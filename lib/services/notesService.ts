// Epic 8, Story 8.3: Note-Taking App Connections Service

import { supabase } from '@/lib/supabase';
import type { 
  NoteAppConnection,
  NotePage,
  TaskNoteLink,
  NoteTemplate,
  NoteSyncLog,
  NoteProvider
} from '@/lib/types/notes';

export class NotesService {
  /**
   * Get user's note app connections
   */
  async getConnections(): Promise<NoteAppConnection[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('note_app_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Connect Notion workspace
   */
  async connectNotion(authCode: string): Promise<NoteAppConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Exchange auth code for access token
    const tokenResponse = await this.exchangeNotionAuthCode(authCode);
    
    // Get workspace info
    const workspaceInfo = await this.getNotionWorkspaceInfo(tokenResponse.access_token);
    
    const connectionData = {
      user_id: user.id,
      provider: 'notion' as NoteProvider,
      provider_account_id: tokenResponse.bot_id,
      provider_workspace_id: tokenResponse.workspace_id,
      workspace_name: workspaceInfo.name,
      access_token: tokenResponse.access_token,
      connection_config: {
        workspace_name: workspaceInfo.name,
        workspace_icon: workspaceInfo.icon,
        bot_id: tokenResponse.bot_id,
        owner: tokenResponse.owner,
      },
    };

    const { data, error } = await supabase
      .from('note_app_connections')
      .upsert([connectionData], { onConflict: 'user_id,provider,provider_workspace_id' })
      .select()
      .single();

    if (error) throw error;

    // Initial sync to get pages
    await this.syncNotionPages(data.id);
    
    return data;
  }

  /**
   * Connect Obsidian vault
   */
  async connectObsidian(vaultPath: string, vaultName: string): Promise<NoteAppConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const connectionData = {
      user_id: user.id,
      provider: 'obsidian' as NoteProvider,
      provider_workspace_id: vaultPath,
      workspace_name: vaultName,
      connection_config: {
        vault_path: vaultPath,
        vault_name: vaultName,
        uri_scheme: `obsidian://open?vault=${encodeURIComponent(vaultName)}`,
      },
    };

    const { data, error } = await supabase
      .from('note_app_connections')
      .upsert([connectionData], { onConflict: 'user_id,provider,provider_workspace_id' })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Disconnect note app
   */
  async disconnectApp(connectionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('note_app_connections')
      .update({ is_active: false })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get note pages
   */
  async getPages(connectionId?: string, pageType?: string): Promise<NotePage[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('note_pages')
      .select(`
        *,
        connection:note_app_connections!note_pages_connection_id_fkey(
          provider,
          workspace_name,
          connection_config
        )
      `)
      .eq('is_archived', false)
      .order('last_edited_time', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (pageType) {
      query = query.eq('page_type', pageType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Search note pages
   */
  async searchPages(searchTerm: string, connectionId?: string): Promise<NotePage[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('search_note_pages', {
      p_user_id: user.id,
      p_search_term: searchTerm,
      p_connection_id: connectionId,
      p_limit: 50,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Link task to note page
   */
  async linkTaskToPage(
    taskId: string,
    pageId: string,
    linkType: 'reference' | 'documentation' | 'meeting_notes' = 'reference',
    notes?: string
  ): Promise<TaskNoteLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const linkData = {
      task_id: taskId,
      note_page_id: pageId,
      link_type: linkType,
      created_by_user_id: user.id,
      notes,
    };

    const { data, error } = await supabase
      .from('task_note_links')
      .upsert([linkData], { onConflict: 'task_id,note_page_id' })
      .select(`
        *,
        note_page:note_pages!task_note_links_note_page_id_fkey(
          *,
          connection:note_app_connections!note_pages_connection_id_fkey(provider, workspace_name)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Remove task-note link
   */
  async unlinkTaskFromPage(taskId: string, pageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('task_note_links')
      .delete()
      .eq('task_id', taskId)
      .eq('note_page_id', pageId)
      .eq('created_by_user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get notes linked to task
   */
  async getTaskNotes(taskId: string): Promise<TaskNoteLink[]> {
    const { data, error } = await supabase
      .from('task_note_links')
      .select(`
        *,
        note_page:note_pages!task_note_links_note_page_id_fkey(
          *,
          connection:note_app_connections!note_pages_connection_id_fkey(provider, workspace_name, connection_config)
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create note page from task
   */
  async createPageFromTask(
    taskId: string,
    connectionId: string,
    templateId?: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get connection and task details
    const [connection, task] = await Promise.all([
      this.getConnectionById(connectionId),
      this.getTaskById(taskId),
    ]);

    if (!connection || !task) {
      throw new Error('Connection or task not found');
    }

    let pageId: string;

    if (connection.provider === 'notion') {
      pageId = await this.createNotionPageFromTask(connection, task, templateId);
    } else if (connection.provider === 'obsidian') {
      pageId = await this.createObsidianNoteFromTask(connection, task);
    } else {
      throw new Error('Unsupported note provider');
    }

    return pageId;
  }

  /**
   * Sync pages from note app
   */
  async syncPages(connectionId: string): Promise<void> {
    const connection = await this.getConnectionById(connectionId);
    if (!connection) throw new Error('Connection not found');

    if (connection.provider === 'notion') {
      await this.syncNotionPages(connectionId);
    } else if (connection.provider === 'obsidian') {
      // Obsidian sync would require local file system access
      // In a real implementation, this might use Obsidian's API or file watchers
      console.log('Obsidian sync not implemented - requires local file access');
    }
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(connectionId?: string, limit: number = 20): Promise<NoteSyncLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('note_sync_logs')
      .select(`
        *,
        connection:note_app_connections!note_sync_logs_connection_id_fkey(
          provider,
          workspace_name
        )
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Private helper methods
  private async exchangeNotionAuthCode(code: string): Promise<any> {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${window.location.origin}/integrations/notes/notion/callback`,
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange Notion auth code');
    return response.json();
  }

  private async getNotionWorkspaceInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) throw new Error('Failed to get Notion workspace info');
    return response.json();
  }

  private async syncNotionPages(connectionId: string): Promise<void> {
    const connection = await this.getConnectionById(connectionId);
    if (!connection) return;

    try {
      // Log sync start
      const { data: syncLog } = await supabase
        .from('note_sync_logs')
        .insert([{
          connection_id: connectionId,
          sync_type: 'full_sync',
          status: 'started',
        }])
        .select()
        .single();

      // Get pages from Notion
      const pages = await this.getNotionPages(connection.access_token!);
      
      let processed = 0;
      let created = 0;
      let updated = 0;

      for (const page of pages) {
        const pageData = {
          connection_id: connectionId,
          page_id: page.id,
          title: this.extractNotionTitle(page),
          url: page.url,
          content_preview: this.extractNotionPreview(page),
          page_type: page.object,
          properties: page.properties || {},
          last_edited_time: page.last_edited_time,
          created_time: page.created_time,
        };

        const { error } = await supabase
          .from('note_pages')
          .upsert([pageData], { onConflict: 'connection_id,page_id' });

        if (!error) {
          if (await this.isNewPage(connectionId, page.id)) {
            created++;
          } else {
            updated++;
          }
        }
        processed++;
      }

      // Update sync log
      await supabase
        .from('note_sync_logs')
        .update({
          status: 'completed',
          pages_processed: processed,
          pages_created: created,
          pages_updated: updated,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog?.id);

      // Update connection last sync
      await supabase
        .from('note_app_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connectionId);

    } catch (error) {
      console.error('Notion sync error:', error);
      // Log error in sync logs
    }
  }

  private async getNotionPages(accessToken: string): Promise<any[]> {
    const pages: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: 'object', value: 'page' },
          start_cursor: startCursor,
        }),
      });

      if (!response.ok) break;
      
      const data = await response.json();
      pages.push(...data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    return pages;
  }

  private async createNotionPageFromTask(
    connection: NoteAppConnection,
    task: any,
    templateId?: string
  ): Promise<string> {
    const pageData = {
      parent: { page_id: 'your-default-parent-page-id' }, // Would be configurable
      properties: {
        title: {
          title: [
            {
              text: { content: `Task: ${task.title}` },
            },
          ],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: `Task created from TaskQuest\n\n${task.description || ''}` },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ type: 'text', text: { content: task.title } }],
            checked: task.status === 'completed',
          },
        },
      ],
    };

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) throw new Error('Failed to create Notion page');
    
    const page = await response.json();
    
    // Store in database
    await supabase
      .from('note_pages')
      .insert([{
        connection_id: connection.id,
        page_id: page.id,
        title: `Task: ${task.title}`,
        url: page.url,
        content_preview: task.description?.substring(0, 200),
        page_type: 'page',
        properties: page.properties,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
      }]);

    return page.id;
  }

  private async createObsidianNoteFromTask(
    connection: NoteAppConnection,
    task: any
  ): Promise<string> {
    // For Obsidian, we create a URI that opens/creates a note
    const noteTitle = `Task - ${task.title}`;
    const noteContent = `# ${task.title}\n\n` +
      `**Status:** ${task.status}\n` +
      `**Priority:** ${task.priority}\n` +
      `**Complexity:** ${task.complexity}\n` +
      (task.due_date ? `**Due Date:** ${task.due_date}\n` : '') +
      `\n${task.description || ''}\n\n` +
      `---\n` +
      `Created from TaskQuest on ${new Date().toISOString().split('T')[0]}`;

    const obsidianUri = `obsidian://new?` +
      `vault=${encodeURIComponent(connection.workspace_name)}&` +
      `name=${encodeURIComponent(noteTitle)}&` +
      `content=${encodeURIComponent(noteContent)}`;

    // Store in database (the actual file creation happens via URI)
    const { data: page } = await supabase
      .from('note_pages')
      .insert([{
        connection_id: connection.id,
        page_id: `obsidian_${Date.now()}`,
        title: noteTitle,
        url: obsidianUri,
        content_preview: noteContent.substring(0, 200),
        page_type: 'note',
        properties: { source: 'taskquest', task_id: task.id },
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString(),
      }])
      .select()
      .single();

    return page?.id || '';
  }

  private extractNotionTitle(page: any): string {
    const titleProperty = page.properties?.title || page.properties?.Name;
    if (titleProperty?.title?.[0]?.text?.content) {
      return titleProperty.title[0].text.content;
    }
    return 'Untitled';
  }

  private extractNotionPreview(page: any): string {
    // Extract preview from page properties or content
    // This is a simplified version - real implementation would fetch page content
    return 'Page content preview...';
  }

  private async getConnectionById(connectionId: string): Promise<NoteAppConnection | null> {
    const { data, error } = await supabase
      .from('note_app_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error) return null;
    return data;
  }

  private async getTaskById(taskId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw error;
    return data;
  }

  private async isNewPage(connectionId: string, pageId: string): Promise<boolean> {
    const { data } = await supabase
      .from('note_pages')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('page_id', pageId)
      .single();

    return !data;
  }
}

export const notesService = new NotesService();