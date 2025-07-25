// Epic 9, Story 9.6: Predictive Analytics and Insights Types

export type PredictionModelType = 'completion_prediction' | 'capacity_forecast' | 'bottleneck_detection';
export type BottleneckType = 'skill_gap' | 'time_management' | 'context_switching' | 'external_dependency';
export type BottleneckCategory = 'personal' | 'technical' | 'organizational' | 'environmental';
export type TaskType = 'creative' | 'analytical' | 'administrative' | 'communication';
export type EnergyRequirement = 'low' | 'medium' | 'high';
export type ProductivityTrend = 'improving' | 'declining' | 'stable';
export type PeriodType = 'week' | 'month' | 'quarter';

export interface ProductivityMetrics {
  id: string;
  user_id: string;
  
  // Temporal data
  metric_date: string;
  metric_hour?: number;
  week_number?: number;
  month_number?: number;
  quarter_number?: number;
  
  // Productivity measurements
  tasks_completed: number;
  tasks_created: number;
  goals_achieved: number;
  time_worked_minutes: number;
  productivity_score: number; // 0-1 scale
  
  // Work patterns
  peak_hours: number[];
  task_complexity_distribution: Record<string, number>;
  completion_velocity: number; // Tasks per hour
  
  // Energy and focus metrics
  energy_level?: number; // 1-5 scale
  focus_score: number; // 0-1 scale
  interruption_count: number;
  
  // Context data
  location_type?: string;
  weather_condition?: string;
  stress_level?: number; // 1-5 scale
  
  created_at: string;
}

export interface GoalCompletionPrediction {
  id: string;
  user_id: string;
  goal_id: string;
  
  // Prediction details
  prediction_date: string;
  completion_probability: number; // 0-1 probability
  predicted_completion_date?: string;
  confidence_level: number;
  
  // Factors influencing prediction
  contributing_factors: Record<string, any>;
  risk_factors: string[];
  success_indicators: string[];
  
  // Current state analysis
  current_progress_percentage: number;
  tasks_remaining: number;
  average_completion_velocity: number;
  
  // Time-based predictions
  estimated_hours_remaining?: number;
  optimal_work_schedule: Record<string, any>;
  bottleneck_analysis: Record<string, any>;
  
  // Model metadata
  model_version: string;
  prediction_accuracy_score?: number;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  goal?: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
  };
}

export interface WorkloadPrediction {
  id: string;
  user_id: string;
  
  // Prediction period
  prediction_period_start: string;
  prediction_period_end: string;
  period_type: PeriodType;
  
  // Capacity predictions
  predicted_capacity_hours: number;
  optimal_task_count: number;
  recommended_complexity_mix: Record<string, number>;
  
  // Workload analysis
  current_workload_hours: number;
  workload_utilization: number; // Current vs capacity
  burnout_risk_score: number;
  
  // Performance predictions
  predicted_productivity_score?: number;
  predicted_completion_rate?: number;
  optimal_break_schedule: Record<string, any>;
  
  // Context considerations
  external_factors: Record<string, any>;
  seasonal_adjustments: Record<string, any>;
  historical_pattern_match: number;
  
  // Recommendations
  capacity_recommendations: string[];
  schedule_optimizations: string[];
  risk_mitigation_strategies: string[];
  
  confidence_level: number;
  created_at: string;
}

export interface BottleneckPrediction {
  id: string;
  user_id: string;
  
  // Bottleneck identification
  bottleneck_type: BottleneckType;
  bottleneck_category?: BottleneckCategory;
  
  // Impact analysis
  severity_score: number; // 0-1 scale
  frequency_score: number; // How often this occurs
  productivity_impact: number; // Impact on overall productivity
  
  // Prediction details
  likelihood_next_week: number;
  likelihood_next_month: number;
  estimated_time_cost_hours?: number;
  
  // Context and patterns
  trigger_patterns: Record<string, any>;
  affected_tasks: string[];
  resolution_strategies: string[];
  
  // Historical data
  last_occurrence?: string;
  occurrence_frequency: number; // Times per month
  average_resolution_time_hours?: number;
  
  // Prevention recommendations
  prevention_score: number; // How preventable this is
  early_warning_signals: string[];
  mitigation_actions: string[];
  
  prediction_confidence: number;
  created_at: string;
}

export interface TimingRecommendation {
  id: string;
  user_id: string;
  
  // Timing analysis
  task_type: TaskType;
  complexity_level: string;
  
  // Optimal timing windows
  optimal_hours: number[];
  optimal_days: string[];
  optimal_duration_minutes?: number;
  
  // Performance predictions
  predicted_performance_score?: number;
  expected_completion_time_minutes?: number;
  error_rate_prediction: number;
  
  // Context factors
  energy_requirement?: EnergyRequirement;
  focus_requirement?: EnergyRequirement;
  interruption_tolerance?: EnergyRequirement;
  
  // Environmental preferences
  preferred_location: string[];
  optimal_break_frequency?: number; // Minutes between breaks
  collaboration_timing: Record<string, any>;
  
  // Statistical backing
  sample_size: number; // Number of data points used
  confidence_interval: number;
  last_updated: string;
}

export interface WeeklyInsight {
  id: string;
  user_id: string;
  
  // Report period
  week_start_date: string;
  week_end_date: string;
  week_number: number;
  year: number;
  
  // Productivity summary
  total_productivity_score?: number;
  productivity_trend?: ProductivityTrend;
  productivity_variance?: number; // Consistency measure
  
  // Performance analysis
  goals_completed: number;
  goals_on_track: number;
  goals_at_risk: number;
  average_task_completion_rate?: number;
  
  // Insights and patterns
  key_insights: string[];
  success_patterns: string[];
  improvement_areas: string[];
  behavioral_changes: string[];
  
  // Predictions for next week
  next_week_predictions: Record<string, any>;
  recommended_adjustments: string[];
  focus_areas: string[];
  
  // Comparative analysis
  week_over_week_change?: number; // Percentage change
  month_over_month_trend?: string;
  seasonal_comparison: Record<string, any>;
  
  // Engagement metrics
  report_viewed: boolean;
  report_viewed_at?: string;
  user_feedback_rating?: number; // 1-5 scale
  user_feedback_text?: string;
  
  generated_at: string;
}

export interface PredictionModel {
  id: string;
  model_name: string;
  model_type: PredictionModelType;
  model_version: string;
  
  // Model configuration
  features_used: string[];
  training_period_days: number;
  minimum_data_points: number;
  
  // Performance metrics
  accuracy_score?: number;
  precision_score?: number;
  recall_score?: number;
  f1_score?: number;
  mean_absolute_error?: number;
  
  // Usage statistics
  predictions_made: number;
  correct_predictions: number;
  user_feedback_positive: number;
  user_feedback_negative: number;
  
  // Model metadata
  algorithm_description?: string;
  hyperparameters: Record<string, any>;
  training_data_size?: number;
  last_trained_at?: string;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Request/Response types
export interface ProductivityAnalysisRequest {
  user_id?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  metrics?: string[];
  include_predictions?: boolean;
}

export interface GoalPredictionRequest {
  goal_id: string;
  include_recommendations?: boolean;
  prediction_horizon_days?: number;
}

export interface WorkloadForecastRequest {
  period_type: PeriodType;
  periods_ahead: number;
  include_capacity_recommendations?: boolean;
  external_factors?: Record<string, any>;
}

export interface BottleneckAnalysisRequest {
  analysis_period_days?: number;
  severity_threshold?: number;
  include_prevention_strategies?: boolean;
}

export interface TimingOptimizationRequest {
  task_types?: TaskType[];
  complexity_levels?: string[];
  include_environmental_factors?: boolean;
}

export interface InsightGenerationRequest {
  period_type: 'week' | 'month' | 'quarter';
  include_predictions?: boolean;
  focus_areas?: string[];
}

export interface PredictiveAnalyticsResponse {
  goal_predictions: GoalCompletionPrediction[];
  workload_forecasts: WorkloadPrediction[];
  bottleneck_alerts: BottleneckPrediction[];
  timing_recommendations: TimingRecommendation[];
  productivity_trends: ProductivityTrend;
  confidence_score: number;
  generated_at: string;
}

export interface ProductivityInsights {
  // Performance analysis
  current_productivity_score: number;
  productivity_trend: ProductivityTrend;
  productivity_consistency: number;
  
  // Goal completion analysis
  goals_likely_to_complete: number;
  goals_at_risk: number;
  completion_probability_average: number;
  
  // Capacity analysis
  current_capacity_utilization: number;
  optimal_capacity_hours: number;
  burnout_risk_level: 'low' | 'medium' | 'high' | 'critical';
  
  // Bottleneck identification
  active_bottlenecks: BottleneckPrediction[];
  predicted_bottlenecks: BottleneckPrediction[];
  
  // Timing optimization
  peak_performance_hours: number[];
  optimal_task_distribution: Record<TaskType, number[]>;
  
  // Recommendations
  immediate_actions: string[];
  weekly_optimizations: string[];
  long_term_improvements: string[];
  
  // Confidence metrics
  prediction_confidence: number;
  data_quality_score: number;
  last_updated: string;
}

export interface ProductivityForecast {
  forecast_period: {
    start_date: string;
    end_date: string;
    period_type: PeriodType;
  };
  
  // Predicted metrics
  predicted_productivity_score: number;
  predicted_task_completion_rate: number;
  predicted_goal_completions: number;
  
  // Capacity forecasts
  predicted_capacity_hours: number;
  recommended_workload_distribution: Record<string, number>;
  optimal_break_schedule: Array<{
    day: string;
    break_times: string[];
    duration_minutes: number;
  }>;
  
  // Risk analysis
  burnout_probability: number;
  bottleneck_likelihood: Record<BottleneckType, number>;
  external_risk_factors: string[];
  
  // Recommendations
  capacity_adjustments: string[];
  schedule_optimizations: string[];
  preventive_measures: string[];
  
  // Model metadata
  confidence_level: number;
  prediction_accuracy_estimate: number;
  factors_considered: string[];
  generated_at: string;
}

export interface UserProductivityProfile {
  user_id: string;
  
  // Work patterns
  peak_productivity_hours: number[];
  optimal_work_duration: number; // Minutes
  preferred_break_frequency: number; // Minutes
  
  // Performance characteristics
  average_productivity_score: number;
  productivity_consistency: number;
  task_completion_velocity: number;
  
  // Preferences and constraints
  energy_patterns: Record<string, number>; // Hour -> energy level
  focus_requirements: Record<TaskType, EnergyRequirement>;
  environmental_preferences: {
    location: string[];
    noise_tolerance: EnergyRequirement;
    collaboration_preference: 'individual' | 'collaborative' | 'mixed';
  };
  
  // Historical patterns
  seasonal_variations: Record<string, number>;
  weekly_patterns: Record<string, number>;
  success_factors: string[];
  common_bottlenecks: BottleneckType[];
  
  // Predictive indicators
  burnout_risk_factors: string[];
  productivity_drivers: string[];
  improvement_opportunities: string[];
  
  profile_accuracy: number;
  last_updated: string;
}