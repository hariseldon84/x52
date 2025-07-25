// Epic 9, Story 9.1: AI Task Suggestion Types

export type ModelType = 'task_suggestion' | 'priority_optimization' | 'nlp' | 'behavior_analysis';
export type SuggestionType = 'similar_task' | 'follow_up' | 'pattern_based' | 'context_aware' | 'time_based' | 'related_contacts';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed' | 'modified';
export type FeedbackType = 'acceptance' | 'rejection' | 'modification' | 'rating';
export type PatternType = 'task_creation' | 'completion_time' | 'priority_preference' | 'time_of_day' | 'category_preference';
export type SuggestionFrequency = 'minimal' | 'moderate' | 'frequent';
export type OptimizationAggressiveness = 'conservative' | 'balanced' | 'aggressive';

export interface AIModel {
  id: string;
  model_name: string;
  model_type: ModelType;
  model_version: string;
  description?: string;
  
  // Configuration
  config: Record<string, any>;
  endpoint_url?: string;
  api_key_reference?: string;
  
  // Performance metrics
  accuracy_score?: number;
  last_trained_at?: string;
  training_data_size?: number;
  
  // Status
  is_active: boolean;
  is_default: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface UserAIPreferences {
  id: string;
  user_id: string;
  
  // Suggestion preferences
  enable_ai_suggestions: boolean;
  suggestion_frequency: SuggestionFrequency;
  suggestion_types: SuggestionType[];
  
  // Priority optimization
  enable_priority_optimization: boolean;
  optimization_aggressiveness: OptimizationAggressiveness;
  
  // Automation preferences
  enable_automated_followups: boolean;
  followup_delay_hours: number;
  max_automated_tasks: number;
  
  // Notification preferences
  enable_smart_notifications: boolean;
  notification_timing_optimization: boolean;
  quiet_hours_start: string; // TIME format
  quiet_hours_end: string; // TIME format
  
  // Learning preferences
  allow_behavior_tracking: boolean;
  data_retention_days: number;
  
  created_at: string;
  updated_at: string;
}

export interface AITaskSuggestion {
  id: string;
  user_id: string;
  model_id: string;
  
  // Suggestion details
  suggested_title: string;
  suggested_description?: string;
  suggested_priority: string;
  suggested_complexity: string;
  suggested_category_id?: string;
  suggested_project_id?: string;
  suggested_due_date?: string;
  
  // Context
  suggestion_type: SuggestionType;
  source_context: Record<string, any>;
  confidence_score: number;
  reasoning?: string;
  
  // User interaction
  status: SuggestionStatus;
  user_feedback?: 'helpful' | 'not_helpful' | 'irrelevant';
  created_task_id?: string;
  
  // Metadata
  suggested_at: string;
  responded_at?: string;
  expires_at: string;
  
  // Relations
  model?: AIModel;
  created_task?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface AISuggestionFeedback {
  id: string;
  suggestion_id: string;
  user_id: string;
  
  // Feedback details
  feedback_type: FeedbackType;
  feedback_value: Record<string, any>;
  feedback_text?: string;
  
  // Context
  interaction_context: Record<string, any>;
  response_time_seconds?: number;
  
  created_at: string;
  
  // Relations
  suggestion?: AITaskSuggestion;
}

export interface UserBehaviorPattern {
  id: string;
  user_id: string;
  
  // Pattern identification
  pattern_type: PatternType;
  pattern_name: string;
  
  // Pattern data
  pattern_data: Record<string, any>;
  confidence_level: number;
  
  // Temporal aspects
  time_period?: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  valid_from: string;
  valid_until?: string;
  
  // Usage tracking
  times_applied: number;
  success_rate?: number;
  
  created_at: string;
  updated_at: string;
}

export interface AITrainingData {
  id: string;
  model_id: string;
  user_id?: string;
  
  // Training data
  input_features: Record<string, any>;
  expected_output: Record<string, any>;
  actual_output?: Record<string, any>;
  
  // Data quality
  data_quality_score?: number;
  is_validated: boolean;
  validation_notes?: string;
  
  // Privacy and compliance
  is_anonymized: boolean;
  retention_expires_at?: string;
  
  created_at: string;
  
  // Relations
  model?: AIModel;
}

export interface AIModelMetrics {
  id: string;
  model_id: string;
  
  // Performance metrics
  metric_name: string;
  metric_value: number;
  metric_context: Record<string, any>;
  
  // Temporal data
  measurement_period: 'hour' | 'day' | 'week' | 'month';
  period_start: string;
  period_end: string;
  
  created_at: string;
  
  // Relations
  model?: AIModel;
}

export interface GenerateSuggestionsRequest {
  suggestion_type?: SuggestionType;
  limit?: number;
  context?: Record<string, any>;
}

export interface AcceptSuggestionRequest {
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

export interface RejectSuggestionRequest {
  suggestion_id: string;
  feedback_reason?: 'not_relevant' | 'too_similar' | 'wrong_timing' | 'incorrect_details' | 'other';
  feedback_text?: string;
}

export interface UpdateAIPreferencesRequest {
  enable_ai_suggestions?: boolean;
  suggestion_frequency?: SuggestionFrequency;
  suggestion_types?: SuggestionType[];
  enable_priority_optimization?: boolean;
  optimization_aggressiveness?: OptimizationAggressiveness;
  enable_automated_followups?: boolean;
  followup_delay_hours?: number;
  max_automated_tasks?: number;
  enable_smart_notifications?: boolean;
  notification_timing_optimization?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  allow_behavior_tracking?: boolean;
  data_retention_days?: number;
}

export interface AIStats {
  total_suggestions_generated: number;
  suggestions_accepted: number;
  suggestions_rejected: number;
  acceptance_rate: number;
  average_confidence_score: number;
  tasks_created_from_ai: number;
  behavior_patterns_detected: number;
  model_accuracy: number;
  last_suggestion_generated?: string;
}

export interface SuggestionInsights {
  most_accepted_type: SuggestionType;
  best_performing_time: string;
  average_response_time: number;
  feedback_distribution: Record<string, number>;
  improvement_suggestions: string[];
}

export interface TaskAnalysisResult {
  suggested_priority?: string;
  suggested_complexity?: string;
  suggested_category?: string;
  suggested_due_date?: string;
  confidence_scores: Record<string, number>;
  reasoning: string;
}

export interface BehaviorAnalysisResult {
  detected_patterns: UserBehaviorPattern[];
  productivity_insights: {
    peak_hours: string[];
    preferred_task_types: string[];
    completion_patterns: Record<string, any>;
  };
  recommendations: string[];
}