-- Epic 8, Story 8.6: Zapier Integration for Workflow Automation Schema

-- Zapier webhook configurations
CREATE TABLE zapier_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Webhook identification
  webhook_url VARCHAR(255) UNIQUE NOT NULL, -- Our generated webhook URL
  webhook_name VARCHAR(255) NOT NULL, -- User-friendly name
  description TEXT,
  
  -- Zapier configuration
  zapier_hook_id VARCHAR(255), -- Zapier's hook ID if provided
  secret_token VARCHAR(255) NOT NULL, -- Secret for webhook verification
  
  -- Event configuration
  trigger_events TEXT[] NOT NULL, -- Events that trigger this webhook
  filter_conditions JSONB DEFAULT '{}', -- Conditions to filter events
  
  -- Data transformation
  payload_template JSONB NOT NULL, -- Template for webhook payload
  include_metadata BOOLEAN DEFAULT true,
  
  -- Status and tracking
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  total_triggers INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, is_active),
  INDEX(webhook_url),
  INDEX(trigger_events USING gin)
);

-- Zapier webhook events log
CREATE TABLE zapier_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES zapier_webhooks(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(255) NOT NULL,
  event_source VARCHAR(100) NOT NULL, -- 'task', 'project', 'user', etc.
  source_record_id UUID NOT NULL,
  
  -- Trigger context
  trigger_data JSONB NOT NULL, -- Original event data
  payload_sent JSONB NOT NULL, -- Actual payload sent to Zapier
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'retrying'
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  
  INDEX(webhook_id, created_at),
  INDEX(status, next_retry_at),
  INDEX(event_type, created_at)
);

-- Zapier app configurations (for reverse webhooks from Zapier)
CREATE TABLE zapier_app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Configuration details
  config_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Zapier app details
  app_id VARCHAR(255), -- Zapier app ID if using custom app
  auth_type VARCHAR(50) DEFAULT 'api_key', -- 'api_key', 'oauth2'
  
  -- Incoming webhook configuration
  incoming_webhook_url VARCHAR(255) NOT NULL, -- URL for Zapier to send data
  webhook_secret VARCHAR(255) NOT NULL,
  
  -- Action configuration
  supported_actions TEXT[] NOT NULL, -- ['create_task', 'update_task', 'create_project', etc.]
  action_mappings JSONB NOT NULL, -- Map Zapier actions to TaskQuest operations
  
  -- Data validation
  validation_rules JSONB DEFAULT '{}',
  require_authentication BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, config_name),
  INDEX(user_id, is_active)
);

-- Zapier incoming requests log
CREATE TABLE zapier_incoming_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_config_id UUID NOT NULL REFERENCES zapier_app_configs(id) ON DELETE CASCADE,
  
  -- Request details
  zapier_id VARCHAR(255), -- Zapier's request ID if provided
  action_type VARCHAR(100) NOT NULL,
  
  -- Request data
  headers JSONB NOT NULL,
  payload JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Processing results
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'rejected'
  processing_error TEXT,
  
  -- Results
  created_records JSONB DEFAULT '[]', -- Records created/updated
  validation_errors JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  
  INDEX(app_config_id, created_at),
  INDEX(processing_status, created_at),
  INDEX(action_type, created_at)
);

-- Zapier triggers registry (defines what events can trigger Zapier webhooks)
CREATE TABLE zapier_trigger_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Trigger identification
  trigger_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  
  -- Event configuration
  source_table VARCHAR(100) NOT NULL, -- Table that generates this trigger
  event_types TEXT[] NOT NULL, -- INSERT, UPDATE, DELETE
  
  -- Payload configuration
  default_payload_template JSONB NOT NULL,
  available_fields JSONB NOT NULL, -- Fields available for payload customization
  
  -- Filtering options
  filterable_fields JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false, -- Some triggers might be premium features
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(category),
  INDEX(source_table)
);

-- Create indexes for performance
CREATE INDEX idx_zapier_webhooks_user_active ON zapier_webhooks(user_id, is_active);
CREATE INDEX idx_zapier_webhook_events_status_retry ON zapier_webhook_events(status, next_retry_at);
CREATE INDEX idx_zapier_webhook_events_webhook_date ON zapier_webhook_events(webhook_id, created_at);
CREATE INDEX idx_zapier_app_configs_user ON zapier_app_configs(user_id);
CREATE INDEX idx_zapier_incoming_requests_config ON zapier_incoming_requests(app_config_id, created_at);

-- Enable RLS
ALTER TABLE zapier_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_incoming_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_trigger_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own Zapier webhooks" ON zapier_webhooks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view webhook events for their webhooks" ON zapier_webhook_events
  FOR SELECT USING (
    webhook_id IN (
      SELECT id FROM zapier_webhooks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own Zapier app configs" ON zapier_app_configs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view incoming requests for their configs" ON zapier_incoming_requests
  FOR SELECT USING (
    app_config_id IN (
      SELECT id FROM zapier_app_configs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active trigger registry" ON zapier_trigger_registry
  FOR SELECT USING (is_active = true);

-- Function to trigger Zapier webhook
CREATE OR REPLACE FUNCTION trigger_zapier_webhook(
  p_event_type VARCHAR(255),
  p_source_table VARCHAR(100),
  p_source_record_id UUID,
  p_event_data JSONB
)
RETURNS VOID AS $$
DECLARE
  v_webhook RECORD;
  v_payload JSONB;
  v_event_id UUID;
BEGIN
  -- Find all active webhooks that should be triggered by this event
  FOR v_webhook IN 
    SELECT * FROM zapier_webhooks 
    WHERE is_active = true 
    AND p_event_type = ANY(trigger_events)
  LOOP
    -- Check filter conditions
    IF jsonb_array_length(COALESCE(v_webhook.filter_conditions, '[]'::jsonb)) > 0 THEN
      -- Apply filters (simplified - real implementation would be more sophisticated)
      IF NOT (p_event_data @> v_webhook.filter_conditions) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Build payload from template
    v_payload := v_webhook.payload_template;
    
    -- Replace template variables (simplified implementation)
    v_payload := jsonb_set(v_payload, '{event_type}', to_jsonb(p_event_type));
    v_payload := jsonb_set(v_payload, '{source_table}', to_jsonb(p_source_table));
    v_payload := jsonb_set(v_payload, '{record_id}', to_jsonb(p_source_record_id));
    v_payload := jsonb_set(v_payload, '{timestamp}', to_jsonb(now()));
    
    -- Include metadata if enabled
    IF v_webhook.include_metadata THEN
      v_payload := jsonb_set(v_payload, '{metadata}', p_event_data);
    END IF;
    
    -- Create webhook event
    INSERT INTO zapier_webhook_events (
      webhook_id,
      event_type,
      event_source,
      source_record_id,
      trigger_data,
      payload_sent,
      status
    ) VALUES (
      v_webhook.id,
      p_event_type,
      p_source_table,
      p_source_record_id,
      p_event_data,
      v_payload,
      'pending'
    ) RETURNING id INTO v_event_id;
    
    -- Update webhook stats
    UPDATE zapier_webhooks SET
      last_triggered_at = now(),
      total_triggers = total_triggers + 1
    WHERE id = v_webhook.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process Zapier incoming request
CREATE OR REPLACE FUNCTION process_zapier_incoming_request(
  p_config_id UUID,
  p_action_type VARCHAR(100),
  p_headers JSONB,
  p_payload JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_config RECORD;
  v_validation_errors JSONB := '[]'::jsonb;
  v_created_records JSONB := '[]'::jsonb;
  v_processing_status VARCHAR(50) := 'pending';
  v_processing_error TEXT;
BEGIN
  -- Get app config
  SELECT * INTO v_config FROM zapier_app_configs WHERE id = p_config_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'App config not found';
  END IF;
  
  -- Create request log
  INSERT INTO zapier_incoming_requests (
    app_config_id,
    action_type,
    headers,
    payload,
    ip_address,
    user_agent,
    processing_status
  ) VALUES (
    p_config_id,
    p_action_type,
    p_headers,
    p_payload,
    p_ip_address,
    p_user_agent,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Validate authentication if required
  IF v_config.require_authentication THEN
    -- Verify webhook secret or API key
    IF NOT (p_headers->>'authorization' = 'Bearer ' || v_config.webhook_secret
            OR p_headers->>'x-zapier-secret' = v_config.webhook_secret) THEN
      v_processing_status := 'rejected';
      v_processing_error := 'Authentication failed';
    END IF;
  END IF;
  
  -- Validate action type
  IF NOT (p_action_type = ANY(v_config.supported_actions)) THEN
    v_processing_status := 'rejected';
    v_processing_error := 'Unsupported action type: ' || p_action_type;
  END IF;
  
  -- Process request if validation passed
  IF v_processing_status = 'pending' THEN
    BEGIN
      -- Process based on action type (simplified implementation)
      CASE p_action_type
        WHEN 'create_task' THEN
          -- Would create task and add to v_created_records
          v_created_records := jsonb_build_array(jsonb_build_object('type', 'task', 'action', 'created'));
          v_processing_status := 'processed';
        WHEN 'update_task' THEN
          -- Would update task and add to v_created_records
          v_created_records := jsonb_build_array(jsonb_build_object('type', 'task', 'action', 'updated'));
          v_processing_status := 'processed';
        ELSE
          v_processing_status := 'failed';
          v_processing_error := 'Action processing not implemented: ' || p_action_type;
      END CASE;
    EXCEPTION WHEN OTHERS THEN
      v_processing_status := 'failed';
      v_processing_error := SQLERRM;
    END;
  END IF;
  
  -- Update request with results
  UPDATE zapier_incoming_requests SET
    processing_status = v_processing_status,
    processing_error = v_processing_error,
    created_records = v_created_records,
    validation_errors = v_validation_errors,
    processed_at = now()
  WHERE id = v_request_id;
  
  -- Update config stats
  UPDATE zapier_app_configs SET
    last_used_at = now(),
    total_requests = total_requests + 1
  WHERE id = p_config_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed webhook events
CREATE OR REPLACE FUNCTION retry_failed_zapier_webhooks()
RETURNS INTEGER AS $$
DECLARE
  v_retry_count INTEGER := 0;
  v_event RECORD;
BEGIN
  -- Find events that need retry
  FOR v_event IN
    SELECT * FROM zapier_webhook_events
    WHERE status IN ('failed', 'retrying')
    AND retry_count < max_retries
    AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY created_at
    LIMIT 100
  LOOP
    -- Update retry info
    UPDATE zapier_webhook_events SET
      status = 'retrying',
      retry_count = retry_count + 1,
      next_retry_at = now() + INTERVAL '1 hour' * power(2, retry_count) -- Exponential backoff
    WHERE id = v_event.id;
    
    v_retry_count := v_retry_count + 1;
  END LOOP;
  
  RETURN v_retry_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default trigger registry
INSERT INTO zapier_trigger_registry (
  trigger_name, display_name, description, category, source_table, event_types,
  default_payload_template, available_fields, filterable_fields
) VALUES
(
  'task_created',
  'New Task Created',
  'Triggers when a new task is created',
  'tasks',
  'tasks',
  ARRAY['INSERT'],
  '{
    "id": "{{record_id}}",
    "title": "{{title}}",
    "description": "{{description}}",
    "priority": "{{priority}}",
    "status": "{{status}}",
    "created_at": "{{created_at}}",
    "user_email": "{{user.email}}"
  }',
  '[
    {"field": "title", "type": "string", "description": "Task title"},
    {"field": "description", "type": "string", "description": "Task description"},
    {"field": "priority", "type": "string", "description": "Task priority"},
    {"field": "status", "type": "string", "description": "Task status"},
    {"field": "due_date", "type": "datetime", "description": "Due date"},
    {"field": "user.email", "type": "string", "description": "User email"}
  ]',
  '[
    {"field": "priority", "operators": ["equals", "in"]},
    {"field": "status", "operators": ["equals", "in"]},
    {"field": "category", "operators": ["equals"]}
  ]'
),
(
  'task_completed',
  'Task Completed',
  'Triggers when a task is marked as completed',
  'tasks',
  'tasks',
  ARRAY['UPDATE'],
  '{
    "id": "{{record_id}}",
    "title": "{{title}}",
    "completed_at": "{{updated_at}}",
    "time_taken": "{{time_taken}}",
    "user_email": "{{user.email}}"
  }',
  '[
    {"field": "title", "type": "string", "description": "Task title"},
    {"field": "completed_at", "type": "datetime", "description": "Completion time"},
    {"field": "time_taken", "type": "number", "description": "Time taken in minutes"},
    {"field": "user.email", "type": "string", "description": "User email"}
  ]',
  '[
    {"field": "priority", "operators": ["equals", "in"]},
    {"field": "category", "operators": ["equals"]}
  ]'
),
(
  'project_created',
  'New Project Created',
  'Triggers when a new project is created',
  'projects',
  'projects',
  ARRAY['INSERT'],
  '{
    "id": "{{record_id}}",
    "name": "{{name}}",
    "description": "{{description}}",
    "status": "{{status}}",
    "created_at": "{{created_at}}",
    "user_email": "{{user.email}}"
  }',
  '[
    {"field": "name", "type": "string", "description": "Project name"},
    {"field": "description", "type": "string", "description": "Project description"},
    {"field": "status", "type": "string", "description": "Project status"},
    {"field": "user.email", "type": "string", "description": "User email"}
  ]',
  '[
    {"field": "status", "operators": ["equals", "in"]}
  ]'
);

-- Create trigger functions for automatic Zapier webhook triggering
CREATE OR REPLACE FUNCTION notify_zapier_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM trigger_zapier_webhook(
      'task_created',
      'tasks',
      NEW.id,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
    PERFORM trigger_zapier_webhook(
      'task_completed',
      'tasks',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'task_data', row_to_json(NEW)::jsonb
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_zapier_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM trigger_zapier_webhook(
      'project_created',
      'projects',
      NEW.id,
      row_to_json(NEW)::jsonb
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_zapier_task_changes
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_zapier_task_changes();

CREATE TRIGGER trigger_zapier_project_changes
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION notify_zapier_project_changes();