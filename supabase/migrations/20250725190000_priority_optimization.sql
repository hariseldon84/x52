-- Epic 9, Story 9.2: Smart Priority Optimization Schema

-- Priority optimization rules and configurations
CREATE TABLE priority_optimization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(100) NOT NULL, -- 'deadline_based', 'dependency_based', 'pattern_based', 'context_based'
  description TEXT,
  
  -- Rule configuration
  rule_config JSONB NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0, -- How much this rule influences priority (0.0 to 1.0)
  
  -- Conditions
  trigger_conditions JSONB DEFAULT '{}', -- When this rule should apply
  exclusion_conditions JSONB DEFAULT '{}', -- When this rule should NOT apply
  
  -- Status and performance
  is_active BOOLEAN DEFAULT true,
  times_applied INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, rule_name),
  INDEX(user_id, rule_type, is_active)
);

-- Priority optimization history (track changes made by AI)
CREATE TABLE priority_optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Optimization details
  optimization_type VARCHAR(100) NOT NULL, -- 'automatic', 'suggested', 'manual_override'
  old_priority VARCHAR(20) NOT NULL,
  new_priority VARCHAR(20) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  reasoning TEXT,
  
  -- Applied rules
  applied_rules JSONB NOT NULL, -- Array of rule IDs and their contributions
  optimization_factors JSONB NOT NULL, -- Factors that influenced the decision
  
  -- User interaction
  user_accepted BOOLEAN, -- NULL = no response, true = accepted, false = rejected
  user_feedback TEXT,
  reverted_at TIMESTAMPTZ, -- If user manually changed priority back
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, task_id),
  INDEX(optimization_type, created_at),
  INDEX(user_accepted)
);

-- Task priority scores (calculated by AI)
CREATE TABLE task_priority_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Priority scoring
  calculated_priority VARCHAR(20) NOT NULL,
  priority_score DECIMAL(5,2) NOT NULL, -- Numerical score for ranking
  confidence_level DECIMAL(3,2) NOT NULL,
  
  -- Score breakdown
  urgency_score DECIMAL(3,2) DEFAULT 0, -- Based on deadlines
  importance_score DECIMAL(3,2) DEFAULT 0, -- Based on impact/goals
  context_score DECIMAL(3,2) DEFAULT 0, -- Based on current situation
  pattern_score DECIMAL(3,2) DEFAULT 0, -- Based on user patterns
  dependency_score DECIMAL(3,2) DEFAULT 0, -- Based on task dependencies
  
  -- Calculation metadata
  calculation_method VARCHAR(100) NOT NULL,
  factors_considered JSONB NOT NULL,
  last_recalculated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status
  is_current BOOLEAN DEFAULT true, -- Only one current score per task
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(task_id, is_current) WHERE is_current = true,
  INDEX(user_id, priority_score DESC),
  INDEX(task_id, created_at)
);

-- Priority optimization schedules
CREATE TABLE priority_optimization_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Schedule configuration
  schedule_name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL, -- 'daily', 'hourly', 'on_change', 'manual'
  
  -- Timing
  schedule_time TIME, -- For daily schedules
  schedule_interval INTEGER, -- For interval-based schedules (minutes)
  
  -- Optimization parameters
  optimization_scope VARCHAR(50) DEFAULT 'all', -- 'all', 'pending', 'active', 'overdue'
  max_changes_per_run INTEGER DEFAULT 10,
  min_confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
  
  -- Filters
  category_filter UUID[] DEFAULT '{}', -- Only optimize tasks in these categories
  project_filter UUID[] DEFAULT '{}', -- Only optimize tasks in these projects
  priority_filter VARCHAR(20)[] DEFAULT '{}', -- Only optimize tasks with these priorities
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, schedule_name),
  INDEX(is_active, next_run_at)
);

-- Priority optimization job queue
CREATE TABLE priority_optimization_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES priority_optimization_schedules(id) ON DELETE SET NULL,
  
  -- Job details
  job_type VARCHAR(50) NOT NULL, -- 'scheduled', 'on_demand', 'triggered'
  scope JSONB NOT NULL, -- What to optimize (task IDs, filters, etc.)
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  tasks_analyzed INTEGER DEFAULT 0,
  priorities_changed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0,
  current_task VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, status),
  INDEX(status, created_at)
);

-- Create indexes for performance
CREATE INDEX idx_priority_optimization_rules_user_active ON priority_optimization_rules(user_id, is_active);
CREATE INDEX idx_priority_optimization_history_user_task ON priority_optimization_history(user_id, task_id);
CREATE INDEX idx_task_priority_scores_user_score ON task_priority_scores(user_id, priority_score DESC);
CREATE INDEX idx_priority_optimization_schedules_next_run ON priority_optimization_schedules(is_active, next_run_at);

-- Enable RLS
ALTER TABLE priority_optimization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_optimization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_optimization_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_optimization_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own priority optimization rules" ON priority_optimization_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own priority optimization history" ON priority_optimization_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own task priority scores" ON task_priority_scores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own optimization schedules" ON priority_optimization_schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own optimization jobs" ON priority_optimization_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Function to calculate task priority score
CREATE OR REPLACE FUNCTION calculate_task_priority_score(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_task RECORD;
  v_preferences RECORD;
  v_score DECIMAL(5,2) := 0;
  v_urgency_score DECIMAL(3,2) := 0;
  v_importance_score DECIMAL(3,2) := 0;
  v_context_score DECIMAL(3,2) := 0;
  v_pattern_score DECIMAL(3,2) := 0;
  v_dependency_score DECIMAL(3,2) := 0;
  v_days_until_due INTEGER;
  v_base_priority_score DECIMAL(3,2);
BEGIN
  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get user AI preferences
  SELECT * INTO v_preferences FROM user_ai_preferences WHERE user_id = p_user_id;
  
  -- Base priority score
  CASE v_task.priority
    WHEN 'urgent' THEN v_base_priority_score := 1.00;
    WHEN 'high' THEN v_base_priority_score := 0.75;
    WHEN 'medium' THEN v_base_priority_score := 0.50;
    WHEN 'low' THEN v_base_priority_score := 0.25;
    ELSE v_base_priority_score := 0.50;
  END CASE;
  
  -- Calculate urgency score based on due date
  IF v_task.due_date IS NOT NULL THEN
    v_days_until_due := EXTRACT(days FROM (v_task.due_date - now()));
    
    IF v_days_until_due < 0 THEN
      v_urgency_score := 1.00; -- Overdue
    ELSIF v_days_until_due = 0 THEN
      v_urgency_score := 0.95; -- Due today
    ELSIF v_days_until_due = 1 THEN
      v_urgency_score := 0.85; -- Due tomorrow
    ELSIF v_days_until_due <= 3 THEN
      v_urgency_score := 0.70; -- Due within 3 days
    ELSIF v_days_until_due <= 7 THEN
      v_urgency_score := 0.50; -- Due within a week
    ELSE
      v_urgency_score := 0.30; -- Due later
    END IF;
  ELSE
    v_urgency_score := 0.25; -- No due date
  END IF;
  
  -- Calculate importance score based on complexity and category
  CASE v_task.complexity
    WHEN 'complex' THEN v_importance_score := v_importance_score + 0.3;
    WHEN 'moderate' THEN v_importance_score := v_importance_score + 0.2;
    WHEN 'simple' THEN v_importance_score := v_importance_score + 0.1;
  END CASE;
  
  -- Add importance based on project/goal association
  IF v_task.project_id IS NOT NULL THEN
    v_importance_score := v_importance_score + 0.2;
  END IF;
  
  -- Calculate context score based on current time and user patterns
  -- Simplified: boost score during user's peak hours
  DECLARE
    v_current_hour INTEGER := EXTRACT(hour FROM now());
    v_peak_hours INTEGER[];
  BEGIN
    -- Get user's peak productivity hours from behavior patterns
    SELECT ARRAY_AGG(DISTINCT EXTRACT(hour FROM created_at)::INTEGER)
    INTO v_peak_hours
    FROM tasks
    WHERE user_id = p_user_id 
    AND status = 'completed'
    AND created_at >= now() - INTERVAL '30 days'
    GROUP BY EXTRACT(hour FROM created_at)
    ORDER BY COUNT(*) DESC
    LIMIT 3;
    
    IF v_current_hour = ANY(v_peak_hours) THEN
      v_context_score := 0.2;
    END IF;
  END;
  
  -- Calculate pattern score based on user's completion patterns
  -- Users who complete similar tasks often should see them prioritized
  SELECT COUNT(*)::DECIMAL / 100.0 INTO v_pattern_score
  FROM tasks t
  WHERE t.user_id = p_user_id
  AND t.status = 'completed'
  AND t.priority = v_task.priority
  AND t.complexity = v_task.complexity
  AND t.created_at >= now() - INTERVAL '30 days';
  
  v_pattern_score := LEAST(v_pattern_score, 0.3); -- Cap at 0.3
  
  -- Calculate dependency score (simplified)
  -- Tasks that block others should have higher priority
  -- This would be more sophisticated in a real implementation
  v_dependency_score := 0.1;
  
  -- Combine all scores with weights
  v_score := (
    v_base_priority_score * 0.3 +
    v_urgency_score * 0.4 +
    v_importance_score * 0.15 +
    v_context_score * 0.05 +
    v_pattern_score * 0.05 +
    v_dependency_score * 0.05
  ) * 100; -- Scale to 0-100
  
  -- Store the detailed score breakdown
  INSERT INTO task_priority_scores (
    task_id, user_id, calculated_priority, priority_score, confidence_level,
    urgency_score, importance_score, context_score, pattern_score, dependency_score,
    calculation_method, factors_considered
  ) VALUES (
    p_task_id, p_user_id,
    CASE 
      WHEN v_score >= 85 THEN 'urgent'
      WHEN v_score >= 65 THEN 'high'
      WHEN v_score >= 35 THEN 'medium'
      ELSE 'low'
    END,
    v_score, 0.8, -- Fixed confidence for now
    v_urgency_score, v_importance_score, v_context_score, v_pattern_score, v_dependency_score,
    'weighted_algorithm_v1',
    jsonb_build_object(
      'base_priority', v_task.priority,
      'due_date', v_task.due_date,
      'complexity', v_task.complexity,
      'days_until_due', v_days_until_due,
      'has_project', v_task.project_id IS NOT NULL
    )
  )
  ON CONFLICT (task_id, is_current) WHERE is_current = true
  DO UPDATE SET
    calculated_priority = EXCLUDED.calculated_priority,
    priority_score = EXCLUDED.priority_score,
    confidence_level = EXCLUDED.confidence_level,
    urgency_score = EXCLUDED.urgency_score,
    importance_score = EXCLUDED.importance_score,
    context_score = EXCLUDED.context_score,
    pattern_score = EXCLUDED.pattern_score,
    dependency_score = EXCLUDED.dependency_score,
    factors_considered = EXCLUDED.factors_considered,
    last_recalculated_at = now();
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize task priorities
CREATE OR REPLACE FUNCTION optimize_task_priorities(
  p_user_id UUID,
  p_task_ids UUID[] DEFAULT NULL,
  p_max_changes INTEGER DEFAULT 10,
  p_min_confidence DECIMAL(3,2) DEFAULT 0.7
)
RETURNS TABLE (
  task_id UUID,
  old_priority VARCHAR(20),
  new_priority VARCHAR(20),
  score DECIMAL(5,2),
  confidence DECIMAL(3,2)
) AS $$
DECLARE
  v_task RECORD;
  v_score DECIMAL(5,2);
  v_new_priority VARCHAR(20);
  v_changes_made INTEGER := 0;
  v_preferences RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences FROM user_ai_preferences WHERE user_id = p_user_id;
  IF NOT FOUND OR v_preferences.enable_priority_optimization = false THEN
    RETURN;
  END IF;
  
  -- Process tasks (either specified ones or all pending tasks)
  FOR v_task IN
    SELECT t.id, t.priority, t.title
    FROM tasks t
    WHERE t.user_id = p_user_id
    AND t.status IN ('todo', 'in_progress')
    AND (p_task_ids IS NULL OR t.id = ANY(p_task_ids))
    ORDER BY t.created_at DESC
  LOOP
    -- Calculate new priority score
    v_score := calculate_task_priority_score(v_task.id, p_user_id);
    
    -- Determine new priority based on score
    CASE 
      WHEN v_score >= 85 THEN v_new_priority := 'urgent';
      WHEN v_score >= 65 THEN v_new_priority := 'high';
      WHEN v_score >= 35 THEN v_new_priority := 'medium';
      ELSE v_new_priority := 'low';
    END CASE;
    
    -- Only make changes if priority would actually change and confidence is high enough
    IF v_new_priority != v_task.priority AND 0.8 >= p_min_confidence THEN
      -- Update the task priority
      UPDATE tasks SET 
        priority = v_new_priority,
        updated_at = now()
      WHERE id = v_task.id;
      
      -- Log the optimization
      INSERT INTO priority_optimization_history (
        user_id, task_id, optimization_type, old_priority, new_priority,
        confidence_score, reasoning, applied_rules, optimization_factors
      ) VALUES (
        p_user_id, v_task.id, 'automatic', v_task.priority, v_new_priority,
        0.8, 'AI-calculated priority based on urgency, importance, and user patterns',
        '[]'::jsonb,
        jsonb_build_object('priority_score', v_score, 'algorithm', 'weighted_v1')
      );
      
      -- Return the change
      task_id := v_task.id;
      old_priority := v_task.priority;
      new_priority := v_new_priority;
      score := v_score;
      confidence := 0.8;
      RETURN NEXT;
      
      v_changes_made := v_changes_made + 1;
      
      -- Stop if we've reached the max changes limit
      IF v_changes_made >= p_max_changes THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get priority recommendations (without applying them)
CREATE OR REPLACE FUNCTION get_priority_recommendations(
  p_user_id UUID,
  p_task_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  task_id UUID,
  task_title VARCHAR(255),
  current_priority VARCHAR(20),
  recommended_priority VARCHAR(20),
  priority_score DECIMAL(5,2),
  confidence_score DECIMAL(3,2),
  reasoning TEXT,
  score_breakdown JSONB
) AS $$
DECLARE
  v_task RECORD;
  v_score DECIMAL(5,2);
  v_recommended_priority VARCHAR(20);
  v_score_record RECORD;
BEGIN
  FOR v_task IN
    SELECT t.id, t.title, t.priority
    FROM tasks t
    WHERE t.user_id = p_user_id
    AND t.status IN ('todo', 'in_progress')
    AND (p_task_ids IS NULL OR t.id = ANY(p_task_ids))
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    LIMIT p_limit
  LOOP
    -- Calculate priority score
    v_score := calculate_task_priority_score(v_task.id, p_user_id);
    
    -- Get detailed score breakdown
    SELECT * INTO v_score_record
    FROM task_priority_scores
    WHERE task_id = v_task.id AND is_current = true;
    
    -- Determine recommended priority
    CASE 
      WHEN v_score >= 85 THEN v_recommended_priority := 'urgent';
      WHEN v_score >= 65 THEN v_recommended_priority := 'high';
      WHEN v_score >= 35 THEN v_recommended_priority := 'medium';
      ELSE v_recommended_priority := 'low';
    END CASE;
    
    -- Only return recommendations that suggest a change
    IF v_recommended_priority != v_task.priority THEN
      task_id := v_task.id;
      task_title := v_task.title;
      current_priority := v_task.priority;
      recommended_priority := v_recommended_priority;
      priority_score := v_score;
      confidence_score := COALESCE(v_score_record.confidence_level, 0.8);
      reasoning := 'Priority recommendation based on deadline urgency, task importance, and your productivity patterns';
      score_breakdown := jsonb_build_object(
        'urgency_score', COALESCE(v_score_record.urgency_score, 0),
        'importance_score', COALESCE(v_score_record.importance_score, 0),
        'context_score', COALESCE(v_score_record.context_score, 0),
        'pattern_score', COALESCE(v_score_record.pattern_score, 0),
        'dependency_score', COALESCE(v_score_record.dependency_score, 0)
      );
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create default optimization rules for new users
CREATE OR REPLACE FUNCTION create_default_priority_rules(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Deadline-based rule
  INSERT INTO priority_optimization_rules (
    user_id, rule_name, rule_type, description, rule_config, weight
  ) VALUES (
    p_user_id, 'Deadline Urgency', 'deadline_based',
    'Increase priority as deadline approaches',
    jsonb_build_object(
      'days_urgent', 1,
      'days_high', 3,
      'days_medium', 7,
      'overdue_boost', 1.5
    ),
    0.4
  );
  
  -- Pattern-based rule
  INSERT INTO priority_optimization_rules (
    user_id, rule_name, rule_type, description, rule_config, weight
  ) VALUES (
    p_user_id, 'Completion Patterns', 'pattern_based',
    'Prioritize tasks similar to ones you complete quickly',
    jsonb_build_object(
      'lookback_days', 30,
      'min_completions', 3,
      'boost_factor', 0.2
    ),
    0.2
  );
  
  -- Context-based rule
  INSERT INTO priority_optimization_rules (
    user_id, rule_name, rule_type, description, rule_config, weight
  ) VALUES (
    p_user_id, 'Peak Hours', 'context_based',
    'Boost priority during your most productive hours',
    jsonb_build_object(
      'boost_during_peak', true,
      'peak_boost_factor', 0.15
    ),
    0.1
  );
END;
$$ LANGUAGE plpgsql;

-- Create default optimization schedules for new users
INSERT INTO priority_optimization_schedules (user_id, schedule_name, schedule_type, schedule_time, is_active)
SELECT 
  id, 
  'Daily Priority Optimization', 
  'daily', 
  '09:00'::TIME,
  true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM priority_optimization_schedules);

-- Create default rules for existing users
SELECT create_default_priority_rules(id)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM priority_optimization_rules);

-- Function to run scheduled priority optimization
CREATE OR REPLACE FUNCTION run_scheduled_priority_optimization()
RETURNS INTEGER AS $$
DECLARE
  v_schedule RECORD;
  v_job_id UUID;
  v_changes INTEGER := 0;
  v_total_changes INTEGER := 0;
BEGIN
  -- Find schedules that need to run
  FOR v_schedule IN
    SELECT * FROM priority_optimization_schedules
    WHERE is_active = true
    AND (next_run_at IS NULL OR next_run_at <= now())
    ORDER BY next_run_at ASC NULLS FIRST
    LIMIT 10 -- Process up to 10 schedules at a time
  LOOP
    -- Create job record
    INSERT INTO priority_optimization_jobs (
      user_id, schedule_id, job_type, scope, status
    ) VALUES (
      v_schedule.user_id, v_schedule.id, 'scheduled',
      jsonb_build_object('scope', v_schedule.optimization_scope),
      'running'
    ) RETURNING id INTO v_job_id;
    
    -- Run optimization
    SELECT COUNT(*) INTO v_changes
    FROM optimize_task_priorities(
      v_schedule.user_id, 
      NULL, -- All tasks
      v_schedule.max_changes_per_run,
      v_schedule.min_confidence_threshold
    );
    
    -- Update job completion
    UPDATE priority_optimization_jobs SET
      status = 'completed',
      completed_at = now(),
      priorities_changed = v_changes
    WHERE id = v_job_id;
    
    -- Update schedule next run time
    UPDATE priority_optimization_schedules SET
      last_run_at = now(),
      next_run_at = CASE 
        WHEN schedule_type = 'daily' THEN 
          (CURRENT_DATE + INTERVAL '1 day' + schedule_time)::TIMESTAMPTZ
        WHEN schedule_type = 'hourly' THEN 
          now() + INTERVAL '1 hour'
        ELSE 
          now() + (schedule_interval || ' minutes')::INTERVAL
      END
    WHERE id = v_schedule.id;
    
    v_total_changes := v_total_changes + v_changes;
  END LOOP;
  
  RETURN v_total_changes;
END;
$$ LANGUAGE plpgsql;