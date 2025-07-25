// Epic 8, Story 8.2: Slack Workspace Card Component

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare,
  Users,
  Hash,
  Settings,
  Unplug,
  ExternalLink,
  Bot,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SlackWorkspace } from '@/lib/types/slack';

interface SlackWorkspaceCardProps {
  workspace: SlackWorkspace;
  onDisconnect: (workspaceId: string) => void;
  onManageChannels: () => void;
}

export function SlackWorkspaceCard({
  workspace,
  onDisconnect,
  onManageChannels,
}: SlackWorkspaceCardProps) {
  const activeChannels = workspace.channels?.filter(c => c.is_bot_member && !c.is_archived) || [];
  const totalChannels = workspace.channels?.length || 0;
  
  const isHealthy = workspace.is_active && activeChannels.length > 0;

  return (
    <Card className={`${!workspace.is_active ? 'opacity-50' : ''}`}>
      <CardHeader>
        <div className=\"flex items-center justify-between\">
          <div className=\"flex items-center gap-3\">
            <div className=\"w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl font-bold\">
              {workspace.team_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className=\"text-lg\">{workspace.team_name}</CardTitle>
              <p className=\"text-sm text-gray-600 dark:text-gray-400\">
                {workspace.team_domain ? `${workspace.team_domain}.slack.com` : 'Slack Workspace'}
              </p>
            </div>
          </div>
          
          <div className=\"flex items-center gap-2\">
            {isHealthy ? (
              <Badge variant=\"secondary\" className=\"bg-green-100 text-green-800\">
                <CheckCircle className=\"h-3 w-3 mr-1\" />
                Active
              </Badge>
            ) : (
              <Badge variant=\"secondary\" className=\"bg-yellow-100 text-yellow-800\">
                <AlertTriangle className=\"h-3 w-3 mr-1\" />
                Needs Setup
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className=\"space-y-4\">
        {/* Channel Stats */}
        <div className=\"grid grid-cols-3 gap-4 text-sm\">
          <div className=\"flex items-center gap-2\">
            <Hash className=\"h-4 w-4 text-gray-500\" />
            <span>
              {activeChannels.length} active channels
            </span>
          </div>
          
          <div className=\"flex items-center gap-2\">
            <Bot className=\"h-4 w-4 text-gray-500\" />
            <span>
              Bot installed
            </span>
          </div>
          
          <div className=\"flex items-center gap-2\">
            <Users className=\"h-4 w-4 text-gray-500\" />
            <span>
              Team workspace
            </span>
          </div>
        </div>

        {/* Active Channels Preview */}
        {activeChannels.length > 0 && (
          <div>
            <h4 className=\"text-sm font-medium mb-2\">Active Channels:</h4>
            <div className=\"flex flex-wrap gap-1\">
              {activeChannels.slice(0, 5).map((channel) => (
                <Badge key={channel.id} variant=\"outline\" className=\"text-xs\">
                  #{channel.channel_name}
                </Badge>
              ))}
              {activeChannels.length > 5 && (
                <Badge variant=\"outline\" className=\"text-xs\">
                  +{activeChannels.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Bot Configuration */}
        <div className=\"bg-gray-50 dark:bg-gray-800 rounded-lg p-3\">
          <div className=\"grid grid-cols-2 gap-2 text-xs\">
            <div>
              <span className=\"text-gray-500\">Bot User:</span>
              <span className=\"ml-1 font-medium\">
                {workspace.bot_user_id ? 'Configured' : 'Not set'}
              </span>
            </div>
            <div>
              <span className=\"text-gray-500\">Permissions:</span>
              <span className=\"ml-1 font-medium\">
                {workspace.scope ? 'Granted' : 'Pending'}
              </span>
            </div>
            <div>
              <span className=\"text-gray-500\">Installed:</span>
              <span className=\"ml-1 font-medium\">
                {formatDistanceToNow(new Date(workspace.installed_at), { addSuffix: true })}
              </span>
            </div>
            <div>
              <span className=\"text-gray-500\">Status:</span>
              <span className=\"ml-1 font-medium\">
                {workspace.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Available Commands */}
        <div>
          <h4 className=\"text-sm font-medium mb-2\">Available Commands:</h4>
          <div className=\"space-y-1 text-xs\">
            <div className=\"flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded\">
              <code>/task [title]</code>
              <span className=\"text-gray-500\">Create new task</span>
            </div>
            <div className=\"flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded\">
              <code>📝 :task:</code>
              <span className=\"text-gray-500\">React to create task</span>
            </div>
            <div className=\"flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded\">
              <code>⚡ :action_item:</code>
              <span className=\"text-gray-500\">Mark action item</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className=\"flex flex-wrap gap-2 pt-2\">
          <Button
            onClick={onManageChannels}
            disabled={!workspace.is_active}
            size=\"sm\"
            variant=\"outline\"
          >
            <Hash className=\"h-4 w-4 mr-2\" />
            Manage Channels
          </Button>
          
          <Button
            onClick={() => window.open(`https://${workspace.team_domain}.slack.com`, '_blank')}
            size=\"sm\"
            variant=\"outline\"
          >
            <ExternalLink className=\"h-4 w-4 mr-2\" />
            Open Slack
          </Button>
          
          <Button
            onClick={() => onDisconnect(workspace.id)}
            size=\"sm\"
            variant=\"outline\"
            className=\"text-red-600 border-red-200 hover:bg-red-50\"
          >
            <Unplug className=\"h-4 w-4 mr-2\" />
            Disconnect
          </Button>
        </div>

        {/* Setup Warning */}
        {!isHealthy && workspace.is_active && (
          <div className=\"bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3\">
            <div className=\"flex items-center gap-2 text-yellow-800 dark:text-yellow-200\">
              <AlertTriangle className=\"h-4 w-4\" />
              <p className=\"text-sm font-medium\">Setup Required</p>
            </div>
            <p className=\"text-sm text-yellow-600 dark:text-yellow-300 mt-1\">
              The TaskQuest bot needs to be added to channels to start creating tasks.
              Click \"Manage Channels\" to configure.
            </p>
          </div>
        )}

        {/* Inactive Warning */}
        {!workspace.is_active && (
          <div className=\"bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3\">
            <div className=\"flex items-center gap-2 text-red-800 dark:text-red-200\">
              <AlertTriangle className=\"h-4 w-4\" />
              <p className=\"text-sm font-medium\">Workspace Disconnected</p>
            </div>
            <p className=\"text-sm text-red-600 dark:text-red-300 mt-1\">
              This workspace has been disconnected and is no longer syncing with TaskQuest.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}