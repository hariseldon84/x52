// Epic 8, Story 8.2: Slack Integration Service

import { supabase } from '@/lib/supabase';
import type { 
  SlackWorkspace,
  SlackUserConnection,
  SlackChannel,
  SlackTask,
  SlackInteractionLog,
  SlackNotificationTemplate
} from '@/lib/types/slack';

export class SlackService {
  private readonly SLACK_API_BASE = 'https://slack.com/api';

  /**
   * Get user's Slack workspaces
   */
  async getWorkspaces(): Promise<SlackWorkspace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('slack_user_connections')
      .select(`
        workspace:slack_workspaces!slack_user_connections_workspace_id_fkey(
          *,
          channels:slack_channels(*)
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;
    return data?.map(item => item.workspace).filter(Boolean) || [];
  }

  /**
   * Connect Slack workspace
   */
  async connectWorkspace(code: string): Promise<SlackUserConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Exchange code for tokens
    const tokenResponse = await this.exchangeOAuthCode(code);
    
    // Get workspace info
    const teamInfo = await this.getTeamInfo(tokenResponse.access_token);
    const userInfo = await this.getUserInfo(tokenResponse.access_token);

    // Create or update workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('slack_workspaces')
      .upsert([{
        team_id: teamInfo.team.id,
        team_name: teamInfo.team.name,
        team_domain: teamInfo.team.domain,
        bot_user_id: tokenResponse.bot_user_id,
        bot_access_token: tokenResponse.access_token,
        scope: tokenResponse.scope,
      }], { onConflict: 'team_id' })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    // Create user connection
    const { data: connection, error: connectionError } = await supabase
      .from('slack_user_connections')
      .upsert([{
        user_id: user.id,
        workspace_id: workspace.id,
        slack_user_id: userInfo.user.id,
        slack_username: userInfo.user.name,
        slack_email: userInfo.user.profile?.email,
        access_token: tokenResponse.authed_user?.access_token,
      }], { onConflict: 'user_id,workspace_id' })
      .select()
      .single();

    if (connectionError) throw connectionError;

    // Sync channels
    await this.syncChannels(workspace.id, tokenResponse.access_token);

    return connection;
  }

  /**
   * Disconnect Slack workspace
   */
  async disconnectWorkspace(workspaceId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('slack_user_connections')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get Slack channels for workspace
   */
  async getChannels(workspaceId: string): Promise<SlackChannel[]> {
    const { data, error } = await supabase
      .from('slack_channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .order('channel_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Create task from Slack message
   */
  async createTaskFromMessage(
    workspaceId: string,
    channelId: string,
    messageTs: string,
    messageText: string,
    creatorSlackId: string,
    creationMethod: 'slash_command' | 'emoji_reaction' | 'message_action',
    assigneeSlackId?: string,
    threadTs?: string,
    messagePermalink?: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call database function to create task
    const { data, error } = await supabase.rpc('create_task_from_slack_message', {
      p_user_id: user.id,
      p_workspace_id: workspaceId,
      p_channel_id: channelId,
      p_message_ts: messageTs,
      p_message_text: messageText,
      p_creator_slack_id: creatorSlackId,
      p_creation_method: creationMethod,
      p_assignee_slack_id: assigneeSlackId,
      p_thread_ts: threadTs,
      p_message_permalink: messagePermalink,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get tasks created from Slack
   */
  async getSlackTasks(workspaceId?: string): Promise<SlackTask[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('slack_tasks')
      .select(`
        *,
        task:tasks!slack_tasks_task_id_fkey(*),
        workspace:slack_workspaces!slack_tasks_workspace_id_fkey(team_name, team_domain)
      `)
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Send task notification to Slack
   */
  async sendTaskNotification(
    taskId: string,
    workspaceId: string,
    channelId: string,
    notificationType: 'created' | 'completed' | 'reminder'
  ): Promise<void> {
    // Get workspace and task info
    const [workspace, task] = await Promise.all([
      this.getWorkspaceById(workspaceId),
      this.getTaskById(taskId),
    ]);

    if (!workspace || !task) {
      throw new Error('Workspace or task not found');
    }

    // Format message
    const message = await this.formatTaskMessage(task, notificationType);

    // Send to Slack
    await this.sendSlackMessage(
      workspace.bot_access_token,
      channelId,
      message
    );
  }

  /**
   * Handle Slack slash command
   */
  async handleSlashCommand(payload: any): Promise<any> {
    const { team_id, channel_id, user_id, text, command, response_url } = payload;

    try {
      // Log interaction
      await this.logInteraction(
        team_id,
        'slash_command',
        user_id,
        channel_id,
        payload
      );

      // Get workspace and user
      const workspace = await this.getWorkspaceByTeamId(team_id);
      if (!workspace) {
        return {
          response_type: 'ephemeral',
          text: 'TaskQuest is not installed in this workspace.',
        };
      }

      const userId = await this.getUserBySlackId(user_id, workspace.id);
      if (!userId) {
        return {
          response_type: 'ephemeral',
          text: 'Please connect your TaskQuest account first.',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Connect your TaskQuest account to start creating tasks from Slack.',
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Connect Account',
                },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack/connect?team=${team_id}`,
              },
            },
          ],
        };
      }

      // Parse command
      const taskTitle = text.trim();
      if (!taskTitle) {
        return {
          response_type: 'ephemeral',
          text: 'Please provide a task title. Example: `/task Review quarterly reports`',
        };
      }

      // Create task
      const taskId = await this.createTaskFromMessage(
        workspace.id,
        channel_id,
        Date.now().toString(),
        taskTitle,
        user_id,
        'slash_command'
      );

      return {
        response_type: 'in_channel',
        text: `Task created: ${taskTitle}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Task Created*\n${taskTitle}`,
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View in TaskQuest',
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}`,
            },
          },
        ],
      };
    } catch (error) {
      console.error('Slash command error:', error);
      
      await this.logInteraction(
        team_id,
        'slash_command',
        user_id,
        channel_id,
        payload,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        response_type: 'ephemeral',
        text: 'Sorry, there was an error creating your task. Please try again.',
      };
    }
  }

  /**
   * Handle emoji reaction for task creation
   */
  async handleEmojiReaction(payload: any): Promise<void> {
    const { team_id, user, reaction, item } = payload.event;
    
    if (item.type !== 'message') return;

    try {
      // Check if emoji is configured as trigger
      const workspace = await this.getWorkspaceByTeamId(team_id);
      if (!workspace) return;

      const { data: trigger } = await supabase
        .from('slack_emoji_triggers')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('emoji_name', reaction)
        .eq('is_enabled', true)
        .single();

      if (!trigger) return;

      // Get user
      const userId = await this.getUserBySlackId(user, workspace.id);
      if (!userId) return;

      // Get message content
      const messageInfo = await this.getMessageInfo(
        workspace.bot_access_token,
        item.channel,
        item.ts
      );

      if (!messageInfo) return;

      // Create task
      await this.createTaskFromMessage(
        workspace.id,
        item.channel,
        item.ts,
        messageInfo.text,
        user,
        'emoji_reaction',
        undefined,
        messageInfo.thread_ts,
        messageInfo.permalink
      );

      // React with confirmation
      await this.addReaction(
        workspace.bot_access_token,
        item.channel,
        item.ts,
        'white_check_mark'
      );

    } catch (error) {
      console.error('Emoji reaction error:', error);
      
      await this.logInteraction(
        team_id,
        'emoji_reaction',
        user,
        item.channel,
        payload,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get daily task summary for Slack
   */
  async getDailyTaskSummary(userId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .or(`created_at.gte.${today},completed_at.gte.${today},due_date.eq.${today}`);

    if (error) throw error;

    const completed = tasks?.filter(t => t.status === 'completed' && 
      t.completed_at?.startsWith(today)) || [];
    const dueTasks = tasks?.filter(t => t.due_date?.startsWith(today) && 
      t.status !== 'completed') || [];
    const created = tasks?.filter(t => t.created_at?.startsWith(today)) || [];

    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 Daily Task Summary',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tasks Completed:* ${completed.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Tasks Due Today:* ${dueTasks.length}`,
            },
            {
              type: 'mrkdwn',
              text: `*Tasks Created:* ${created.length}`,
            },
          ],
        },
        ...(dueTasks.length > 0 ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Due Today:*\n${dueTasks.slice(0, 5).map(t => `• ${t.title}`).join('\n')}`,
            },
          },
        ] : []),
      ],
    };
  }

  // Private helper methods
  private async exchangeOAuthCode(code: string): Promise<any> {
    const response = await fetch(`${this.SLACK_API_BASE}/oauth.v2.access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack/callback`,
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange Slack OAuth code');
    return response.json();
  }

  private async getTeamInfo(accessToken: string): Promise<any> {
    const response = await fetch(`${this.SLACK_API_BASE}/team.info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get Slack team info');
    return response.json();
  }

  private async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch(`${this.SLACK_API_BASE}/auth.test`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get Slack user info');
    return response.json();
  }

  private async syncChannels(workspaceId: string, accessToken: string): Promise<void> {
    const response = await fetch(`${this.SLACK_API_BASE}/conversations.list`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return;
    
    const data = await response.json();
    const channels = data.channels?.map((channel: any) => ({
      workspace_id: workspaceId,
      channel_id: channel.id,
      channel_name: channel.name,
      is_private: channel.is_private,
      is_archived: channel.is_archived,
      is_bot_member: channel.is_member,
    })) || [];

    if (channels.length > 0) {
      await supabase
        .from('slack_channels')
        .upsert(channels, { onConflict: 'workspace_id,channel_id' });
    }
  }

  private async getWorkspaceById(workspaceId: string): Promise<SlackWorkspace | null> {
    const { data, error } = await supabase
      .from('slack_workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) return null;
    return data;
  }

  private async getWorkspaceByTeamId(teamId: string): Promise<SlackWorkspace | null> {
    const { data, error } = await supabase
      .from('slack_workspaces')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error) return null;
    return data;
  }

  private async getTaskById(taskId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getUserBySlackId(slackUserId: string, workspaceId: string): Promise<string | null> {
    const { data } = await supabase.rpc('get_user_by_slack_id', {
      p_slack_user_id: slackUserId,
      p_workspace_id: workspaceId,
    });

    return data;
  }

  private async formatTaskMessage(task: any, type: string): Promise<any> {
    const { data } = await supabase.rpc('format_task_for_slack', {
      p_task_id: task.id,
    });

    return data;
  }

  private async sendSlackMessage(accessToken: string, channel: string, message: any): Promise<void> {
    await fetch(`${this.SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ...message,
      }),
    });
  }

  private async getMessageInfo(accessToken: string, channel: string, ts: string): Promise<any> {
    const response = await fetch(`${this.SLACK_API_BASE}/conversations.history?channel=${channel}&latest=${ts}&limit=1&inclusive=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.messages?.[0];
  }

  private async addReaction(accessToken: string, channel: string, timestamp: string, name: string): Promise<void> {
    await fetch(`${this.SLACK_API_BASE}/reactions.add`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        timestamp,
        name,
      }),
    });
  }

  private async logInteraction(
    teamId: string,
    type: string,
    userId: string,
    channelId: string,
    payload: any,
    status: string = 'success',
    errorMessage?: string
  ): Promise<void> {
    const workspace = await this.getWorkspaceByTeamId(teamId);
    if (!workspace) return;

    await supabase
      .from('slack_interaction_logs')
      .insert([{
        workspace_id: workspace.id,
        interaction_type: type,
        user_slack_id: userId,
        channel_id: channelId,
        payload,
        response_status: status,
        error_message: errorMessage,
      }]);
  }
}

export const slackService = new SlackService();