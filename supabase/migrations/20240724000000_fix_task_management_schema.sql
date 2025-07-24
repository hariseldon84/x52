-- Fix inconsistencies in existing task management schema
-- This migration updates the existing schema to be consistent with the codebase

-- Update tasks table to include missing columns and fix inconsistencies
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Update projects table to include missing progress tracking columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS task_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_task_count INTEGER DEFAULT 0;

-- Update goals table to include missing columns
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 0;

-- Create xp_events table for XP tracking (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for xp_events
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for xp_events
CREATE POLICY "Users can view their own xp events" 
  ON public.xp_events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own xp events" 
  ON public.xp_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for xp_events
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_event_type ON public.xp_events(event_type);

-- Create function to get user's total XP
CREATE OR REPLACE FUNCTION get_user_total_xp(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(xp_amount) FROM public.xp_events WHERE user_id = get_user_total_xp.user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update project progress when tasks change
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  project_progress INTEGER;
BEGIN
  -- Get task counts for the project
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE completed = true) as completed
  INTO total_tasks, completed_tasks
  FROM public.tasks 
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Calculate progress percentage
  project_progress := CASE 
    WHEN total_tasks = 0 THEN 0 
    ELSE ROUND((completed_tasks::FLOAT / total_tasks::FLOAT) * 100) 
  END;
  
  -- Update project with new counts and progress
  UPDATE public.projects 
  SET 
    task_count = total_tasks,
    completed_task_count = completed_tasks,
    progress = project_progress,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update project progress
DROP TRIGGER IF EXISTS update_project_progress_trigger ON public.tasks;
CREATE TRIGGER update_project_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();

-- Function to update goal progress when projects change
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_projects INTEGER;
  completed_projects INTEGER;
  goal_progress INTEGER;
BEGIN
  -- Get project counts for the goal
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
  INTO total_projects, completed_projects
  FROM public.projects 
  WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id);
  
  -- Calculate progress percentage
  goal_progress := CASE 
    WHEN total_projects = 0 THEN 0 
    ELSE ROUND((completed_projects::FLOAT / total_projects::FLOAT) * 100) 
  END;
  
  -- Update goal with new progress
  UPDATE public.goals 
  SET 
    progress = goal_progress,
    completed = (goal_progress = 100),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update goal progress
DROP TRIGGER IF EXISTS update_goal_progress_trigger ON public.projects;
CREATE TRIGGER update_goal_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress();

-- Function to award XP when tasks are completed
CREATE OR REPLACE FUNCTION award_task_completion_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_amount INTEGER;
BEGIN
  -- Only award XP when task is being completed (not when updating other fields)
  IF NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL) THEN
    -- Calculate XP based on complexity
    xp_amount := calculate_task_xp(NEW.complexity);
    
    -- Insert XP event
    INSERT INTO public.xp_events (user_id, xp_amount, event_type, description)
    VALUES (NEW.user_id, xp_amount, 'task_completion', 'Completed task: ' || NEW.title);
    
    -- Update task with XP earned
    NEW.xp_earned := xp_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to award XP on task completion
DROP TRIGGER IF EXISTS award_task_xp_trigger ON public.tasks;
CREATE TRIGGER award_task_xp_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_task_completion_xp();

-- Update the existing streak function to work with the new completed column
CREATE OR REPLACE FUNCTION public.update_streak_on_task_completion(task_id UUID)
RETURNS void AS $$
DECLARE
  user_id UUID;
  today DATE := (CURRENT_DATE AT TIME ZONE 'UTC');
  yesterday DATE := (CURRENT_DATE - INTERVAL '1 day' AT TIME ZONE 'UTC');
  last_activity_date DATE;
  current_streak INTEGER;
  longest_streak INTEGER;
  new_streak INTEGER;
  is_new_record BOOLEAN := FALSE;
BEGIN
  -- Get the user who completed the task
  SELECT t.user_id INTO user_id
  FROM public.tasks t
  WHERE t.id = task_id AND t.completed = true;
  
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get or create the user's streak record
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current streak data
  SELECT 
    us.current_streak, 
    us.longest_streak, 
    us.last_activity_date
  INTO current_streak, longest_streak, last_activity_date
  FROM public.user_streaks us
  WHERE us.user_id = user_id;
  
  -- Calculate new streak
  IF last_activity_date IS NULL OR last_activity_date < yesterday THEN
    -- Reset streak if more than one day has passed
    new_streak := 1;
  ELSIF last_activity_date = today THEN
    -- Already updated today, no change needed
    RETURN;
  ELSIF last_activity_date = yesterday THEN
    -- Increment streak if consecutive days
    new_streak := current_streak + 1;
  END IF;
  
  -- Update longest streak if needed
  IF new_streak > longest_streak THEN
    longest_streak := new_streak;
    is_new_record := TRUE;
  END IF;
  
  -- Update the streak record
  UPDATE public.user_streaks
  SET 
    current_streak = new_streak,
    longest_streak = longest_streak,
    last_activity_date = today
  WHERE user_id = user_id;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update streaks when a task is marked as completed
CREATE OR REPLACE FUNCTION public.trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL) THEN
    PERFORM public.update_streak_on_task_completion(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the tasks table
DROP TRIGGER IF EXISTS update_streak_after_task_completion ON public.tasks;
CREATE TRIGGER update_streak_after_task_completion
AFTER UPDATE OF completed ON public.tasks
FOR EACH ROW
WHEN (NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL))
EXECUTE FUNCTION public.trigger_update_streak();

-- Grant permissions for new tables
GRANT SELECT, INSERT, UPDATE ON TABLE public.xp_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_total_xp(UUID) TO authenticated;