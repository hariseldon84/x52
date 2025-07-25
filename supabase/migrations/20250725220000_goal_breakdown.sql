-- Epic 9, Story 9.5: Intelligent Goal Breakdown and Planning Schema

-- Goal breakdown templates and patterns for AI analysis
CREATE TABLE goal_breakdown_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(100) NOT NULL, -- 'project', 'skill_development', 'business', 'personal', 'learning'
  description TEXT,
  
  -- Template structure
  default_phases JSONB NOT NULL DEFAULT '[]', -- Array of phase templates
  complexity_factors JSONB NOT NULL DEFAULT '{}', -- Factors that affect complexity
  time_multipliers JSONB NOT NULL DEFAULT '{}', -- Time estimation multipliers
  
  -- AI training data
  success_patterns JSONB DEFAULT '{}', -- Patterns from successful breakdowns
  common_tasks JSONB DEFAULT '[]', -- Common tasks for this template type
  dependencies_pattern JSONB DEFAULT '{}', -- Common dependency patterns
  
  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.5,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(template_type, is_active),
  INDEX(success_rate DESC)
);

-- Goal breakdown analysis and planning
CREATE TABLE goal_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  
  -- Goal analysis
  goal_description TEXT NOT NULL,
  goal_complexity_score DECIMAL(3,2) DEFAULT 0.5, -- 0-1 complexity rating
  estimated_duration_days INTEGER,
  
  -- AI analysis results
  breakdown_analysis JSONB NOT NULL, -- AI analysis of goal requirements
  suggested_phases JSONB NOT NULL DEFAULT '[]', -- Recommended phases
  suggested_tasks JSONB NOT NULL DEFAULT '[]', -- AI-generated task suggestions
  dependencies_graph JSONB DEFAULT '{}', -- Task dependencies and sequencing
  
  -- Template and patterns used
  template_id UUID REFERENCES goal_breakdown_templates(id),
  similar_goals JSONB DEFAULT '[]', -- References to similar successful goals
  
  -- User feedback and modifications
  user_modifications JSONB DEFAULT '{}', -- User changes to AI suggestions
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  -- Planning details
  target_start_date DATE,
  target_end_date DATE,
  milestones JSONB DEFAULT '[]', -- Key milestones and checkpoints
  resource_requirements JSONB DEFAULT '{}', -- Required resources, skills, time
  
  -- Status and progress
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'in_progress', 'completed', 'cancelled'
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Learning and improvement
  actual_completion_time INTEGER, -- Days taken if completed
  success_factors JSONB DEFAULT '{}', -- What worked well
  challenges_faced JSONB DEFAULT '{}', -- What was difficult
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(goal_id), -- One breakdown per goal
  INDEX(user_id, status),
  INDEX(goal_complexity_score),
  INDEX(template_id)
);

-- Generated tasks from goal breakdown
CREATE TABLE breakdown_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_id UUID NOT NULL REFERENCES goal_breakdowns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task details
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_type VARCHAR(100), -- 'research', 'implementation', 'review', 'milestone', 'dependency'
  
  -- AI-generated metadata
  complexity_level VARCHAR(20) DEFAULT 'medium', -- 'simple', 'medium', 'complex'
  estimated_hours DECIMAL(5,2),
  confidence_score DECIMAL(3,2), -- AI confidence in this task suggestion
  
  -- Sequencing and dependencies
  phase_number INTEGER DEFAULT 1,
  sequence_order INTEGER DEFAULT 0,
  prerequisite_tasks JSONB DEFAULT '[]', -- Array of task IDs that must be completed first
  dependency_type VARCHAR(50), -- 'blocking', 'parallel', 'optional'
  
  -- Scheduling
  suggested_start_date DATE,
  suggested_due_date DATE,
  priority_level VARCHAR(20) DEFAULT 'medium',
  
  -- Skills and resources
  required_skills JSONB DEFAULT '[]', -- Skills needed for this task
  required_resources JSONB DEFAULT '[]', -- Resources needed
  learning_components JSONB DEFAULT '[]', -- Things user needs to learn
  
  -- User actions
  is_approved BOOLEAN DEFAULT false,
  is_created_as_task BOOLEAN DEFAULT false, -- Whether user created actual task
  created_task_id UUID REFERENCES tasks(id), -- Link to actual created task
  
  -- Feedback and learning
  user_modifications JSONB DEFAULT '{}',
  actual_completion_time DECIMAL(5,2), -- Hours actually taken
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(breakdown_id, phase_number, sequence_order),
  INDEX(user_id, is_approved),
  INDEX(confidence_score DESC),
  INDEX(created_task_id)
);

-- Goal breakdown milestones and checkpoints
CREATE TABLE breakdown_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_id UUID NOT NULL REFERENCES goal_breakdowns(id) ON DELETE CASCADE,
  
  -- Milestone details
  milestone_name VARCHAR(255) NOT NULL,
  milestone_description TEXT,
  milestone_type VARCHAR(100), -- 'phase_completion', 'major_deliverable', 'checkpoint', 'review'
  
  -- Scheduling
  target_date DATE,
  phase_number INTEGER,
  sequence_order INTEGER DEFAULT 0,
  
  -- Success criteria
  success_criteria JSONB NOT NULL DEFAULT '[]', -- Array of criteria to meet
  deliverables JSONB DEFAULT '[]', -- Expected outputs/deliverables
  
  -- Dependencies
  dependent_tasks JSONB DEFAULT '[]', -- Tasks that must be complete
  blocking_milestones JSONB DEFAULT '[]', -- Milestones that block this one
  
  -- Progress tracking
  is_achieved BOOLEAN DEFAULT false,
  achieved_date DATE,
  achievement_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(breakdown_id, phase_number, sequence_order),
  INDEX(target_date),
  INDEX(is_achieved)
);

-- Goal breakdown insights and recommendations
CREATE TABLE breakdown_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  breakdown_id UUID REFERENCES goal_breakdowns(id) ON DELETE CASCADE,
  
  -- Insight details
  insight_type VARCHAR(100) NOT NULL, -- 'time_estimation', 'risk_assessment', 'skill_gap', 'optimization'
  insight_category VARCHAR(100), -- 'planning', 'execution', 'learning', 'resource'
  
  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,
  
  -- Data and analysis
  supporting_data JSONB DEFAULT '{}',
  confidence_level DECIMAL(3,2) DEFAULT 0.5,
  impact_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- User interaction
  is_acknowledged BOOLEAN DEFAULT false,
  user_action_taken VARCHAR(100), -- 'accepted', 'rejected', 'modified', 'ignored'
  user_notes TEXT,
  
  -- Effectiveness tracking
  was_helpful BOOLEAN,
  outcome_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, insight_type),
  INDEX(breakdown_id, impact_level),
  INDEX(confidence_level DESC)
);

-- User skill assessments for goal planning
CREATE TABLE user_skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Skill details
  skill_name VARCHAR(255) NOT NULL,
  skill_category VARCHAR(100), -- 'technical', 'soft_skill', 'domain_knowledge', 'tool'
  
  -- Assessment
  current_level INTEGER CHECK (current_level >= 1 AND current_level <= 5), -- 1=beginner, 5=expert
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
  
  -- Evidence and context
  evidence_sources JSONB DEFAULT '[]', -- How this was assessed
  related_experiences JSONB DEFAULT '[]', -- Past experiences with this skill
  learning_progress JSONB DEFAULT '{}', -- Current learning activities
  
  -- Goal relevance
  relevant_goals JSONB DEFAULT '[]', -- Goals that require this skill
  improvement_priority VARCHAR(20) DEFAULT 'medium', -- Priority for improvement
  
  -- Tracking
  last_used_date DATE,
  assessment_date DATE DEFAULT CURRENT_DATE,
  next_review_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, skill_name),
  INDEX(user_id, skill_category),
  INDEX(current_level, improvement_priority)
);

-- Historical goal patterns for ML training
CREATE TABLE goal_completion_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type VARCHAR(100) NOT NULL, -- 'success_factor', 'failure_point', 'time_pattern', 'task_pattern'
  pattern_category VARCHAR(100), -- 'planning', 'execution', 'motivation', 'external'
  
  -- Pattern data
  pattern_description TEXT NOT NULL,
  pattern_data JSONB NOT NULL, -- Structured pattern information
  frequency_count INTEGER DEFAULT 1,
  
  -- Context
  goal_types JSONB DEFAULT '[]', -- Types of goals where this pattern applies
  user_characteristics JSONB DEFAULT '{}', -- User traits when pattern occurs
  environmental_factors JSONB DEFAULT '{}', -- External conditions
  
  -- Effectiveness
  success_correlation DECIMAL(3,2), -- How much this correlates with success
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Learning and improvement
  last_observed TIMESTAMPTZ DEFAULT now(),
  trend_direction VARCHAR(20), -- 'improving', 'stable', 'declining'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, pattern_type),
  INDEX(success_correlation DESC),
  INDEX(confidence_score DESC)
);

-- Create indexes for performance
CREATE INDEX idx_goal_breakdowns_user_status ON goal_breakdowns(user_id, status, created_at DESC);
CREATE INDEX idx_breakdown_tasks_sequence ON breakdown_tasks(breakdown_id, phase_number, sequence_order);
CREATE INDEX idx_breakdown_milestones_schedule ON breakdown_milestones(breakdown_id, target_date);
CREATE INDEX idx_breakdown_insights_priority ON breakdown_insights(user_id, impact_level, confidence_level DESC);
CREATE INDEX idx_user_skills_priority ON user_skill_assessments(user_id, improvement_priority, current_level);

-- Enable RLS
ALTER TABLE goal_breakdown_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdown_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdown_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdown_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_completion_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Templates are publicly readable" ON goal_breakdown_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own goal breakdowns" ON goal_breakdowns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own breakdown tasks" ON breakdown_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view milestones for their breakdowns" ON breakdown_milestones
  FOR ALL USING (auth.uid() = (SELECT user_id FROM goal_breakdowns WHERE id = breakdown_id));

CREATE POLICY "Users can manage their own insights" ON breakdown_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skill assessments" ON user_skill_assessments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own patterns" ON goal_completion_patterns
  FOR ALL USING (auth.uid() = user_id);

-- Function to analyze goal complexity and generate breakdown suggestions
CREATE OR REPLACE FUNCTION analyze_goal_complexity(
  p_goal_id UUID,
  p_goal_description TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_complexity_score DECIMAL(3,2) := 0.5;
  v_estimated_duration INTEGER := 30;
  v_suggested_phases JSONB := '[]';
  v_suggested_tasks JSONB := '[]';
  v_user_history RECORD;
  v_template RECORD;
  v_skills_needed JSONB := '[]';
  v_analysis JSONB;
BEGIN
  -- Analyze goal description complexity
  -- Simple keyword-based analysis (in production, use NLP/ML)
  DECLARE
    v_description_length INTEGER := length(p_goal_description);
    v_keyword_count INTEGER := 0;
    v_complexity_keywords TEXT[] := ARRAY['integrate', 'implement', 'develop', 'create', 'build', 'design', 'research', 'analyze', 'optimize', 'system', 'platform', 'application', 'framework', 'architecture'];
  BEGIN
    -- Count complexity indicators
    SELECT COUNT(*) INTO v_keyword_count
    FROM unnest(v_complexity_keywords) AS keyword
    WHERE p_goal_description ILIKE '%' || keyword || '%';
    
    -- Calculate base complexity
    v_complexity_score := LEAST(1.0, (
      (v_description_length / 100.0) * 0.3 +
      (v_keyword_count / 5.0) * 0.4 +
      0.3 -- Base complexity
    ));
    
    -- Estimate duration based on complexity
    v_estimated_duration := GREATEST(7, LEAST(365, 
      ROUND(v_complexity_score * 90 + 30)::INTEGER
    ));
  END;
  
  -- Get user's historical performance
  SELECT 
    AVG(EXTRACT(days FROM (completed_at - created_at))) as avg_completion_days,
    COUNT(*) as completed_goals
  INTO v_user_history
  FROM goals 
  WHERE user_id = p_user_id AND status = 'completed' AND completed_at IS NOT NULL;
  
  -- Adjust estimates based on user history
  IF v_user_history.completed_goals > 0 THEN
    v_estimated_duration := ROUND(v_estimated_duration * 
      LEAST(2.0, GREATEST(0.5, v_user_history.avg_completion_days / 60.0))
    )::INTEGER;
  END IF;
  
  -- Find best matching template
  SELECT * INTO v_template
  FROM goal_breakdown_templates
  WHERE is_active = true
  ORDER BY success_rate DESC, usage_count DESC
  LIMIT 1;
  
  -- Generate phase suggestions based on complexity
  IF v_complexity_score <= 0.3 THEN
    v_suggested_phases := '[
      {"name": "Planning & Research", "duration_days": 3, "description": "Define requirements and plan approach"},
      {"name": "Implementation", "duration_days": 7, "description": "Execute the main work"},
      {"name": "Review & Completion", "duration_days": 2, "description": "Review results and finalize"}
    ]';
  ELSIF v_complexity_score <= 0.7 THEN
    v_suggested_phases := '[
      {"name": "Discovery & Planning", "duration_days": 7, "description": "Research and create detailed plan"},
      {"name": "Phase 1: Foundation", "duration_days": 14, "description": "Build core components"},
      {"name": "Phase 2: Development", "duration_days": 21, "description": "Implement main features"},
      {"name": "Testing & Refinement", "duration_days": 7, "description": "Test and improve quality"},
      {"name": "Launch & Review", "duration_days": 3, "description": "Deploy and evaluate results"}
    ]';
  ELSE
    v_suggested_phases := '[
      {"name": "Research & Analysis", "duration_days": 14, "description": "Comprehensive research and requirement analysis"},
      {"name": "Architecture & Planning", "duration_days": 10, "description": "Design system architecture and detailed planning"},
      {"name": "Phase 1: Core Development", "duration_days": 30, "description": "Build foundational components"},
      {"name": "Phase 2: Feature Implementation", "duration_days": 35, "description": "Implement main features and functionality"},
      {"name": "Phase 3: Integration & Testing", "duration_days": 21, "description": "Integrate components and comprehensive testing"},
      {"name": "Optimization & Performance", "duration_days": 14, "description": "Optimize performance and user experience"},
      {"name": "Documentation & Launch", "duration_days": 10, "description": "Complete documentation and launch"},
      {"name": "Monitoring & Iteration", "duration_days": 7, "description": "Monitor performance and iterate"}
    ]';
  END IF;
  
  -- Generate initial task suggestions
  v_suggested_tasks := '[
    {"title": "Define success criteria", "type": "planning", "phase": 1, "estimated_hours": 2, "complexity": "simple"},
    {"title": "Research best practices", "type": "research", "phase": 1, "estimated_hours": 4, "complexity": "medium"},
    {"title": "Create project timeline", "type": "planning", "phase": 1, "estimated_hours": 3, "complexity": "simple"},
    {"title": "Identify required resources", "type": "planning", "phase": 1, "estimated_hours": 2, "complexity": "simple"}
  ]';
  
  -- Identify required skills (simplified analysis)
  IF p_goal_description ILIKE '%code%' OR p_goal_description ILIKE '%develop%' THEN
    v_skills_needed := v_skills_needed || '["Programming", "Software Development"]';
  END IF;
  IF p_goal_description ILIKE '%design%' THEN
    v_skills_needed := v_skills_needed || '["Design", "UI/UX"]';
  END IF;
  IF p_goal_description ILIKE '%manage%' OR p_goal_description ILIKE '%lead%' THEN
    v_skills_needed := v_skills_needed || '["Project Management", "Leadership"]';
  END IF;
  
  -- Build analysis result
  v_analysis := jsonb_build_object(
    'complexity_score', v_complexity_score,
    'estimated_duration_days', v_estimated_duration,
    'confidence_level', 0.7,
    'analysis_factors', jsonb_build_object(
      'description_complexity', v_complexity_score,
      'user_experience_factor', COALESCE(v_user_history.completed_goals, 0),
      'template_match', COALESCE(v_template.template_name, 'Generic')
    ),
    'suggested_phases', v_suggested_phases,
    'suggested_tasks', v_suggested_tasks,
    'required_skills', v_skills_needed,
    'risk_factors', '["Scope creep", "Time estimation", "Resource availability"]',
    'success_factors', '["Clear planning", "Regular review", "Stakeholder communication"]'
  );
  
  RETURN v_analysis;
END;
$$ LANGUAGE plpgsql;

-- Function to create tasks from breakdown suggestions
CREATE OR REPLACE FUNCTION create_tasks_from_breakdown(
  p_breakdown_id UUID,
  p_selected_tasks JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_breakdown RECORD;
  v_task JSONB;
  v_created_count INTEGER := 0;
  v_task_id UUID;
BEGIN
  -- Get breakdown details
  SELECT * INTO v_breakdown FROM goal_breakdowns WHERE id = p_breakdown_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Breakdown not found';
  END IF;
  
  -- Create tasks from selected suggestions
  FOR v_task IN SELECT * FROM jsonb_array_elements(p_selected_tasks)
  LOOP
    -- Create the task
    INSERT INTO tasks (
      user_id, goal_id, project_id, title, description, 
      complexity, priority, estimated_time_hours
    ) VALUES (
      v_breakdown.user_id,
      v_breakdown.goal_id,
      NULL, -- Will be linked to project if needed
      v_task->>'title',
      v_task->>'description',
      COALESCE(v_task->>'complexity', 'medium'),
      COALESCE(v_task->>'priority', 'medium'),
      COALESCE((v_task->>'estimated_hours')::DECIMAL, 4)
    ) RETURNING id INTO v_task_id;
    
    -- Update breakdown task to link to created task
    UPDATE breakdown_tasks SET 
      is_created_as_task = true,
      created_task_id = v_task_id
    WHERE breakdown_id = p_breakdown_id 
    AND task_title = v_task->>'title';
    
    v_created_count := v_created_count + 1;
  END LOOP;
  
  RETURN v_created_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user skill assessment from completed tasks
CREATE OR REPLACE FUNCTION update_skill_from_task_completion(
  p_user_id UUID,
  p_task_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_skill TEXT;
BEGIN
  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Simple skill inference (in production, use NLP/ML)
  IF v_task.title ILIKE '%code%' OR v_task.title ILIKE '%program%' THEN
    v_skill := 'Programming';
  ELSIF v_task.title ILIKE '%design%' THEN
    v_skill := 'Design';
  ELSIF v_task.title ILIKE '%write%' OR v_task.title ILIKE '%document%' THEN
    v_skill := 'Technical Writing';
  ELSIF v_task.title ILIKE '%research%' THEN
    v_skill := 'Research';
  ELSE
    RETURN true; -- No specific skill identified
  END IF;
  
  -- Update or create skill assessment
  INSERT INTO user_skill_assessments (
    user_id, skill_name, skill_category, current_level, 
    confidence_rating, assessment_date, last_used_date
  ) VALUES (
    p_user_id, v_skill, 'technical', 3, 3, CURRENT_DATE, CURRENT_DATE
  )
  ON CONFLICT (user_id, skill_name) DO UPDATE SET
    last_used_date = CURRENT_DATE,
    current_level = LEAST(5, user_skill_assessments.current_level + 0.1),
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Insert default goal breakdown templates
INSERT INTO goal_breakdown_templates (
  template_name, template_type, description, default_phases, 
  complexity_factors, time_multipliers, common_tasks
) VALUES 
(
  'Software Development Project',
  'project',
  'Template for software development goals with planning, development, and deployment phases',
  '[
    {"name": "Planning & Requirements", "percentage": 15, "key_activities": ["requirements", "architecture", "planning"]},
    {"name": "Development", "percentage": 60, "key_activities": ["coding", "testing", "integration"]},
    {"name": "Testing & QA", "percentage": 15, "key_activities": ["testing", "debugging", "optimization"]},
    {"name": "Deployment & Documentation", "percentage": 10, "key_activities": ["deployment", "documentation", "monitoring"]}
  ]',
  '{"complexity_keywords": ["API", "database", "frontend", "backend", "integration", "architecture"], "multiplier": 1.3}',
  '{"programming_experience": 0.8, "domain_knowledge": 0.9, "team_size": 1.2}',
  '[
    {"title": "Set up development environment", "type": "setup", "estimated_hours": 4},
    {"title": "Create project structure", "type": "setup", "estimated_hours": 2},
    {"title": "Design database schema", "type": "planning", "estimated_hours": 6},
    {"title": "Implement core functionality", "type": "development", "estimated_hours": 20},
    {"title": "Write unit tests", "type": "testing", "estimated_hours": 8},
    {"title": "Deploy to production", "type": "deployment", "estimated_hours": 4}
  ]'
),
(
  'Learning & Skill Development',
  'skill_development',
  'Template for learning new skills or technologies',
  '[
    {"name": "Foundation & Basics", "percentage": 30, "key_activities": ["research", "fundamentals", "setup"]},
    {"name": "Practice & Application", "percentage": 50, "key_activities": ["practice", "projects", "application"]},
    {"name": "Mastery & Teaching", "percentage": 20, "key_activities": ["advanced_topics", "teaching", "mentoring"]}
  ]',
  '{"difficulty_keywords": ["advanced", "complex", "expert", "mastery"], "multiplier": 1.5}',
  '{"prior_knowledge": 0.7, "learning_pace": 1.2, "practice_time": 1.1}',
  '[
    {"title": "Research learning resources", "type": "research", "estimated_hours": 3},
    {"title": "Complete foundational course", "type": "learning", "estimated_hours": 20},
    {"title": "Build practice project", "type": "practice", "estimated_hours": 15},
    {"title": "Join community/forum", "type": "networking", "estimated_hours": 1},
    {"title": "Teach someone else", "type": "teaching", "estimated_hours": 5}
  ]'
),
(
  'Business Development',
  'business',
  'Template for business-related goals and initiatives',
  '[
    {"name": "Research & Strategy", "percentage": 25, "key_activities": ["market_research", "strategy", "planning"]},
    {"name": "Development & Implementation", "percentage": 45, "key_activities": ["development", "implementation", "execution"]},
    {"name": "Launch & Marketing", "percentage": 20, "key_activities": ["launch", "marketing", "promotion"]},
    {"name": "Monitor & Optimize", "percentage": 10, "key_activities": ["monitoring", "optimization", "iteration"]}
  ]',
  '{"market_complexity": 1.2, "competition_level": 1.1, "regulatory_requirements": 1.4}',
  '{"industry_experience": 0.8, "network_strength": 0.9, "resource_availability": 1.1}',
  '[
    {"title": "Conduct market research", "type": "research", "estimated_hours": 12},
    {"title": "Define target audience", "type": "planning", "estimated_hours": 4},
    {"title": "Create business plan", "type": "planning", "estimated_hours": 16},
    {"title": "Develop MVP", "type": "development", "estimated_hours": 40},
    {"title": "Launch marketing campaign", "type": "marketing", "estimated_hours": 8}
  ]'
);

-- Create trigger to update skill assessments when tasks are completed
CREATE OR REPLACE FUNCTION trigger_skill_update_from_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Update skills when task is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM update_skill_from_task_completion(NEW.user_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_completion_skill_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_skill_update_from_task();