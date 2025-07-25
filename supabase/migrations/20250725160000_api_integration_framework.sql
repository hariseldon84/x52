-- Epic 8, Story 8.5: Third-Party API Integration Framework Schema

-- API integration definitions (templates for common integrations)
CREATE TABLE api_integration_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'productivity', 'communication', 'development', 'marketing', etc.
  icon_url TEXT,
  documentation_url TEXT,
  
  -- Authentication configuration
  auth_type VARCHAR(50) NOT NULL, -- 'oauth2', 'api_key', 'basic_auth', 'bearer_token'
  auth_config JSONB NOT NULL, -- Template for auth configuration
  
  -- API configuration
  base_url VARCHAR(500) NOT NULL,
  api_version VARCHAR(50),
  rate_limit_config JSONB,
  
  -- Integration capabilities
  supported_actions TEXT[] NOT NULL, -- ['read_tasks', 'create_tasks', 'sync_data', 'webhook_events']
  webhook_events TEXT[], -- Events this integration can send
  
  -- Configuration schema for instances
  config_schema JSONB NOT NULL, -- JSON schema for user configuration
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Officially verified integrations
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(category),
  INDEX(auth_type)
);

-- User API integration instances
CREATE TABLE api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES api_integration_templates(id) ON DELETE CASCADE,
  
  -- User-specific configuration
  name VARCHAR(255) NOT NULL, -- User-defined name for this integration
  description TEXT,
  
  -- Authentication data
  auth_data JSONB NOT NULL, -- Encrypted auth tokens/keys
  auth_expires_at TIMESTAMPTZ,
  
  -- Configuration
  config JSONB DEFAULT '{}', -- User-specific configuration
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency_minutes INTEGER DEFAULT 60, -- How often to sync (0 = manual only)
  
  -- Status tracking
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, template_id, name),
  INDEX(user_id, template_id),
  INDEX(last_sync_at)
);

-- API integration actions/workflows
CREATE TABLE api_integration_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES api_integrations(id) ON DELETE CASCADE,
  
  -- Action configuration
  action_name VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- 'sync', 'webhook', 'scheduled', 'manual'
  description TEXT,
  
  -- Trigger configuration
  trigger_config JSONB NOT NULL, -- When this action should run
  
  -- Action configuration
  action_config JSONB NOT NULL, -- What this action should do
  
  -- Mapping configuration (how to transform data)
  field_mappings JSONB DEFAULT '{}', -- Map external fields to TaskQuest fields
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(integration_id, action_type),
  INDEX(last_executed_at)
);

-- API call logs
CREATE TABLE api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES api_integrations(id) ON DELETE CASCADE,
  action_id UUID REFERENCES api_integration_actions(id) ON DELETE SET NULL,
  
  -- Request details
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, etc.
  url TEXT NOT NULL,
  headers JSONB,
  request_body JSONB,
  
  -- Response details
  status_code INTEGER,
  response_headers JSONB,
  response_body JSONB,
  response_time_ms INTEGER,
  
  -- Processing results
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- Data transformation results
  records_processed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  tasks_updated INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(integration_id, created_at),
  INDEX(success, created_at)
);

-- Webhook endpoints for integrations
CREATE TABLE api_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES api_integrations(id) ON DELETE CASCADE,
  
  -- Webhook configuration
  webhook_url VARCHAR(255) UNIQUE NOT NULL, -- Our generated webhook URL
  secret_key VARCHAR(255) NOT NULL, -- For webhook verification
  
  -- Event configuration
  event_types TEXT[] NOT NULL, -- Which events this webhook handles
  
  -- Processing configuration
  processor_config JSONB NOT NULL, -- How to process incoming webhooks
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_received_at TIMESTAMPTZ,
  total_received INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(integration_id),
  INDEX(webhook_url)
);

-- Webhook events received
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES api_webhooks(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES api_integrations(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(255) NOT NULL,
  event_id VARCHAR(255), -- External event ID if provided
  
  -- Raw webhook data
  headers JSONB NOT NULL,
  payload JSONB NOT NULL,
  
  -- Processing status
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'ignored'
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  
  -- Results
  tasks_created INTEGER DEFAULT 0,
  tasks_updated INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(webhook_id, created_at),
  INDEX(integration_id, processing_status),
  INDEX(event_type, created_at)
);

-- Data sync mappings (for bi-directional sync)
CREATE TABLE sync_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES api_integrations(id) ON DELETE CASCADE,
  
  -- Local record
  local_table VARCHAR(100) NOT NULL, -- 'tasks', 'projects', 'categories', etc.
  local_record_id UUID NOT NULL,
  
  -- External record
  external_id VARCHAR(255) NOT NULL,
  external_type VARCHAR(100), -- Additional context for external record type
  
  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- 'import', 'export', 'bidirectional'
  
  -- Conflict resolution
  local_version INTEGER DEFAULT 1,
  external_version VARCHAR(100), -- External systems may use different versioning
  last_conflict_at TIMESTAMPTZ,
  conflict_resolution VARCHAR(50), -- 'local_wins', 'external_wins', 'merge', 'manual'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(integration_id, local_table, local_record_id),
  UNIQUE(integration_id, external_id, external_type),
  INDEX(integration_id, local_table),
  INDEX(last_synced_at)
);

-- Create indexes for performance
CREATE INDEX idx_api_integration_templates_category ON api_integration_templates(category);
CREATE INDEX idx_api_integrations_user_active ON api_integrations(user_id, is_active);
CREATE INDEX idx_api_integration_actions_type ON api_integration_actions(action_type, is_active);
CREATE INDEX idx_api_call_logs_integration_date ON api_call_logs(integration_id, created_at);
CREATE INDEX idx_webhook_events_status_date ON webhook_events(processing_status, created_at);
CREATE INDEX idx_sync_mappings_sync_date ON sync_mappings(last_synced_at);

-- Enable RLS
ALTER TABLE api_integration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integration_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active integration templates" ON api_integration_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own integrations" ON api_integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage actions for their integrations" ON api_integration_actions
  FOR ALL USING (
    integration_id IN (
      SELECT id FROM api_integrations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view logs for their integrations" ON api_call_logs
  FOR SELECT USING (
    integration_id IN (
      SELECT id FROM api_integrations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage webhooks for their integrations" ON api_webhooks
  FOR ALL USING (
    integration_id IN (
      SELECT id FROM api_integrations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view webhook events for their integrations" ON webhook_events
  FOR SELECT USING (
    integration_id IN (
      SELECT id FROM api_integrations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sync mappings for their integrations" ON sync_mappings
  FOR ALL USING (
    integration_id IN (
      SELECT id FROM api_integrations WHERE user_id = auth.uid()
    )
  );

-- Function to execute API integration action
CREATE OR REPLACE FUNCTION execute_api_integration_action(
  p_action_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_action RECORD;
  v_integration RECORD;
  v_template RECORD;
  v_result JSONB;
BEGIN
  -- Get action details
  SELECT * INTO v_action FROM api_integration_actions WHERE id = p_action_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Action not found';
  END IF;
  
  -- Get integration details
  SELECT * INTO v_integration FROM api_integrations WHERE id = v_action.integration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;
  
  -- Get template details
  SELECT * INTO v_template FROM api_integration_templates WHERE id = v_integration.template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integration template not found';
  END IF;
  
  -- Update execution tracking
  UPDATE api_integration_actions SET
    last_executed_at = now(),
    execution_count = execution_count + 1
  WHERE id = p_action_id;
  
  -- Return configuration for external processing
  RETURN jsonb_build_object(
    'action', v_action,
    'integration', v_integration,
    'template', v_template
  );
END;
$$ LANGUAGE plpgsql;

-- Function to process webhook event
CREATE OR REPLACE FUNCTION process_webhook_event(
  p_webhook_url VARCHAR(255),
  p_headers JSONB,
  p_payload JSONB,
  p_event_type VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_webhook RECORD;
  v_event_id UUID;
  v_extracted_event_type VARCHAR(255);
BEGIN
  -- Find webhook by URL
  SELECT * INTO v_webhook FROM api_webhooks WHERE webhook_url = p_webhook_url AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Webhook not found or inactive';
  END IF;
  
  -- Extract event type from payload if not provided
  v_extracted_event_type := COALESCE(
    p_event_type,
    p_payload->>'type',
    p_payload->>'event_type',
    p_payload->>'action',
    'unknown'
  );
  
  -- Create webhook event record
  INSERT INTO webhook_events (
    webhook_id,
    integration_id,
    event_type,
    event_id,
    headers,
    payload,
    processing_status
  ) VALUES (
    v_webhook.id,
    v_webhook.integration_id,
    v_extracted_event_type,
    COALESCE(p_payload->>'id', p_payload->>'event_id'),
    p_headers,
    p_payload,
    'pending'
  ) RETURNING id INTO v_event_id;
  
  -- Update webhook stats
  UPDATE api_webhooks SET
    last_received_at = now(),
    total_received = total_received + 1
  WHERE id = v_webhook.id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create sync mapping
CREATE OR REPLACE FUNCTION create_sync_mapping(
  p_integration_id UUID,
  p_local_table VARCHAR(100),
  p_local_record_id UUID,
  p_external_id VARCHAR(255),
  p_external_type VARCHAR(100) DEFAULT NULL,
  p_sync_direction VARCHAR(20) DEFAULT 'bidirectional'
)
RETURNS UUID AS $$
DECLARE
  v_mapping_id UUID;
BEGIN
  INSERT INTO sync_mappings (
    integration_id,
    local_table,
    local_record_id,
    external_id,
    external_type,
    sync_direction
  ) VALUES (
    p_integration_id,
    p_local_table,
    p_local_record_id,
    p_external_id,
    p_external_type,
    p_sync_direction
  ) 
  ON CONFLICT (integration_id, local_table, local_record_id) 
  DO UPDATE SET
    external_id = EXCLUDED.external_id,
    external_type = EXCLUDED.external_type,
    sync_direction = EXCLUDED.sync_direction,
    updated_at = now()
  RETURNING id INTO v_mapping_id;
  
  RETURN v_mapping_id;
END;
$$ LANGUAGE plpgsql;

-- Insert common integration templates
INSERT INTO api_integration_templates (
  name, display_name, description, category, auth_type, auth_config, base_url, 
  supported_actions, config_schema
) VALUES
(
  'github',
  'GitHub',
  'Integrate with GitHub to sync issues as tasks and track development progress',
  'development',
  'oauth2',
  '{
    "auth_url": "https://github.com/login/oauth/authorize",
    "token_url": "https://github.com/login/oauth/access_token",
    "scopes": ["repo", "user:email"]
  }',
  'https://api.github.com',
  ARRAY['read_tasks', 'create_tasks', 'sync_data', 'webhook_events'],
  '{
    "type": "object",
    "properties": {
      "repositories": {
        "type": "array",
        "items": {"type": "string"},
        "title": "Repositories to sync"
      },
      "sync_issues": {"type": "boolean", "default": true},
      "sync_pull_requests": {"type": "boolean", "default": false},
      "auto_create_tasks": {"type": "boolean", "default": true}
    }
  }'
),
(
  'trello',
  'Trello',
  'Sync Trello cards with TaskQuest tasks for unified project management',
  'productivity',
  'api_key',
  '{
    "api_key_param": "key",
    "token_param": "token",
    "auth_url": "https://trello.com/1/authorize"
  }',
  'https://api.trello.com/1',
  ARRAY['read_tasks', 'create_tasks', 'sync_data', 'webhook_events'],
  '{
    "type": "object",
    "properties": {
      "boards": {
        "type": "array",
        "items": {"type": "string"},
        "title": "Trello boards to sync"
      },
      "sync_direction": {
        "type": "string",
        "enum": ["import", "export", "bidirectional"],
        "default": "bidirectional"
      }
    }
  }'
),
(
  'asana',
  'Asana',
  'Connect Asana projects and tasks with TaskQuest for comprehensive task management',
  'productivity',
  'oauth2',
  '{
    "auth_url": "https://app.asana.com/-/oauth_authorize",
    "token_url": "https://app.asana.com/-/oauth_token",
    "scopes": ["default"]
  }',
  'https://app.asana.com/api/1.0',
  ARRAY['read_tasks', 'create_tasks', 'sync_data', 'webhook_events'],
  '{
    "type": "object",
    "properties": {
      "projects": {
        "type": "array",
        "items": {"type": "string"},
        "title": "Asana projects to sync"
      },
      "workspace_id": {"type": "string", "title": "Workspace ID"}
    }
  }'
),
(
  'linear',
  'Linear',
  'Sync Linear issues with TaskQuest for engineering task management',
  'development',
  'api_key',
  '{
    "header_name": "Authorization",
    "header_format": "Bearer {token}"
  }',
  'https://api.linear.app/graphql',
  ARRAY['read_tasks', 'create_tasks', 'sync_data', 'webhook_events'],
  '{
    "type": "object",
    "properties": {
      "team_ids": {
        "type": "array",
        "items": {"type": "string"},
        "title": "Linear team IDs"
      },
      "sync_completed": {"type": "boolean", "default": false}
    }
  }'
),
(
  'todoist',
  'Todoist',
  'Import tasks from Todoist and keep them synchronized',
  'productivity',
  'api_key',
  '{
    "header_name": "Authorization",
    "header_format": "Bearer {token}"
  }',
  'https://api.todoist.com/rest/v2',
  ARRAY['read_tasks', 'create_tasks', 'sync_data'],
  '{
    "type": "object",
    "properties": {
      "projects": {
        "type": "array",
        "items": {"type": "string"},
        "title": "Todoist projects to sync"
      },
      "sync_completed": {"type": "boolean", "default": false}
    }
  }'
);