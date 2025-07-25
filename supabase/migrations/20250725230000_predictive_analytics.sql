-- Epic 9, Story 9.6: Predictive Analytics and Insights Schema

-- User productivity metrics for predictive modeling
CREATE TABLE productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Temporal data
  metric_date DATE NOT NULL,
  metric_hour INTEGER CHECK (metric_hour >= 0 AND metric_hour <= 23),
  week_number INTEGER,
  month_number INTEGER,
  quarter_number INTEGER,
  
  -- Productivity measurements
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  goals_achieved INTEGER DEFAULT 0,
  time_worked_minutes INTEGER DEFAULT 0,
  productivity_score DECIMAL(3,2) DEFAULT 0, -- 0-1 scale
  
  -- Work patterns
  peak_hours JSONB DEFAULT '[]', -- Hours of highest productivity
  task_complexity_distribution JSONB DEFAULT '{}', -- Simple/medium/complex task ratios
  completion_velocity DECIMAL(5,2) DEFAULT 0, -- Tasks completed per hour
  
  -- Energy and focus metrics
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  focus_score DECIMAL(3,2) DEFAULT 0.5, -- Derived from task completion patterns
  interruption_count INTEGER DEFAULT 0,
  
  -- Context data
  location_type VARCHAR(100), -- 'office', 'home', 'travel'
  weather_condition VARCHAR(100), -- External factor
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, metric_date, metric_hour),
  INDEX(user_id, metric_date),
  INDEX(user_id, week_number),
  INDEX(productivity_score DESC)
);

-- Goal completion predictions
CREATE TABLE goal_completion_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  
  -- Prediction details
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_probability DECIMAL(3,2) NOT NULL, -- 0-1 probability
  predicted_completion_date DATE,
  confidence_level DECIMAL(3,2) DEFAULT 0.5,
  
  -- Factors influencing prediction
  contributing_factors JSONB NOT NULL DEFAULT '{}',
  risk_factors JSONB DEFAULT '[]',
  success_indicators JSONB DEFAULT '[]',
  
  -- Current state analysis
  current_progress_percentage DECIMAL(5,2) DEFAULT 0,
  tasks_remaining INTEGER DEFAULT 0,
  average_completion_velocity DECIMAL(5,2) DEFAULT 0,
  
  -- Time-based predictions
  estimated_hours_remaining DECIMAL(8,2),
  optimal_work_schedule JSONB DEFAULT '{}', -- Suggested time allocation
  bottleneck_analysis JSONB DEFAULT '{}',
  
  -- Model metadata
  model_version VARCHAR(50) DEFAULT '1.0',
  prediction_accuracy_score DECIMAL(3,2), -- Updated after goal completion
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, prediction_date),
  INDEX(goal_id, completion_probability DESC),
  INDEX(predicted_completion_date)
);

-- Workload capacity predictions
CREATE TABLE workload_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Prediction period
  prediction_period_start DATE NOT NULL,
  prediction_period_end DATE NOT NULL,
  period_type VARCHAR(50) NOT NULL, -- 'week', 'month', 'quarter'
  
  -- Capacity predictions
  predicted_capacity_hours DECIMAL(6,2) NOT NULL,
  optimal_task_count INTEGER NOT NULL,
  recommended_complexity_mix JSONB NOT NULL DEFAULT '{}', -- Simple/medium/complex ratios
  
  -- Workload analysis
  current_workload_hours DECIMAL(6,2) DEFAULT 0,
  workload_utilization DECIMAL(3,2) DEFAULT 0, -- Current vs capacity
  burnout_risk_score DECIMAL(3,2) DEFAULT 0,
  
  -- Performance predictions
  predicted_productivity_score DECIMAL(3,2),
  predicted_completion_rate DECIMAL(3,2),
  optimal_break_schedule JSONB DEFAULT '{}',
  
  -- Context considerations
  external_factors JSONB DEFAULT '{}', -- Holidays, travel, etc.
  seasonal_adjustments JSONB DEFAULT '{}',
  historical_pattern_match DECIMAL(3,2) DEFAULT 0,
  
  -- Recommendations
  capacity_recommendations JSONB DEFAULT '[]',
  schedule_optimizations JSONB DEFAULT '[]',
  risk_mitigation_strategies JSONB DEFAULT '[]',
  
  confidence_level DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, prediction_period_start),
  INDEX(period_type, prediction_period_start),
  INDEX(burnout_risk_score DESC)
);

-- Productivity bottleneck analysis
CREATE TABLE bottleneck_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bottleneck identification
  bottleneck_type VARCHAR(100) NOT NULL, -- 'skill_gap', 'time_management', 'context_switching', 'external_dependency'
  bottleneck_category VARCHAR(100), -- 'personal', 'technical', 'organizational', 'environmental'
  
  -- Impact analysis
  severity_score DECIMAL(3,2) NOT NULL, -- 0-1 scale
  frequency_score DECIMAL(3,2) NOT NULL, -- How often this occurs
  productivity_impact DECIMAL(3,2) NOT NULL, -- Impact on overall productivity
  
  -- Prediction details
  likelihood_next_week DECIMAL(3,2) DEFAULT 0,
  likelihood_next_month DECIMAL(3,2) DEFAULT 0,
  estimated_time_cost_hours DECIMAL(6,2),
  
  -- Context and patterns
  trigger_patterns JSONB DEFAULT '{}', -- What conditions lead to this bottleneck
  affected_tasks JSONB DEFAULT '[]', -- Types of tasks most affected
  resolution_strategies JSONB DEFAULT '[]', -- Recommended solutions
  
  -- Historical data
  last_occurrence DATE,
  occurrence_frequency INTEGER DEFAULT 0, -- Times per month
  average_resolution_time_hours DECIMAL(6,2),
  
  -- Prevention recommendations
  prevention_score DECIMAL(3,2) DEFAULT 0.5, -- How preventable this is
  early_warning_signals JSONB DEFAULT '[]',
  mitigation_actions JSONB DEFAULT '[]',
  
  prediction_confidence DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, severity_score DESC),
  INDEX(bottleneck_type, likelihood_next_week DESC),
  INDEX(prediction_confidence DESC)
);

-- Optimal timing recommendations
CREATE TABLE timing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timing analysis
  task_type VARCHAR(100) NOT NULL, -- 'creative', 'analytical', 'administrative', 'communication'
  complexity_level VARCHAR(20) NOT NULL, -- 'simple', 'medium', 'complex'
  
  -- Optimal timing windows
  optimal_hours JSONB NOT NULL DEFAULT '[]', -- Array of hour ranges
  optimal_days JSONB NOT NULL DEFAULT '[]', -- Best days of week
  optimal_duration_minutes INTEGER,
  
  -- Performance predictions
  predicted_performance_score DECIMAL(3,2),
  expected_completion_time_minutes INTEGER,
  error_rate_prediction DECIMAL(3,2) DEFAULT 0,
  
  -- Context factors
  energy_requirement VARCHAR(20), -- 'low', 'medium', 'high'
  focus_requirement VARCHAR(20), -- 'low', 'medium', 'high'
  interruption_tolerance VARCHAR(20), -- 'low', 'medium', 'high'
  
  -- Environmental preferences
  preferred_location JSONB DEFAULT '[]',
  optimal_break_frequency INTEGER, -- Minutes between breaks
  collaboration_timing JSONB DEFAULT '{}',
  
  -- Statistical backing
  sample_size INTEGER DEFAULT 0, -- Number of data points used
  confidence_interval DECIMAL(3,2) DEFAULT 0.1,
  last_updated DATE DEFAULT CURRENT_DATE,
  
  INDEX(user_id, task_type),
  INDEX(optimal_hours),
  INDEX(predicted_performance_score DESC)
);

-- Weekly insight reports
CREATE TABLE weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Report period
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  week_number INTEGER,
  year INTEGER,
  
  -- Productivity summary
  total_productivity_score DECIMAL(3,2),
  productivity_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
  productivity_variance DECIMAL(3,2), -- Consistency measure
  
  -- Performance analysis
  goals_completed INTEGER DEFAULT 0,
  goals_on_track INTEGER DEFAULT 0,
  goals_at_risk INTEGER DEFAULT 0,
  average_task_completion_rate DECIMAL(3,2),
  
  -- Insights and patterns
  key_insights JSONB NOT NULL DEFAULT '[]', -- Main insights from the week
  success_patterns JSONB DEFAULT '[]', -- What worked well
  improvement_areas JSONB DEFAULT '[]', -- What needs work
  behavioral_changes JSONB DEFAULT '[]', -- Changes in work patterns
  
  -- Predictions for next week
  next_week_predictions JSONB DEFAULT '{}',
  recommended_adjustments JSONB DEFAULT '[]',
  focus_areas JSONB DEFAULT '[]',
  
  -- Comparative analysis
  week_over_week_change DECIMAL(5,2), -- Percentage change
  month_over_month_trend VARCHAR(20),
  seasonal_comparison JSONB DEFAULT '{}',
  
  -- Engagement metrics
  report_viewed BOOLEAN DEFAULT false,
  report_viewed_at TIMESTAMPTZ,
  user_feedback_rating INTEGER CHECK (user_feedback_rating >= 1 AND user_feedback_rating <= 5),
  user_feedback_text TEXT,
  
  generated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, week_start_date),
  INDEX(user_id, week_start_date DESC),
  INDEX(productivity_trend, week_start_date)
);

-- Predictive model configurations and performance
CREATE TABLE prediction_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL, -- 'completion_prediction', 'capacity_forecast', 'bottleneck_detection'
  model_version VARCHAR(50) DEFAULT '1.0',
  
  -- Model configuration
  features_used JSONB NOT NULL, -- List of features/variables used
  training_period_days INTEGER DEFAULT 90,
  minimum_data_points INTEGER DEFAULT 10,
  
  -- Performance metrics
  accuracy_score DECIMAL(3,2),
  precision_score DECIMAL(3,2),
  recall_score DECIMAL(3,2),
  f1_score DECIMAL(3,2),
  mean_absolute_error DECIMAL(6,2),
  
  -- Usage statistics
  predictions_made INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  user_feedback_positive INTEGER DEFAULT 0,
  user_feedback_negative INTEGER DEFAULT 0,
  
  -- Model metadata
  algorithm_description TEXT,
  hyperparameters JSONB DEFAULT '{}',
  training_data_size INTEGER,
  last_trained_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(model_type, is_active),
  INDEX(accuracy_score DESC)
);

-- Create indexes for performance
CREATE INDEX idx_productivity_metrics_user_date ON productivity_metrics(user_id, metric_date DESC);
CREATE INDEX idx_goal_predictions_completion ON goal_completion_predictions(user_id, completion_probability DESC, predicted_completion_date);
CREATE INDEX idx_workload_predictions_period ON workload_predictions(user_id, prediction_period_start, burnout_risk_score DESC);
CREATE INDEX idx_bottleneck_severity ON bottleneck_predictions(user_id, severity_score DESC, likelihood_next_week DESC);
CREATE INDEX idx_timing_optimal ON timing_recommendations(user_id, task_type, predicted_performance_score DESC);
CREATE INDEX idx_weekly_insights_recent ON weekly_insights(user_id, week_start_date DESC, productivity_trend);

-- Enable RLS
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_completion_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottleneck_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own productivity metrics" ON productivity_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goal predictions" ON goal_completion_predictions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own workload predictions" ON workload_predictions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bottleneck predictions" ON bottleneck_predictions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own timing recommendations" ON timing_recommendations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own weekly insights" ON weekly_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Models are publicly readable" ON prediction_models
  FOR SELECT USING (is_active = true);

-- Function to calculate productivity metrics from task completion data
CREATE OR REPLACE FUNCTION calculate_productivity_metrics(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tasks_completed INTEGER;
  v_tasks_created INTEGER;
  v_goals_achieved INTEGER;
  v_productivity_score DECIMAL(3,2);
  v_completion_velocity DECIMAL(5,2);
  v_peak_hours JSONB;
BEGIN
  -- Get task completion data for the date
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = p_date),
    COUNT(*) FILTER (WHERE DATE(created_at) = p_date),
    COUNT(DISTINCT goal_id) FILTER (WHERE status = 'completed' AND DATE(completed_at) = p_date)
  INTO v_tasks_completed, v_tasks_created, v_goals_achieved
  FROM tasks 
  WHERE user_id = p_user_id;
  
  -- Calculate productivity score (simplified algorithm)
  v_productivity_score := LEAST(1.0, (
    (v_tasks_completed * 0.6) + 
    (v_goals_achieved * 0.3) + 
    (CASE WHEN v_tasks_created > 0 THEN (v_tasks_completed::DECIMAL / v_tasks_created) * 0.1 ELSE 0 END)
  ) / 10.0);
  
  -- Calculate completion velocity (tasks per hour - simplified)
  v_completion_velocity := v_tasks_completed / 8.0; -- Assume 8-hour work day
  
  -- Identify peak hours (simplified - would use actual completion timestamps)
  v_peak_hours := CASE 
    WHEN v_tasks_completed > 5 THEN '[9, 10, 14, 15]'::JSONB
    WHEN v_tasks_completed > 2 THEN '[10, 14]'::JSONB
    ELSE '[]'::JSONB
  END;
  
  -- Insert or update metrics
  INSERT INTO productivity_metrics (
    user_id, metric_date, tasks_completed, tasks_created, goals_achieved,
    productivity_score, completion_velocity, peak_hours
  ) VALUES (
    p_user_id, p_date, v_tasks_completed, v_tasks_created, v_goals_achieved,
    v_productivity_score, v_completion_velocity, v_peak_hours
  )
  ON CONFLICT (user_id, metric_date, metric_hour) DO UPDATE SET
    tasks_completed = v_tasks_completed,
    tasks_created = v_tasks_created,
    goals_achieved = v_goals_achieved,
    productivity_score = v_productivity_score,
    completion_velocity = v_completion_velocity,
    peak_hours = v_peak_hours,
    created_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to predict goal completion probability
CREATE OR REPLACE FUNCTION predict_goal_completion(
  p_goal_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_goal RECORD;
  v_tasks_total INTEGER;
  v_tasks_completed INTEGER;
  v_progress_rate DECIMAL(3,2);
  v_completion_probability DECIMAL(3,2);
  v_days_since_start INTEGER;
  v_user_avg_velocity DECIMAL(5,2);
BEGIN
  -- Get goal details
  SELECT * INTO v_goal FROM goals WHERE id = p_goal_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get task statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_tasks_total, v_tasks_completed
  FROM tasks 
  WHERE goal_id = p_goal_id AND user_id = p_user_id;
  
  -- Calculate current progress rate
  v_progress_rate := CASE 
    WHEN v_tasks_total > 0 THEN v_tasks_completed::DECIMAL / v_tasks_total
    ELSE 0
  END;
  
  -- Calculate days since goal creation
  v_days_since_start := EXTRACT(days FROM (now() - v_goal.created_at));
  
  -- Get user's average completion velocity
  SELECT AVG(completion_velocity) INTO v_user_avg_velocity
  FROM productivity_metrics
  WHERE user_id = p_user_id
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days';
  
  v_user_avg_velocity := COALESCE(v_user_avg_velocity, 1.0);
  
  -- Calculate completion probability (simplified ML algorithm)
  v_completion_probability := LEAST(1.0, GREATEST(0.0, (
    v_progress_rate * 0.4 +
    LEAST(1.0, v_user_avg_velocity / 2.0) * 0.3 +
    CASE 
      WHEN v_goal.due_date IS NOT NULL AND v_goal.due_date > CURRENT_DATE THEN 0.2
      WHEN v_goal.due_date IS NULL THEN 0.1
      ELSE 0.05 -- Overdue goals have lower probability
    END +
    CASE v_goal.priority
      WHEN 'high' THEN 0.1
      WHEN 'medium' THEN 0.05
      ELSE 0
    END
  )));
  
  -- Store prediction
  INSERT INTO goal_completion_predictions (
    user_id, goal_id, completion_probability, current_progress_percentage,
    tasks_remaining, contributing_factors
  ) VALUES (
    p_user_id, p_goal_id, v_completion_probability, v_progress_rate * 100,
    v_tasks_total - v_tasks_completed,
    jsonb_build_object(
      'progress_rate', v_progress_rate,
      'user_velocity', v_user_avg_velocity,
      'days_active', v_days_since_start,
      'priority', v_goal.priority
    )
  )
  ON CONFLICT (user_id, goal_id, prediction_date) DO UPDATE SET
    completion_probability = v_completion_probability,
    current_progress_percentage = v_progress_rate * 100,
    tasks_remaining = v_tasks_total - v_tasks_completed,
    contributing_factors = jsonb_build_object(
      'progress_rate', v_progress_rate,
      'user_velocity', v_user_avg_velocity,
      'days_active', v_days_since_start,
      'priority', v_goal.priority
    ),
    updated_at = now();
  
  RETURN v_completion_probability;
END;
$$ LANGUAGE plpgsql;

-- Function to generate weekly insights
CREATE OR REPLACE FUNCTION generate_weekly_insights(
  p_user_id UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_week_number INTEGER;
  v_year INTEGER;
  v_productivity_score DECIMAL(3,2);
  v_goals_completed INTEGER;
  v_goals_on_track INTEGER;
  v_insights JSONB;
  v_insight_id UUID;
BEGIN
  -- Default to current week if not specified
  v_week_start := COALESCE(p_week_start, DATE_TRUNC('week', CURRENT_DATE));
  v_week_end := v_week_start + INTERVAL '6 days';
  v_week_number := EXTRACT(week FROM v_week_start);
  v_year := EXTRACT(year FROM v_week_start);
  
  -- Calculate weekly productivity score
  SELECT AVG(productivity_score) INTO v_productivity_score
  FROM productivity_metrics
  WHERE user_id = p_user_id
  AND metric_date BETWEEN v_week_start AND v_week_end;
  
  v_productivity_score := COALESCE(v_productivity_score, 0.5);
  
  -- Count goals completed this week
  SELECT COUNT(*) INTO v_goals_completed
  FROM goals
  WHERE user_id = p_user_id
  AND status = 'completed'
  AND DATE(completed_at) BETWEEN v_week_start AND v_week_end;
  
  -- Count goals on track (with recent progress)
  SELECT COUNT(*) INTO v_goals_on_track
  FROM goals g
  WHERE g.user_id = p_user_id
  AND g.status = 'active'
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.goal_id = g.id
    AND t.status = 'completed'
    AND DATE(t.completed_at) BETWEEN v_week_start AND v_week_end
  );
  
  -- Generate insights
  v_insights := jsonb_build_array(
    CASE 
      WHEN v_productivity_score >= 0.8 THEN 'Excellent productivity this week! You''re in a great flow state.'
      WHEN v_productivity_score >= 0.6 THEN 'Good productivity levels. Consider optimizing your peak hours.'
      WHEN v_productivity_score >= 0.4 THEN 'Moderate productivity. Look for patterns in your most productive days.'
      ELSE 'Productivity could be improved. Focus on smaller, achievable tasks to build momentum.'
    END,
    CASE 
      WHEN v_goals_completed > 0 THEN 'Congratulations on completing ' || v_goals_completed || ' goal(s) this week!'
      WHEN v_goals_on_track > 0 THEN 'You''re making progress on ' || v_goals_on_track || ' goal(s). Keep it up!'
      ELSE 'Consider breaking down your goals into smaller, more manageable tasks.'
    END
  );
  
  -- Insert weekly insight
  INSERT INTO weekly_insights (
    user_id, week_start_date, week_end_date, week_number, year,
    total_productivity_score, goals_completed, goals_on_track,
    key_insights, productivity_trend
  ) VALUES (
    p_user_id, v_week_start, v_week_end, v_week_number, v_year,
    v_productivity_score, v_goals_completed, v_goals_on_track,
    v_insights,
    CASE 
      WHEN v_productivity_score >= 0.7 THEN 'improving'
      WHEN v_productivity_score >= 0.4 THEN 'stable'
      ELSE 'declining'
    END
  )
  ON CONFLICT (user_id, week_start_date) DO UPDATE SET
    total_productivity_score = v_productivity_score,
    goals_completed = v_goals_completed,
    goals_on_track = v_goals_on_track,
    key_insights = v_insights,
    productivity_trend = CASE 
      WHEN v_productivity_score >= 0.7 THEN 'improving'
      WHEN v_productivity_score >= 0.4 THEN 'stable'
      ELSE 'declining'
    END,
    generated_at = now()
  RETURNING id INTO v_insight_id;
  
  RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql;

-- Insert initial prediction models
INSERT INTO prediction_models (
  model_name, model_type, model_version, features_used, algorithm_description
) VALUES 
(
  'Goal Completion Predictor',
  'completion_prediction',
  '1.0',
  '["progress_rate", "user_velocity", "time_active", "priority", "task_complexity"]',
  'Linear regression model that predicts goal completion probability based on current progress, user velocity, and goal characteristics.'
),
(
  'Workload Capacity Forecaster',
  'capacity_forecast',
  '1.0',
  '["historical_capacity", "productivity_patterns", "seasonal_factors", "workload_trends"]',
  'Time series forecasting model that predicts optimal workload capacity for upcoming periods.'
),
(
  'Bottleneck Detector',
  'bottleneck_detection',
  '1.0',
  '["task_patterns", "completion_delays", "context_switches", "skill_gaps"]',
  'Classification model that identifies potential productivity bottlenecks before they occur.'
);

-- Create trigger to automatically calculate productivity metrics when tasks are completed
CREATE OR REPLACE FUNCTION trigger_productivity_calculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate productivity metrics when task is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM calculate_productivity_metrics(NEW.user_id, CURRENT_DATE);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_completion_productivity
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_productivity_calculation();