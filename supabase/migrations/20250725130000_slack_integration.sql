-- Epic 8, Story 8.2: Slack Integration Schema

-- Slack workspace connections
CREATE TABLE slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id VARCHAR(50) NOT NULL UNIQUE, -- Slack team ID
  team_name VARCHAR(255) NOT NULL,
  team_domain VARCHAR(255),
  bot_user_id VARCHAR(50), -- Bot user ID in workspace
  bot_access_token TEXT NOT NULL,
  user_access_token TEXT,
  scope TEXT, -- Granted permissions
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(team_id)
);

-- User Slack connections
CREATE TABLE slack_user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  slack_user_id VARCHAR(50) NOT NULL,
  slack_username VARCHAR(255),
  slack_email VARCHAR(255),
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, workspace_id),
  INDEX(slack_user_id),
  INDEX(user_id)
);

-- Slack channels where bot is installed
CREATE TABLE slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_bot_member BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}', -- Channel-specific settings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(workspace_id, channel_id),
  INDEX(channel_id)
);

-- Tasks created from Slack messages
CREATE TABLE slack_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  channel_id VARCHAR(50) NOT NULL,
  message_ts VARCHAR(50) NOT NULL, -- Slack message timestamp
  thread_ts VARCHAR(50), -- Thread timestamp if in thread
  creator_slack_id VARCHAR(50) NOT NULL,
  assignee_slack_id VARCHAR(50), -- If assigned to team member
  message_text TEXT,
  message_permalink TEXT,
  creation_method VARCHAR(50) NOT NULL, -- 'slash_command', 'emoji_reaction', 'message_action'
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(workspace_id, channel_id, message_ts),
  INDEX(task_id),
  INDEX(workspace_id, channel_id)
);

-- Slack slash command configurations
CREATE TABLE slack_slash_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  command VARCHAR(100) NOT NULL, -- e.g., '/task', '/todo'
  description TEXT,
  usage_hint TEXT,
  is_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(workspace_id, command)
);

-- Slack emoji reactions for task creation
CREATE TABLE slack_emoji_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  emoji_name VARCHAR(100) NOT NULL, -- e.g., 'task', 'todo', 'action_item'
  action VARCHAR(50) NOT NULL DEFAULT 'create_task',
  is_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(workspace_id, emoji_name)
);

-- Slack notification templates
CREATE TABLE slack_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- 'task_created', 'task_completed', 'task_reminder', 'daily_summary'
  template_name VARCHAR(255) NOT NULL,
  message_template JSONB NOT NULL, -- Slack Block Kit format
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(workspace_id, template_type)
);

-- Slack bot interaction logs
CREATE TABLE slack_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'slash_command', 'emoji_reaction', 'button_click', 'message_action'
  user_slack_id VARCHAR(50) NOT NULL,
  channel_id VARCHAR(50),
  payload JSONB, -- Full interaction payload
  response_status VARCHAR(20), -- 'success', 'error', 'ignored'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(workspace_id, created_at),
  INDEX(interaction_type)
);

-- Create indexes for performance
CREATE INDEX idx_slack_workspaces_team_id ON slack_workspaces(team_id);
CREATE INDEX idx_slack_user_connections_user_id ON slack_user_connections(user_id);
CREATE INDEX idx_slack_tasks_task_id ON slack_tasks(task_id);
CREATE INDEX idx_slack_tasks_workspace_channel ON slack_tasks(workspace_id, channel_id);

-- Enable RLS
ALTER TABLE slack_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_slash_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_emoji_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_interaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access workspaces they're connected to" ON slack_workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage their own Slack connections" ON slack_user_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access channels from their workspaces" ON slack_channels
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can access Slack tasks from their workspaces" ON slack_tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can access slash commands from their workspaces" ON slack_slash_commands
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can access emoji triggers from their workspaces" ON slack_emoji_triggers
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can access notification templates from their workspaces" ON slack_notification_templates
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view interaction logs from their workspaces" ON slack_interaction_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM slack_user_connections 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Function to create task from Slack message
CREATE OR REPLACE FUNCTION create_task_from_slack_message(
  p_user_id UUID,
  p_workspace_id UUID,
  p_channel_id VARCHAR(50),
  p_message_ts VARCHAR(50),
  p_message_text TEXT,
  p_creator_slack_id VARCHAR(50),
  p_creation_method VARCHAR(50),
  p_assignee_slack_id VARCHAR(50) DEFAULT NULL,
  p_thread_ts VARCHAR(50) DEFAULT NULL,
  p_message_permalink TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_task_title VARCHAR(500);
  v_task_description TEXT;
BEGIN
  -- Extract title and description from message
  v_task_title := CASE 
    WHEN length(p_message_text) > 100 THEN 
      substring(p_message_text from 1 for 97) || '...'
    ELSE 
      p_message_text
  END;
  
  v_task_description := 'Task created from Slack message' || 
    CASE WHEN p_message_permalink IS NOT NULL THEN 
      E'\n\nOriginal message: ' || p_message_permalink 
    ELSE '' END ||
    CASE WHEN p_thread_ts IS NOT NULL THEN 
      E'\n\nFrom thread: ' || p_thread_ts 
    ELSE '' END ||
    E'\n\nMessage: ' || p_message_text;

  -- Create the task
  INSERT INTO tasks (
    user_id,
    title,
    description,
    priority,
    complexity,
    status,
    tags
  ) VALUES (
    p_user_id,
    v_task_title,
    v_task_description,
    'medium',
    'medium',
    'todo',
    ARRAY['slack-import']
  ) RETURNING id INTO v_task_id;

  -- Create slack task record
  INSERT INTO slack_tasks (
    task_id,
    workspace_id,
    channel_id,
    message_ts,
    thread_ts,
    creator_slack_id,
    assignee_slack_id,
    message_text,
    message_permalink,
    creation_method
  ) VALUES (
    v_task_id,
    p_workspace_id,
    p_channel_id,
    p_message_ts,
    p_thread_ts,
    p_creator_slack_id,
    p_assignee_slack_id,
    p_message_text,
    p_message_permalink,
    p_creation_method
  );

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user by Slack ID
CREATE OR REPLACE FUNCTION get_user_by_slack_id(
  p_slack_user_id VARCHAR(50),
  p_workspace_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM slack_user_connections
  WHERE slack_user_id = p_slack_user_id
    AND workspace_id = p_workspace_id
    AND is_active = true;
    
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to format task for Slack notification
CREATE OR REPLACE FUNCTION format_task_for_slack(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_slack_message JSONB;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  v_slack_message := jsonb_build_object(
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'type', 'section',
        'text', jsonb_build_object(
          'type', 'mrkdwn',
          'text', format('*%s*\n%s', v_task.title, COALESCE(v_task.description, ''))
        )
      ),
      jsonb_build_object(
        'type', 'context',
        'elements', jsonb_build_array(
          jsonb_build_object(
            'type', 'mrkdwn',
            'text', format('Priority: %s | Complexity: %s | Status: %s', 
              v_task.priority, v_task.complexity, v_task.status)
          )
        )
      )
    )
  );
  
  RETURN v_slack_message;
END;
$$ LANGUAGE plpgsql;