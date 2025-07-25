-- Epic 9, Story 9.1: AI Task Suggestion Engine Schema

-- AI model configurations
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(255) NOT NULL UNIQUE,
  model_type VARCHAR(100) NOT NULL, -- 'task_suggestion', 'priority_optimization', 'nlp', 'behavior_analysis'
  model_version VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Model configuration
  config JSONB NOT NULL DEFAULT '{}',
  endpoint_url TEXT,
  api_key_reference VARCHAR(255), -- Reference to encrypted API key
  
  -- Performance metrics
  accuracy_score DECIMAL(3,2),
  last_trained_at TIMESTAMPTZ,
  training_data_size INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(model_type, is_active)
);

-- User AI preferences and settings
CREATE TABLE user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Suggestion preferences
  enable_ai_suggestions BOOLEAN DEFAULT true,
  suggestion_frequency VARCHAR(50) DEFAULT 'moderate', -- 'minimal', 'moderate', 'frequent'
  suggestion_types TEXT[] DEFAULT ARRAY['similar_tasks', 'follow_ups', 'related_contacts', 'time_based'],
  
  -- Priority optimization preferences
  enable_priority_optimization BOOLEAN DEFAULT true,
  optimization_aggressiveness VARCHAR(50) DEFAULT 'balanced', -- 'conservative', 'balanced', 'aggressive'
  
  -- Automation preferences
  enable_automated_followups BOOLEAN DEFAULT false,
  followup_delay_hours INTEGER DEFAULT 24,
  max_automated_tasks INTEGER DEFAULT 5,
  
  -- Notification preferences
  enable_smart_notifications BOOLEAN DEFAULT true,
  notification_timing_optimization BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  -- Learning preferences
  allow_behavior_tracking BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 365,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- AI-generated task suggestions
CREATE TABLE ai_task_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES ai_models(id),
  
  -- Suggestion details
  suggested_title VARCHAR(255) NOT NULL,
  suggested_description TEXT,
  suggested_priority VARCHAR(20) DEFAULT 'medium',
  suggested_complexity VARCHAR(20) DEFAULT 'moderate',
  suggested_category_id UUID REFERENCES categories(id),
  suggested_project_id UUID REFERENCES projects(id),
  suggested_due_date TIMESTAMPTZ,
  
  -- Suggestion context
  suggestion_type VARCHAR(100) NOT NULL, -- 'similar_task', 'follow_up', 'pattern_based', 'context_aware'
  source_context JSONB NOT NULL, -- Context that triggered the suggestion
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  reasoning TEXT, -- Human-readable explanation
  
  -- User interaction
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'dismissed', 'modified'
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'irrelevant'
  created_task_id UUID REFERENCES tasks(id),
  
  -- Metadata
  suggested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  
  INDEX(user_id, status),
  INDEX(suggested_at),
  INDEX(confidence_score),
  INDEX(suggestion_type)
);

-- AI suggestion feedback for model improvement
CREATE TABLE ai_suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES ai_task_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feedback details
  feedback_type VARCHAR(50) NOT NULL, -- 'acceptance', 'rejection', 'modification', 'rating'
  feedback_value JSONB NOT NULL, -- Structured feedback data
  feedback_text TEXT, -- Optional user comments
  
  -- Context
  interaction_context JSONB DEFAULT '{}',
  response_time_seconds INTEGER, -- How long user took to respond
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(suggestion_id),
  INDEX(feedback_type, created_at)
);

-- User behavior patterns (for ML training)
CREATE TABLE user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type VARCHAR(100) NOT NULL, -- 'task_creation', 'completion_time', 'priority_preference', 'time_of_day'
  pattern_name VARCHAR(255) NOT NULL,
  
  -- Pattern data
  pattern_data JSONB NOT NULL,
  confidence_level DECIMAL(3,2) NOT NULL,
  
  -- Temporal aspects
  time_period VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'seasonal'
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  
  -- Usage tracking
  times_applied INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, pattern_type, pattern_name),
  INDEX(user_id, pattern_type),
  INDEX(confidence_level)
);

-- AI model training data
CREATE TABLE ai_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ai_models(id),
  user_id UUID REFERENCES auth.users(id), -- NULL for aggregated/anonymized data
  
  -- Training data
  input_features JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  actual_output JSONB, -- For tracking prediction accuracy
  
  -- Data quality
  data_quality_score DECIMAL(3,2),
  is_validated BOOLEAN DEFAULT false,
  validation_notes TEXT,
  
  -- Privacy and compliance
  is_anonymized BOOLEAN DEFAULT false,
  retention_expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(model_id, created_at),
  INDEX(user_id, created_at)
);

-- AI model performance metrics
CREATE TABLE ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ai_models(id),
  
  -- Performance metrics
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_context JSONB DEFAULT '{}',
  
  -- Temporal data
  measurement_period VARCHAR(50), -- 'hour', 'day', 'week', 'month'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(model_id, metric_name, period_start),
  INDEX(period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX idx_ai_task_suggestions_user_status ON ai_task_suggestions(user_id, status);
CREATE INDEX idx_ai_task_suggestions_expires ON ai_task_suggestions(expires_at) WHERE status = 'pending';
CREATE INDEX idx_user_behavior_patterns_user ON user_behavior_patterns(user_id, pattern_type);
CREATE INDEX idx_ai_training_data_model ON ai_training_data(model_id, created_at);

-- Enable RLS
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_task_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "AI models are viewable by all authenticated users" ON ai_models
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Users can manage their own AI preferences" ON user_ai_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI suggestions" ON ai_task_suggestions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can provide feedback on their suggestions" ON ai_suggestion_feedback
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own behavior patterns" ON user_behavior_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their training data contributions" ON ai_training_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Model metrics are viewable by authenticated users" ON ai_model_metrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function to generate AI task suggestions
CREATE OR REPLACE FUNCTION generate_ai_task_suggestions(
  p_user_id UUID,
  p_suggestion_type VARCHAR(100) DEFAULT 'pattern_based',
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  suggestion_id UUID,
  title VARCHAR(255),
  description TEXT,
  priority VARCHAR(20),
  complexity VARCHAR(20),
  confidence_score DECIMAL(3,2),
  reasoning TEXT
) AS $$
DECLARE
  v_preferences RECORD;
  v_model RECORD;
  v_user_patterns JSONB;
  v_suggestion RECORD;
BEGIN
  -- Get user AI preferences
  SELECT * INTO v_preferences FROM user_ai_preferences WHERE user_id = p_user_id;
  IF NOT FOUND OR v_preferences.enable_ai_suggestions = false THEN
    RETURN;
  END IF;
  
  -- Get the appropriate AI model
  SELECT * INTO v_model FROM ai_models 
  WHERE model_type = 'task_suggestion' AND is_active = true AND is_default = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get user behavior patterns
  SELECT jsonb_agg(
    jsonb_build_object(
      'pattern_type', pattern_type,
      'pattern_name', pattern_name,
      'pattern_data', pattern_data,
      'confidence_level', confidence_level
    )
  ) INTO v_user_patterns
  FROM user_behavior_patterns
  WHERE user_id = p_user_id AND confidence_level > 0.6;
  
  -- Generate suggestions based on type
  CASE p_suggestion_type
    WHEN 'similar_task' THEN
      -- Find similar tasks based on recent completions
      FOR v_suggestion IN
        SELECT DISTINCT ON (t.category_id)
          gen_random_uuid() as id,
          'Follow up on ' || t.title as suggested_title,
          'Based on your recent completion of "' || t.title || '"' as suggested_description,
          t.priority,
          t.complexity,
          0.75 as confidence,
          'Similar to recently completed task' as reasoning
        FROM tasks t
        WHERE t.user_id = p_user_id 
        AND t.status = 'completed'
        AND t.completed_at > now() - INTERVAL '7 days'
        ORDER BY t.category_id, t.completed_at DESC
        LIMIT p_limit
      LOOP
        -- Insert suggestion
        INSERT INTO ai_task_suggestions (
          user_id, model_id, suggested_title, suggested_description,
          suggested_priority, suggested_complexity, suggestion_type,
          source_context, confidence_score, reasoning
        ) VALUES (
          p_user_id, v_model.id, v_suggestion.suggested_title, v_suggestion.suggested_description,
          v_suggestion.priority, v_suggestion.complexity, p_suggestion_type,
          jsonb_build_object('similar_task_pattern', true),
          v_suggestion.confidence, v_suggestion.reasoning
        ) RETURNING id, suggested_title, suggested_description, suggested_priority, 
                   suggested_complexity, confidence_score, reasoning
        INTO suggestion_id, title, description, priority, complexity, confidence_score, reasoning;
        
        RETURN NEXT;
      END LOOP;
      
    WHEN 'time_based' THEN
      -- Generate suggestions based on time patterns
      FOR v_suggestion IN
        SELECT 
          gen_random_uuid() as id,
          'Daily review task' as suggested_title,
          'Time for your daily productivity review' as suggested_description,
          'medium' as priority,
          'simple' as complexity,
          0.80 as confidence,
          'Based on your daily activity pattern' as reasoning
        FROM (SELECT 1) dummy -- Placeholder for time-based logic
        LIMIT p_limit
      LOOP
        INSERT INTO ai_task_suggestions (
          user_id, model_id, suggested_title, suggested_description,
          suggested_priority, suggested_complexity, suggestion_type,
          source_context, confidence_score, reasoning
        ) VALUES (
          p_user_id, v_model.id, v_suggestion.suggested_title, v_suggestion.suggested_description,
          v_suggestion.priority, v_suggestion.complexity, p_suggestion_type,
          jsonb_build_object('time_pattern', true),
          v_suggestion.confidence, v_suggestion.reasoning
        ) RETURNING id, suggested_title, suggested_description, suggested_priority, 
                   suggested_complexity, confidence_score, reasoning
        INTO suggestion_id, title, description, priority, complexity, confidence_score, reasoning;
        
        RETURN NEXT;
      END LOOP;
      
    ELSE
      -- Default pattern-based suggestions
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to accept AI suggestion and create task
CREATE OR REPLACE FUNCTION accept_ai_suggestion(
  p_suggestion_id UUID,
  p_user_id UUID,
  p_modifications JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_suggestion RECORD;
  v_task_id UUID;
  v_title VARCHAR(255);
  v_description TEXT;
  v_priority VARCHAR(20);
  v_complexity VARCHAR(20);
  v_category_id UUID;
  v_project_id UUID;
  v_due_date TIMESTAMPTZ;
BEGIN
  -- Get suggestion details
  SELECT * INTO v_suggestion FROM ai_task_suggestions 
  WHERE id = p_suggestion_id AND user_id = p_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found or already processed';
  END IF;
  
  -- Apply user modifications or use suggested values
  v_title := COALESCE(p_modifications->>'title', v_suggestion.suggested_title);
  v_description := COALESCE(p_modifications->>'description', v_suggestion.suggested_description);
  v_priority := COALESCE(p_modifications->>'priority', v_suggestion.suggested_priority);
  v_complexity := COALESCE(p_modifications->>'complexity', v_suggestion.suggested_complexity);
  v_category_id := COALESCE((p_modifications->>'category_id')::UUID, v_suggestion.suggested_category_id);
  v_project_id := COALESCE((p_modifications->>'project_id')::UUID, v_suggestion.suggested_project_id);
  v_due_date := COALESCE((p_modifications->>'due_date')::TIMESTAMPTZ, v_suggestion.suggested_due_date);
  
  -- Create the task
  INSERT INTO tasks (
    user_id, title, description, priority, complexity, 
    category_id, project_id, due_date, status, source, source_metadata
  ) VALUES (
    p_user_id, v_title, v_description, v_priority, v_complexity,
    v_category_id, v_project_id, v_due_date, 'todo', 'ai_suggestion',
    jsonb_build_object(
      'suggestion_id', p_suggestion_id,
      'confidence_score', v_suggestion.confidence_score,
      'suggestion_type', v_suggestion.suggestion_type,
      'modifications', p_modifications
    )
  ) RETURNING id INTO v_task_id;
  
  -- Update suggestion status
  UPDATE ai_task_suggestions SET
    status = CASE 
      WHEN jsonb_array_length(COALESCE(p_modifications, '{}'::jsonb)) > 0 THEN 'modified'
      ELSE 'accepted'
    END,
    created_task_id = v_task_id,
    responded_at = now()
  WHERE id = p_suggestion_id;
  
  -- Record feedback
  INSERT INTO ai_suggestion_feedback (
    suggestion_id, user_id, feedback_type, feedback_value
  ) VALUES (
    p_suggestion_id, p_user_id, 'acceptance',
    jsonb_build_object(
      'accepted', true,
      'modifications', p_modifications,
      'task_id', v_task_id
    )
  );
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reject AI suggestion with feedback
CREATE OR REPLACE FUNCTION reject_ai_suggestion(
  p_suggestion_id UUID,
  p_user_id UUID,
  p_feedback_reason VARCHAR(100) DEFAULT 'not_relevant',
  p_feedback_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_suggestion RECORD;
BEGIN
  -- Get suggestion details
  SELECT * INTO v_suggestion FROM ai_task_suggestions 
  WHERE id = p_suggestion_id AND user_id = p_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update suggestion status
  UPDATE ai_task_suggestions SET
    status = 'rejected',
    responded_at = now()
  WHERE id = p_suggestion_id;
  
  -- Record feedback
  INSERT INTO ai_suggestion_feedback (
    suggestion_id, user_id, feedback_type, feedback_value, feedback_text
  ) VALUES (
    p_suggestion_id, p_user_id, 'rejection',
    jsonb_build_object(
      'rejected', true,
      'reason', p_feedback_reason
    ),
    p_feedback_text
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired suggestions
CREATE OR REPLACE FUNCTION cleanup_expired_ai_suggestions()
RETURNS INTEGER AS $$
DECLARE
  v_cleanup_count INTEGER;
BEGIN
  -- Update expired pending suggestions to dismissed
  UPDATE ai_task_suggestions SET
    status = 'dismissed',
    responded_at = now()
  WHERE status = 'pending' 
  AND expires_at < now();
  
  GET DIAGNOSTICS v_cleanup_count = ROW_COUNT;
  
  RETURN v_cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default AI models
INSERT INTO ai_models (model_name, model_type, model_version, description, config) VALUES
(
  'task_suggestion_v1',
  'task_suggestion',
  '1.0.0',
  'Rule-based task suggestion engine using user patterns and completion history',
  '{
    "algorithm": "pattern_matching",
    "min_confidence": 0.6,
    "max_suggestions_per_day": 10,
    "lookback_days": 30
  }'
),
(
  'priority_optimizer_v1',
  'priority_optimization',
  '1.0.0',
  'Dynamic priority adjustment based on deadlines, importance, and user behavior',
  '{
    "algorithm": "weighted_scoring",
    "factors": ["deadline_proximity", "completion_history", "user_patterns"],
    "rebalance_frequency": "daily"
  }'
),
(
  'nlp_processor_v1',
  'nlp',
  '1.0.0',
  'Natural language processing for task understanding and categorization',
  '{
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "max_tokens": 150,
    "temperature": 0.3
  }'
);

-- Insert default AI preferences for existing users
INSERT INTO user_ai_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_ai_preferences);

-- Set default model flags
UPDATE ai_models SET is_default = true WHERE model_name = 'task_suggestion_v1';
UPDATE ai_models SET is_default = true WHERE model_name = 'priority_optimizer_v1';
UPDATE ai_models SET is_default = true WHERE model_name = 'nlp_processor_v1';