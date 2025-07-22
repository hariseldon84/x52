-- Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT user_streaks_user_id_key UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own streaks
CREATE POLICY "Users can view their own streaks"
  ON public.user_streaks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to update their own streaks
CREATE POLICY "Users can update their own streaks"
  ON public.user_streaks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own streaks
CREATE POLICY "Users can insert their own streaks"
  ON public.user_streaks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks(user_id);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to update streaks when a task is completed
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
  
  -- TODO: Trigger XP rewards for milestones
  -- This would be implemented as a separate function
  -- to handle the XP reward logic
  
  -- TODO: Send notification for new record
  -- This would be implemented as a separate function
  -- to handle notifications
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update streaks when a task is marked as completed
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
-- Note: This assumes there's a 'tasks' table with 'id', 'user_id', and 'completed' columns
-- You may need to adjust the table and column names to match your schema
-- CREATE TRIGGER update_streak_after_task_completion
-- AFTER UPDATE OF completed ON public.tasks
-- FOR EACH ROW
-- WHEN (NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL))
-- EXECUTE FUNCTION public.trigger_update_streak();

-- Add a comment to explain the table
COMMENT ON TABLE public.user_streaks IS 'Tracks user streaks for daily task completion';

-- Add comments to columns
COMMENT ON COLUMN public.user_streaks.user_id IS 'Reference to the user';
COMMENT ON COLUMN public.user_streaks.current_streak IS 'Current consecutive days of task completion';
COMMENT ON COLUMN public.user_streaks.longest_streak IS 'Longest streak of consecutive days';
COMMENT ON COLUMN public.user_streaks.last_activity_date IS 'Most recent date with task completion';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_streaks TO authenticated_user;
GRANT USAGE, SELECT ON SEQUENCE public.user_streaks_id_seq TO authenticated_user;
