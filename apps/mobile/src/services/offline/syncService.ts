import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../supabase';
import { localDatabase, SyncOperation } from './database';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  syncErrors: string[];
}

export interface SyncResult {
  success: boolean;
  operationsProcessed: number;
  errors: string[];
  conflictsResolved: number;
}

class SyncService {
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        // Just came online, trigger sync
        this.performSync();
      }

      this.notifyStatusChange();
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;

    // Set up periodic sync when online
    this.setupPeriodicSync();
  }

  private setupPeriodicSync(): void {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.performBackgroundSync();
      }
    }, 5 * 60 * 1000);
  }

  async performSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (!this.isOnline) {
      throw new Error('No internet connection');
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      const result = await this.executeSyncProcess();
      
      // Update last sync time
      await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
      
      return result;
    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  private async performBackgroundSync(): Promise<void> {
    try {
      await this.performSync();
    } catch (error) {
      console.log('Background sync failed:', error);
      // Don't throw in background sync
    }
  }

  private async executeSyncProcess(): Promise<SyncResult> {
    const errors: string[] = [];
    let operationsProcessed = 0;
    let conflictsResolved = 0;

    try {
      // Step 1: Pull latest data from server
      await this.pullFromServer();

      // Step 2: Push local changes to server
      const pushResult = await this.pushToServer();
      operationsProcessed += pushResult.operationsProcessed;
      errors.push(...pushResult.errors);
      conflictsResolved += pushResult.conflictsResolved;

      // Step 3: Resolve any remaining conflicts
      const conflictResult = await this.resolveConflicts();
      conflictsResolved += conflictResult.conflictsResolved;
      errors.push(...conflictResult.errors);

      // Step 4: Clean up successful operations
      await this.cleanupSyncOperations();

      return {
        success: errors.length === 0,
        operationsProcessed,
        errors,
        conflictsResolved,
      };
    } catch (error) {
      console.error('Sync process failed:', error);
      return {
        success: false,
        operationsProcessed,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown sync error'],
        conflictsResolved,
      };
    }
  }

  private async pullFromServer(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get last sync timestamp
    const lastSyncTime = await AsyncStorage.getItem('last_sync_time');
    const since = lastSyncTime ? new Date(lastSyncTime) : new Date(0);

    // Pull tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', since.toISOString());

    if (tasksError) throw tasksError;

    if (tasks && tasks.length > 0) {
      await localDatabase.bulkUpsertTasks(
        tasks.map(task => ({ ...task, sync_status: 'synced' as const }))
      );
    }

    // Pull goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', since.toISOString());

    if (goalsError) throw goalsError;

    if (goals && goals.length > 0) {
      await localDatabase.bulkUpsertGoals(
        goals.map(goal => ({ ...goal, sync_status: 'synced' as const }))
      );
    }

    // Pull contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', since.toISOString());

    if (contactsError) throw contactsError;

    if (contacts && contacts.length > 0) {
      await localDatabase.bulkUpsertContacts(
        contacts.map(contact => ({ 
          ...contact, 
          tags: contact.tags || [],
          sync_status: 'synced' as const 
        }))
      );
    }
  }

  private async pushToServer(): Promise<{
    operationsProcessed: number;
    errors: string[];
    conflictsResolved: number;
  }> {
    const operations = await localDatabase.getPendingSyncOperations();
    const errors: string[] = [];
    let operationsProcessed = 0;
    let conflictsResolved = 0;

    for (const operation of operations) {
      try {
        const result = await this.processSyncOperation(operation);
        
        if (result.success) {
          await localDatabase.deleteSyncOperation(operation.id);
          operationsProcessed++;
        } else if (result.isConflict) {
          // Handle conflict
          await this.handleConflict(operation, result.serverData);
          conflictsResolved++;
        } else {
          // Increment retry count
          await localDatabase.updateSyncOperation(operation.id, {
            retry_count: operation.retry_count + 1,
            last_error: result.error,
          });
          errors.push(`${operation.table_name}:${operation.record_id} - ${result.error}`);
        }
      } catch (error) {
        console.error('Error processing sync operation:', error);
        errors.push(`${operation.table_name}:${operation.record_id} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Increment retry count
        await localDatabase.updateSyncOperation(operation.id, {
          retry_count: operation.retry_count + 1,
          last_error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { operationsProcessed, errors, conflictsResolved };
  }

  private async processSyncOperation(operation: SyncOperation): Promise<{
    success: boolean;
    isConflict: boolean;
    error?: string;
    serverData?: any;
  }> {
    const data = JSON.parse(operation.data);
    
    try {
      switch (operation.operation_type) {
        case 'insert':
          return await this.performInsert(operation.table_name, data);
        case 'update':
          return await this.performUpdate(operation.table_name, operation.record_id, data);
        case 'delete':
          return await this.performDelete(operation.table_name, operation.record_id);
        default:
          return { success: false, isConflict: false, error: 'Unknown operation type' };
      }
    } catch (error) {
      return { 
        success: false, 
        isConflict: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async performInsert(tableName: string, data: any): Promise<{
    success: boolean;
    isConflict: boolean;
    error?: string;
  }> {
    const { error } = await supabase.from(tableName).insert(data);
    
    if (error) {
      // Check if it's a duplicate key error (conflict)
      if (error.code === '23505') {
        return { success: false, isConflict: true };
      }
      return { success: false, isConflict: false, error: error.message };
    }
    
    return { success: true, isConflict: false };
  }

  private async performUpdate(tableName: string, recordId: string, data: any): Promise<{
    success: boolean;
    isConflict: boolean;
    error?: string;
    serverData?: any;
  }> {
    // First, get the current server version
    const { data: serverData, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { success: false, isConflict: false, error: fetchError.message };
    }

    // Check for conflicts based on updated_at timestamp
    if (serverData && data.updated_at && new Date(serverData.updated_at) > new Date(data.updated_at)) {
      return { 
        success: false, 
        isConflict: true, 
        serverData 
      };
    }

    // Perform the update
    const { error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', recordId);

    if (error) {
      return { success: false, isConflict: false, error: error.message };
    }

    return { success: true, isConflict: false };
  }

  private async performDelete(tableName: string, recordId: string): Promise<{
    success: boolean;
    isConflict: boolean;
    error?: string;
  }> {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', recordId);

    if (error) {
      return { success: false, isConflict: false, error: error.message };
    }

    return { success: true, isConflict: false };
  }

  private async handleConflict(operation: SyncOperation, serverData: any): Promise<void> {
    // Simple conflict resolution: server wins for now
    // In a more sophisticated app, you might want to show user a conflict resolution UI

    const data = JSON.parse(operation.data);
    
    // Update local record with server data
    switch (operation.table_name) {
      case 'tasks':
        await localDatabase.bulkUpsertTasks([{ ...serverData, sync_status: 'synced' }]);
        break;
      case 'goals':
        await localDatabase.bulkUpsertGoals([{ ...serverData, sync_status: 'synced' }]);
        break;
      case 'contacts':
        await localDatabase.bulkUpsertContacts([{ 
          ...serverData, 
          tags: serverData.tags || [],
          sync_status: 'synced' 
        }]);
        break;
    }

    // Remove the conflicting operation
    await localDatabase.deleteSyncOperation(operation.id);
  }

  private async resolveConflicts(): Promise<{
    conflictsResolved: number;
    errors: string[];
  }> {
    // For now, this is handled in the push process
    // Future enhancement: implement more sophisticated conflict resolution
    return { conflictsResolved: 0, errors: [] };
  }

  private async cleanupSyncOperations(): Promise<void> {
    // Remove operations that have exceeded retry limit
    const operations = await localDatabase.getPendingSyncOperations();
    
    for (const operation of operations) {
      if (operation.retry_count >= 3) {
        console.warn(`Removing failed sync operation: ${operation.table_name}:${operation.record_id}`);
        await localDatabase.deleteSyncOperation(operation.id);
      }
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const pendingOperations = await localDatabase.getPendingSyncOperations();
    const lastSyncTimeStr = await AsyncStorage.getItem('last_sync_time');
    const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr) : null;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime,
      pendingOperations: pendingOperations.length,
      syncErrors: [], // Could be enhanced to track recent errors
    };
  }

  addSyncStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private async notifyStatusChange(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  async forceFullSync(): Promise<SyncResult> {
    // Clear last sync time to force full data pull
    await AsyncStorage.removeItem('last_sync_time');
    return await this.performSync();
  }

  async clearAllLocalData(): Promise<void> {
    await localDatabase.clearAllData();
    await AsyncStorage.removeItem('last_sync_time');
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncListeners = [];
  }
}

export const syncService = new SyncService();