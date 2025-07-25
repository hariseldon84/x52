// Epic 8, Story 8.6: Zapier Integration Types

export type WebhookStatus = 'pending' | 'sent' | 'failed' | 'retrying';
export type ProcessingStatus = 'pending' | 'processed' | 'failed' | 'rejected';
export type AuthType = 'api_key' | 'oauth2';

export interface ZapierWebhook {
  id: string;
  user_id: string;
  
  // Webhook identification
  webhook_url: string;
  webhook_name: string;
  description?: string;
  
  // Zapier configuration
  zapier_hook_id?: string;
  secret_token: string;
  
  // Event configuration
  trigger_events: string[];
  filter_conditions: Record<string, any>;
  
  // Data transformation
  payload_template: Record<string, any>;
  include_metadata: boolean;
  
  // Status and tracking
  is_active: boolean;
  last_triggered_at?: string;
  total_triggers: number;
  success_count: number;
  error_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface ZapierWebhookEvent {
  id: string;
  webhook_id: string;
  
  // Event details
  event_type: string;
  event_source: string;
  source_record_id: string;
  
  // Trigger context
  trigger_data: Record<string, any>;
  payload_sent: Record<string, any>;
  
  // Processing status
  status: WebhookStatus;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  
  // Retry tracking
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  
  created_at: string;
  processed_at?: string;
  
  // Relations
  webhook?: ZapierWebhook;
}

export interface ZapierAppConfig {
  id: string;
  user_id: string;
  
  // Configuration details
  config_name: string;
  description?: string;
  
  // Zapier app details
  app_id?: string;
  auth_type: AuthType;
  
  // Incoming webhook configuration
  incoming_webhook_url: string;
  webhook_secret: string;
  
  // Action configuration
  supported_actions: string[];
  action_mappings: Record<string, any>;
  
  // Data validation
  validation_rules: Record<string, any>;
  require_authentication: boolean;
  
  // Status
  is_active: boolean;
  last_used_at?: string;
  total_requests: number;
  
  created_at: string;
  updated_at: string;
}

export interface ZapierIncomingRequest {
  id: string;
  app_config_id: string;
  
  // Request details
  zapier_id?: string;
  action_type: string;
  
  // Request data
  headers: Record<string, any>;
  payload: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  
  // Processing results
  processing_status: ProcessingStatus;
  processing_error?: string;
  
  // Results
  created_records: Array<Record<string, any>>;
  validation_errors: Array<Record<string, any>>;
  
  created_at: string;
  processed_at?: string;
  
  // Relations
  app_config?: ZapierAppConfig;
}

export interface ZapierTriggerRegistry {
  id: string;
  
  // Trigger identification
  trigger_name: string;
  display_name: string;
  description?: string;
  category: string;
  
  // Event configuration
  source_table: string;
  event_types: string[];
  
  // Payload configuration
  default_payload_template: Record<string, any>;
  available_fields: Array<{
    field: string;
    type: string;
    description: string;
    required?: boolean;
  }>;
  
  // Filtering options
  filterable_fields: Array<{
    field: string;
    operators: string[];
    values?: string[];
  }>;
  
  // Status
  is_active: boolean;
  is_premium: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookRequest {
  webhook_name: string;
  description?: string;
  zapier_hook_id?: string;
  trigger_events: string[];
  filter_conditions?: Record<string, any>;
  payload_template: Record<string, any>;
  include_metadata?: boolean;
}

export interface UpdateWebhookRequest {
  webhook_name?: string;
  description?: string;
  trigger_events?: string[];
  filter_conditions?: Record<string, any>;
  payload_template?: Record<string, any>;
  include_metadata?: boolean;
  is_active?: boolean;
}

export interface CreateAppConfigRequest {
  config_name: string;
  description?: string;
  app_id?: string;
  auth_type: AuthType;
  supported_actions: string[];
  action_mappings: Record<string, any>;
  validation_rules?: Record<string, any>;
  require_authentication?: boolean;
}

export interface UpdateAppConfigRequest {
  config_name?: string;
  description?: string;
  supported_actions?: string[];
  action_mappings?: Record<string, any>;
  validation_rules?: Record<string, any>;
  require_authentication?: boolean;
  is_active?: boolean;
}

export interface ZapierStats {
  total_webhooks: number;
  active_webhooks: number;
  total_triggers: number;
  successful_triggers: number;
  failed_triggers: number;
  total_incoming_requests: number;
  successful_requests: number;
  failed_requests: number;
  last_trigger?: string;
  last_request?: string;
}

export interface WebhookTestResult {
  success: boolean;
  response_status?: number;
  response_body?: string;
  error?: string;
  payload_sent: Record<string, any>;
}

export interface TriggerFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface PayloadField {
  key: string;
  value: string; // Template string like "{{task.title}}"
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'object';
  required: boolean;
}

export interface ZapierIntegrationSettings {
  webhook_base_url: string;
  api_base_url: string;
  max_retries: number;
  retry_backoff_multiplier: number;
  webhook_timeout_seconds: number;
  rate_limit_per_minute: number;
  enable_debug_logging: boolean;
}