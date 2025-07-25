-- Epic 8, Story 8.1: Calendar Integration Schema

-- Calendar providers and user connections
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'outlook'
  provider_account_id VARCHAR(255) NOT NULL,
  provider_account_email VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT, -- Granted permissions
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_settings JSONB DEFAULT '{}', -- User preferences for sync
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, provider, provider_account_id)
);

-- User's connected calendars
CREATE TABLE user_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  calendar_id VARCHAR(255) NOT NULL, -- Provider's calendar ID
  calendar_name VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false, -- User chose to sync this calendar
  color VARCHAR(7), -- Hex color code
  time_zone VARCHAR(100),
  access_role VARCHAR(20) DEFAULT 'reader', -- reader, writer, owner
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(connection_id, calendar_id)
);

-- Calendar events synced from providers
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES user_calendars(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL, -- Provider's event ID
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  creator_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  visibility VARCHAR(20) DEFAULT 'default', -- default, public, private
  recurrence_rule TEXT, -- RRULE format
  original_start_time TIMESTAMPTZ, -- For recurring event instances
  is_recurring BOOLEAN DEFAULT false,
  etag VARCHAR(255), -- For optimistic updates
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Linked TaskQuest task
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(calendar_id, event_id)
);

-- Track task-to-calendar sync status
CREATE TABLE task_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES user_calendars(id) ON DELETE CASCADE,
  event_id VARCHAR(255), -- Provider's event ID if synced
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, failed, conflict
  sync_direction VARCHAR(20) NOT NULL, -- task_to_calendar, calendar_to_task, bidirectional
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  conflict_data JSONB, -- Data for resolving conflicts
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(task_id, calendar_id)
);

-- Calendar sync logs for debugging and monitoring
CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- full_sync, incremental_sync, webhook_update
  status VARCHAR(20) NOT NULL, -- started, completed, failed
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  INDEX(connection_id, started_at)
);

-- Create indexes for performance
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX idx_user_calendars_connection_id ON user_calendars(connection_id);
CREATE INDEX idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_task_id ON calendar_events(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_task_calendar_sync_task_id ON task_calendar_sync(task_id);
CREATE INDEX idx_task_calendar_sync_status ON task_calendar_sync(sync_status);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access calendars from their connections" ON user_calendars
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access events from their calendars" ON calendar_events
  FOR ALL USING (
    calendar_id IN (
      SELECT uc.id FROM user_calendars uc
      JOIN calendar_connections cc ON uc.connection_id = cc.id
      WHERE cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sync for their tasks" ON task_calendar_sync
  FOR ALL USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR calendar_id IN (
      SELECT uc.id FROM user_calendars uc
      JOIN calendar_connections cc ON uc.connection_id = cc.id
      WHERE cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their sync logs" ON calendar_sync_logs
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Functions for automatic task-calendar sync
CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert sync record for tasks with due dates
  IF NEW.due_date IS NOT NULL AND (OLD.due_date IS NULL OR OLD.due_date != NEW.due_date OR OLD.title != NEW.title) THEN
    INSERT INTO task_calendar_sync (task_id, calendar_id, sync_direction)
    SELECT NEW.id, uc.id, 'task_to_calendar'
    FROM user_calendars uc
    JOIN calendar_connections cc ON uc.connection_id = cc.id
    WHERE cc.user_id = NEW.user_id AND uc.is_selected = true
    ON CONFLICT (task_id, calendar_id) 
    DO UPDATE SET 
      sync_status = 'pending',
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task changes
CREATE TRIGGER trigger_sync_task_to_calendar
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_calendar();

-- Function to suggest follow-up tasks from meetings
CREATE OR REPLACE FUNCTION suggest_followup_tasks()
RETURNS TRIGGER AS $$
DECLARE
  meeting_keywords TEXT[] := ARRAY['meeting', 'call', 'discussion', 'review', 'sync', 'standup', 'retrospective'];
  has_keyword BOOLEAN := false;
  keyword TEXT;
BEGIN
  -- Check if event title suggests a meeting
  FOREACH keyword IN ARRAY meeting_keywords LOOP
    IF LOWER(NEW.title) LIKE '%' || keyword || '%' THEN
      has_keyword := true;
      EXIT;
    END IF;
  END LOOP;
  
  -- Create follow-up task suggestion if it's a meeting and in the future
  IF has_keyword AND NEW.end_time > now() THEN
    INSERT INTO task_suggestions (
      user_id,
      suggested_title,
      suggested_description,
      suggestion_type,
      source_data,
      created_at
    )
    SELECT 
      cc.user_id,
      'Follow up: ' || NEW.title,
      'Follow up on discussion points from calendar event: ' || NEW.title,
      'calendar_meeting',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'event_title', NEW.title,
        'event_time', NEW.start_time
      ),
      now()
    FROM user_calendars uc
    JOIN calendar_connections cc ON uc.connection_id = cc.id
    WHERE uc.id = NEW.calendar_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for meeting follow-up suggestions
CREATE TRIGGER trigger_suggest_followup_tasks
  AFTER INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION suggest_followup_tasks();

-- Create task_suggestions table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_title VARCHAR(500) NOT NULL,
  suggested_description TEXT,
  suggestion_type VARCHAR(50) NOT NULL,
  source_data JSONB DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT false,
  is_accepted BOOLEAN DEFAULT false,
  created_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, created_at)
);

ALTER TABLE task_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own task suggestions" ON task_suggestions
  FOR ALL USING (auth.uid() = user_id);