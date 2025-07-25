-- Create analytics and insights database tables for Epic 5
-- This migration sets up the foundation for productivity analytics

-- Productivity Sessions Table - Track work sessions and patterns
CREATE TABLE IF NOT EXISTS productivity_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  tasks_completed INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  session_type TEXT CHECK (session_type IN ('focus', 'maintenance', 'exploration', 'mixed')) DEFAULT 'mixed',
  productivity_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5), -- 1-5 scale
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5), -- 1-5 scale
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productivity Insights Table - Store calculated insights and patterns
CREATE TABLE IF NOT EXISTS productivity_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'peak_hours', 'peak_days', 'productivity_trend', 'burnout_risk', 
    'goal_success_rate', 'task_completion_pattern', 'wellness_score', 'networking_pattern'
  )),
  insight_category TEXT NOT NULL CHECK (insight_category IN (
    'productivity', 'wellness', 'goals', 'networking', 'patterns'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_payload JSONB NOT NULL, -- Store structured insight data
  confidence_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  is_actionable BOOLEAN DEFAULT false,
  action_recommendations JSONB, -- Array of recommended actions
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness Metrics Table - Track user wellness and burnout indicators
CREATE TABLE IF NOT EXISTS wellness_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  burnout_risk_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5) DEFAULT 3,
  work_life_balance_score DECIMAL(3,2) DEFAULT 5.0, -- 0.00 to 10.00
  productivity_consistency DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  task_completion_velocity DECIMAL(5,2) DEFAULT 0, -- tasks per hour
  break_frequency INTEGER DEFAULT 0, -- number of breaks taken
  overtime_hours DECIMAL(4,2) DEFAULT 0, -- hours worked beyond normal
  mood_average DECIMAL(2,1) DEFAULT 3.0, -- 1.0 to 5.0
  energy_average DECIMAL(2,1) DEFAULT 3.0, -- 1.0 to 5.0
  recommendations JSONB, -- Wellness recommendations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, metric_date)
);

-- Goal Analytics Table - Track goal achievement patterns and success rates
CREATE TABLE IF NOT EXISTS goal_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  analysis_period TEXT NOT NULL CHECK (analysis_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  goals_created INTEGER DEFAULT 0,
  goals_completed INTEGER DEFAULT 0,
  goals_abandoned INTEGER DEFAULT 0,
  avg_completion_time_days DECIMAL(5,1) DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  completion_velocity DECIMAL(5,2) DEFAULT 0, -- goals per time period
  complexity_distribution JSONB, -- Distribution of goal complexities
  category_performance JSONB, -- Performance by goal category
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, analysis_period, period_start)
);

-- Contact Interaction Analytics Table - Track networking patterns
CREATE TABLE IF NOT EXISTS contact_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  analysis_period TEXT NOT NULL CHECK (analysis_period IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  interaction_count INTEGER DEFAULT 0,
  interaction_types JSONB, -- Count by interaction type
  task_collaborations INTEGER DEFAULT 0,
  follow_ups_completed INTEGER DEFAULT 0,
  follow_ups_missed INTEGER DEFAULT 0,
  relationship_strength DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  communication_frequency DECIMAL(4,2) DEFAULT 0, -- interactions per week
  response_rate DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  networking_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, contact_id, analysis_period, period_start)
);

-- User Analytics Summary Table - Aggregated user statistics
CREATE TABLE IF NOT EXISTS user_analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_tasks_completed INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  goals_active INTEGER DEFAULT 0,
  goals_completed_total INTEGER DEFAULT 0,
  contacts_total INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  productivity_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  wellness_score DECIMAL(3,2) DEFAULT 5.0, -- 0.00 to 10.00
  networking_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  overall_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 10.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, summary_date)
);

-- Enable RLS on all analytics tables
ALTER TABLE productivity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own productivity sessions" ON productivity_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own productivity insights" ON productivity_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wellness metrics" ON wellness_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goal analytics" ON goal_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own contact analytics" ON contact_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics summary" ON user_analytics_summary
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_productivity_sessions_user_id_date ON productivity_sessions(user_id, session_start);
CREATE INDEX idx_productivity_insights_user_type ON productivity_insights(user_id, insight_type);
CREATE INDEX idx_wellness_metrics_user_date ON wellness_metrics(user_id, metric_date);
CREATE INDEX idx_goal_analytics_user_period ON goal_analytics(user_id, analysis_period, period_start);
CREATE INDEX idx_contact_analytics_user_period ON contact_analytics(user_id, analysis_period, period_start);
CREATE INDEX idx_user_analytics_summary_user_date ON user_analytics_summary(user_id, summary_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_productivity_sessions_updated_at
  BEFORE UPDATE ON productivity_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productivity_insights_updated_at
  BEFORE UPDATE ON productivity_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_metrics_updated_at
  BEFORE UPDATE ON wellness_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_analytics_updated_at
  BEFORE UPDATE ON goal_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_analytics_updated_at
  BEFORE UPDATE ON contact_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_analytics_summary_updated_at
  BEFORE UPDATE ON user_analytics_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();