-- Achievement tracking triggers and logic for Epic 4: Achievement & Progression System
-- This migration adds trigger functions to automatically track and unlock achievements

-- Function to check and unlock task completion achievements
CREATE OR REPLACE FUNCTION check_task_completion_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  total_tasks INTEGER;
  simple_tasks INTEGER;
  medium_tasks INTEGER;
  complex_tasks INTEGER;
  achievement_record RECORD;
BEGIN
  -- Get task counts
  SELECT 
    COUNT(*) FILTER (WHERE completed = true) as total,
    COUNT(*) FILTER (WHERE completed = true AND complexity = 'simple') as simple,
    COUNT(*) FILTER (WHERE completed = true AND complexity = 'medium') as medium,
    COUNT(*) FILTER (WHERE completed = true AND complexity = 'complex') as complex
  INTO total_tasks, simple_tasks, medium_tasks, complex_tasks
  FROM public.tasks
  WHERE user_id = p_user_id;

  -- Check general task completion achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'productivity' 
    AND unlock_criteria->>'type' = 'task_completion'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF total_tasks >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('total_tasks', total_tasks, 'trigger', 'task_completion'));
      ELSE
        -- Update progress
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', total_tasks, 'required_count', required_count),
          ROUND((total_tasks::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;

  -- Check complexity-specific achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'productivity' 
    AND unlock_criteria->>'type' = 'complexity_completion'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
      complexity_type TEXT := achievement_record.unlock_criteria->>'complexity';
      current_count INTEGER;
    BEGIN
      current_count := CASE complexity_type
        WHEN 'simple' THEN simple_tasks
        WHEN 'medium' THEN medium_tasks
        WHEN 'complex' THEN complex_tasks
        ELSE 0
      END;

      IF current_count >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('complexity', complexity_type, 'count', current_count));
      ELSE
        -- Update progress
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', current_count, 'required_count', required_count, 'complexity', complexity_type),
          ROUND((current_count::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check XP milestone achievements
CREATE OR REPLACE FUNCTION check_xp_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  total_xp INTEGER;
  achievement_record RECORD;
BEGIN
  -- Get total XP
  SELECT get_user_total_xp(p_user_id) INTO total_xp;

  -- Check XP milestone achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'productivity' 
    AND unlock_criteria->>'type' = 'xp_milestone'
    AND is_active = true
  LOOP
    DECLARE
      required_xp INTEGER := (achievement_record.unlock_criteria->>'amount')::INTEGER;
    BEGIN
      IF total_xp >= required_xp THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('total_xp', total_xp, 'milestone', required_xp));
      ELSE
        -- Update progress
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_xp', total_xp, 'required_xp', required_xp),
          ROUND((total_xp::FLOAT / required_xp::FLOAT) * 100));
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check streak achievements
CREATE OR REPLACE FUNCTION check_streak_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_streak INTEGER;
  longest_streak INTEGER;
  achievement_record RECORD;
BEGIN
  -- Get streak info
  SELECT 
    COALESCE(current_streak, 0),
    COALESCE(longest_streak, 0)
  INTO current_streak, longest_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  -- Check streak achievements (use longest streak to prevent re-unlocking)
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'productivity' 
    AND unlock_criteria->>'type' = 'streak'
    AND is_active = true
  LOOP
    DECLARE
      required_days INTEGER := (achievement_record.unlock_criteria->>'days')::INTEGER;
    BEGIN
      IF longest_streak >= required_days THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('streak_days', longest_streak, 'required_days', required_days));
      ELSE
        -- Update progress based on current streak
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_streak', current_streak, 'required_days', required_days),
          ROUND((current_streak::FLOAT / required_days::FLOAT) * 100));
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check social achievements (contacts, interactions)
CREATE OR REPLACE FUNCTION check_social_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  contact_count INTEGER;
  interaction_count INTEGER;
  contact_task_count INTEGER;
  achievement_record RECORD;
BEGIN
  -- Get social metrics
  SELECT 
    (SELECT COUNT(*) FROM public.contacts WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM public.contact_interactions WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM public.tasks WHERE user_id = p_user_id AND contact_id IS NOT NULL AND completed = true)
  INTO contact_count, interaction_count, contact_task_count;

  -- Check contact creation achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'social' 
    AND unlock_criteria->>'type' = 'contact_creation'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF contact_count >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('contact_count', contact_count));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', contact_count, 'required_count', required_count),
          ROUND((contact_count::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;

  -- Check interaction achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'social' 
    AND unlock_criteria->>'type' = 'interaction_count'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF interaction_count >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('interaction_count', interaction_count));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', interaction_count, 'required_count', required_count),
          ROUND((interaction_count::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;

  -- Check contact task completion achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'social' 
    AND unlock_criteria->>'type' = 'contact_task_completion'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF contact_task_count >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('contact_task_count', contact_task_count));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', contact_task_count, 'required_count', required_count),
          ROUND((contact_task_count::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check exploration achievements (goals, projects)
CREATE OR REPLACE FUNCTION check_exploration_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  goal_count INTEGER;
  project_count INTEGER;
  achievement_record RECORD;
BEGIN
  -- Get exploration metrics
  SELECT 
    (SELECT COUNT(*) FROM public.goals WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM public.projects WHERE user_id = p_user_id)
  INTO goal_count, project_count;

  -- Check goal creation achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'exploration' 
    AND unlock_criteria->>'type' = 'goal_creation'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF goal_count >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('goal_count', goal_count));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', goal_count, 'required_count', required_count),
          ROUND((goal_count::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;

  -- Check project creation achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'exploration' 
    AND unlock_criteria->>'type' = 'project_creation'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF project_count >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('project_count', project_count));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', project_count, 'required_count', required_count),
          ROUND((project_count::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check mastery achievements (completions)
CREATE OR REPLACE FUNCTION check_mastery_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  completed_goals INTEGER;
  completed_projects INTEGER;
  completed_followups INTEGER;
  achievement_record RECORD;
BEGIN
  -- Get mastery metrics
  SELECT 
    (SELECT COUNT(*) FROM public.goals WHERE user_id = p_user_id AND completed = true),
    (SELECT COUNT(*) FROM public.projects WHERE user_id = p_user_id AND status = 'completed'),
    (SELECT COUNT(*) FROM public.follow_ups WHERE user_id = p_user_id AND status = 'completed')
  INTO completed_goals, completed_projects, completed_followups;

  -- Check goal completion achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'mastery' 
    AND unlock_criteria->>'type' = 'goal_completion'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF completed_goals >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('completed_goals', completed_goals));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', completed_goals, 'required_count', required_count),
          ROUND((completed_goals::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;

  -- Check project completion achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'mastery' 
    AND unlock_criteria->>'type' = 'project_completion'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF completed_projects >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('completed_projects', completed_projects));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', completed_projects, 'required_count', required_count),
          ROUND((completed_projects::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;

  -- Check follow-up completion achievements
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE category = 'mastery' 
    AND unlock_criteria->>'type' = 'followup_completion'
    AND is_active = true
  LOOP
    DECLARE
      required_count INTEGER := (achievement_record.unlock_criteria->>'count')::INTEGER;
    BEGIN
      IF completed_followups >= required_count THEN
        PERFORM unlock_achievement(p_user_id, achievement_record.id, 
          jsonb_build_object('completed_followups', completed_followups));
      ELSE
        PERFORM update_achievement_progress(p_user_id, achievement_record.id,
          jsonb_build_object('current_count', completed_followups, 'required_count', required_count),
          ROUND((completed_followups::FLOAT / required_count::FLOAT) * 100));
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main achievement check function
CREATE OR REPLACE FUNCTION check_all_achievements(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM check_task_completion_achievements(p_user_id);
  PERFORM check_xp_achievements(p_user_id);
  PERFORM check_streak_achievements(p_user_id);
  PERFORM check_social_achievements(p_user_id);
  PERFORM check_exploration_achievements(p_user_id);
  PERFORM check_mastery_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for task completion
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check achievements when a task is completed
  IF NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL) THEN
    PERFORM check_all_achievements(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for XP events
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_xp()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_xp_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for streak updates
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_streak_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for contact creation
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_contact()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_social_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for interaction logging
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_social_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for goal creation/completion
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_goal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_exploration_achievements(NEW.user_id);
  PERFORM check_mastery_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for project creation/completion
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_project()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_exploration_achievements(NEW.user_id);
  PERFORM check_mastery_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for follow-up completion
CREATE OR REPLACE FUNCTION trigger_achievement_check_on_followup()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_mastery_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS achievement_check_on_task_completion ON public.tasks;
CREATE TRIGGER achievement_check_on_task_completion
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_task();

DROP TRIGGER IF EXISTS achievement_check_on_xp_event ON public.xp_events;
CREATE TRIGGER achievement_check_on_xp_event
  AFTER INSERT ON public.xp_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_xp();

DROP TRIGGER IF EXISTS achievement_check_on_streak_update ON public.user_streaks;
CREATE TRIGGER achievement_check_on_streak_update
  AFTER UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_streak();

DROP TRIGGER IF EXISTS achievement_check_on_contact_creation ON public.contacts;
CREATE TRIGGER achievement_check_on_contact_creation
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_contact();

DROP TRIGGER IF EXISTS achievement_check_on_interaction_creation ON public.contact_interactions;
CREATE TRIGGER achievement_check_on_interaction_creation
  AFTER INSERT ON public.contact_interactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_interaction();

DROP TRIGGER IF EXISTS achievement_check_on_goal_change ON public.goals;
CREATE TRIGGER achievement_check_on_goal_change
  AFTER INSERT OR UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_goal();

DROP TRIGGER IF EXISTS achievement_check_on_project_change ON public.projects;
CREATE TRIGGER achievement_check_on_project_change
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_project();

DROP TRIGGER IF EXISTS achievement_check_on_followup_completion ON public.follow_ups;
CREATE TRIGGER achievement_check_on_followup_completion
  AFTER UPDATE ON public.follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check_on_followup();

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION check_task_completion_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_xp_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_streak_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_social_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_exploration_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_mastery_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_all_achievements(UUID) TO authenticated;