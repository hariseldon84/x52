-- Create achievements system for Epic 4: Achievement & Progression System
-- This migration creates the foundational achievements tables and tracking system

-- Create achievement category enum
CREATE TYPE achievement_category AS ENUM ('productivity', 'social', 'exploration', 'mastery');

-- Create achievement rarity enum
CREATE TYPE achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- Create achievements definition table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic achievement information
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  unlock_criteria JSONB NOT NULL, -- Flexible criteria definition
  
  -- Classification
  category achievement_category NOT NULL DEFAULT 'productivity',
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  
  -- Rewards
  xp_reward INTEGER NOT NULL DEFAULT 0,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Rarity-based multiplier
  
  -- Display
  icon_name VARCHAR(50), -- Icon identifier for UI
  color_scheme VARCHAR(20), -- Color theme for the achievement
  is_hidden BOOLEAN DEFAULT FALSE, -- Hidden until unlocked
  
  -- System
  is_active BOOLEAN DEFAULT TRUE, -- Can be deactivated
  sort_order INTEGER DEFAULT 0, -- Display ordering
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_achievements table for tracking unlocked achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  -- Unlock details
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  unlock_context JSONB, -- Context data when unlocked (e.g., which task, streak count)
  
  -- Social sharing
  is_shared BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMP WITH TIME ZONE,
  share_platforms TEXT[], -- Which platforms it was shared to
  
  -- Constraints
  UNIQUE(user_id, achievement_id) -- Prevent duplicate unlocks
);

-- Create achievement_progress table for tracking progress toward achievements
CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  -- Progress tracking
  current_progress JSONB NOT NULL DEFAULT '{}', -- Current progress state
  progress_percentage INTEGER DEFAULT 0, -- 0-100 percentage
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, achievement_id), -- One progress record per user per achievement
  CONSTRAINT progress_percentage_valid CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Create achievement_notifications table for notification management
CREATE TABLE IF NOT EXISTS public.achievement_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL, -- 'unlock', 'progress', 'reminder'
  title VARCHAR(200) NOT NULL,
  message TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery
  show_in_app BOOLEAN DEFAULT TRUE,
  show_push BOOLEAN DEFAULT FALSE,
  show_email BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_achievements_rarity ON public.achievements(rarity);
CREATE INDEX idx_achievements_active ON public.achievements(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_achievements_sort ON public.achievements(sort_order, created_at);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at);
CREATE INDEX idx_user_achievements_user_unlocked ON public.user_achievements(user_id, unlocked_at);

CREATE INDEX idx_achievement_progress_user_id ON public.achievement_progress(user_id);
CREATE INDEX idx_achievement_progress_user_achievement ON public.achievement_progress(user_id, achievement_id);
CREATE INDEX idx_achievement_progress_percentage ON public.achievement_progress(progress_percentage);

CREATE INDEX idx_achievement_notifications_user_id ON public.achievement_notifications(user_id);
CREATE INDEX idx_achievement_notifications_unread ON public.achievement_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view active achievements" 
  ON public.achievements FOR SELECT 
  TO authenticated
  USING (is_active = TRUE);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
  ON public.user_achievements FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
  ON public.user_achievements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" 
  ON public.user_achievements FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for achievement_progress
CREATE POLICY "Users can view their own achievement progress" 
  ON public.achievement_progress FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievement progress" 
  ON public.achievement_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement progress" 
  ON public.achievement_progress FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for achievement_notifications
CREATE POLICY "Users can view their own achievement notifications" 
  ON public.achievement_notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification status" 
  ON public.achievement_notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON TABLE public.achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.achievement_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.achievement_notifications TO authenticated;

-- Function to calculate achievement XP with rarity multiplier
CREATE OR REPLACE FUNCTION calculate_achievement_xp(base_xp INTEGER, rarity achievement_rarity)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE rarity
    WHEN 'common' THEN base_xp
    WHEN 'rare' THEN ROUND(base_xp * 1.5)
    WHEN 'epic' THEN base_xp * 2
    WHEN 'legendary' THEN base_xp * 3
    ELSE base_xp
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to unlock achievement for user
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id UUID,
  p_unlock_context JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  achievement_record RECORD;
  calculated_xp INTEGER;
  already_unlocked BOOLEAN;
BEGIN
  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO already_unlocked;
  
  IF already_unlocked THEN
    RETURN FALSE; -- Already unlocked
  END IF;
  
  -- Get achievement details
  SELECT * INTO achievement_record
  FROM public.achievements
  WHERE id = p_achievement_id AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- Achievement not found or inactive
  END IF;
  
  -- Calculate XP with rarity multiplier
  calculated_xp := calculate_achievement_xp(achievement_record.xp_reward, achievement_record.rarity);
  
  -- Unlock the achievement
  INSERT INTO public.user_achievements (
    user_id,
    achievement_id,
    xp_earned,
    unlock_context
  ) VALUES (
    p_user_id,
    p_achievement_id,
    calculated_xp,
    p_unlock_context
  );
  
  -- Award XP to user
  INSERT INTO public.xp_events (user_id, xp_amount, event_type, description)
  VALUES (
    p_user_id,
    calculated_xp,
    'achievement_unlock',
    'Unlocked achievement: ' || achievement_record.title
  );
  
  -- Create notification
  INSERT INTO public.achievement_notifications (
    user_id,
    achievement_id,
    notification_type,
    title,
    message
  ) VALUES (
    p_user_id,
    p_achievement_id,
    'unlock',
    'Achievement Unlocked!',
    'You have unlocked "' || achievement_record.title || '" and earned ' || calculated_xp || ' XP!'
  );
  
  -- Remove progress tracking (no longer needed)
  DELETE FROM public.achievement_progress
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update achievement progress
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id UUID,
  p_achievement_id UUID,
  p_progress JSONB,
  p_percentage INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update progress
  INSERT INTO public.achievement_progress (
    user_id,
    achievement_id,
    current_progress,
    progress_percentage,
    last_updated
  ) VALUES (
    p_user_id,
    p_achievement_id,
    p_progress,
    GREATEST(0, LEAST(100, p_percentage)), -- Clamp between 0-100
    NOW()
  )
  ON CONFLICT (user_id, achievement_id) 
  DO UPDATE SET
    current_progress = EXCLUDED.current_progress,
    progress_percentage = GREATEST(0, LEAST(100, EXCLUDED.progress_percentage)),
    last_updated = NOW();
  
  -- Auto-unlock if 100% progress
  IF p_percentage >= 100 THEN
    PERFORM unlock_achievement(p_user_id, p_achievement_id, p_progress);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_achievement_xp(INTEGER, achievement_rarity) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_achievement(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_achievement_progress(UUID, UUID, JSONB, INTEGER) TO authenticated;