// Epic 8, Story 8.4: Email Integration Types

export type EmailProvider = 'gmail' | 'outlook';

export interface EmailConnection {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email_address: string;
  provider_account_id?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailProcessingRule {
  id: string;
  user_id: string;
  rule_name: string;
  rule_description?: string;
  is_active: boolean;
  priority: number;
  
  // Trigger conditions
  from_addresses?: string[];
  to_addresses?: string[];
  subject_patterns?: string[];
  body_keywords?: string[];
  has_attachments?: boolean;
  folder_names?: string[];
  
  // Task creation settings
  task_title_template: string;
  task_description_template: string;
  default_priority: string;
  default_complexity: string;
  default_category_id?: string;
  default_project_id?: string;
  auto_assign_to_user: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface ProcessedEmail {
  id: string;
  connection_id: string;
  message_id: string;
  thread_id?: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  received_date: string;
  has_attachments: boolean;
  folder_name?: string;
  labels?: string[];
  
  // Processing results
  processing_status: 'pending' | 'processed' | 'ignored' | 'failed';
  rule_id?: string;
  task_id?: string;
  processing_error?: string;
  processed_at?: string;
  
  created_at: string;
  
  connection?: {
    provider: EmailProvider;
    email_address: string;
  };
  rule?: EmailProcessingRule;
  task?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface EmailAttachment {
  id: string;
  processed_email_id: string;
  filename: string;
  content_type?: string;
  file_size?: number;
  attachment_id?: string;
  download_url?: string;
  is_downloaded: boolean;
  local_file_path?: string;
  created_at: string;
}

export interface EmailSyncLog {
  id: string;
  connection_id: string;
  sync_type: 'full_sync' | 'incremental' | 'webhook';
  status: 'started' | 'completed' | 'failed';
  emails_processed: number;
  emails_imported: number;
  tasks_created: number;
  errors_count: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  
  connection?: {
    provider: EmailProvider;
    email_address: string;
  };
}

export interface EmailSearchResult {
  email_id: string;
  subject?: string;
  from_address: string;
  received_date: string;
  processing_status: string;
  task_id?: string;
  provider: EmailProvider;
  rank: number;
}

export interface CreateRuleRequest {
  rule_name: string;
  rule_description?: string;
  priority: number;
  from_addresses?: string[];
  to_addresses?: string[];
  subject_patterns?: string[];
  body_keywords?: string[];
  has_attachments?: boolean;
  folder_names?: string[];
  task_title_template: string;
  task_description_template: string;
  default_priority: string;
  default_complexity: string;
  default_category_id?: string;
  default_project_id?: string;
  auto_assign_to_user: boolean;
}

export interface EmailStats {
  total_emails: number;
  processed_emails: number;
  pending_emails: number;
  failed_emails: number;
  tasks_created: number;
  last_sync?: string;
}