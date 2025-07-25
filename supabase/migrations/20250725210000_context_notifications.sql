-- Epic 9, Story 9.4: Context-Aware Notification System Schema

-- User notification preferences and context settings
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Global notification settings
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  in_app_notifications BOOLEAN DEFAULT true,
  
  -- Context-aware settings
  context_awareness_enabled BOOLEAN DEFAULT true,
  location_based_notifications BOOLEAN DEFAULT false,
  time_based_optimization BOOLEAN DEFAULT true,
  activity_based_filtering BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Focus modes
  focus_mode_enabled BOOLEAN DEFAULT false,
  focus_mode_schedule JSONB DEFAULT '[]', -- Array of focus periods
  do_not_disturb_keywords TEXT[] DEFAULT '{}',
  
  -- Urgency thresholds
  urgent_priority_immediate BOOLEAN DEFAULT true,
  high_priority_delay_minutes INTEGER DEFAULT 15,
  medium_priority_delay_minutes INTEGER DEFAULT 60,
  low_priority_delay_minutes INTEGER DEFAULT 240,
  
  -- Frequency controls
  max_notifications_per_hour INTEGER DEFAULT 10,
  batch_similar_notifications BOOLEAN DEFAULT true,
  notification_cooldown_minutes INTEGER DEFAULT 5,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- User context tracking for intelligent notifications
CREATE TABLE user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Current context
  current_activity VARCHAR(100), -- 'working', 'meeting', 'commuting', 'break', 'offline'
  current_location_type VARCHAR(100), -- 'office', 'home', 'travel', 'other'
  current_device VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  
  -- Context data
  context_data JSONB NOT NULL DEFAULT '{}',
  context_confidence DECIMAL(3,2) DEFAULT 0.5,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  availability_until TIMESTAMPTZ,
  
  -- Focus state
  is_in_focus_mode BOOLEAN DEFAULT false,
  focus_mode_type VARCHAR(50), -- 'deep_work', 'meeting', 'break', 'custom'
  focus_mode_until TIMESTAMPTZ,
  
  -- Learning data
  response_patterns JSONB DEFAULT '{}', -- How user typically responds at different times/contexts
  notification_preferences JSONB DEFAULT '{}', -- Context-specific preferences
  
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  context_updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, context_updated_at),
  INDEX(user_id, is_available)
);

-- Smart notification queue with context evaluation
CREATE TABLE smart_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  notification_type VARCHAR(100) NOT NULL, -- 'task_due', 'task_overdue', 'reminder', 'followup', 'priority_change'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Delivery configuration
  channels TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'push', 'sms'
  priority_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Context evaluation
  context_score DECIMAL(3,2) DEFAULT 0.5, -- How well this fits user's current context
  optimal_delivery_time TIMESTAMPTZ, -- When this should ideally be delivered
  delivery_window_start TIMESTAMPTZ, -- Earliest acceptable delivery time
  delivery_window_end TIMESTAMPTZ, -- Latest acceptable delivery time
  
  -- Delivery tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'scheduled', 'delivered', 'failed', 'dismissed', 'expired'
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- User interaction
  clicked BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  action_taken VARCHAR(100), -- 'viewed_task', 'completed_task', 'snoozed', 'ignored'
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, status),
  INDEX(scheduled_for),
  INDEX(notification_type, created_at),
  INDEX(related_task_id)
);

-- Notification delivery history for learning
CREATE TABLE notification_delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES smart_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Delivery details
  delivery_channel VARCHAR(50) NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL,
  
  -- Context at delivery
  user_context JSONB NOT NULL,
  device_context JSONB DEFAULT '{}',
  
  -- User response
  opened_at TIMESTAMPTZ,
  response_time_seconds INTEGER, -- How long until user responded
  response_action VARCHAR(100),
  
  -- Effectiveness metrics
  was_useful BOOLEAN, -- Did user find this notification useful
  was_timely BOOLEAN, -- Was the timing good
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, delivered_at),
  INDEX(delivery_channel, delivered_at)
);

-- Notification rules for automatic context-based filtering
CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(100) NOT NULL, -- 'context_filter', 'time_based', 'frequency_limit', 'priority_boost'
  description TEXT,
  
  -- Rule conditions
  conditions JSONB NOT NULL, -- When this rule applies
  actions JSONB NOT NULL, -- What to do when conditions are met
  
  -- Priority and ordering
  priority INTEGER DEFAULT 0, -- Higher priority rules run first
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  times_applied INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, rule_name),
  INDEX(user_id, rule_type, is_active)
);

-- Notification batching groups
CREATE TABLE notification_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Batch configuration
  batch_type VARCHAR(100) NOT NULL, -- 'similar_notifications', 'time_based', 'project_based'
  batch_title VARCHAR(255) NOT NULL,
  
  -- Delivery settings
  delivery_method VARCHAR(50) DEFAULT 'digest', -- 'digest', 'individual', 'summary'
  scheduled_delivery_time TIMESTAMPTZ NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'delivered', 'cancelled'
  delivered_at TIMESTAMPTZ,
  
  -- Metadata
  batch_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, scheduled_delivery_time),
  INDEX(status, scheduled_delivery_time)
);

-- Notification batch items
CREATE TABLE notification_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES notification_batches(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES smart_notifications(id) ON DELETE CASCADE,
  
  -- Item ordering within batch
  sort_order INTEGER DEFAULT 0,
  
  -- Item-specific delivery settings
  item_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(batch_id, notification_id),
  INDEX(batch_id, sort_order)
);

-- Create indexes for performance
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_user_context_active ON user_context(user_id, is_available, context_updated_at);
CREATE INDEX idx_smart_notifications_delivery ON smart_notifications(scheduled_for) WHERE status IN ('pending', 'scheduled');
CREATE INDEX idx_notification_rules_user_active ON notification_rules(user_id, is_active, priority DESC);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batch_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY \"Users can manage their own notification preferences\" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY \"Users can manage their own context\" ON user_context
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY \"Users can view their own notifications\" ON smart_notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY \"Users can view their own delivery history\" ON notification_delivery_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY \"Users can manage their own notification rules\" ON notification_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY \"Users can view their own notification batches\" ON notification_batches
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY \"Users can view their own batch items\" ON notification_batch_items
  FOR ALL USING (auth.uid() = (SELECT user_id FROM notification_batches WHERE id = batch_id));

-- Function to evaluate notification context and schedule delivery
CREATE OR REPLACE FUNCTION evaluate_notification_context(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_notification RECORD;
  v_context RECORD;
  v_preferences RECORD;
  v_context_score DECIMAL(3,2) := 0.5;
  v_time_score DECIMAL(3,2) := 0.5;
  v_availability_score DECIMAL(3,2) := 0.5;
  v_final_score DECIMAL(3,2);
BEGIN
  -- Get notification details
  SELECT * INTO v_notification FROM smart_notifications 
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get user context
  SELECT * INTO v_context FROM user_context WHERE user_id = p_user_id;
  
  -- Get user preferences
  SELECT * INTO v_preferences FROM notification_preferences WHERE user_id = p_user_id;
  
  -- Evaluate time-based score
  DECLARE
    v_current_hour INTEGER := EXTRACT(hour FROM now());
    v_quiet_start INTEGER := EXTRACT(hour FROM v_preferences.quiet_hours_start);
    v_quiet_end INTEGER := EXTRACT(hour FROM v_preferences.quiet_hours_end);
  BEGIN
    -- Check if in quiet hours
    IF v_preferences.quiet_hours_enabled THEN
      IF (v_quiet_start > v_quiet_end AND (v_current_hour >= v_quiet_start OR v_current_hour < v_quiet_end))
         OR (v_quiet_start <= v_quiet_end AND v_current_hour >= v_quiet_start AND v_current_hour < v_quiet_end) THEN
        -- In quiet hours - reduce score unless urgent
        v_time_score := CASE 
          WHEN v_notification.priority_level = 'urgent' THEN 0.8
          ELSE 0.2
        END;
      ELSE
        v_time_score := 0.9;
      END IF;
    END IF;
  END;
  
  -- Evaluate availability score
  IF v_context.is_available THEN
    v_availability_score := 0.9;
  ELSIF v_context.is_in_focus_mode THEN
    v_availability_score := CASE 
      WHEN v_notification.priority_level = 'urgent' THEN 0.7
      WHEN v_notification.priority_level = 'high' THEN 0.4
      ELSE 0.1
    END;
  ELSE
    v_availability_score := 0.3;
  END IF;
  
  -- Evaluate context appropriateness
  IF v_context.current_activity IS NOT NULL THEN
    CASE v_context.current_activity
      WHEN 'working' THEN 
        v_context_score := CASE v_notification.notification_type
          WHEN 'task_due' THEN 0.9
          WHEN 'task_overdue' THEN 0.95
          WHEN 'priority_change' THEN 0.8
          ELSE 0.6
        END;
      WHEN 'meeting' THEN
        v_context_score := CASE 
          WHEN v_notification.priority_level = 'urgent' THEN 0.5
          ELSE 0.1
        END;
      WHEN 'break' THEN
        v_context_score := 0.7;
      ELSE
        v_context_score := 0.5;
    END CASE;
  END IF;
  
  -- Calculate final weighted score
  v_final_score := (
    v_time_score * 0.3 +
    v_availability_score * 0.4 +
    v_context_score * 0.3
  );
  
  -- Update notification with context score
  UPDATE smart_notifications SET
    context_score = v_final_score,
    optimal_delivery_time = CASE 
      WHEN v_final_score >= 0.7 THEN now()
      WHEN v_final_score >= 0.5 THEN now() + INTERVAL '15 minutes'
      ELSE now() + INTERVAL '1 hour'
    END
  WHERE id = p_notification_id;
  
  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to create smart notification
CREATE OR REPLACE FUNCTION create_smart_notification(
  p_user_id UUID,
  p_notification_type VARCHAR(100),
  p_title VARCHAR(255),
  p_message TEXT,
  p_related_task_id UUID DEFAULT NULL,
  p_priority_level VARCHAR(20) DEFAULT 'medium',
  p_channels TEXT[] DEFAULT ARRAY['in_app']
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_context_score DECIMAL(3,2);
  v_preferences RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences FROM notification_preferences WHERE user_id = p_user_id;
  
  -- Check if notifications are enabled
  IF NOT FOUND OR v_preferences.notifications_enabled = false THEN
    RETURN NULL;
  END IF;
  
  -- Create notification
  INSERT INTO smart_notifications (
    user_id, notification_type, title, message,
    related_task_id, priority_level, channels
  ) VALUES (
    p_user_id, p_notification_type, p_title, p_message,
    p_related_task_id, p_priority_level, p_channels
  ) RETURNING id INTO v_notification_id;
  
  -- Evaluate context and schedule delivery
  v_context_score := evaluate_notification_context(v_notification_id, p_user_id);
  
  -- Schedule delivery based on context score and priority
  UPDATE smart_notifications SET
    scheduled_for = CASE 
      WHEN p_priority_level = 'urgent' AND v_context_score >= 0.3 THEN now()
      WHEN p_priority_level = 'high' AND v_context_score >= 0.5 THEN now() + INTERVAL '5 minutes'
      WHEN v_context_score >= 0.7 THEN now() + INTERVAL '2 minutes'
      WHEN v_context_score >= 0.5 THEN now() + INTERVAL '15 minutes'
      ELSE now() + INTERVAL '1 hour'
    END,
    status = 'scheduled'
  WHERE id = v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications(
  p_limit INTEGER DEFAULT 50
)
RETURNS INTEGER AS $$
DECLARE
  v_notification RECORD;
  v_processed_count INTEGER := 0;
  v_context_score DECIMAL(3,2);
BEGIN
  -- Process due notifications
  FOR v_notification IN
    SELECT * FROM smart_notifications
    WHERE status = 'scheduled'
    AND scheduled_for <= now()
    ORDER BY priority_level DESC, scheduled_for ASC
    LIMIT p_limit
  LOOP
    -- Re-evaluate context before delivery
    v_context_score := evaluate_notification_context(v_notification.id, v_notification.user_id);
    
    -- Deliver if context is appropriate or notification is urgent/overdue
    IF v_context_score >= 0.5 OR v_notification.priority_level = 'urgent' 
       OR v_notification.scheduled_for < now() - INTERVAL '1 hour' THEN
      
      -- Mark as delivered
      UPDATE smart_notifications SET
        status = 'delivered',
        delivered_at = now()
      WHERE id = v_notification.id;
      
      -- Record delivery
      INSERT INTO notification_delivery_history (
        notification_id, user_id, delivery_channel, delivered_at, user_context
      ) VALUES (
        v_notification.id, v_notification.user_id, 'in_app', now(),
        (SELECT to_jsonb(uc.*) FROM user_context uc WHERE user_id = v_notification.user_id)
      );
      
      v_processed_count := v_processed_count + 1;
      
    ELSE
      -- Reschedule for later
      UPDATE smart_notifications SET
        scheduled_for = now() + INTERVAL '30 minutes'
      WHERE id = v_notification.id;
    END IF;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user context
CREATE OR REPLACE FUNCTION update_user_context(
  p_user_id UUID,
  p_activity VARCHAR(100) DEFAULT NULL,
  p_location_type VARCHAR(100) DEFAULT NULL,
  p_device VARCHAR(50) DEFAULT NULL,
  p_is_available BOOLEAN DEFAULT NULL,
  p_context_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_context (
    user_id, current_activity, current_location_type, current_device,
    is_available, context_data, context_updated_at
  ) VALUES (
    p_user_id, p_activity, p_location_type, p_device,
    COALESCE(p_is_available, true), COALESCE(p_context_data, '{}'), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_activity = COALESCE(p_activity, user_context.current_activity),
    current_location_type = COALESCE(p_location_type, user_context.current_location_type),
    current_device = COALESCE(p_device, user_context.current_device),
    is_available = COALESCE(p_is_available, user_context.is_available),
    context_data = COALESCE(p_context_data, user_context.context_data),
    context_updated_at = now(),
    last_activity_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences);

-- Insert default user context for existing users
INSERT INTO user_context (user_id, current_activity, current_device)
SELECT id, 'working', 'desktop' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_context);

-- Create some default notification rules
INSERT INTO notification_rules (user_id, rule_name, rule_type, description, conditions, actions)
SELECT 
  id,
  'Quiet Hours Filter',
  'time_based',
  'Reduce non-urgent notifications during quiet hours',
  '{"during_quiet_hours": true, "max_priority": "medium"}',
  '{"delay_delivery": true, "reduce_channels": ["push"]}'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_rules WHERE rule_name = 'Quiet Hours Filter');

-- Function to create task-related notifications
CREATE OR REPLACE FUNCTION create_task_notification(
  p_task_id UUID,
  p_notification_type VARCHAR(100),
  p_custom_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task RECORD;
  v_title VARCHAR(255);
  v_message TEXT;
  v_priority VARCHAR(20);
  v_notification_id UUID;
BEGIN
  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Generate notification content based on type
  CASE p_notification_type
    WHEN 'task_due' THEN
      v_title := 'Task Due: ' || v_task.title;
      v_message := COALESCE(p_custom_message, 'Your task \"' || v_task.title || '\" is due today.');
      v_priority := v_task.priority;
      
    WHEN 'task_overdue' THEN
      v_title := 'Overdue Task: ' || v_task.title;
      v_message := COALESCE(p_custom_message, 'Your task \"' || v_task.title || '\" is overdue.');
      v_priority := 'urgent';
      
    WHEN 'task_reminder' THEN
      v_title := 'Reminder: ' || v_task.title;
      v_message := COALESCE(p_custom_message, 'Don''t forget about your task: \"' || v_task.title || '\"');
      v_priority := v_task.priority;
      
    WHEN 'priority_change' THEN
      v_title := 'Priority Updated: ' || v_task.title;
      v_message := COALESCE(p_custom_message, 'The priority of \"' || v_task.title || '\" has been updated to ' || v_task.priority || '.');
      v_priority := v_task.priority;
      
    ELSE
      v_title := 'Task Update: ' || v_task.title;
      v_message := COALESCE(p_custom_message, 'Update for your task: \"' || v_task.title || '\"');
      v_priority := v_task.priority;
  END CASE;
  
  -- Create the smart notification
  v_notification_id := create_smart_notification(
    v_task.user_id,
    p_notification_type,
    v_title,
    v_message,
    p_task_id,
    v_priority
  );
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications when tasks are updated
CREATE OR REPLACE FUNCTION trigger_task_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Task became overdue
  IF NEW.due_date IS NOT NULL AND NEW.due_date < now() AND NEW.status != 'completed' 
     AND (OLD.due_date IS NULL OR OLD.due_date >= now()) THEN
    PERFORM create_task_notification(NEW.id, 'task_overdue');
  END IF;
  
  -- Priority changed
  IF OLD.priority != NEW.priority THEN
    PERFORM create_task_notification(NEW.id, 'priority_change');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_notification_updates
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_notifications();

-- Create a trigger to automatically create due date reminders
CREATE OR REPLACE FUNCTION create_due_date_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create reminder notification for tasks with due dates
  IF NEW.due_date IS NOT NULL AND NEW.status != 'completed' THEN
    -- Schedule reminder 1 day before due date
    IF NEW.due_date > now() + INTERVAL '1 day' THEN
      INSERT INTO smart_notifications (
        user_id, notification_type, title, message, related_task_id,
        priority_level, scheduled_for, status
      ) VALUES (
        NEW.user_id, 'task_reminder',
        'Reminder: ' || NEW.title || ' due tomorrow',
        'Your task \"' || NEW.title || '\" is due tomorrow.',
        NEW.id, NEW.priority,
        NEW.due_date - INTERVAL '1 day', 'scheduled'
      );
    END IF;
    
    -- Schedule due notification for due date
    INSERT INTO smart_notifications (
      user_id, notification_type, title, message, related_task_id,
      priority_level, scheduled_for, status
    ) VALUES (
      NEW.user_id, 'task_due',
      'Task Due: ' || NEW.title,
      'Your task \"' || NEW.title || '\" is due today.',
      NEW.id, NEW.priority,
      DATE_TRUNC('day', NEW.due_date) + INTERVAL '9 hours', 'scheduled'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_due_date_reminders
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_due_date_reminders();