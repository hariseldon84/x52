// Epic 8, Story 8.3: Note-Taking App Integration Types

export type NoteProvider = 'notion' | 'obsidian';

export interface NoteAppConnection {
  id: string;
  user_id: string;
  provider: NoteProvider;
  provider_account_id?: string;
  provider_workspace_id?: string;
  workspace_name?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotePage {
  id: string;
  connection_id: string;
  page_id: string;
  parent_id?: string;
  title: string;
  url?: string;
  content_preview?: string;
  page_type?: string;
  properties: Record<string, any>;
  last_edited_time?: string;
  created_time?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  connection?: {
    provider: NoteProvider;
    workspace_name?: string;
    connection_config?: Record<string, any>;
  };
}

export interface TaskNoteLink {
  id: string;
  task_id: string;
  note_page_id: string;
  link_type: 'reference' | 'documentation' | 'meeting_notes';
  created_by_user_id: string;
  notes?: string;
  created_at: string;
  note_page?: NotePage;
}

export interface NoteTemplate {
  id: string;
  connection_id: string;
  template_name: string;
  template_type: 'task_page' | 'project_page' | 'meeting_notes';
  provider_template_id?: string;
  template_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteSyncLog {
  id: string;
  connection_id: string;
  sync_type: 'full_sync' | 'incremental' | 'page_update';
  status: 'started' | 'completed' | 'failed';
  pages_processed: number;
  pages_created: number;
  pages_updated: number;
  pages_deleted: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  connection?: {
    provider: NoteProvider;
    workspace_name?: string;
  };
}

export interface NoteSearchIndex {
  id: string;
  note_page_id: string;
  search_vector: string;
  content_text: string;
  indexed_at: string;
}