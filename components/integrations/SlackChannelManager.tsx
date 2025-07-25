// Epic 8, Story 8.2: Slack Channel Manager Component

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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Hash,
  Users,
  Lock,
  Search,
  Settings,
  Bot,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { slackService } from '@/lib/services/slackService';
import type { SlackChannel } from '@/lib/types/slack';

interface SlackChannelManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
}

export function SlackChannelManager({
  open,
  onOpenChange,
  workspaceId,
}: SlackChannelManagerProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && workspaceId) {
      loadChannels();
    }
  }, [open, workspaceId]);

  const loadChannels = async () => {
    if (!workspaceId) return;
    
    try {
      setIsLoading(true);
      const data = await slackService.getChannels(workspaceId);
      setChannels(data);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Slack channels.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBotToggle = async (channel: SlackChannel, shouldAdd: boolean) => {
    try {
      // In a real implementation, this would call Slack API to add/remove bot
      // For now, we'll update the local state
      setChannels(prev => 
        prev.map(c => 
          c.id === channel.id 
            ? { ...c, is_bot_member: shouldAdd }
            : c
        )
      );
      
      toast({
        title: shouldAdd ? 'Bot Added' : 'Bot Removed',
        description: `TaskQuest bot ${shouldAdd ? 'added to' : 'removed from'} #${channel.channel_name}`,
      });
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bot membership.',
        variant: 'destructive',
      });
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.channel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (!channel.is_archived && searchTerm === '') // Show active channels by default
  );

  const activeChannels = channels.filter(c => c.is_bot_member && !c.is_archived);
  const totalChannels = channels.filter(c => !c.is_archived).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"max-w-2xl max-h-[80vh]\">
        <DialogHeader>
          <DialogTitle className=\"flex items-center gap-2\">
            <Hash className=\"h-5 w-5\" />
            Manage Slack Channels
          </DialogTitle>
          <DialogDescription>
            Configure which channels the TaskQuest bot has access to.
          </DialogDescription>
        </DialogHeader>

        <div className=\"space-y-4\">
          {/* Stats */}
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-4 text-sm\">
              <span className=\"flex items-center gap-1\">
                <Bot className=\"h-4 w-4 text-green-500\" />
                {activeChannels.length} active
              </span>
              <span className=\"flex items-center gap-1\">
                <Hash className=\"h-4 w-4 text-gray-500\" />
                {totalChannels} total
              </span>
            </div>
          </div>

          {/* Search */}
          <div className=\"relative\">
            <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400\" />
            <Input
              placeholder=\"Search channels...\"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=\"pl-10\"
            />
          </div>

          {/* Channel List */}
          <ScrollArea className=\"h-80 border rounded-lg\">
            {isLoading ? (
              <div className=\"p-8 text-center\">
                <MessageSquare className=\"h-8 w-8 animate-pulse mx-auto mb-2 text-gray-400\" />
                <p className=\"text-gray-500\">Loading channels...</p>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className=\"p-8 text-center\">
                <Hash className=\"h-8 w-8 mx-auto mb-2 text-gray-400\" />
                <p className=\"text-gray-500\">
                  {searchTerm ? 'No channels found' : 'No channels available'}
                </p>
              </div>
            ) : (
              <div className=\"divide-y divide-gray-200 dark:divide-gray-700\">
                {filteredChannels.map((channel) => (
                  <div 
                    key={channel.id} 
                    className=\"p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors\"
                  >
                    <div className=\"flex items-center justify-between\">
                      <div className=\"flex items-center gap-3 flex-1 min-w-0\">
                        <div className=\"flex items-center gap-2\">
                          {channel.is_private ? (
                            <Lock className=\"h-4 w-4 text-gray-500\" />
                          ) : (
                            <Hash className=\"h-4 w-4 text-gray-500\" />
                          )}
                          <span className=\"font-medium truncate\">
                            {channel.channel_name}
                          </span>
                        </div>
                        
                        <div className=\"flex items-center gap-2\">
                          {channel.is_archived && (
                            <Badge variant=\"secondary\" className=\"text-xs\">
                              Archived
                            </Badge>
                          )}
                          {channel.is_private && (
                            <Badge variant=\"outline\" className=\"text-xs\">
                              Private
                            </Badge>
                          )}
                          {channel.is_bot_member && (
                            <Badge variant=\"secondary\" className=\"text-xs bg-green-100 text-green-800\">
                              <Bot className=\"h-3 w-3 mr-1\" />
                              Bot Added
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className=\"flex items-center gap-2\">
                        {!channel.is_archived && (
                          <Switch
                            checked={channel.is_bot_member}
                            onCheckedChange={(checked) => handleBotToggle(channel, checked)}
                            disabled={channel.is_archived}
                          />
                        )}
                        
                        {channel.is_bot_member && (
                          <Button
                            size=\"sm\"
                            variant=\"ghost\"
                            onClick={() => {
                              setSelectedChannel(channel.id);
                              setShowSettings(true);
                            }}
                          >
                            <Settings className=\"h-4 w-4\" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Channel Settings Preview */}
                    {channel.is_bot_member && (
                      <div className=\"mt-2 ml-6 text-xs text-gray-600 dark:text-gray-400\">
                        <div className=\"flex items-center gap-4\">
                          <span className=\"flex items-center gap-1\">
                            <Zap className=\"h-3 w-3\" />
                            {channel.settings?.auto_task_creation ? 'Auto-create' : 'Manual only'}
                          </span>
                          <span className=\"flex items-center gap-1\">
                            <MessageSquare className=\"h-3 w-3\" />
                            {channel.settings?.thread_replies ? 'Thread replies' : 'No threads'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Quick Actions */}
          {activeChannels.length > 0 && (
            <div className=\"bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3\">
              <div className=\"flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2\">
                <Bot className=\"h-4 w-4\" />
                <span className=\"text-sm font-medium\">Bot Configuration</span>
              </div>
              <div className=\"text-sm text-blue-700 dark:text-blue-300 space-y-1\">
                <p>• Use <code>/task [title]</code> to create tasks</p>
                <p>• React with 📝 or ⚡ to convert messages to tasks</p>
                <p>• Bot will respond with confirmations and links</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          {activeChannels.length === 0 && (
            <div className=\"bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3\">
              <div className=\"flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2\">
                <Bot className=\"h-4 w-4\" />
                <span className=\"text-sm font-medium\">Getting Started</span>
              </div>
              <div className=\"text-sm text-yellow-700 dark:text-yellow-300 space-y-1\">
                <p>1. Toggle the switch to add the TaskQuest bot to channels</p>
                <p>2. The bot will need to be invited manually for private channels</p>
                <p>3. Once added, team members can use slash commands and emoji reactions</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className=\"flex gap-2 pt-4\">
            <Button onClick={() => onOpenChange(false)} className=\"flex-1\">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}