// Epic 9, Story 9.3: Automated Follow-up Task Creation Types

export type TemplateType = 'completion_followup' | 'deadline_reminder' | 'dependency_chain' | 'recurring_review';
export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export type FollowupStatus = 'scheduled' | 'created' | 'cancelled' | 'failed';
export type DependencyType = 'blocks' | 'enables' | 'informs' | 'follows';
export type DependencyStrictness = 'hard' | 'soft' | 'suggestion';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed';
export type TriggerEvent = 'task_completed' | 'deadline_approaching' | 'pattern_detected';
export type JobType = 'process_followups' | 'check_dependencies' | 'generate_suggestions';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface FollowupTemplate {
  id: string;
  user_id: string;
  
  // Template identification
  template_name: string;
  template_type: TemplateType;
  description?: string;
  
  // Template configuration
  trigger_conditions: Record<string, any>;
  followup_config: Record<string, any>;
  
  // Timing configuration
  delay_amount: number;
  delay_unit: DelayUnit;
  
  // Task creation settings
  inherit_properties: string[];
  default_priority: string;
  default_complexity: string;
  
  // Status and performance
  is_active: boolean;
  times_triggered: number;
  success_rate?: number;
  
  created_at: string;
  updated_at: string;
}

export interface AutomatedFollowup {
  id: string;
  user_id: string;
  template_id?: string;
  trigger_task_id: string;
  
  // Follow-up task details
  followup_title: string;
  followup_description?: string;
  followup_priority: string;
  followup_complexity: string;
  followup_category_id?: string;
  followup_project_id?: string;
  
  // Scheduling
  scheduled_for: string;
  created_task_id?: string;
  
  // Processing status
  status: FollowupStatus;
  processing_notes?: string;
  
  // User interaction
  user_cancelled: boolean;
  cancellation_reason?: string;
  
  created_at: string;
  processed_at?: string;
  
  // Relations
  template?: FollowupTemplate;
  trigger_task?: {
    id: string;
    title: string;
    status: string;
  };
  created_task?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface TaskDependency {
  id: string;
  user_id: string;
  
  // Dependency relationship
  dependent_task_id: string;
  prerequisite_task_id: string;
  
  // Dependency configuration
  dependency_type: DependencyType;
  strictness: DependencyStrictness;
  
  // Automation behavior
  auto_unblock: boolean;
  notification_enabled: boolean;
  
  // Status tracking
  is_active: boolean;
  resolved_at?: string;
  
  created_at: string;
  
  // Relations
  dependent_task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  };
  prerequisite_task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  };
}

export interface FollowupSuggestion {
  id: string;
  user_id: string;
  source_task_id: string;
  
  // Suggestion details
  suggested_title: string;
  suggested_description?: string;
  suggested_priority?: string;
  suggested_complexity?: string;
  suggestion_reasoning?: string;
  confidence_score: number;
  
  // Suggestion context
  suggestion_type: string;
  trigger_event: TriggerEvent;
  context_data: Record<string, any>;
  
  // User response
  status: SuggestionStatus;
  user_feedback?: string;
  created_task_id?: string;
  
  suggested_at: string;
  responded_at?: string;
  expires_at: string;
  
  // Relations
  source_task?: {
    id: string;
    title: string;
    status: string;
  };
  created_task?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface FollowupAutomationJob {
  id: string;
  user_id: string;
  
  // Job details
  job_type: JobType;
  job_data: Record<string, any>;
  
  // Processing status
  status: JobStatus;
  started_at?: string;
  completed_at?: string;
  
  // Results
  tasks_processed: number;
  followups_created: number;
  suggestions_generated: number;
  errors_count: number;
  error_details: any[];
  
  created_at: string;
}

// Request/Response types
export interface CreateFollowupTemplateRequest {
  template_name: string;
  template_type: TemplateType;
  description?: string;
  trigger_conditions: Record<string, any>;
  followup_config: Record<string, any>;
  delay_amount?: number;
  delay_unit?: DelayUnit;
  inherit_properties?: string[];
  default_priority?: string;
  default_complexity?: string;
}

export interface UpdateFollowupTemplateRequest {
  template_name?: string;
  template_type?: TemplateType;
  description?: string;
  trigger_conditions?: Record<string, any>;
  followup_config?: Record<string, any>;
  delay_amount?: number;
  delay_unit?: DelayUnit;
  inherit_properties?: string[];
  default_priority?: string;
  default_complexity?: string;
  is_active?: boolean;
}

export interface CreateTaskDependencyRequest {
  dependent_task_id: string;
  prerequisite_task_id: string;
  dependency_type?: DependencyType;
  strictness?: DependencyStrictness;
  auto_unblock?: boolean;
  notification_enabled?: boolean;
}

export interface UpdateTaskDependencyRequest {
  dependency_type?: DependencyType;
  strictness?: DependencyStrictness;
  auto_unblock?: boolean;
  notification_enabled?: boolean;
  is_active?: boolean;
}

export interface AcceptFollowupSuggestionRequest {
  suggestion_id: string;
  modifications?: {
    title?: string;
    description?: string;
    priority?: string;
    complexity?: string;
    category_id?: string;
    project_id?: string;
    due_date?: string;
  };
}

export interface RejectFollowupSuggestionRequest {
  suggestion_id: string;
  feedback?: string;
}

export interface FollowupStats {
  total_templates: number;
  active_templates: number;
  total_followups_created: number;
  pending_followups: number;
  success_rate: number;
  average_delay: number; // in hours
  most_used_template: string;
  dependencies_resolved_today: number;
  suggestions_generated: number;
  suggestion_acceptance_rate: number;
}

export interface FollowupInsights {
  most_effective_templates: Array<{
    template_name: string;
    success_rate: number;
    usage_count: number;
  }>;
  optimal_delay_patterns: Record<string, number>;
  dependency_resolution_trends: Record<string, number>;
  suggestion_performance: {
    best_performing_types: string[];
    peak_suggestion_hours: string[];
    user_acceptance_patterns: Record<string, any>;
  };
  improvement_recommendations: string[];
}

export interface DependencyChain {
  chain_id: string;
  tasks: Array<{
    task_id: string;
    task_title: string;
    status: string;
    position_in_chain: number;
    dependencies: TaskDependency[];
  }>;
  completion_progress: number;
  estimated_completion_date?: string;
  blocking_issues: Array<{
    task_id: string;
    issue_description: string;
    resolution_suggestions: string[];
  }>;
}