// Epic 8, Story 8.2: Slack Integration Page

'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Bot, 
  Settings, 
  Plus, 
  Zap,
  Check,
  Users,
  Hash,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SlackWorkspaceCard } from '@/components/integrations/SlackWorkspaceCard';
import { SlackChannelManager } from '@/components/integrations/SlackChannelManager';
import { SlackSettingsDialog } from '@/components/integrations/SlackSettingsDialog';
import { slackService } from '@/lib/services/slackService';
import type { SlackWorkspace, SlackTask, SlackInteractionLog } from '@/lib/types/slack';

export default function SlackIntegrationsPage() {
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([]);
  const [slackTasks, setSlackTasks] = useState<SlackTask[]>([]);
  const [interactionLogs, setInteractionLogs] = useState<SlackInteractionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [showChannelManager, setShowChannelManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSlackData();
  }, []);

  const loadSlackData = async () => {
    try {
      setIsLoading(true);
      
      const [workspacesData, tasksData] = await Promise.all([
        slackService.getWorkspaces(),
        slackService.getSlackTasks(),
      ]);
      
      setWorkspaces(workspacesData);
      setSlackTasks(tasksData);
    } catch (error) {
      console.error('Error loading Slack data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Slack integrations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectSlack = async () => {
    try {
      setIsConnecting(true);
      
      const scopes = [
        'channels:read',
        'chat:write',
        'commands',
        'reactions:read',
        'reactions:write',
        'users:read',
        'users:read.email',
        'team:read'
      ].join(',');

      const oauthUrl = `https://slack.com/oauth/v2/authorize?${new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID!,
        scope: scopes,
        redirect_uri: `${window.location.origin}/integrations/slack/callback`,
        state: crypto.randomUUID(),
      })}`;

      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error connecting Slack:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect Slack workspace. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWorkspace = async (workspaceId: string) => {
    try {
      await slackService.disconnectWorkspace(workspaceId);
      
      toast({
        title: 'Workspace Disconnected',
        description: 'Slack workspace has been disconnected successfully.',
      });
      
      await loadSlackData();
    } catch (error) {
      console.error('Error disconnecting workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect workspace. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getIntegrationStats = () => {
    const totalChannels = workspaces.reduce((sum, ws) => sum + (ws.channels?.length || 0), 0);
    const activeChannels = workspaces.reduce((sum, ws) => 
      sum + (ws.channels?.filter(c => c.is_bot_member && !c.is_archived).length || 0), 0);
    const tasksToday = slackTasks.filter(task => 
      task.created_at.startsWith(new Date().toISOString().split('T')[0])).length;

    return {
      connectedWorkspaces: workspaces.length,
      totalChannels,
      activeChannels,
      tasksCreated: slackTasks.length,
      tasksToday,
    };
  };

  const stats = getIntegrationStats();

  return (
    <div className=\"container mx-auto py-8 px-4\">
      {/* Header */}
      <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8\">
        <div>
          <h1 className=\"text-3xl font-bold text-gray-900 dark:text-gray-100\">
            Slack Integration
          </h1>
          <p className=\"text-gray-600 dark:text-gray-400 mt-2\">
            Create and manage tasks directly from Slack
          </p>
        </div>
        <div className=\"flex gap-2 mt-4 sm:mt-0\">
          <Button 
            onClick={() => setShowChannelManager(true)}
            disabled={workspaces.length === 0}
            variant=\"outline\"
          >
            <Hash className=\"h-4 w-4 mr-2\" />
            Channels
          </Button>
          <Button 
            onClick={() => setShowSettings(true)}
            disabled={workspaces.length === 0}
            variant=\"outline\"
          >
            <Settings className=\"h-4 w-4 mr-2\" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-5 gap-6 mb-8\">
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Workspaces</CardTitle>
            <MessageSquare className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.connectedWorkspaces}</div>
            <p className=\"text-xs text-muted-foreground\">
              Connected teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Active Channels</CardTitle>
            <Hash className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.activeChannels}</div>
            <p className=\"text-xs text-muted-foreground\">
              of {stats.totalChannels} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Tasks Created</CardTitle>
            <Zap className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.tasksCreated}</div>
            <p className=\"text-xs text-muted-foreground\">
              Total from Slack
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Today</CardTitle>
            <Activity className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.tasksToday}</div>
            <p className=\"text-xs text-muted-foreground\">
              Tasks created today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Bot Status</CardTitle>
            <Bot className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">
              {workspaces.length > 0 ? '🟢' : '🔴'}
            </div>
            <p className=\"text-xs text-muted-foreground\">
              {workspaces.length > 0 ? 'Active' : 'Not connected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Workspaces */}
      <div className=\"mb-8\">
        <h2 className=\"text-xl font-semibold mb-4\">Connected Workspaces</h2>
        
        {workspaces.length === 0 ? (
          <Card>
            <CardContent className=\"text-center py-12\">
              <MessageSquare className=\"h-16 w-16 mx-auto text-gray-400 mb-4\" />
              <h3 className=\"text-lg font-medium text-gray-900 dark:text-gray-100 mb-2\">
                No Slack Workspaces Connected
              </h3>
              <p className=\"text-gray-500 dark:text-gray-400 mb-6\">
                Connect your Slack workspace to start creating tasks from your conversations.
              </p>
              <Button onClick={handleConnectSlack} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Bot className=\"h-4 w-4 mr-2 animate-pulse\" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className=\"h-4 w-4 mr-2\" />
                    Connect Slack Workspace
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className=\"space-y-6\">
            {workspaces.map((workspace) => (
              <SlackWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onDisconnect={handleDisconnectWorkspace}
                onManageChannels={() => {
                  setSelectedWorkspace(workspace.id);
                  setShowChannelManager(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slack App Features */}
      <div className=\"mb-8\">
        <h2 className=\"text-xl font-semibold mb-4\">TaskQuest Bot Features</h2>
        
        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Bot className=\"h-5 w-5\" />
                Slash Commands
              </CardTitle>
              <CardDescription>
                Create tasks instantly with simple commands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-3\">
                <div className=\"bg-gray-50 dark:bg-gray-800 rounded-lg p-3\">
                  <code className=\"text-sm font-mono\">/task Review quarterly reports</code>
                  <p className=\"text-xs text-gray-600 dark:text-gray-400 mt-1\">
                    Creates a new task with the given title
                  </p>
                </div>
                <div className=\"bg-gray-50 dark:bg-gray-800 rounded-lg p-3\">
                  <code className=\"text-sm font-mono\">/todo @john Prepare presentation</code>
                  <p className=\"text-xs text-gray-600 dark:text-gray-400 mt-1\">
                    Creates a task and assigns it to a team member
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Zap className=\"h-5 w-5\" />
                Emoji Reactions
              </CardTitle>
              <CardDescription>
                Turn any message into a task with emoji reactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-3\">
                <div className=\"flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">
                  <span className=\"text-lg\">📝</span>
                  <div>
                    <p className=\"text-sm font-medium\">:task: or :todo:</p>
                    <p className=\"text-xs text-gray-600 dark:text-gray-400\">
                      React to create a task from the message
                    </p>
                  </div>
                </div>
                <div className=\"flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">
                  <span className=\"text-lg\">⚡</span>
                  <div>
                    <p className=\"text-sm font-medium\">:action_item:</p>
                    <p className=\"text-xs text-gray-600 dark:text-gray-400\">
                      Mark important action items for follow-up
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Users className=\"h-5 w-5\" />
                Team Collaboration
              </CardTitle>
              <CardDescription>
                Keep your team in sync with task updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className=\"space-y-2 text-sm\">
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Automatic task assignment to team members
                </li>
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Task completion notifications in channels
                </li>
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Daily productivity summaries
                </li>
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Reminder notifications for due tasks
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Settings className=\"h-5 w-5\" />
                Smart Automation
              </CardTitle>
              <CardDescription>
                Intelligent features that work in the background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className=\"space-y-2 text-sm\">
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Context-aware task descriptions
                </li>
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Message thread preservation
                </li>
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Channel-specific configurations
                </li>
                <li className=\"flex items-center gap-2\">
                  <Check className=\"h-4 w-4 text-green-500\" />
                  Priority detection from keywords
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Tasks from Slack */}
      {slackTasks.length > 0 && (
        <div className=\"mb-8\">
          <h2 className=\"text-xl font-semibold mb-4\">Recent Tasks from Slack</h2>
          
          <Card>
            <CardContent className=\"p-0\">
              <div className=\"divide-y divide-gray-200 dark:divide-gray-700\">
                {slackTasks.slice(0, 10).map((slackTask) => (
                  <div key={slackTask.id} className=\"p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors\">
                    <div className=\"flex items-start justify-between\">
                      <div className=\"flex-1 min-w-0\">
                        <h4 className=\"font-medium truncate\">
                          {slackTask.task?.title}
                        </h4>
                        <div className=\"flex items-center gap-2 mt-1\">
                          <Badge variant=\"outline\" className=\"text-xs\">
                            {slackTask.creation_method.replace('_', ' ')}
                          </Badge>
                          <span className=\"text-xs text-gray-500\">
                            {slackTask.workspace?.team_name} #{slackTask.channel_id}
                          </span>
                        </div>
                        {slackTask.message_text && (
                          <p className=\"text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2\">
                            {slackTask.message_text}
                          </p>
                        )}
                      </div>
                      
                      <div className=\"text-right ml-4\">
                        <Badge 
                          variant={slackTask.task?.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {slackTask.task?.status}
                        </Badge>
                        <p className=\"text-xs text-gray-500 mt-1\">
                          {new Date(slackTask.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Workspace Button */}
      {workspaces.length > 0 && (
        <div className=\"text-center\">
          <Button onClick={handleConnectSlack} disabled={isConnecting} variant=\"outline\">
            {isConnecting ? (
              <>
                <Bot className=\"h-4 w-4 mr-2 animate-pulse\" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className=\"h-4 w-4 mr-2\" />
                Connect Another Workspace
              </>
            )}
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <SlackChannelManager
        open={showChannelManager}
        onOpenChange={setShowChannelManager}
        workspaceId={selectedWorkspace}
      />
      
      <SlackSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        workspaces={workspaces}
      />
    </div>
  );
}