// Epic 8, Story 8.2: Slack Settings Dialog Component

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
  Bot,
  Bell,
  Zap,
  Clock,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SlackWorkspace, SlackNotificationSettings } from '@/lib/types/slack';

interface SlackSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: SlackWorkspace[];
}

const DEFAULT_NOTIFICATION_SETTINGS: SlackNotificationSettings = {
  task_reminders: true,
  daily_summary: true,
  task_completions: true,
  team_updates: false,
  summary_time: '09:00',
  reminder_frequency: 'immediate',
  quiet_hours: {
    enabled: false,
    start: '18:00',
    end: '09:00',
  },
};

export function SlackSettingsDialog({
  open,
  onOpenChange,
  workspaces,
}: SlackSettingsDialogProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [notificationSettings, setNotificationSettings] = useState<SlackNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [emojiTriggers, setEmojiTriggers] = useState<string>('task, todo, action_item');
  const [slashCommands, setSlashCommands] = useState({
    task: { enabled: true, description: 'Create a new task' },
    todo: { enabled: true, description: 'Create a todo item' },
    reminder: { enabled: false, description: 'Set a reminder' },
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0].id);
    }
  }, [open, workspaces]);

  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    // In a real implementation, load settings for the selected workspace
  };

  const handleNotificationChange = <K extends keyof SlackNotificationSettings>(
    key: K,
    value: SlackNotificationSettings[K]
  ) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleQuietHoursChange = (field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    setNotificationSettings(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedWorkspace) return;
    
    try {
      setIsSaving(true);
      
      // In a real implementation, save settings to backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Settings Saved',
        description: 'Slack integration settings have been updated successfully.',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedWorkspaceData = workspaces.find(w => w.id === selectedWorkspace);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"max-w-3xl max-h-[80vh] overflow-y-auto\">
        <DialogHeader>
          <DialogTitle className=\"flex items-center gap-2\">
            <Settings className=\"h-5 w-5\" />
            Slack Integration Settings
          </DialogTitle>
          <DialogDescription>
            Configure how TaskQuest integrates with your Slack workspaces.
          </DialogDescription>
        </DialogHeader>

        <div className=\"space-y-6\">
          {/* Workspace Selector */}
          {workspaces.length > 1 && (
            <div className=\"space-y-2\">
              <Label>Slack Workspace</Label>
              <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
                <SelectTrigger>
                  <SelectValue placeholder=\"Select workspace\" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <div className=\"flex items-center gap-2\">
                        <span>{workspace.team_name}</span>
                        <span className=\"text-gray-500\">
                          ({workspace.team_domain})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedWorkspaceData && (
            <Tabs defaultValue=\"notifications\" className=\"w-full\">
              <TabsList className=\"grid w-full grid-cols-4\">
                <TabsTrigger value=\"notifications\">Notifications</TabsTrigger>
                <TabsTrigger value=\"commands\">Commands</TabsTrigger>
                <TabsTrigger value=\"triggers\">Triggers</TabsTrigger>
                <TabsTrigger value=\"advanced\">Advanced</TabsTrigger>
              </TabsList>

              {/* Notifications Tab */}
              <TabsContent value=\"notifications\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Task Reminders</Label>
                      <p className=\"text-sm text-gray-500\">
                        Get notified about upcoming task deadlines
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.task_reminders}
                      onCheckedChange={(checked) => handleNotificationChange('task_reminders', checked)}
                    />
                  </div>

                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Daily Summary</Label>
                      <p className=\"text-sm text-gray-500\">
                        Receive a daily productivity summary
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.daily_summary}
                      onCheckedChange={(checked) => handleNotificationChange('daily_summary', checked)}
                    />
                  </div>

                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Task Completions</Label>
                      <p className=\"text-sm text-gray-500\">
                        Notify channels when tasks are completed
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.task_completions}
                      onCheckedChange={(checked) => handleNotificationChange('task_completions', checked)}
                    />
                  </div>

                  <div className=\"flex items-center justify-between\">
                    <div className=\"space-y-0.5\">
                      <Label>Team Updates</Label>
                      <p className=\"text-sm text-gray-500\">
                        Share your achievements with team members
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.team_updates}
                      onCheckedChange={(checked) => handleNotificationChange('team_updates', checked)}
                    />
                  </div>

                  <div className=\"grid grid-cols-2 gap-4\">
                    <div className=\"space-y-2\">
                      <Label>Daily Summary Time</Label>
                      <Input
                        type=\"time\"
                        value={notificationSettings.summary_time}
                        onChange={(e) => handleNotificationChange('summary_time', e.target.value)}
                      />
                    </div>

                    <div className=\"space-y-2\">
                      <Label>Reminder Frequency</Label>
                      <Select
                        value={notificationSettings.reminder_frequency}
                        onValueChange={(value: 'immediate' | 'hourly' | 'daily') => 
                          handleNotificationChange('reminder_frequency', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=\"immediate\">Immediate</SelectItem>
                          <SelectItem value=\"hourly\">Hourly digest</SelectItem>
                          <SelectItem value=\"daily\">Daily digest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quiet Hours */}
                  <div className=\"space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg\">
                    <div className=\"flex items-center justify-between\">
                      <Label>Quiet Hours</Label>
                      <Switch
                        checked={notificationSettings.quiet_hours.enabled}
                        onCheckedChange={(checked) => handleQuietHoursChange('enabled', checked)}
                      />
                    </div>
                    
                    {notificationSettings.quiet_hours.enabled && (
                      <div className=\"grid grid-cols-2 gap-4\">
                        <div className=\"space-y-2\">
                          <Label>Start Time</Label>
                          <Input
                            type=\"time\"
                            value={notificationSettings.quiet_hours.start}
                            onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                          />
                        </div>
                        <div className=\"space-y-2\">
                          <Label>End Time</Label>
                          <Input
                            type=\"time\"
                            value={notificationSettings.quiet_hours.end}
                            onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Commands Tab */}
              <TabsContent value=\"commands\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div className=\"text-sm text-gray-600 dark:text-gray-400\">
                    Configure which slash commands are available in your workspace.
                  </div>

                  {Object.entries(slashCommands).map(([command, config]) => (
                    <div key={command} className=\"flex items-center justify-between p-3 border rounded-lg\">
                      <div className=\"flex-1\">
                        <div className=\"flex items-center gap-2\">
                          <code className=\"text-sm font-mono\">/{command}</code>
                          <Badge variant={config.enabled ? 'default' : 'secondary'}>
                            {config.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className=\"text-sm text-gray-500 mt-1\">{config.description}</p>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => 
                          setSlashCommands(prev => ({
                            ...prev,
                            [command]: { ...prev[command], enabled: checked }
                          }))
                        }
                      />
                    </div>
                  ))}

                  <div className=\"bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3\">
                    <div className=\"flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2\">
                      <Bot className=\"h-4 w-4\" />
                      <span className=\"font-medium\">Command Usage</span>
                    </div>
                    <div className=\"text-sm text-blue-700 dark:text-blue-300 space-y-1\">
                      <p><code>/task Review quarterly reports</code> - Creates a new task</p>
                      <p><code>/todo @john Prepare presentation</code> - Assigns task to team member</p>
                      <p><code>/reminder Call client tomorrow at 2pm</code> - Sets a reminder</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Triggers Tab */}
              <TabsContent value=\"triggers\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div>
                    <Label>Emoji Triggers</Label>
                    <p className=\"text-sm text-gray-500 mb-2\">
                      Comma-separated list of emoji names that create tasks when used as reactions
                    </p>
                    <Textarea
                      placeholder=\"task, todo, action_item, reminder\"
                      value={emojiTriggers}
                      onChange={(e) => setEmojiTriggers(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className=\"space-y-3\">
                    <Label>Reaction Behaviors</Label>
                    
                    <div className=\"space-y-2\">
                      <div className=\"flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">
                        <div>
                          <p className=\"font-medium\">📝 :task:</p>
                          <p className=\"text-sm text-gray-500\">Create task from message</p>
                        </div>
                        <Switch checked readOnly />
                      </div>

                      <div className=\"flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">
                        <div>
                          <p className=\"font-medium\">⚡ :action_item:</p>
                          <p className=\"text-sm text-gray-500\">Mark as high priority action item</p>
                        </div>
                        <Switch checked readOnly />
                      </div>

                      <div className=\"flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">
                        <div>
                          <p className=\"font-medium\">⏰ :reminder:</p>
                          <p className=\"text-sm text-gray-500\">Set reminder for later</p>
                        </div>
                        <Switch checked={false} readOnly />
                      </div>
                    </div>
                  </div>

                  <div className=\"bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3\">
                    <div className=\"flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2\">
                      <Zap className=\"h-4 w-4\" />
                      <span className=\"font-medium\">Emoji Tips</span>
                    </div>
                    <div className=\"text-sm text-yellow-700 dark:text-yellow-300 space-y-1\">
                      <p>• Use custom workspace emoji for branded reactions</p>
                      <p>• Bot will confirm task creation with a ✅ reaction</p>
                      <p>• Message context and thread information is preserved</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value=\"advanced\" className=\"space-y-4\">
                <div className=\"space-y-4\">
                  <div className=\"bg-gray-50 dark:bg-gray-800 rounded-lg p-4\">
                    <h4 className=\"font-medium mb-3\">Workspace Information</h4>
                    <div className=\"grid grid-cols-2 gap-4 text-sm\">
                      <div>
                        <span className=\"text-gray-500\">Team:</span>
                        <span className=\"ml-2 font-medium\">{selectedWorkspaceData.team_name}</span>
                      </div>
                      <div>
                        <span className=\"text-gray-500\">Domain:</span>
                        <span className=\"ml-2 font-medium\">{selectedWorkspaceData.team_domain}</span>
                      </div>
                      <div>
                        <span className=\"text-gray-500\">Bot User:</span>
                        <span className=\"ml-2 font-medium\">{selectedWorkspaceData.bot_user_id || 'Not configured'}</span>
                      </div>
                      <div>
                        <span className=\"text-gray-500\">Permissions:</span>
                        <span className=\"ml-2 font-medium\">{selectedWorkspaceData.scope ? 'Granted' : 'Pending'}</span>
                      </div>
                    </div>
                  </div>

                  <div className=\"space-y-3\">
                    <Label>Integration Features</Label>
                    
                    <div className=\"space-y-2\">
                      <div className=\"flex items-center justify-between p-3 border rounded-lg\">
                        <div>
                          <p className=\"font-medium\">Thread Replies</p>
                          <p className=\"text-sm text-gray-500\">Respond to task creation in threads</p>
                        </div>
                        <Switch checked readOnly />
                      </div>

                      <div className=\"flex items-center justify-between p-3 border rounded-lg\">
                        <div>
                          <p className=\"font-medium\">Message Context</p>
                          <p className=\"text-sm text-gray-500\">Include message links in task descriptions</p>
                        </div>
                        <Switch checked readOnly />
                      </div>

                      <div className=\"flex items-center justify-between p-3 border rounded-lg\">
                        <div>
                          <p className=\"font-medium\">Auto-Assignment</p>
                          <p className=\"text-sm text-gray-500\">Assign tasks to message author by default</p>
                        </div>
                        <Switch checked readOnly />
                      </div>
                    </div>
                  </div>

                  <div className=\"bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3\">
                    <div className=\"flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2\">
                      <Users className=\"h-4 w-4\" />
                      <span className=\"font-medium\">Team Collaboration</span>
                    </div>
                    <div className=\"text-sm text-blue-700 dark:text-blue-300 space-y-1\">
                      <p>• Tasks can be assigned to any team member with a TaskQuest account</p>
                      <p>• Non-users will receive invitation links when mentioned</p>
                      <p>• Channel notifications keep everyone informed of progress</p>
                    </div>
                  </div>
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
              disabled={isSaving || !selectedWorkspace}
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