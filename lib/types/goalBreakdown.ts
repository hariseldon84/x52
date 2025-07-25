// Epic 9, Story 9.5: Intelligent Goal Breakdown and Planning Types

export type TemplateType = 'project' | 'skill_development' | 'business' | 'personal' | 'learning';
export type ComplexityLevel = 'simple' | 'medium' | 'complex';
export type TaskType = 'research' | 'implementation' | 'review' | 'milestone' | 'dependency' | 'planning';
export type DependencyType = 'blocking' | 'parallel' | 'optional';
export type BreakdownStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type InsightType = 'time_estimation' | 'risk_assessment' | 'skill_gap' | 'optimization';
export type InsightCategory = 'planning' | 'execution' | 'learning' | 'resource';
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
export type PatternType = 'success_factor' | 'failure_point' | 'time_pattern' | 'task_pattern';
export type SkillCategory = 'technical' | 'soft_skill' | 'domain_knowledge' | 'tool';
export type MilestoneType = 'phase_completion' | 'major_deliverable' | 'checkpoint' | 'review';

export interface GoalBreakdownTemplate {
  id: string;
  template_name: string;
  template_type: TemplateType;
  description?: string;
  
  // Template structure
  default_phases: PhaseTemplate[];
  complexity_factors: Record<string, any>;
  time_multipliers: Record<string, number>;
  
  // AI training data
  success_patterns: Record<string, any>;
  common_tasks: TaskTemplate[];
  dependencies_pattern: Record<string, any>;
  
  // Usage statistics
  usage_count: number;
  success_rate: number;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhaseTemplate {
  name: string;
  percentage: number;
  key_activities: string[];
  duration_days?: number;
  description?: string;
}

export interface TaskTemplate {
  title: string;
  type: TaskType;
  estimated_hours: number;
  complexity?: ComplexityLevel;
  description?: string;
  phase?: number;
}

export interface GoalBreakdown {
  id: string;
  user_id: string;
  goal_id: string;
  
  // Goal analysis
  goal_description: string;
  goal_complexity_score: number;
  estimated_duration_days?: number;
  
  // AI analysis results
  breakdown_analysis: BreakdownAnalysis;
  suggested_phases: SuggestedPhase[];
  suggested_tasks: SuggestedTask[];
  dependencies_graph: Record<string, any>;
  
  // Template and patterns used
  template_id?: string;
  similar_goals: string[];
  
  // User feedback and modifications
  user_modifications: Record<string, any>;
  user_rating?: number;
  user_feedback?: string;
  
  // Planning details
  target_start_date?: string;
  target_end_date?: string;
  milestones: Milestone[];
  resource_requirements: Record<string, any>;
  
  // Status and progress
  status: BreakdownStatus;
  progress_percentage: number;
  
  // Learning and improvement
  actual_completion_time?: number;
  success_factors: Record<string, any>;
  challenges_faced: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  goal?: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
  template?: GoalBreakdownTemplate;
}

export interface BreakdownAnalysis {
  complexity_score: number;
  estimated_duration_days: number;
  confidence_level: number;
  analysis_factors: {
    description_complexity: number;
    user_experience_factor: number;
    template_match: string;
  };
  suggested_phases: SuggestedPhase[];
  suggested_tasks: SuggestedTask[];
  required_skills: string[];
  risk_factors: string[];
  success_factors: string[];
}

export interface SuggestedPhase {
  name: string;
  duration_days: number;
  description: string;
  percentage?: number;
  key_activities?: string[];
}

export interface SuggestedTask {
  title: string;
  description?: string;
  type: TaskType;
  complexity: ComplexityLevel;
  estimated_hours: number;
  phase: number;
  priority?: string;
  required_skills?: string[];
  confidence_score?: number;
}

export interface BreakdownTask {
  id: string;
  breakdown_id: string;
  user_id: string;
  
  // Task details
  task_title: string;
  task_description?: string;
  task_type: TaskType;
  
  // AI-generated metadata
  complexity_level: ComplexityLevel;
  estimated_hours: number;
  confidence_score: number;
  
  // Sequencing and dependencies
  phase_number: number;
  sequence_order: number;
  prerequisite_tasks: string[];
  dependency_type?: DependencyType;
  
  // Scheduling
  suggested_start_date?: string;
  suggested_due_date?: string;
  priority_level: string;
  
  // Skills and resources
  required_skills: string[];
  required_resources: string[];
  learning_components: string[];
  
  // User actions
  is_approved: boolean;
  is_created_as_task: boolean;
  created_task_id?: string;
  
  // Feedback and learning
  user_modifications: Record<string, any>;
  actual_completion_time?: number;
  difficulty_rating?: number;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  created_task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  };
}

export interface Milestone {
  id: string;
  breakdown_id: string;
  milestone_name: string;
  milestone_description?: string;
  milestone_type: MilestoneType;
  
  // Scheduling
  target_date?: string;
  phase_number?: number;
  sequence_order: number;
  
  // Success criteria
  success_criteria: string[];
  deliverables: string[];
  
  // Dependencies
  dependent_tasks: string[];
  blocking_milestones: string[];
  
  // Progress tracking
  is_achieved: boolean;
  achieved_date?: string;
  achievement_notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface BreakdownInsight {
  id: string;
  user_id: string;
  breakdown_id?: string;
  
  // Insight details
  insight_type: InsightType;
  insight_category: InsightCategory;
  
  // Content
  title: string;
  description: string;
  recommendation?: string;
  
  // Data and analysis
  supporting_data: Record<string, any>;
  confidence_level: number;
  impact_level: ImpactLevel;
  
  // User interaction
  is_acknowledged: boolean;
  user_action_taken?: 'accepted' | 'rejected' | 'modified' | 'ignored';
  user_notes?: string;
  
  // Effectiveness tracking
  was_helpful?: boolean;
  outcome_notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface UserSkillAssessment {
  id: string;
  user_id: string;
  
  // Skill details
  skill_name: string;
  skill_category: SkillCategory;
  
  // Assessment
  current_level: number; // 1-5 scale
  confidence_rating: number; // 1-5 scale
  
  // Evidence and context
  evidence_sources: string[];
  related_experiences: string[];
  learning_progress: Record<string, any>;
  
  // Goal relevance
  relevant_goals: string[];
  improvement_priority: string;
  
  // Tracking
  last_used_date?: string;
  assessment_date: string;
  next_review_date?: string;
  
  created_at: string;
  updated_at: string;
}

export interface GoalCompletionPattern {
  id: string;
  user_id: string;
  
  // Pattern identification
  pattern_type: PatternType;
  pattern_category: string;
  
  // Pattern data
  pattern_description: string;
  pattern_data: Record<string, any>;
  frequency_count: number;
  
  // Context
  goal_types: string[];
  user_characteristics: Record<string, any>;
  environmental_factors: Record<string, any>;
  
  // Effectiveness
  success_correlation: number;
  confidence_score: number;
  
  // Learning and improvement
  last_observed: string;
  trend_direction: 'improving' | 'stable' | 'declining';
  
  created_at: string;
  updated_at: string;
}

// Request/Response types
export interface CreateGoalBreakdownRequest {
  goal_id: string;
  goal_description: string;
  target_start_date?: string;
  target_end_date?: string;
  template_id?: string;
  user_preferences?: Record<string, any>;
}

export interface UpdateGoalBreakdownRequest {
  goal_description?: string;
  target_start_date?: string;
  target_end_date?: string;
  user_modifications?: Record<string, any>;
  user_rating?: number;
  user_feedback?: string;
  status?: BreakdownStatus;
}

export interface CreateBreakdownTasksRequest {
  breakdown_id: string;
  selected_tasks: SuggestedTask[];
  create_actual_tasks?: boolean;
}

export interface UpdateBreakdownTaskRequest {
  task_title?: string;
  task_description?: string;
  estimated_hours?: number;
  priority_level?: string;
  is_approved?: boolean;
  user_modifications?: Record<string, any>;
}

export interface CreateMilestoneRequest {
  breakdown_id: string;
  milestone_name: string;
  milestone_description?: string;
  milestone_type: MilestoneType;
  target_date?: string;
  phase_number?: number;
  success_criteria: string[];
  deliverables?: string[];
}

export interface UpdateSkillAssessmentRequest {
  skill_name: string;
  skill_category: SkillCategory;
  current_level: number;
  confidence_rating: number;
  evidence_sources?: string[];
  improvement_priority?: string;
}

export interface GoalAnalysisRequest {
  goal_id: string;
  goal_description: string;
  additional_context?: string;
  user_preferences?: {
    preferred_timeline?: number;
    skill_focus_areas?: string[];
    resource_constraints?: string[];
  };
}

export interface BreakdownStats {
  total_breakdowns: number;
  completed_breakdowns: number;
  average_completion_time: number;
  success_rate: number;
  most_used_template: string;
  skill_improvement_areas: string[];
  common_challenges: string[];
  productivity_patterns: Record<string, number>;
}

export interface BreakdownInsights {
  time_estimation_accuracy: {
    average_variance: number;
    improvement_trend: string;
    recommendations: string[];
  };
  skill_gap_analysis: {
    identified_gaps: Array<{
      skill: string;
      current_level: number;
      required_level: number;
      learning_resources: string[];
    }>;
    priority_skills: string[];
  };
  success_factor_analysis: {
    key_success_factors: string[];
    risk_mitigation_strategies: string[];
    optimal_planning_patterns: string[];
  };
  personalized_recommendations: Array<{
    type: InsightType;
    title: string;
    description: string;
    confidence: number;
    impact: ImpactLevel;
  }>;
}

export interface SmartBreakdownSuggestion {
  confidence_score: number;
  reasoning: string;
  alternative_approaches: string[];
  estimated_success_probability: number;
  recommended_adjustments: Array<{
    area: string;
    current_value: any;
    suggested_value: any;
    impact: string;
  }>;
}

export interface BreakdownProgress {
  overall_progress: number;
  phase_progress: Array<{
    phase_name: string;
    completion_percentage: number;
    tasks_completed: number;
    tasks_total: number;
    on_schedule: boolean;
  }>;
  milestone_status: Array<{
    milestone_name: string;
    is_achieved: boolean;
    target_date: string;
    actual_date?: string;
    variance_days?: number;
  }>;
  current_bottlenecks: string[];
  upcoming_risks: string[];
  recommended_actions: string[];
}

export interface TaskCreationBatch {
  breakdown_id: string;
  selected_task_ids: string[];
  project_id?: string;
  apply_scheduling?: boolean;
  assign_dependencies?: boolean;
}

export interface BreakdownTemplate {
  name: string;
  description: string;
  phases: PhaseTemplate[];
  common_tasks: TaskTemplate[];
  complexity_factors: string[];
  estimated_duration_range: {
    min_days: number;
    max_days: number;
  };
  success_rate: number;
  recommended_for: string[];
}