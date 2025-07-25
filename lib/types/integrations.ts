// Epic 8, Story 8.5: Third-Party API Integration Framework Types

export type AuthType = 'oauth2' | 'api_key' | 'basic_auth' | 'bearer_token';
export type SyncDirection = 'import' | 'export' | 'bidirectional';
export type ActionType = 'sync' | 'webhook' | 'scheduled' | 'manual';
export type ProcessingStatus = 'pending' | 'processed' | 'failed' | 'ignored';
export type ConflictResolution = 'local_wins' | 'external_wins' | 'merge' | 'manual';

export interface ApiIntegrationTemplate {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  icon_url?: string;
  documentation_url?: string;
  
  // Authentication configuration
  auth_type: AuthType;
  auth_config: Record<string, any>;
  
  // API configuration
  base_url: string;
  api_version?: string;
  rate_limit_config?: Record<string, any>;
  
  // Integration capabilities
  supported_actions: string[];
  webhook_events?: string[];
  
  // Configuration schema
  config_schema: Record<string, any>;
  
  // Status
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiIntegration {
  id: string;
  user_id: string;
  template_id: string;
  
  // User configuration
  name: string;
  description?: string;
  
  // Authentication
  auth_data: Record<string, any>;
  auth_expires_at?: string;
  
  // Configuration
  config: Record<string, any>;
  
  // Settings
  is_active: boolean;
  auto_sync: boolean;
  sync_frequency_minutes: number;
  
  // Status
  last_sync_at?: string;
  last_error?: string;
  error_count: number;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  template?: ApiIntegrationTemplate;
}

export interface ApiIntegrationAction {
  id: string;
  integration_id: string;
  
  // Action configuration
  action_name: string;
  action_type: ActionType;
  description?: string;
  
  // Configuration
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
  field_mappings: Record<string, any>;
  
  // Status
  is_active: boolean;
  last_executed_at?: string;
  execution_count: number;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  integration?: ApiIntegration;
}

export interface ApiCallLog {
  id: string;
  integration_id: string;
  action_id?: string;
  
  // Request details
  method: string;
  url: string;
  headers?: Record<string, any>;
  request_body?: Record<string, any>;
  
  // Response details
  status_code?: number;
  response_headers?: Record<string, any>;
  response_body?: Record<string, any>;
  response_time_ms?: number;
  
  // Processing results
  success: boolean;
  error_message?: string;
  
  // Data transformation results
  records_processed: number;
  tasks_created: number;
  tasks_updated: number;
  
  created_at: string;
  
  // Relations
  integration?: ApiIntegration;
  action?: ApiIntegrationAction;
}

export interface ApiWebhook {
  id: string;
  integration_id: string;
  
  // Webhook configuration
  webhook_url: string;
  secret_key: string;
  
  // Event configuration
  event_types: string[];
  
  // Processing configuration
  processor_config: Record<string, any>;
  
  // Status
  is_active: boolean;
  last_received_at?: string;
  total_received: number;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  integration?: ApiIntegration;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  integration_id: string;
  
  // Event details
  event_type: string;
  event_id?: string;
  
  // Raw webhook data
  headers: Record<string, any>;
  payload: Record<string, any>;
  
  // Processing status
  processing_status: ProcessingStatus;
  processing_error?: string;
  processed_at?: string;
  
  // Results
  tasks_created: number;
  tasks_updated: number;
  
  created_at: string;
  
  // Relations
  webhook?: ApiWebhook;
  integration?: ApiIntegration;
}

export interface SyncMapping {
  id: string;
  integration_id: string;
  
  // Local record
  local_table: string;
  local_record_id: string;
  
  // External record
  external_id: string;
  external_type?: string;
  
  // Sync metadata
  last_synced_at: string;
  sync_direction: SyncDirection;
  
  // Conflict resolution
  local_version: number;
  external_version?: string;
  last_conflict_at?: string;
  conflict_resolution: ConflictResolution;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  integration?: ApiIntegration;
}

export interface CreateIntegrationRequest {
  template_id: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  auth_data?: Record<string, any>;
  auto_sync?: boolean;
  sync_frequency_minutes?: number;
}

export interface UpdateIntegrationRequest {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  is_active?: boolean;
  auto_sync?: boolean;
  sync_frequency_minutes?: number;
}

export interface CreateActionRequest {
  integration_id: string;
  action_name: string;
  action_type: ActionType;
  description?: string;
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
  field_mappings?: Record<string, any>;
}

export interface UpdateActionRequest {
  action_name?: string;
  description?: string;
  trigger_config?: Record<string, any>;
  action_config?: Record<string, any>;
  field_mappings?: Record<string, any>;
  is_active?: boolean;
}

export interface IntegrationStats {
  total_integrations: number;
  active_integrations: number;
  total_actions: number;
  successful_calls: number;
  failed_calls: number;
  tasks_created: number;
  tasks_updated: number;
  last_sync?: string;
}

export interface AuthFlowResult {
  success: boolean;
  auth_data?: Record<string, any>;
  error?: string;
  redirect_url?: string;
}

export interface SyncResult {
  success: boolean;
  records_processed: number;
  tasks_created: number;
  tasks_updated: number;
  errors: string[];
  sync_mappings: SyncMapping[];
}

export interface WebhookProcessingResult {
  success: boolean;
  tasks_created: number;
  tasks_updated: number;
  error?: string;
  processed_data?: Record<string, any>;
}