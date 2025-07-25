// Epic 8, Story 8.1: Sync Settings Dialog Component

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calendarService } from '@/lib/services/calendarService';
import type { CalendarConnection, SyncSettings } from '@/lib/types/calendar';

interface SyncSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: CalendarConnection[];
}

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  auto_sync_enabled: true,
  sync_interval_minutes: 15,
  create_tasks_from_events: true,
  create_events_from_tasks: true,
  sync_past_events_days: 7,
  sync_future_events_days: 90,
  default_task_duration_minutes: 60,
  meeting_keywords: ['meeting', 'call', 'discussion', 'review', 'sync', 'standup'],
  exclude_all_day_events: false,
  exclude_declined_events: true,
};

export function SyncSettingsDialog({
  open,
  onOpenChange,
  connections,
}: SyncSettingsDialogProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && connections.length > 0) {
      const firstConnection = connections[0];
      setSelectedConnection(firstConnection.id);
      setSettings(firstConnection.sync_settings || DEFAULT_SYNC_SETTINGS);
    }
  }, [open, connections]);

  const handleConnectionChange = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      setSelectedConnection(connectionId);
      setSettings(connection.sync_settings || DEFAULT_SYNC_SETTINGS);
    }
  };

  const handleSettingChange = <K extends keyof SyncSettings>(
    key: K,
    value: SyncSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleKeywordsChange = (value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    handleSettingChange('meeting_keywords', keywords);
  };

  const handleSave = async () => {
    if (!selectedConnection) return;
    
    try {
      setIsSaving(true);
      await calendarService.updateSyncSettings(selectedConnection, settings);
      
      toast({
        title: 'Settings Saved',
        description: 'Calendar sync settings have been updated successfully.',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving sync settings:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save sync settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedConnectionData = connections.find(c => c.id === selectedConnection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"max-w-3xl max-h-[80vh] overflow-y-auto\">
        <DialogHeader>
          <DialogTitle className=\"flex items-center gap-2\">
            <Settings className=\"h-5 w-5\" />
            Calendar Sync Settings
          </DialogTitle>
          <DialogDescription>
            Configure how TaskQuest syncs with your calendar accounts.
          </DialogDescription>
        </DialogHeader>

        <div className=\"space-y-6\">
          {/* Connection Selector */}
          {connections.length > 1 && (
            <div className=\"space-y-2\">
              <Label>Calendar Account</Label>
              <Select value={selectedConnection} onValueChange={handleConnectionChange}>
                <SelectTrigger>
                  <SelectValue placeholder=\"Select calendar account\" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className=\"flex items-center gap-2\">
                        <span className=\"capitalize\">{connection.provider}</span>
                        <span className=\"text-gray-500\">
                          ({connection.provider_account_email})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedConnectionData && (
            <Tabs defaultValue=\"general\" className=\"w-full\">
              <TabsList className=\"grid w-full grid-cols-3\">
                <TabsTrigger value=\"general\">General</TabsTrigger>
                <TabsTrigger value=\"sync\">Sync Rules</TabsTrigger>
                <TabsTrigger value=\"advanced\">Advanced</TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value=\"general\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Auto Sync</Label>
                      <p className=\"text-sm text-gray-500\">
                        Automatically sync calendar events and tasks
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_sync_enabled}
                      onCheckedChange={(checked) => handleSettingChange('auto_sync_enabled', checked)}
                    />
                  </div>

                  <div className=\"grid grid-cols-2 gap-4\">
                    <div className=\"space-y-2\">
                      <Label>Sync Interval</Label>
                      <Select
                        value={settings.sync_interval_minutes.toString()}
                        onValueChange={(value) => handleSettingChange('sync_interval_minutes', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=\"5\">5 minutes</SelectItem>
                          <SelectItem value=\"15\">15 minutes</SelectItem>
                          <SelectItem value=\"30\">30 minutes</SelectItem>
                          <SelectItem value=\"60\">1 hour</SelectItem>
                          <SelectItem value=\"240\">4 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className=\"space-y-2\">
                      <Label>Default Task Duration</Label>
                      <Select
                        value={settings.default_task_duration_minutes.toString()}
                        onValueChange={(value) => handleSettingChange('default_task_duration_minutes', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=\"30\">30 minutes</SelectItem>
                          <SelectItem value=\"60\">1 hour</SelectItem>
                          <SelectItem value=\"90\">1.5 hours</SelectItem>
                          <SelectItem value=\"120\">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Sync Rules */}
              <TabsContent value=\"sync\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Create Tasks from Events</Label>
                      <p className=\"text-sm text-gray-500\">
                        Automatically create tasks from calendar events
                      </p>
                    </div>
                    <Switch
                      checked={settings.create_tasks_from_events}
                      onCheckedChange={(checked) => handleSettingChange('create_tasks_from_events', checked)}
                    />
                  </div>

                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Create Events from Tasks</Label>
                      <p className=\"text-sm text-gray-500\">
                        Create calendar events for tasks with due dates
                      </p>
                    </div>
                    <Switch
                      checked={settings.create_events_from_tasks}
                      onCheckedChange={(checked) => handleSettingChange('create_events_from_tasks', checked)}
                    />
                  </div>

                  <div className=\"grid grid-cols-2 gap-4\">
                    <div className=\"space-y-2\">
                      <Label>Sync Past Events (days)</Label>
                      <Input
                        type=\"number\"
                        value={settings.sync_past_events_days}
                        onChange={(e) => handleSettingChange('sync_past_events_days', parseInt(e.target.value) || 0)}
                        min=\"0\"
                        max=\"365\"
                      />
                    </div>

                    <div className=\"space-y-2\">
                      <Label>Sync Future Events (days)</Label>
                      <Input
                        type=\"number\"
                        value={settings.sync_future_events_days}
                        onChange={(e) => handleSettingChange('sync_future_events_days', parseInt(e.target.value) || 30)}
                        min=\"1\"
                        max=\"365\"
                      />
                    </div>
                  </div>

                  <div className=\"space-y-2\">
                    <Label>Meeting Keywords</Label>
                    <Textarea
                      placeholder=\"meeting, call, discussion, review, sync, standup\"
                      value={settings.meeting_keywords.join(', ')}
                      onChange={(e) => handleKeywordsChange(e.target.value)}
                      rows={3}
                    />
                    <p className=\"text-sm text-gray-500\">
                      Comma-separated keywords to identify meetings for follow-up task suggestions
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value=\"advanced\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Exclude All-Day Events</Label>
                      <p className=\"text-sm text-gray-500\">
                        Don't create tasks from all-day calendar events
                      </p>
                    </div>
                    <Switch
                      checked={settings.exclude_all_day_events}
                      onCheckedChange={(checked) => handleSettingChange('exclude_all_day_events', checked)}
                    />
                  </div>

                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Exclude Declined Events</Label>
                      <p className=\"text-sm text-gray-500\">
                        Don't sync events that you've declined
                      </p>
                    </div>
                    <Switch
                      checked={settings.exclude_declined_events}
                      onCheckedChange={(checked) => handleSettingChange('exclude_declined_events', checked)}
                    />
                  </div>

                  {/* Sync Status Information */}
                  <div className=\"bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4\">
                    <div className=\"flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2\">
                      <Info className=\"h-4 w-4\" />
                      <span className=\"font-medium\">Sync Information</span>
                    </div>
                    <div className=\"grid grid-cols-2 gap-4 text-sm\">
                      <div>
                        <span className=\"text-blue-700 dark:text-blue-300\">Provider:</span>
                        <span className=\"ml-2 font-medium capitalize\">
                          {selectedConnectionData.provider}
                        </span>
                      </div>
                      <div>
                        <span className=\"text-blue-700 dark:text-blue-300\">Account:</span>
                        <span className=\"ml-2 font-medium\">
                          {selectedConnectionData.provider_account_email}
                        </span>
                      </div>
                      <div>
                        <span className=\"text-blue-700 dark:text-blue-300\">Last Sync:</span>
                        <span className=\"ml-2 font-medium\">
                          {selectedConnectionData.last_sync_at 
                            ? new Date(selectedConnectionData.last_sync_at).toLocaleString()
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div>
                        <span className=\"text-blue-700 dark:text-blue-300\">Status:</span>
                        <span className=\"ml-2 font-medium\">
                          {selectedConnectionData.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warning about token expiration */}
                  {selectedConnectionData.token_expires_at && 
                   new Date(selectedConnectionData.token_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                    <div className=\"bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4\">
                      <div className=\"flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2\">
                        <AlertTriangle className=\"h-4 w-4\" />
                        <span className=\"font-medium\">Token Expiring Soon</span>
                      </div>
                      <p className=\"text-sm text-yellow-700 dark:text-yellow-300\">
                        Your authentication token expires on{' '}
                        {new Date(selectedConnectionData.token_expires_at).toLocaleDateString()}.
                        You may need to reconnect your account soon.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Buttons */}
          <div className=\"flex gap-2 pt-4 border-t\">
            <Button
              onClick={() => onOpenChange(false)}
              variant=\"outline\"
              className=\"flex-1\"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !selectedConnection}
              className=\"flex-1\"
            >
              {isSaving ? (
                <>
                  <Clock className=\"h-4 w-4 mr-2 animate-spin\" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}