-- Create analytics functions and aggregation logic for Epic 5
-- This migration implements the business logic for productivity analytics

-- Function to calculate user productivity score
CREATE OR REPLACE FUNCTION calculate_productivity_score(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  task_completion_score DECIMAL(3,2) := 0;
  streak_score DECIMAL(3,2) := 0;
  xp_score DECIMAL(3,2) := 0;
  consistency_score DECIMAL(3,2) := 0;
  total_score DECIMAL(3,2) := 0;
BEGIN
  -- Task completion score (0-3 points)
  SELECT COALESCE(
    LEAST(3.0, COUNT(*) * 0.3), 0
  ) INTO task_completion_score
  FROM tasks 
  WHERE user_id = p_user_id 
    AND completed = true 
    AND DATE(completed_at) = p_date;
  
  -- Streak score (0-2 points)
  SELECT COALESCE(
    LEAST(2.0, current_streak * 0.1), 0
  ) INTO streak_score
  FROM user_streaks 
  WHERE user_id = p_user_id;
  
  -- XP score (0-3 points)
  SELECT COALESCE(
    LEAST(3.0, SUM(xp_earned) * 0.01), 0
  ) INTO xp_score
  FROM tasks 
  WHERE user_id = p_user_id 
    AND completed = true 
    AND DATE(completed_at) = p_date;
  
  -- Consistency score (0-2 points) - based on goal progress
  SELECT COALESCE(
    LEAST(2.0, AVG(progress) * 0.02), 0
  ) INTO consistency_score
  FROM goals 
  WHERE user_id = p_user_id 
    AND completed = false;
  
  total_score := task_completion_score + streak_score + xp_score + consistency_score;
  
  RETURN LEAST(10.0, total_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate wellness score
CREATE OR REPLACE FUNCTION calculate_wellness_score(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  burnout_risk DECIMAL(3,2) := 0;
  work_balance DECIMAL(3,2) := 5.0;
  consistency DECIMAL(3,2) := 5.0;
  wellness_score DECIMAL(3,2) := 5.0;
  task_count INTEGER := 0;
  avg_completion_time DECIMAL(4,2) := 0;
BEGIN
  -- Get recent task completion patterns
  SELECT COUNT(*), AVG(EXTRACT(HOUR FROM completed_at)) 
  INTO task_count, avg_completion_time
  FROM tasks 
  WHERE user_id = p_user_id 
    AND completed = true 
    AND completed_at >= p_date - INTERVAL '7 days';
  
  -- Calculate burnout risk (inverse relationship)
  IF task_count > 50 THEN -- High task volume
    burnout_risk := 8.0;
  ELSIF task_count > 30 THEN
    burnout_risk := 6.0;
  ELSIF task_count > 15 THEN
    burnout_risk := 4.0;
  ELSE
    burnout_risk := 2.0;
  END IF;
  
  -- Work-life balance (based on completion times)
  IF avg_completion_time IS NOT NULL THEN
    IF avg_completion_time BETWEEN 9 AND 17 THEN -- Normal hours
      work_balance := 8.0;
    ELSIF avg_completion_time BETWEEN 7 AND 19 THEN -- Extended hours
      work_balance := 6.0;
    ELSE -- Off hours
      work_balance := 3.0;
    END IF;
  END IF;
  
  -- Calculate overall wellness (lower burnout risk = higher wellness)
  wellness_score := (10.0 - burnout_risk + work_balance) / 2;
  
  RETURN LEAST(10.0, GREATEST(0.0, wellness_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect productivity patterns
CREATE OR REPLACE FUNCTION analyze_productivity_patterns(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  peak_hours JSONB;
  peak_days JSONB;
  productivity_trend JSONB;
  result JSONB;
BEGIN
  -- Find peak productivity hours
  WITH hourly_stats AS (
    SELECT 
      EXTRACT(HOUR FROM completed_at) as hour,
      COUNT(*) as task_count,
      AVG(xp_earned) as avg_xp
    FROM tasks 
    WHERE user_id = p_user_id 
      AND completed = true 
      AND completed_at >= CURRENT_DATE - p_days_back
    GROUP BY EXTRACT(HOUR FROM completed_at)
    ORDER BY task_count DESC, avg_xp DESC
    LIMIT 3
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', hour,
      'task_count', task_count,
      'avg_xp', avg_xp
    )
  ) INTO peak_hours
  FROM hourly_stats;
  
  -- Find peak productivity days
  WITH daily_stats AS (
    SELECT 
      EXTRACT(ISODOW FROM completed_at) as day_of_week,
      COUNT(*) as task_count,
      AVG(xp_earned) as avg_xp
    FROM tasks 
    WHERE user_id = p_user_id 
      AND completed = true 
      AND completed_at >= CURRENT_DATE - p_days_back
    GROUP BY EXTRACT(ISODOW FROM completed_at)
    ORDER BY task_count DESC, avg_xp DESC
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'day_of_week', day_of_week,
      'task_count', task_count,
      'avg_xp', avg_xp
    )
  ) INTO peak_days
  FROM daily_stats;
  
  -- Calculate productivity trend
  WITH weekly_productivity AS (
    SELECT 
      DATE_TRUNC('week', completed_at) as week,
      COUNT(*) as tasks,
      SUM(xp_earned) as total_xp
    FROM tasks 
    WHERE user_id = p_user_id 
      AND completed = true 
      AND completed_at >= CURRENT_DATE - p_days_back
    GROUP BY DATE_TRUNC('week', completed_at)
    ORDER BY week
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'week', week,
      'tasks', tasks,
      'total_xp', total_xp
    )
  ) INTO productivity_trend
  FROM weekly_productivity;
  
  result := jsonb_build_object(
    'peak_hours', COALESCE(peak_hours, '[]'::jsonb),
    'peak_days', COALESCE(peak_days, '[]'::jsonb),
    'productivity_trend', COALESCE(productivity_trend, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate goal success rate
CREATE OR REPLACE FUNCTION calculate_goal_success_rate(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 90
) RETURNS JSONB AS $$
DECLARE
  total_goals INTEGER := 0;
  completed_goals INTEGER := 0;
  abandoned_goals INTEGER := 0;
  success_rate DECIMAL(3,2) := 0;
  avg_completion_days DECIMAL(5,1) := 0;
  result JSONB;
BEGIN
  -- Count goals by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*) FILTER (WHERE completed = false AND updated_at < CURRENT_DATE - INTERVAL '30 days')
  INTO total_goals, completed_goals, abandoned_goals
  FROM goals 
  WHERE user_id = p_user_id 
    AND created_at >= CURRENT_DATE - p_days_back;
  
  -- Calculate success rate
  IF total_goals > 0 THEN
    success_rate := completed_goals::DECIMAL / total_goals::DECIMAL;
  END IF;
  
  -- Calculate average completion time
  SELECT AVG(completed_at - created_at) 
  INTO avg_completion_days
  FROM goals 
  WHERE user_id = p_user_id 
    AND completed = true
    AND created_at >= CURRENT_DATE - p_days_back;
  
  result := jsonb_build_object(
    'total_goals', total_goals,
    'completed_goals', completed_goals,
    'abandoned_goals', abandoned_goals,
    'success_rate', success_rate,
    'avg_completion_days', COALESCE(EXTRACT(DAYS FROM avg_completion_days), 0)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate contact interaction insights
CREATE OR REPLACE FUNCTION analyze_contact_interactions(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  total_interactions INTEGER := 0;
  unique_contacts INTEGER := 0;
  avg_interactions_per_contact DECIMAL(4,1) := 0;
  top_contacts JSONB;
  interaction_types JSONB;
  result JSONB;
BEGIN
  -- Basic interaction stats
  SELECT 
    COUNT(*),
    COUNT(DISTINCT contact_id)
  INTO total_interactions, unique_contacts
  FROM interactions 
  WHERE user_id = p_user_id 
    AND created_at >= CURRENT_DATE - p_days_back;
  
  -- Calculate average interactions per contact
  IF unique_contacts > 0 THEN
    avg_interactions_per_contact := total_interactions::DECIMAL / unique_contacts::DECIMAL;
  END IF;
  
  -- Get top contacts by interaction count
  WITH contact_stats AS (
    SELECT 
      c.name,
      COUNT(i.*) as interaction_count,
      MAX(i.created_at) as last_interaction
    FROM contacts c
    LEFT JOIN interactions i ON c.id = i.contact_id
    WHERE c.user_id = p_user_id 
      AND i.created_at >= CURRENT_DATE - p_days_back
    GROUP BY c.id, c.name
    ORDER BY interaction_count DESC
    LIMIT 5
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', name,
      'interaction_count', interaction_count,
      'last_interaction', last_interaction
    )
  ) INTO top_contacts
  FROM contact_stats;
  
  -- Get interaction type distribution
  WITH type_stats AS (
    SELECT 
      interaction_type,
      COUNT(*) as count
    FROM interactions 
    WHERE user_id = p_user_id 
      AND created_at >= CURRENT_DATE - p_days_back
    GROUP BY interaction_type
  )
  SELECT jsonb_object_agg(interaction_type, count)
  INTO interaction_types
  FROM type_stats;
  
  result := jsonb_build_object(
    'total_interactions', total_interactions,
    'unique_contacts', unique_contacts,
    'avg_interactions_per_contact', avg_interactions_per_contact,
    'top_contacts', COALESCE(top_contacts, '[]'::jsonb),
    'interaction_types', COALESCE(interaction_types, '{}'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily analytics summary
CREATE OR REPLACE FUNCTION update_daily_analytics_summary(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
  productivity_score DECIMAL(3,2);
  wellness_score DECIMAL(3,2);
  networking_score DECIMAL(3,2);
  overall_score DECIMAL(3,2);
BEGIN
  -- Calculate scores
  productivity_score := calculate_productivity_score(p_user_id, p_date);
  wellness_score := calculate_wellness_score(p_user_id, p_date);
  
  -- Simple networking score based on interactions
  SELECT COALESCE(LEAST(10.0, COUNT(*) * 0.5), 0)
  INTO networking_score
  FROM interactions 
  WHERE user_id = p_user_id 
    AND DATE(created_at) = p_date;
  
  -- Overall score (weighted average)
  overall_score := (productivity_score * 0.5 + wellness_score * 0.3 + networking_score * 0.2);
  
  -- Insert or update daily summary
  INSERT INTO user_analytics_summary (
    user_id, summary_date, productivity_score, wellness_score, 
    networking_score, overall_score
  ) VALUES (
    p_user_id, p_date, productivity_score, wellness_score,
    networking_score, overall_score
  )
  ON CONFLICT (user_id, summary_date) 
  DO UPDATE SET
    productivity_score = EXCLUDED.productivity_score,
    wellness_score = EXCLUDED.wellness_score,
    networking_score = EXCLUDED.networking_score,
    overall_score = EXCLUDED.overall_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate productivity insights
CREATE OR REPLACE FUNCTION generate_productivity_insights(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  patterns JSONB;
  goal_stats JSONB;
  interaction_stats JSONB;
  productivity_score DECIMAL(3,2);
  wellness_score DECIMAL(3,2);
BEGIN
  -- Get analytics data
  patterns := analyze_productivity_patterns(p_user_id);
  goal_stats := calculate_goal_success_rate(p_user_id);
  interaction_stats := analyze_contact_interactions(p_user_id);
  productivity_score := calculate_productivity_score(p_user_id);
  wellness_score := calculate_wellness_score(p_user_id);
  
  -- Clear old insights (keep only last 30)
  DELETE FROM productivity_insights 
  WHERE user_id = p_user_id 
    AND created_at < CURRENT_DATE - INTERVAL '30 days';
  
  -- Generate peak hours insight
  IF jsonb_array_length(patterns->'peak_hours') > 0 THEN
    INSERT INTO productivity_insights (
      user_id, insight_type, insight_category, title, description,
      data_payload, confidence_score, is_actionable, action_recommendations
    ) VALUES (
      p_user_id, 'peak_hours', 'productivity', 
      'Peak Productivity Hours Identified',
      'Based on your task completion patterns, you are most productive during specific hours.',
      patterns->'peak_hours',
      0.85,
      true,
      '["Schedule important tasks during peak hours", "Block calendar during high-productivity times"]'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Generate wellness insight
  IF wellness_score < 4.0 THEN
    INSERT INTO productivity_insights (
      user_id, insight_type, insight_category, title, description,
      data_payload, confidence_score, priority_level, is_actionable, action_recommendations
    ) VALUES (
      p_user_id, 'burnout_risk', 'wellness',
      'Potential Burnout Risk Detected',
      'Your recent activity patterns suggest you may be at risk of burnout.',
      jsonb_build_object('wellness_score', wellness_score, 'risk_level', 'medium'),
      0.75,
      'high',
      true,
      '["Take regular breaks", "Reduce task load", "Focus on work-life balance", "Consider scheduling rest days"]'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Generate goal success insight
  IF (goal_stats->>'success_rate')::DECIMAL < 0.5 THEN
    INSERT INTO productivity_insights (
      user_id, insight_type, insight_category, title, description,
      data_payload, confidence_score, is_actionable, action_recommendations
    ) VALUES (
      p_user_id, 'goal_success_rate', 'goals',
      'Goal Completion Rate Below Average',
      'Your goal completion rate could be improved with better planning.',
      goal_stats,
      0.80,
      true,
      '["Break large goals into smaller tasks", "Set more realistic deadlines", "Review and adjust goals regularly"]'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_productivity_score(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_wellness_score(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_productivity_patterns(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_goal_success_rate(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_contact_interactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_analytics_summary(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_productivity_insights(UUID) TO authenticated;