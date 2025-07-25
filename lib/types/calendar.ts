// Epic 8, Story 8.1: Calendar Integration Types

export type CalendarProvider = 'google' | 'outlook';

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  provider_account_id: string;
  provider_account_email: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scope?: string;
  is_active: boolean;
  last_sync_at?: string;
  sync_settings: SyncSettings;
  created_at: string;
  updated_at: string;
  calendars?: UserCalendar[];
}

export interface UserCalendar {
  id: string;
  connection_id: string;
  calendar_id: string;
  calendar_name: string;
  is_primary: boolean;
  is_selected: boolean;
  color?: string;
  time_zone?: string;
  access_role: string;
  created_at: string;
  updated_at: string;
  connection?: {
    id: string;
    provider: CalendarProvider;
    provider_account_email: string;
  };
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location?: string;
  attendees: string; // JSON string
  creator_email?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'default' | 'public' | 'private';
  recurrence_rule?: string;
  original_start_time?: string;
  is_recurring: boolean;
  etag?: string;
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCalendarSync {
  id: string;
  task_id: string;
  calendar_id: string;
  event_id?: string;
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict';
  sync_direction: 'task_to_calendar' | 'calendar_to_task' | 'bidirectional';
  last_sync_at?: string;
  sync_error?: string;
  conflict_data?: any;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncLog {
  id: string;
  connection_id: string;
  sync_type: 'full_sync' | 'incremental_sync' | 'webhook_update';
  status: 'started' | 'completed' | 'failed';
  events_processed: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  connection?: {
    provider: CalendarProvider;
    provider_account_email: string;
  };
}

export interface SyncSettings {
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  create_tasks_from_events: boolean;
  create_events_from_tasks: boolean;
  sync_past_events_days: number;
  sync_future_events_days: number;
  default_task_duration_minutes: number;
  meeting_keywords: string[];
  exclude_all_day_events: boolean;
  exclude_declined_events: boolean;
}

export interface CalendarIntegrationStats {
  total_connections: number;
  active_connections: number;
  total_calendars: number;
  selected_calendars: number;
  synced_events: number;
  linked_tasks: number;
  last_sync_at?: string;
  sync_errors: number;
}

export interface TaskSuggestion {
  id: string;
  user_id: string;
  suggested_title: string;
  suggested_description?: string;
  suggestion_type: 'calendar_meeting' | 'deadline_reminder' | 'follow_up';
  source_data: any;
  is_dismissed: boolean;
  is_accepted: boolean;
  created_task_id?: string;
  created_at: string;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
  organizer?: boolean;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  location?: string;
  attendees?: CalendarEventAttendee[];
  recurrence_rule?: string;
  reminders?: {
    minutes: number;
    method: 'email' | 'popup';
  }[];
}

export interface CalendarConflict {
  task_id: string;
  event_id: string;
  conflict_type: 'time_mismatch' | 'title_mismatch' | 'description_mismatch';
  task_data: any;
  event_data: any;
  suggested_resolution: 'update_task' | 'update_event' | 'manual_resolve';
}

export interface CalendarOAuthConfig {
  google: {
    client_id: string;
    scopes: string[];
    redirect_uri: string;
  };
  outlook: {
    client_id: string;
    scopes: string[];
    redirect_uri: string;
  };
}

export interface CalendarProviderInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
  oauth_url: string;
}

export interface SyncConflictResolution {
  conflict_id: string;
  resolution_type: 'use_task' | 'use_event' | 'merge' | 'create_new';
  updated_data?: any;
}

export interface CalendarWebhookData {
  provider: CalendarProvider;
  event_type: 'created' | 'updated' | 'deleted';
  calendar_id: string;
  event_id: string;
  event_data?: any;
  timestamp: string;
}