import * as SQLite from 'expo-sqlite';
import { Database } from '@/types/supabase';

export interface LocalTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  xp_earned?: number;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  goal_id?: string;
  project_id?: string;
  contact_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  local_changes?: string; // JSON string of pending changes
}

export interface LocalGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  target_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  sync_status: 'synced' | 'pending' | 'conflict';
  local_changes?: string;
}

export interface LocalContact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'vip';
  notes?: string;
  tags?: string; // JSON string array
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  local_changes?: string;
}

export interface SyncOperation {
  id: string;
  table_name: string;
  operation_type: 'insert' | 'update' | 'delete';
  record_id: string;
  data: string; // JSON string
  created_at: string;
  retry_count: number;
  last_error?: string;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('taskquest.db');
      
      await this.createTables();
      await this.createIndexes();
      
      console.log('Local database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize local database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Tasks table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        complexity TEXT DEFAULT 'simple',
        xp_earned INTEGER,
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        goal_id TEXT,
        project_id TEXT,
        contact_id TEXT,
        sync_status TEXT DEFAULT 'synced',
        local_changes TEXT
      );
    `);

    // Goals table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        target_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        category TEXT,
        priority TEXT DEFAULT 'medium',
        sync_status TEXT DEFAULT 'synced',
        local_changes TEXT
      );
    `);

    // Contacts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        job_title TEXT,
        category TEXT,
        priority TEXT DEFAULT 'medium',
        notes TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        local_changes TEXT
      );
    `);

    // Sync operations queue
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_operations (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );
    `);

    // User data cache
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create indexes for better query performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(sync_status);
      
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);
      CREATE INDEX IF NOT EXISTS idx_goals_sync_status ON goals(sync_status);
      
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_sync_status ON contacts(sync_status);
      
      CREATE INDEX IF NOT EXISTS idx_sync_operations_created_at ON sync_operations(created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_retry_count ON sync_operations(retry_count);
    `);
  }

  // Tasks CRUD operations
  async getTasks(userId: string, includeCompleted: boolean = true): Promise<LocalTask[]> {
    if (!this.db) throw new Error('Database not initialized');

    const whereClause = includeCompleted 
      ? 'WHERE user_id = ?' 
      : 'WHERE user_id = ? AND completed = FALSE';

    const result = await this.db.getAllAsync(
      `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC`,
      [userId]
    );

    return result as LocalTask[];
  }

  async getTask(id: string): Promise<LocalTask | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );

    return result as LocalTask | null;
  }

  async createTask(task: Omit<LocalTask, 'sync_status' | 'local_changes'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT INTO tasks (
        id, user_id, title, description, completed, complexity,
        xp_earned, priority, due_date, created_at, updated_at,
        completed_at, goal_id, project_id, contact_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      task.id, task.user_id, task.title, task.description, task.completed,
      task.complexity, task.xp_earned, task.priority, task.due_date,
      task.created_at, task.updated_at, task.completed_at,
      task.goal_id, task.project_id, task.contact_id
    ]);

    // Queue for sync
    await this.queueSyncOperation({
      id: `sync_${Date.now()}_${Math.random()}`,
      table_name: 'tasks',
      operation_type: 'insert',
      record_id: task.id,
      data: JSON.stringify(task),
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  }

  async updateTask(id: string, updates: Partial<LocalTask>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'sync_status' && key !== 'local_changes')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'sync_status' && key !== 'local_changes')
      .map(([, value]) => value);

    await this.db.runAsync(`
      UPDATE tasks 
      SET ${setClause}, sync_status = 'pending', updated_at = ?
      WHERE id = ?
    `, [...values, new Date().toISOString(), id]);

    // Queue for sync
    await this.queueSyncOperation({
      id: `sync_${Date.now()}_${Math.random()}`,
      table_name: 'tasks',
      operation_type: 'update',
      record_id: id,
      data: JSON.stringify(updates),
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);

    // Queue for sync
    await this.queueSyncOperation({
      id: `sync_${Date.now()}_${Math.random()}`,
      table_name: 'tasks',
      operation_type: 'delete',
      record_id: id,
      data: JSON.stringify({ id }),
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  }

  // Goals CRUD operations
  async getGoals(userId: string): Promise<LocalGoal[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return result as LocalGoal[];
  }

  async createGoal(goal: Omit<LocalGoal, 'sync_status' | 'local_changes'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT INTO goals (
        id, user_id, title, description, completed, target_date,
        created_at, updated_at, completed_at, category, priority, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      goal.id, goal.user_id, goal.title, goal.description, goal.completed,
      goal.target_date, goal.created_at, goal.updated_at, goal.completed_at,
      goal.category, goal.priority
    ]);

    // Queue for sync
    await this.queueSyncOperation({
      id: `sync_${Date.now()}_${Math.random()}`,
      table_name: 'goals',
      operation_type: 'insert',
      record_id: goal.id,
      data: JSON.stringify(goal),
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  }

  // Contacts CRUD operations
  async getContacts(userId: string): Promise<LocalContact[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );

    return result.map(contact => ({
      ...contact,
      tags: contact.tags ? JSON.parse(contact.tags) : [],
    })) as LocalContact[];
  }

  async createContact(contact: Omit<LocalContact, 'sync_status' | 'local_changes'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT INTO contacts (
        id, user_id, name, email, phone, company, job_title,
        category, priority, notes, tags, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      contact.id, contact.user_id, contact.name, contact.email, contact.phone,
      contact.company, contact.job_title, contact.category, contact.priority,
      contact.notes, JSON.stringify(contact.tags), contact.created_at,
      contact.updated_at
    ]);

    // Queue for sync
    await this.queueSyncOperation({
      id: `sync_${Date.now()}_${Math.random()}`,
      table_name: 'contacts',
      operation_type: 'insert',
      record_id: contact.id,
      data: JSON.stringify(contact),
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
  }

  // Sync operations
  private async queueSyncOperation(operation: SyncOperation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT INTO sync_operations (
        id, table_name, operation_type, record_id, data, created_at, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      operation.id, operation.table_name, operation.operation_type,
      operation.record_id, operation.data, operation.created_at, operation.retry_count
    ]);
  }

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(`
      SELECT * FROM sync_operations 
      WHERE retry_count < 3 
      ORDER BY created_at ASC
    `);

    return result as SyncOperation[];
  }

  async updateSyncOperation(id: string, updates: Partial<SyncOperation>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value);

    await this.db.runAsync(`
      UPDATE sync_operations SET ${setClause} WHERE id = ?
    `, [...values, id]);
  }

  async deleteSyncOperation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM sync_operations WHERE id = ?', [id]);
  }

  // Cache operations
  async setCache(key: string, value: any, expiresInMinutes: number = 60): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    await this.db.runAsync(`
      INSERT OR REPLACE INTO user_cache (key, value, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `, [key, JSON.stringify(value), expiresAt, new Date().toISOString()]);
  }

  async getCache(key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`
      SELECT value FROM user_cache 
      WHERE key = ? AND expires_at > datetime('now')
    `, [key]);

    return result ? JSON.parse((result as any).value) : null;
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      DELETE FROM user_cache WHERE expires_at <= datetime('now')
    `);
  }

  // Bulk operations for sync
  async bulkUpsertTasks(tasks: LocalTask[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.withTransactionAsync(async () => {
      for (const task of tasks) {
        await this.db!.runAsync(`
          INSERT OR REPLACE INTO tasks (
            id, user_id, title, description, completed, complexity,
            xp_earned, priority, due_date, created_at, updated_at,
            completed_at, goal_id, project_id, contact_id, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        `, [
          task.id, task.user_id, task.title, task.description, task.completed,
          task.complexity, task.xp_earned, task.priority, task.due_date,
          task.created_at, task.updated_at, task.completed_at,
          task.goal_id, task.project_id, task.contact_id
        ]);
      }
    });
  }

  async bulkUpsertGoals(goals: LocalGoal[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.withTransactionAsync(async () => {
      for (const goal of goals) {
        await this.db!.runAsync(`
          INSERT OR REPLACE INTO goals (
            id, user_id, title, description, completed, target_date,
            created_at, updated_at, completed_at, category, priority, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        `, [
          goal.id, goal.user_id, goal.title, goal.description, goal.completed,
          goal.target_date, goal.created_at, goal.updated_at, goal.completed_at,
          goal.category, goal.priority
        ]);
      }
    });
  }

  async bulkUpsertContacts(contacts: LocalContact[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.withTransactionAsync(async () => {
      for (const contact of contacts) {
        await this.db!.runAsync(`
          INSERT OR REPLACE INTO contacts (
            id, user_id, name, email, phone, company, job_title,
            category, priority, notes, tags, created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        `, [
          contact.id, contact.user_id, contact.name, contact.email, contact.phone,
          contact.company, contact.job_title, contact.category, contact.priority,
          contact.notes, JSON.stringify(contact.tags), contact.created_at,
          contact.updated_at
        ]);
      }
    });
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.withTransactionAsync(async () => {
      await this.db!.execAsync('DELETE FROM tasks');
      await this.db!.execAsync('DELETE FROM goals');
      await this.db!.execAsync('DELETE FROM contacts');
      await this.db!.execAsync('DELETE FROM sync_operations');
      await this.db!.execAsync('DELETE FROM user_cache');
    });
  }

  async getStorageStats(): Promise<{
    tasks: number;
    goals: number;
    contacts: number;
    pendingSync: number;
    cacheSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const [tasks, goals, contacts, pendingSync, cacheSize] = await Promise.all([
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM tasks'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM goals'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM contacts'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM sync_operations'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM user_cache'),
    ]);

    return {
      tasks: (tasks as any)?.count || 0,
      goals: (goals as any)?.count || 0,
      contacts: (contacts as any)?.count || 0,
      pendingSync: (pendingSync as any)?.count || 0,
      cacheSize: (cacheSize as any)?.count || 0,
    };
  }
}

export const localDatabase = new LocalDatabase();