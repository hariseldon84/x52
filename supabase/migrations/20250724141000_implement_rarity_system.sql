-- Implement rarity-based XP multipliers and category completion bonuses
-- This migration enhances the achievement system with proper rarity mechanics

-- Set bonus multipliers based on rarity levels
UPDATE public.achievements 
SET bonus_multiplier = CASE 
  WHEN rarity = 'common' THEN 1.0
  WHEN rarity = 'rare' THEN 1.25
  WHEN rarity = 'epic' THEN 1.5
  WHEN rarity = 'legendary' THEN 2.0
  ELSE 1.0
END
WHERE bonus_multiplier IS NULL OR bonus_multiplier = 1.0;

-- Create category completion bonus achievements
-- These are special meta-achievements that unlock when users complete certain percentages of categories

INSERT INTO public.achievements (
  title, description, category, rarity, xp_reward, bonus_multiplier, unlock_criteria, 
  icon_name, color_scheme, sort_order, is_hidden
) VALUES 

-- Productivity Category Mastery
('Productivity Pioneer', 'Complete 50% of all productivity achievements', 'productivity', 'epic', 300, 1.5,
 '{"type": "category_completion_percentage", "category": "productivity", "percentage": 50}', 
 'trending', 'green', 100, false),

('Productivity Master', 'Complete 75% of all productivity achievements', 'productivity', 'legendary', 500, 2.0,
 '{"type": "category_completion_percentage", "category": "productivity", "percentage": 75}', 
 'crown', 'gold', 101, false),

-- Social Category Mastery  
('Social Specialist', 'Complete 50% of all social achievements', 'social', 'epic', 300, 1.5,
 '{"type": "category_completion_percentage", "category": "social", "percentage": 50}', 
 'users', 'blue', 102, false),

('Social Master', 'Complete 75% of all social achievements', 'social', 'legendary', 500, 2.0,
 '{"type": "category_completion_percentage", "category": "social", "percentage": 75}', 
 'globe', 'pink', 103, false),

-- Exploration Category Mastery
('Explorer Extraordinaire', 'Complete 50% of all exploration achievements', 'exploration', 'epic', 300, 1.5,
 '{"type": "category_completion_percentage", "category": "exploration", "percentage": 50}', 
 'eye', 'purple', 104, false),

('Master Explorer', 'Complete 75% of all exploration achievements', 'exploration', 'legendary', 500, 2.0,
 '{"type": "category_completion_percentage", "category": "exploration", "percentage": 75}', 
 'flag', 'rainbow', 105, false),

-- Mastery Category Mastery (Meta!)
('Mastery Specialist', 'Complete 50% of all mastery achievements', 'mastery', 'epic', 300, 1.5,
 '{"type": "category_completion_percentage", "category": "mastery", "percentage": 50}', 
 'award', 'orange', 106, false),

('Grand Master', 'Complete 75% of all mastery achievements', 'mastery', 'legendary', 500, 2.0,
 '{"type": "category_completion_percentage", "category": "mastery", "percentage": 75}', 
 'diamond', 'rainbow', 107, false),

-- Ultimate Achievement
('Achievement Completionist', 'Complete 90% of all achievements across all categories', 'mastery', 'legendary', 1000, 3.0,
 '{"type": "overall_completion_percentage", "percentage": 90}', 
 'star', 'rainbow', 200, false);

-- Create function to calculate category completion percentage
CREATE OR REPLACE FUNCTION calculate_category_completion_percentage(
  p_user_id UUID,
  p_category TEXT
) RETURNS DECIMAL AS $$
DECLARE
  total_achievements INTEGER;
  completed_achievements INTEGER;
  completion_percentage DECIMAL;
BEGIN
  -- Count total achievements in category (excluding hidden ones for fairness)
  SELECT COUNT(*) INTO total_achievements
  FROM achievements 
  WHERE category = p_category 
    AND is_active = true 
    AND is_hidden = false;
  
  -- Count completed achievements in category
  SELECT COUNT(*) INTO completed_achievements
  FROM achievements a
  INNER JOIN user_achievements ua ON a.id = ua.achievement_id
  WHERE a.category = p_category 
    AND a.is_active = true 
    AND a.is_hidden = false
    AND ua.user_id = p_user_id;
  
  -- Calculate percentage
  IF total_achievements > 0 THEN
    completion_percentage := (completed_achievements::DECIMAL / total_achievements::DECIMAL) * 100;
  ELSE
    completion_percentage := 0;
  END IF;
  
  RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate overall completion percentage
CREATE OR REPLACE FUNCTION calculate_overall_completion_percentage(
  p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  total_achievements INTEGER;
  completed_achievements INTEGER;
  completion_percentage DECIMAL;
BEGIN
  -- Count total achievements (excluding hidden ones and category completion bonuses)
  SELECT COUNT(*) INTO total_achievements
  FROM achievements 
  WHERE is_active = true 
    AND is_hidden = false
    AND unlock_criteria::text NOT LIKE '%category_completion_percentage%'
    AND unlock_criteria::text NOT LIKE '%overall_completion_percentage%';
  
  -- Count completed achievements
  SELECT COUNT(*) INTO completed_achievements
  FROM achievements a
  INNER JOIN user_achievements ua ON a.id = ua.achievement_id
  WHERE a.is_active = true 
    AND a.is_hidden = false
    AND a.unlock_criteria::text NOT LIKE '%category_completion_percentage%'
    AND a.unlock_criteria::text NOT LIKE '%overall_completion_percentage%'
    AND ua.user_id = p_user_id;
  
  -- Calculate percentage
  IF total_achievements > 0 THEN
    completion_percentage := (completed_achievements::DECIMAL / total_achievements::DECIMAL) * 100;
  ELSE
    completion_percentage := 0;
  END IF;
  
  RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update achievement tracking function to handle category completion bonuses
CREATE OR REPLACE FUNCTION track_category_completion_achievements()
RETURNS TRIGGER AS $$
DECLARE
  achievement_category TEXT;
  completion_percentage DECIMAL;
  category_achievement RECORD;
  overall_percentage DECIMAL;
  overall_achievement RECORD;
BEGIN
  -- Get the category of the newly unlocked achievement
  SELECT category INTO achievement_category
  FROM achievements 
  WHERE id = NEW.achievement_id;
  
  -- Calculate completion percentage for this category
  completion_percentage := calculate_category_completion_percentage(NEW.user_id, achievement_category);
  
  -- Check for category completion achievements
  FOR category_achievement IN 
    SELECT a.*, 
           (a.unlock_criteria->>'percentage')::INTEGER as required_percentage
    FROM achievements a
    WHERE a.unlock_criteria->>'type' = 'category_completion_percentage'
      AND a.unlock_criteria->>'category' = achievement_category
      AND a.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua 
        WHERE ua.achievement_id = a.id AND ua.user_id = NEW.user_id
      )
  LOOP
    -- Check if user meets the percentage requirement
    IF completion_percentage >= category_achievement.required_percentage THEN
      -- Award the category completion achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_id, 
        xp_earned,
        unlocked_at
      ) VALUES (
        NEW.user_id,
        category_achievement.id,
        ROUND(category_achievement.xp_reward * category_achievement.bonus_multiplier),
        NOW()
      );
      
      -- Create notification
      INSERT INTO achievement_notifications (
        user_id,
        achievement_id,
        notification_type,
        title,
        message
      ) VALUES (
        NEW.user_id,
        category_achievement.id,
        'unlock',
        'Category Mastery Unlocked!',
        'You completed ' || category_achievement.required_percentage || '% of ' || achievement_category || ' achievements!'
      );
    END IF;
  END LOOP;
  
  -- Check overall completion achievements
  overall_percentage := calculate_overall_completion_percentage(NEW.user_id);
  
  FOR overall_achievement IN 
    SELECT a.*, 
           (a.unlock_criteria->>'percentage')::INTEGER as required_percentage
    FROM achievements a
    WHERE a.unlock_criteria->>'type' = 'overall_completion_percentage'
      AND a.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua 
        WHERE ua.achievement_id = a.id AND ua.user_id = NEW.user_id
      )
  LOOP
    -- Check if user meets the overall percentage requirement
    IF overall_percentage >= overall_achievement.required_percentage THEN
      -- Award the overall completion achievement
      INSERT INTO user_achievements (
        user_id, 
        achievement_id, 
        xp_earned,
        unlocked_at
      ) VALUES (
        NEW.user_id,
        overall_achievement.id,
        ROUND(overall_achievement.xp_reward * overall_achievement.bonus_multiplier),
        NOW()
      );
      
      -- Create notification
      INSERT INTO achievement_notifications (
        user_id,
        achievement_id,
        notification_type,
        title,
        message
      ) VALUES (
        NEW.user_id,
        overall_achievement.id,
        'unlock',
        'Ultimate Achievement Unlocked!',
        'You completed ' || overall_achievement.required_percentage || '% of all achievements!'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category completion tracking
DROP TRIGGER IF EXISTS trigger_category_completion_achievements ON user_achievements;
CREATE TRIGGER trigger_category_completion_achievements
  AFTER INSERT ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION track_category_completion_achievements();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_category_completion_percentage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_overall_completion_percentage(UUID) TO authenticated;