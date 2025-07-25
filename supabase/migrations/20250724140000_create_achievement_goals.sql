-- Create achievement_goals table for users to set goals and reminders for specific achievements
CREATE TABLE IF NOT EXISTS achievement_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_frequency TEXT CHECK (reminder_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one active goal per user per achievement
  UNIQUE(user_id, achievement_id, is_active) WHERE is_active = true
);

-- Enable RLS
ALTER TABLE achievement_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own achievement goals" ON achievement_goals
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_achievement_goals_user_id ON achievement_goals(user_id);
CREATE INDEX idx_achievement_goals_achievement_id ON achievement_goals(achievement_id);
CREATE INDEX idx_achievement_goals_target_date ON achievement_goals(target_date);
CREATE INDEX idx_achievement_goals_active ON achievement_goals(is_active) WHERE is_active = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_achievement_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_achievement_goals_updated_at
  BEFORE UPDATE ON achievement_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_achievement_goals_updated_at();