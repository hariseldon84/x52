-- Insert initial achievement definitions for Epic 4: Achievement & Progression System
-- This migration populates the achievements table with initial achievement definitions

-- Productivity Category Achievements
INSERT INTO public.achievements (
  title, description, category, rarity, xp_reward, unlock_criteria, icon_name, color_scheme, sort_order
) VALUES 

-- Task Completion Achievements
('First Steps', 'Complete your first task', 'productivity', 'common', 25, 
 '{"type": "task_completion", "count": 1}', 'checkSquare', 'blue', 1),

('Getting Started', 'Complete 5 tasks', 'productivity', 'common', 50, 
 '{"type": "task_completion", "count": 5}', 'target', 'blue', 2),

('Task Master', 'Complete 25 tasks', 'productivity', 'rare', 100, 
 '{"type": "task_completion", "count": 25}', 'trophy', 'gold', 3),

('Productivity Pro', 'Complete 100 tasks', 'productivity', 'epic', 250, 
 '{"type": "task_completion", "count": 100}', 'crown', 'purple', 4),

('Task Conqueror', 'Complete 500 tasks', 'productivity', 'legendary', 500, 
 '{"type": "task_completion", "count": 500}', 'star', 'rainbow', 5),

-- Streak Achievements
('Daily Habit', 'Maintain a 3-day task completion streak', 'productivity', 'common', 30, 
 '{"type": "streak", "days": 3}', 'flame', 'orange', 6),

('Week Warrior', 'Maintain a 7-day task completion streak', 'productivity', 'rare', 75, 
 '{"type": "streak", "days": 7}', 'fire', 'red', 7),

('Unstoppable', 'Maintain a 30-day task completion streak', 'productivity', 'epic', 200, 
 '{"type": "streak", "days": 30}', 'zap', 'yellow', 8),

('Legendary Streak', 'Maintain a 100-day task completion streak', 'productivity', 'legendary', 1000, 
 '{"type": "streak", "days": 100}', 'lightning', 'gold', 9),

-- XP Milestones
('XP Explorer', 'Earn your first 500 XP', 'productivity', 'common', 50, 
 '{"type": "xp_milestone", "amount": 500}', 'award', 'green', 10),

('XP Collector', 'Earn 2,500 XP', 'productivity', 'rare', 100, 
 '{"type": "xp_milestone", "amount": 2500}', 'medal', 'blue', 11),

('XP Master', 'Earn 10,000 XP', 'productivity', 'epic', 250, 
 '{"type": "xp_milestone", "amount": 10000}', 'gem', 'purple', 12),

('XP Legend', 'Earn 50,000 XP', 'productivity', 'legendary', 1000, 
 '{"type": "xp_milestone", "amount": 50000}', 'diamond', 'rainbow', 13),

-- Complexity Achievements
('Simple Success', 'Complete 10 simple tasks', 'productivity', 'common', 25, 
 '{"type": "complexity_completion", "complexity": "simple", "count": 10}', 'thumbsUp', 'green', 14),

('Medium Maven', 'Complete 10 medium complexity tasks', 'productivity', 'common', 50, 
 '{"type": "complexity_completion", "complexity": "medium", "count": 10}', 'trending', 'blue', 15),

('Complex Champion', 'Complete 10 complex tasks', 'productivity', 'rare', 150, 
 '{"type": "complexity_completion", "complexity": "complex", "count": 10}', 'brain', 'purple', 16),

-- Social Category Achievements
('First Contact', 'Add your first contact to the CRM', 'social', 'common', 25, 
 '{"type": "contact_creation", "count": 1}', 'userPlus', 'blue', 17),

('Network Builder', 'Add 10 contacts to your CRM', 'social', 'common', 50, 
 '{"type": "contact_creation", "count": 10}', 'users', 'green', 18),

('Social Butterfly', 'Add 50 contacts to your CRM', 'social', 'rare', 125, 
 '{"type": "contact_creation", "count": 50}', 'globe', 'pink', 19),

('Network Master', 'Add 100 contacts to your CRM', 'social', 'epic', 300, 
 '{"type": "contact_creation", "count": 100}', 'network', 'purple', 20),

('Relationship Guru', 'Log 25 contact interactions', 'social', 'rare', 100, 
 '{"type": "interaction_count", "count": 25}', 'messageCircle', 'blue', 21),

('Connection Champion', 'Complete 10 tasks linked to contacts', 'social', 'rare', 75, 
 '{"type": "contact_task_completion", "count": 10}', 'link', 'green', 22),

-- Exploration Category Achievements
('Goal Getter', 'Create your first goal', 'exploration', 'common', 30, 
 '{"type": "goal_creation", "count": 1}', 'flag', 'blue', 23),

('Visionary', 'Create 5 goals', 'exploration', 'common', 60, 
 '{"type": "goal_creation", "count": 5}', 'eye', 'purple', 24),

('Project Pioneer', 'Create your first project', 'exploration', 'common', 25, 
 '{"type": "project_creation", "count": 1}', 'folder', 'yellow', 25),

('Project Manager', 'Create 10 projects', 'exploration', 'rare', 100, 
 '{"type": "project_creation", "count": 10}', 'briefcase', 'blue', 26),

('Early Bird', 'Complete a task before 9 AM', 'exploration', 'common', 30, 
 '{"type": "early_completion", "hour": 9}', 'sunrise', 'orange', 27),

('Night Owl', 'Complete a task after 10 PM', 'exploration', 'common', 30, 
 '{"type": "late_completion", "hour": 22}', 'moon', 'purple', 28),

('Weekend Warrior', 'Complete tasks on both Saturday and Sunday', 'exploration', 'rare', 75, 
 '{"type": "weekend_completion"}', 'calendar', 'green', 29),

-- Mastery Category Achievements
('Goal Achiever', 'Complete your first goal', 'mastery', 'rare', 100, 
 '{"type": "goal_completion", "count": 1}', 'checkCircle', 'gold', 30),

('Goal Master', 'Complete 5 goals', 'mastery', 'epic', 250, 
 '{"type": "goal_completion", "count": 5}', 'trophy', 'gold', 31),

('Goal Legend', 'Complete 25 goals', 'mastery', 'legendary', 750, 
 '{"type": "goal_completion", "count": 25}', 'crown', 'rainbow', 32),

('Project Finisher', 'Complete your first project', 'mastery', 'rare', 75, 
 '{"type": "project_completion", "count": 1}', 'package', 'blue', 33),

('Project Pro', 'Complete 10 projects', 'mastery', 'epic', 200, 
 '{"type": "project_completion", "count": 10}', 'archive', 'purple', 34),

('Efficiency Expert', 'Complete 5 tasks in a single day', 'mastery', 'rare', 100, 
 '{"type": "daily_task_completion", "count": 5}', 'zap', 'yellow', 35),

('Power User', 'Complete 10 tasks in a single day', 'mastery', 'epic', 200, 
 '{"type": "daily_task_completion", "count": 10}', 'lightning', 'gold', 36),

('Productivity Machine', 'Complete 20 tasks in a single day', 'mastery', 'legendary', 500, 
 '{"type": "daily_task_completion", "count": 20}', 'cpu', 'rainbow', 37),

('Follow-up Master', 'Complete 10 follow-up reminders', 'mastery', 'rare', 75, 
 '{"type": "followup_completion", "count": 10}', 'bellRing', 'blue', 38),

('Priority Juggler', 'Complete tasks of all 3 priority levels in one day', 'mastery', 'epic', 150, 
 '{"type": "priority_variety_daily"}', 'shuffle', 'purple', 39),

-- Hidden Achievements (Surprise factor)
('Perfectionist', 'Complete a complex task on the same day it was created', 'mastery', 'epic', 200, 
 '{"type": "same_day_complex"}', 'target', 'gold', 40, true),

('Speed Demon', 'Complete 3 tasks within 1 hour', 'productivity', 'rare', 125, 
 '{"type": "rapid_completion", "count": 3, "timeframe": 3600}', 'timer', 'red', 41, true),

('Comeback Kid', 'Complete a task after a 30+ day streak break', 'exploration', 'rare', 100, 
 '{"type": "streak_recovery", "break_days": 30}', 'refresh', 'green', 42, true),

('Jack of All Trades', 'Complete tasks of all complexity levels in one day', 'mastery', 'epic', 175, 
 '{"type": "complexity_variety_daily"}', 'layers', 'rainbow', 43, true),

('Social Connector', 'Complete tasks for 5 different contacts in one week', 'social', 'epic', 200, 
 '{"type": "weekly_contact_variety", "count": 5}', 'share2', 'pink', 44, true);

-- Update the is_hidden column for hidden achievements (fixing the INSERT statement)
UPDATE public.achievements 
SET is_hidden = true 
WHERE title IN (
  'Perfectionist', 
  'Speed Demon', 
  'Comeback Kid', 
  'Jack of All Trades', 
  'Social Connector'
);