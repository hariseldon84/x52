// Epic 9, Story 9.4: Context-Aware Notification System Types

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
export type NotificationType = 'task_due' | 'task_overdue' | 'reminder' | 'followup' | 'priority_change' | 'system' | 'achievement';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'scheduled' | 'delivered' | 'failed' | 'dismissed' | 'expired';
export type UserActivity = 'working' | 'meeting' | 'commuting' | 'break' | 'offline' | 'sleeping';
export type LocationType = 'office' | 'home' | 'travel' | 'other';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type FocusModeType = 'deep_work' | 'meeting' | 'break' | 'custom';
export type RuleType = 'context_filter' | 'time_based' | 'frequency_limit' | 'priority_boost';
export type BatchType = 'similar_notifications' | 'time_based' | 'project_based';
export type DeliveryMethod = 'digest' | 'individual' | 'summary';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  
  // Global notification settings
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  
  // Context-aware settings
  context_awareness_enabled: boolean;
  location_based_notifications: boolean;
  time_based_optimization: boolean;
  activity_based_filtering: boolean;
  
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // TIME format
  quiet_hours_end: string; // TIME format
  quiet_hours_timezone: string;
  
  // Focus modes
  focus_mode_enabled: boolean;
  focus_mode_schedule: Array<{
    start_time: string;
    end_time: string;
    days: string[];
    focus_type: FocusModeType;
  }>;
  do_not_disturb_keywords: string[];
  
  // Urgency thresholds
  urgent_priority_immediate: boolean;
  high_priority_delay_minutes: number;
  medium_priority_delay_minutes: number;
  low_priority_delay_minutes: number;
  
  // Frequency controls
  max_notifications_per_hour: number;
  batch_similar_notifications: boolean;
  notification_cooldown_minutes: number;
  
  created_at: string;
  updated_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  
  // Current context
  current_activity?: UserActivity;
  current_location_type?: LocationType;
  current_device?: DeviceType;
  
  // Context data
  context_data: Record<string, any>;
  context_confidence: number;
  
  // Availability
  is_available: boolean;
  availability_until?: string;
  
  // Focus state
  is_in_focus_mode: boolean;
  focus_mode_type?: FocusModeType;
  focus_mode_until?: string;
  
  // Learning data
  response_patterns: Record<string, any>;
  notification_preferences: Record<string, any>;
  
  last_activity_at: string;
  context_updated_at: string;
}

export interface SmartNotification {
  id: string;
  user_id: string;
  
  // Notification content
  notification_type: NotificationType;
  title: string;
  message: string;
  
  // Related entities
  related_task_id?: string;
  related_project_id?: string;
  
  // Delivery configuration
  channels: NotificationChannel[];
  priority_level: PriorityLevel;
  
  // Context evaluation
  context_score: number;
  optimal_delivery_time?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  
  // Delivery tracking
  status: NotificationStatus;
  scheduled_for?: string;
  delivered_at?: string;
  read_at?: string;
  
  // User interaction
  clicked: boolean;
  dismissed: boolean;
  action_taken?: string;
  
  // Metadata
  metadata: Record<string, any>;
  retry_count: number;
  
  created_at: string;
  
  // Relations
  related_task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  };
  related_project?: {
    id: string;
    name: string;
  };
}

export interface NotificationDeliveryHistory {
  id: string;
  notification_id: string;
  user_id: string;
  
  // Delivery details
  delivery_channel: NotificationChannel;
  delivered_at: string;
  
  // Context at delivery
  user_context: Record<string, any>;
  device_context: Record<string, any>;
  
  // User response
  opened_at?: string;
  response_time_seconds?: number;
  response_action?: string;
  
  // Effectiveness metrics
  was_useful?: boolean;
  was_timely?: boolean;
  user_feedback?: string;
  
  created_at: string;
}

export interface NotificationRule {
  id: string;
  user_id: string;
  
  // Rule identification
  rule_name: string;
  rule_type: RuleType;
  description?: string;
  
  // Rule conditions
  conditions: Record<string, any>;
  actions: Record<string, any>;
  
  // Priority and ordering
  priority: number;
  
  // Status
  is_active: boolean;
  times_applied: number;
  success_rate?: number;
  
  created_at: string;
  updated_at: string;
}

export interface NotificationBatch {
  id: string;
  user_id: string;
  
  // Batch configuration
  batch_type: BatchType;
  batch_title: string;
  
  // Delivery settings
  delivery_method: DeliveryMethod;
  scheduled_delivery_time: string;
  
  // Status
  status: 'pending' | 'delivered' | 'cancelled';
  delivered_at?: string;
  
  // Metadata
  batch_metadata: Record<string, any>;
  
  created_at: string;
  
  // Relations
  items?: NotificationBatchItem[];
}

export interface NotificationBatchItem {
  id: string;
  batch_id: string;
  notification_id: string;
  
  // Item ordering within batch
  sort_order: number;
  
  // Item-specific delivery settings
  item_metadata: Record<string, any>;
  
  created_at: string;
  
  // Relations
  notification?: SmartNotification;
}

// Request/Response types
export interface UpdateNotificationPreferencesRequest {
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  in_app_notifications?: boolean;
  context_awareness_enabled?: boolean;
  location_based_notifications?: boolean;
  time_based_optimization?: boolean;
  activity_based_filtering?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone?: string;
  focus_mode_enabled?: boolean;
  focus_mode_schedule?: Array<{
    start_time: string;
    end_time: string;
    days: string[];
    focus_type: FocusModeType;
  }>;
  do_not_disturb_keywords?: string[];
  urgent_priority_immediate?: boolean;
  high_priority_delay_minutes?: number;
  medium_priority_delay_minutes?: number;
  low_priority_delay_minutes?: number;
  max_notifications_per_hour?: number;
  batch_similar_notifications?: boolean;
  notification_cooldown_minutes?: number;
}

export interface UpdateUserContextRequest {
  current_activity?: UserActivity;
  current_location_type?: LocationType;
  current_device?: DeviceType;
  is_available?: boolean;
  availability_until?: string;
  is_in_focus_mode?: boolean;
  focus_mode_type?: FocusModeType;
  focus_mode_until?: string;
  context_data?: Record<string, any>;
}

export interface CreateNotificationRequest {
  notification_type: NotificationType;
  title: string;
  message: string;
  related_task_id?: string;
  related_project_id?: string;
  channels?: NotificationChannel[];
  priority_level?: PriorityLevel;
  metadata?: Record<string, any>;
}

export interface CreateNotificationRuleRequest {
  rule_name: string;
  rule_type: RuleType;
  description?: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority?: number;
}

export interface UpdateNotificationRuleRequest {
  rule_name?: string;
  rule_type?: RuleType;
  description?: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  priority?: number;
  is_active?: boolean;
}

export interface NotificationInteractionRequest {
  notification_id: string;
  action: 'clicked' | 'dismissed' | 'snoozed' | 'completed_task' | 'viewed_task';
  feedback?: string;
}

export interface NotificationStats {
  total_notifications: number;
  delivered_notifications: number;
  delivery_rate: number;
  average_response_time: number; // seconds
  click_through_rate: number;
  dismissal_rate: number;
  context_accuracy: number;
  notifications_today: number;
  most_effective_channel: NotificationChannel;
  peak_notification_hours: string[];
  user_satisfaction_score: number;
}

export interface NotificationInsights {
  delivery_effectiveness: {
    channel_performance: Record<NotificationChannel, {
      delivery_rate: number;
      response_rate: number;
      user_satisfaction: number;
    }>;
    time_based_performance: Record<string, number>;
    context_based_performance: Record<string, number>;
  };
  user_behavior_patterns: {
    preferred_delivery_times: string[];
    response_time_patterns: Record<string, number>;
    activity_preferences: Record<UserActivity, number>;
    channel_preferences: Record<NotificationChannel, number>;
  };
  optimization_opportunities: {
    suggested_rule_changes: Array<{
      rule_id: string;
      current_performance: number;
      suggested_change: string;
      expected_improvement: number;
    }>;
    timing_optimizations: Array<{
      notification_type: NotificationType;
      current_timing: string;
      suggested_timing: string;
      confidence: number;
    }>;
  };
  improvement_recommendations: string[];
}

export interface ContextAnalysis {
  current_context_score: number;
  context_factors: {
    time_appropriateness: number;
    activity_compatibility: number;
    availability_status: number;
    focus_state_impact: number;
  };
  recommendations: {
    optimal_delivery_time?: string;
    preferred_channels: NotificationChannel[];
    context_improvements: string[];
  };
  predicted_user_response: {
    likelihood_to_engage: number;
    expected_response_time: number;
    preferred_action: string;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  notification_type: NotificationType;
  title_template: string;
  message_template: string;
  default_channels: NotificationChannel[];
  default_priority: PriorityLevel;
  context_rules: Record<string, any>;
  personalization_fields: string[];
}

export interface FocusSession {
  id: string;
  user_id: string;
  focus_type: FocusModeType;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  notification_rules: Record<string, any>;
  break_conditions: string[];
  created_at: string;
}