// Epic 9, Story 9.2: Smart Priority Optimization Types

export type OptimizationType = 'automatic' | 'suggested' | 'manual_override';
export type ScheduleType = 'daily' | 'hourly' | 'on_change' | 'manual';
export type OptimizationScope = 'all' | 'pending' | 'active' | 'overdue';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RuleType = 'deadline_based' | 'dependency_based' | 'pattern_based' | 'context_based';

export interface PriorityOptimizationRule {
  id: string;
  user_id: string;
  
  // Rule identification
  rule_name: string;
  rule_type: RuleType;
  description?: string;
  
  // Rule configuration
  rule_config: Record<string, any>;
  weight: number; // 0.0 to 1.0
  
  // Conditions
  trigger_conditions: Record<string, any>;
  exclusion_conditions: Record<string, any>;
  
  // Status and performance
  is_active: boolean;
  times_applied: number;
  success_rate?: number;
  
  created_at: string;
  updated_at: string;
}

export interface PriorityOptimizationHistory {
  id: string;
  user_id: string;
  task_id: string;
  
  // Optimization details
  optimization_type: OptimizationType;
  old_priority: string;
  new_priority: string;
  confidence_score: number;
  reasoning?: string;
  
  // Applied rules
  applied_rules: Record<string, any>;
  optimization_factors: Record<string, any>;
  
  // User interaction
  user_accepted?: boolean;
  user_feedback?: string;
  reverted_at?: string;
  
  created_at: string;
}

export interface TaskPriorityScore {
  id: string;
  task_id: string;
  user_id: string;
  
  // Priority scoring
  calculated_priority: string;
  priority_score: number;
  confidence_level: number;
  
  // Score breakdown
  urgency_score: number;
  importance_score: number;
  context_score: number;
  pattern_score: number;
  dependency_score: number;
  
  // Calculation metadata
  calculation_method: string;
  factors_considered: Record<string, any>;
  last_recalculated_at: string;
  
  // Status
  is_current: boolean;
  
  created_at: string;
}

export interface PriorityOptimizationSchedule {
  id: string;
  user_id: string;
  
  // Schedule configuration
  schedule_name: string;
  schedule_type: ScheduleType;
  
  // Timing
  schedule_time?: string; // TIME format
  schedule_interval?: number; // minutes
  
  // Optimization parameters
  optimization_scope: OptimizationScope;
  max_changes_per_run: number;
  min_confidence_threshold: number;
  
  // Filters
  category_filter: string[];
  project_filter: string[];
  priority_filter: string[];
  
  // Status
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PriorityOptimizationJob {
  id: string;
  user_id: string;
  schedule_id?: string;
  
  // Job details
  job_type: 'scheduled' | 'on_demand' | 'triggered';
  scope: Record<string, any>;
  
  // Processing status
  status: JobStatus;
  started_at?: string;
  completed_at?: string;
  
  // Results
  tasks_analyzed: number;
  priorities_changed: number;
  errors_count: number;
  error_details: any[];
  
  // Progress tracking
  progress_percentage: number;
  current_task?: string;
  
  created_at: string;
}

export interface PriorityRecommendation {
  task_id: string;
  task_title: string;
  current_priority: string;
  recommended_priority: string;
  priority_score: number;
  confidence_score: number;
  reasoning: string;
  score_breakdown: {
    urgency_score: number;
    importance_score: number;
    context_score: number;
    pattern_score: number;
    dependency_score: number;
  };
}

export interface OptimizationResult {
  task_id: string;
  old_priority: string;
  new_priority: string;
  score: number;
  confidence: number;
}

// Request/Response types
export interface GetPriorityRecommendationsRequest {
  task_ids?: string[];
  limit?: number;
}

export interface OptimizeTaskPrioritiesRequest {
  task_ids?: string[];
  max_changes?: number;
  min_confidence?: number;
}

export interface CreateOptimizationRuleRequest {
  rule_name: string;
  rule_type: RuleType;
  description?: string;
  rule_config: Record<string, any>;
  weight?: number;
  trigger_conditions?: Record<string, any>;
  exclusion_conditions?: Record<string, any>;
}

export interface UpdateOptimizationRuleRequest {
  rule_name?: string;
  rule_type?: RuleType;
  description?: string;
  rule_config?: Record<string, any>;
  weight?: number;
  trigger_conditions?: Record<string, any>;
  exclusion_conditions?: Record<string, any>;
  is_active?: boolean;
}

export interface CreateOptimizationScheduleRequest {
  schedule_name: string;
  schedule_type: ScheduleType;
  schedule_time?: string;
  schedule_interval?: number;
  optimization_scope?: OptimizationScope;
  max_changes_per_run?: number;
  min_confidence_threshold?: number;
  category_filter?: string[];
  project_filter?: string[];
  priority_filter?: string[];
}

export interface UpdateOptimizationScheduleRequest {
  schedule_name?: string;
  schedule_type?: ScheduleType;
  schedule_time?: string;
  schedule_interval?: number;
  optimization_scope?: OptimizationScope;
  max_changes_per_run?: number;
  min_confidence_threshold?: number;
  category_filter?: string[];
  project_filter?: string[];
  priority_filter?: string[];
  is_active?: boolean;
}

export interface PriorityOptimizationStats {
  total_optimizations: number;
  accepted_optimizations: number;
  acceptance_rate: number;
  average_confidence: number;
  most_effective_rule: string;
  last_optimization_run?: string;
  tasks_optimized_today: number;
  average_score_improvement: number;
}

export interface OptimizationInsights {
  peak_optimization_hours: string[];
  most_optimized_priorities: string[];
  rule_effectiveness: Record<string, number>;
  user_acceptance_patterns: Record<string, any>;
  improvement_suggestions: string[];
}