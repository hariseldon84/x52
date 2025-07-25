// Epic 8, Story 8.2: Slack Integration Types

export interface SlackWorkspace {
  id: string;
  team_id: string;
  team_name: string;
  team_domain?: string;
  bot_user_id?: string;
  bot_access_token: string;
  user_access_token?: string;
  scope?: string;
  is_active: boolean;
  installed_at: string;
  updated_at: string;
  channels?: SlackChannel[];
}

export interface SlackUserConnection {
  id: string;
  user_id: string;
  workspace_id: string;
  slack_user_id: string;
  slack_username?: string;
  slack_email?: string;
  access_token?: string;
  is_active: boolean;
  notification_settings: SlackNotificationSettings;
  created_at: string;
  updated_at: string;
  workspace?: SlackWorkspace;
}

export interface SlackChannel {
  id: string;
  workspace_id: string;
  channel_id: string;
  channel_name: string;
  is_private: boolean;
  is_archived: boolean;
  is_bot_member: boolean;
  settings: SlackChannelSettings;
  created_at: string;
  updated_at: string;
}

export interface SlackTask {
  id: string;
  task_id: string;
  workspace_id: string;
  channel_id: string;
  message_ts: string;
  thread_ts?: string;
  creator_slack_id: string;
  assignee_slack_id?: string;
  message_text?: string;
  message_permalink?: string;
  creation_method: 'slash_command' | 'emoji_reaction' | 'message_action';
  created_at: string;
  task?: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    complexity: string;
    due_date?: string;
    completed_at?: string;
  };
  workspace?: {
    team_name: string;
    team_domain?: string;
  };
}

export interface SlackSlashCommand {
  id: string;
  workspace_id: string;
  command: string;
  description?: string;
  usage_hint?: string;
  is_enabled: boolean;
  settings: SlackCommandSettings;
  created_at: string;
}

export interface SlackEmojiTrigger {
  id: string;
  workspace_id: string;
  emoji_name: string;
  action: string;
  is_enabled: boolean;
  settings: SlackEmojiSettings;
  created_at: string;
}

export interface SlackNotificationTemplate {
  id: string;
  workspace_id: string;
  template_type: 'task_created' | 'task_completed' | 'task_reminder' | 'daily_summary';
  template_name: string;
  message_template: SlackBlockKit;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackInteractionLog {
  id: string;
  workspace_id: string;
  interaction_type: 'slash_command' | 'emoji_reaction' | 'button_click' | 'message_action';
  user_slack_id: string;
  channel_id?: string;
  payload?: any;
  response_status: 'success' | 'error' | 'ignored';
  error_message?: string;
  created_at: string;
}

export interface SlackNotificationSettings {
  task_reminders: boolean;
  daily_summary: boolean;
  task_completions: boolean;
  team_updates: boolean;
  summary_time: string; // HH:MM format
  reminder_frequency: 'immediate' | 'hourly' | 'daily';
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export interface SlackChannelSettings {
  auto_task_creation: boolean;
  emoji_triggers: string[];
  notification_types: string[];
  thread_replies: boolean;
  user_mentions: boolean;
}

export interface SlackCommandSettings {
  default_priority: 'low' | 'medium' | 'high' | 'urgent';
  default_complexity: 'simple' | 'medium' | 'complex';
  auto_assign: boolean;
  require_confirmation: boolean;
  include_metadata: boolean;
}

export interface SlackEmojiSettings {
  auto_assign_creator: boolean;
  include_message_context: boolean;
  create_in_thread: boolean;
  notify_creator: boolean;
}

export interface SlackBlockKit {
  blocks: SlackBlock[];
  text?: string;
  response_type?: 'ephemeral' | 'in_channel';
}

export interface SlackBlock {
  type: 'section' | 'header' | 'divider' | 'context' | 'actions' | 'input';
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  accessory?: SlackElement;
  elements?: SlackElement[];
  block_id?: string;
}

export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackElement {
  type: 'button' | 'static_select' | 'overflow' | 'datepicker' | 'timepicker';
  text?: SlackTextObject;
  value?: string;
  url?: string;
  action_id?: string;
  options?: SlackOption[];
}

export interface SlackOption {
  text: SlackTextObject;
  value: string;
  description?: SlackTextObject;
}

export interface SlackEventPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  event: {
    type: string;
    user: string;
    item: {
      type: string;
      channel: string;
      ts: string;
    };
    reaction: string;
    event_ts: string;
  };
  type: 'event_callback';
  event_id: string;
  event_time: number;
}

export interface SlackSlashCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackInteractivePayload {
  type: 'block_actions' | 'view_submission' | 'shortcut';
  user: {
    id: string;
    name: string;
  };
  team: {
    id: string;
    domain: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  actions?: SlackAction[];
  view?: SlackView;
  trigger_id: string;
  response_url?: string;
}

export interface SlackAction {
  type: string;
  action_id: string;
  block_id: string;
  text: SlackTextObject;
  value?: string;
  selected_option?: SlackOption;
  action_ts: string;
}

export interface SlackView {
  id: string;
  team_id: string;
  type: 'modal' | 'home';
  title: SlackTextObject;
  blocks: SlackBlock[];
  private_metadata?: string;
  callback_id?: string;
  state?: {
    values: Record<string, Record<string, any>>;
  };
}

export interface SlackApp {
  id: string;
  name: string;
  description: string;
  scopes: SlackScope[];
  oauth_config: SlackOAuthConfig;
  event_subscriptions: SlackEventSubscription[];
  slash_commands: SlackSlashCommandConfig[];
  interactive_components: boolean;
}

export interface SlackScope {
  name: string;
  description: string;
  is_sensitive: boolean;
}

export interface SlackOAuthConfig {
  redirect_urls: string[];
  scopes: {
    bot: string[];
    user: string[];
  };
}

export interface SlackEventSubscription {
  type: string;
  description: string;
}

export interface SlackSlashCommandConfig {
  command: string;
  url: string;
  description: string;
  usage_hint: string;
  should_escape: boolean;
}

export interface SlackIntegrationStats {
  connected_workspaces: number;
  active_channels: number;
  tasks_created: number;
  interactions_today: number;
  most_used_command: string;
  most_active_channel: string;
}

export interface SlackTaskCreationRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  complexity?: 'simple' | 'medium' | 'complex';
  due_date?: string;
  assignee_slack_id?: string;
  channel_id: string;
  thread_ts?: string;
}

export interface SlackBotInfo {
  id: string;
  app_id: string;
  user_id: string;
  name: string;
  icons: {
    image_36: string;
    image_48: string;
    image_72: string;
  };
}

export interface SlackManifest {
  display_information: {
    name: string;
    description: string;
    background_color: string;
    long_description: string;
  };
  features: {
    bot_user: {
      display_name: string;
      always_online: boolean;
    };
    slash_commands: SlackSlashCommandConfig[];
  };
  oauth_config: SlackOAuthConfig;
  settings: {
    event_subscriptions: {
      request_url: string;
      bot_events: string[];
    };
    interactivity: {
      is_enabled: boolean;
      request_url: string;
    };
    org_deploy_enabled: boolean;
    socket_mode_enabled: boolean;
    token_rotation_enabled: boolean;
  };
}