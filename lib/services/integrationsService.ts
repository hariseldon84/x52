// Epic 8, Story 8.5: Third-Party API Integration Framework Service

import { supabase } from '@/lib/supabase';
import type { 
  ApiIntegrationTemplate,
  ApiIntegration,
  ApiIntegrationAction,
  ApiCallLog,
  ApiWebhook,
  WebhookEvent,
  SyncMapping,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  CreateActionRequest,
  UpdateActionRequest,
  IntegrationStats,
  AuthFlowResult,
  SyncResult,
  WebhookProcessingResult,
  AuthType
} from '@/lib/types/integrations';

export class IntegrationsService {
  /**
   * Get available integration templates
   */
  async getTemplates(category?: string): Promise<ApiIntegrationTemplate[]> {
    let query = supabase
      .from('api_integration_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's integrations
   */
  async getIntegrations(): Promise<ApiIntegration[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_integrations')
      .select(`
        *,
        template:api_integration_templates!api_integrations_template_id_fkey(
          name,
          display_name,
          category,
          icon_url,
          auth_type,
          supported_actions
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get integration by ID
   */
  async getIntegration(id: string): Promise<ApiIntegration | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_integrations')
      .select(`
        *,
        template:api_integration_templates!api_integrations_template_id_fkey(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Create new integration
   */
  async createIntegration(request: CreateIntegrationRequest): Promise<ApiIntegration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const integrationData = {
      user_id: user.id,
      template_id: request.template_id,
      name: request.name,
      description: request.description,
      config: request.config,
      auth_data: request.auth_data || {},
      auto_sync: request.auto_sync || false,
      sync_frequency_minutes: request.sync_frequency_minutes || 60,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('api_integrations')
      .insert([integrationData])
      .select(`
        *,
        template:api_integration_templates!api_integrations_template_id_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update integration
   */
  async updateIntegration(id: string, request: UpdateIntegrationRequest): Promise<ApiIntegration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_integrations')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        template:api_integration_templates!api_integrations_template_id_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('api_integrations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Start OAuth flow for integration
   */
  async startOAuthFlow(templateId: string, redirectUri: string): Promise<AuthFlowResult> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    if (template.auth_type !== 'oauth2') {
      return { success: false, error: 'Template does not support OAuth2' };
    }

    const authConfig = template.auth_config;
    const clientId = process.env[`${template.name.toUpperCase()}_CLIENT_ID`];
    
    if (!clientId) {
      return { success: false, error: 'OAuth client ID not configured' };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: authConfig.scopes?.join(' ') || '',
      state: `template_${templateId}`, // Include template ID in state
    });

    const authUrl = `${authConfig.auth_url}?${params.toString()}`;

    return {
      success: true,
      redirect_url: authUrl,
    };
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuthFlow(templateId: string, code: string, redirectUri: string): Promise<AuthFlowResult> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    try {
      const authConfig = template.auth_config;
      const clientId = process.env[`${template.name.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${template.name.toUpperCase()}_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        return { success: false, error: 'OAuth credentials not configured' };
      }

      const tokenResponse = await fetch(authConfig.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        return { success: false, error: `Token exchange failed: ${errorData}` };
      }

      const tokenData = await tokenResponse.json();

      return {
        success: true,
        auth_data: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type || 'Bearer',
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth flow failed' 
      };
    }
  }

  /**
   * Test integration connection
   */
  async testConnection(integrationId: string): Promise<{ success: boolean; error?: string }> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      return { success: false, error: 'Integration not found' };
    }

    try {
      // Make a simple API call to test the connection
      const result = await this.makeApiCall(integration, 'GET', '/user', {});
      
      return { success: result.success };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Sync data from integration
   */
  async syncIntegration(integrationId: string): Promise<SyncResult> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || !integration.template) {
      throw new Error('Integration not found');
    }

    const result: SyncResult = {
      success: false,
      records_processed: 0,
      tasks_created: 0,
      tasks_updated: 0,
      errors: [],
      sync_mappings: [],
    };

    try {
      // Update integration sync status
      await supabase
        .from('api_integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          error_count: 0,
          last_error: null,
        })
        .eq('id', integrationId);

      // Execute sync based on template type
      switch (integration.template.name) {
        case 'github':
          return await this.syncGitHub(integration);
        case 'trello':
          return await this.syncTrello(integration);
        case 'asana':
          return await this.syncAsana(integration);
        case 'linear':
          return await this.syncLinear(integration);
        case 'todoist':
          return await this.syncTodoist(integration);
        default:
          result.errors.push(`Sync not implemented for ${integration.template.name}`);
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      result.errors.push(errorMessage);
      
      // Update integration error status
      await supabase
        .from('api_integrations')
        .update({ 
          last_error: errorMessage,
          error_count: integration.error_count + 1,
        })
        .eq('id', integrationId);

      return result;
    }
  }

  /**
   * Get integration actions
   */
  async getActions(integrationId: string): Promise<ApiIntegrationAction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_integration_actions')
      .select(`
        *,
        integration:api_integrations!api_integration_actions_integration_id_fkey(
          name,
          template:api_integration_templates!api_integrations_template_id_fkey(display_name)
        )
      `)
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create integration action
   */
  async createAction(request: CreateActionRequest): Promise<ApiIntegrationAction> {
    const { data, error } = await supabase
      .from('api_integration_actions')
      .insert([{
        integration_id: request.integration_id,
        action_name: request.action_name,
        action_type: request.action_type,
        description: request.description,
        trigger_config: request.trigger_config,
        action_config: request.action_config,
        field_mappings: request.field_mappings || {},
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get API call logs
   */
  async getCallLogs(integrationId?: string, limit: number = 50): Promise<ApiCallLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('api_call_logs')
      .select(`
        *,
        integration:api_integrations!api_call_logs_integration_id_fkey(
          name,
          template:api_integration_templates!api_integrations_template_id_fkey(display_name)
        ),
        action:api_integration_actions!api_call_logs_action_id_fkey(action_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get integration statistics
   */
  async getStats(integrationId?: string): Promise<IntegrationStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get basic integration counts
    let integrationQuery = supabase
      .from('api_integrations')
      .select('is_active, last_sync_at', { count: 'exact' })
      .eq('user_id', user.id);

    if (integrationId) {
      integrationQuery = integrationQuery.eq('id', integrationId);
    }

    const { data: integrations, count: totalIntegrations } = await integrationQuery;

    const activeIntegrations = integrations?.filter(i => i.is_active).length || 0;
    const lastSync = integrations?.reduce((latest, integration) => {
      if (!integration.last_sync_at) return latest;
      if (!latest) return integration.last_sync_at;
      return integration.last_sync_at > latest ? integration.last_sync_at : latest;
    }, null as string | null);

    // Get action counts and call statistics
    let actionQuery = supabase
      .from('api_integration_actions')
      .select('id', { count: 'exact' });

    let callLogQuery = supabase
      .from('api_call_logs')
      .select('success, tasks_created, tasks_updated');

    if (integrationId) {
      actionQuery = actionQuery.eq('integration_id', integrationId);
      callLogQuery = callLogQuery.eq('integration_id', integrationId);
    } else {
      // Filter by user's integrations
      const userIntegrationIds = integrations?.map(i => i.id) || [];
      if (userIntegrationIds.length > 0) {
        actionQuery = actionQuery.in('integration_id', userIntegrationIds);
        callLogQuery = callLogQuery.in('integration_id', userIntegrationIds);
      }
    }

    const [
      { count: totalActions },
      { data: callLogs }
    ] = await Promise.all([
      actionQuery,
      callLogQuery
    ]);

    const successfulCalls = callLogs?.filter(log => log.success).length || 0;
    const failedCalls = (callLogs?.length || 0) - successfulCalls;
    const tasksCreated = callLogs?.reduce((sum, log) => sum + (log.tasks_created || 0), 0) || 0;
    const tasksUpdated = callLogs?.reduce((sum, log) => sum + (log.tasks_updated || 0), 0) || 0;

    return {
      total_integrations: totalIntegrations || 0,
      active_integrations: activeIntegrations,
      total_actions: totalActions || 0,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      tasks_created: tasksCreated,
      tasks_updated: tasksUpdated,
      last_sync: lastSync || undefined,
    };
  }

  // Private helper methods
  private async getTemplate(id: string): Promise<ApiIntegrationTemplate | null> {
    const { data, error } = await supabase
      .from('api_integration_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  private async makeApiCall(
    integration: ApiIntegration,
    method: string,
    endpoint: string,
    body?: Record<string, any>
  ) {
    const startTime = Date.now();
    const template = integration.template!;
    const url = `${template.base_url}${endpoint}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TaskQuest/1.0',
    };

    // Add authentication headers
    if (template.auth_type === 'oauth2' || template.auth_type === 'bearer_token') {
      headers['Authorization'] = `Bearer ${integration.auth_data.access_token}`;
    } else if (template.auth_type === 'api_key') {
      const authConfig = template.auth_config;
      if (authConfig.header_name) {
        headers[authConfig.header_name] = authConfig.header_format 
          ? authConfig.header_format.replace('{token}', integration.auth_data.api_key)
          : integration.auth_data.api_key;
      }
    }

    const requestData = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    };

    let success = false;
    let statusCode: number | undefined;
    let responseBody: any;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(url, requestData);
      statusCode = response.status;
      success = response.ok;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Network error';
    }

    const responseTime = Date.now() - startTime;

    // Log the API call
    await supabase
      .from('api_call_logs')
      .insert([{
        integration_id: integration.id,
        method,
        url,
        headers: requestData.headers,
        request_body: body,
        status_code: statusCode,
        response_body: responseBody,
        response_time_ms: responseTime,
        success,
        error_message: errorMessage,
      }]);

    return {
      success,
      statusCode,
      data: responseBody,
      error: errorMessage,
    };
  }

  // Integration-specific sync methods
  private async syncGitHub(integration: ApiIntegration): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      records_processed: 0,
      tasks_created: 0,
      tasks_updated: 0,
      errors: [],
      sync_mappings: [],
    };

    const repositories = integration.config.repositories || [];
    
    for (const repo of repositories) {
      try {
        const response = await this.makeApiCall(integration, 'GET', `/repos/${repo}/issues`);
        
        if (!response.success) {
          result.errors.push(`Failed to fetch issues from ${repo}: ${response.error}`);
          continue;
        }

        const issues = Array.isArray(response.data) ? response.data : [];
        result.records_processed += issues.length;

        for (const issue of issues) {
          // Check if issue already exists
          const existingMapping = await this.findSyncMapping(integration.id, 'tasks', issue.id.toString());
          
          if (existingMapping) {
            // Update existing task
            await this.updateTaskFromIssue(existingMapping.local_record_id, issue);
            result.tasks_updated++;
          } else {
            // Create new task
            const taskId = await this.createTaskFromIssue(integration, issue);
            if (taskId) {
              result.tasks_created++;
              
              // Create sync mapping
              const mapping = await this.createSyncMapping(
                integration.id,
                'tasks',
                taskId,
                issue.id.toString(),
                'github_issue'
              );
              result.sync_mappings.push(mapping);
            }
          }
        }
      } catch (error) {
        result.errors.push(`Error syncing repository ${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async syncTrello(integration: ApiIntegration): Promise<SyncResult> {
    // Implementation for Trello sync
    return {
      success: false,
      records_processed: 0,
      tasks_created: 0,
      tasks_updated: 0,
      errors: ['Trello sync not yet implemented'],
      sync_mappings: [],
    };
  }

  private async syncAsana(integration: ApiIntegration): Promise<SyncResult> {
    // Implementation for Asana sync
    return {
      success: false,
      records_processed: 0,
      tasks_created: 0,
      tasks_updated: 0,
      errors: ['Asana sync not yet implemented'],
      sync_mappings: [],
    };
  }

  private async syncLinear(integration: ApiIntegration): Promise<SyncResult> {
    // Implementation for Linear sync
    return {
      success: false,
      records_processed: 0,
      tasks_created: 0,
      tasks_updated: 0,
      errors: ['Linear sync not yet implemented'],
      sync_mappings: [],
    };
  }

  private async syncTodoist(integration: ApiIntegration): Promise<SyncResult> {
    // Implementation for Todoist sync
    return {
      success: false,
      records_processed: 0,
      tasks_created: 0,
      tasks_updated: 0,
      errors: ['Todoist sync not yet implemented'],
      sync_mappings: [],
    };
  }

  private async createTaskFromIssue(integration: ApiIntegration, issue: any): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: user.id,
        title: issue.title,
        description: issue.body || '',
        priority: this.mapGitHubLabelsToPriority(issue.labels),
        complexity: 'moderate',
        status: issue.state === 'open' ? 'todo' : 'completed',
        source: 'github',
        source_metadata: {
          issue_id: issue.id,
          issue_number: issue.number,
          repository: issue.repository_url,
          url: issue.html_url,
          integration_id: integration.id,
        },
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create task from GitHub issue:', error);
      return null;
    }

    return task.id;
  }

  private async updateTaskFromIssue(taskId: string, issue: any): Promise<void> {
    await supabase
      .from('tasks')
      .update({
        title: issue.title,
        description: issue.body || '',
        status: issue.state === 'open' ? 'todo' : 'completed',
        source_metadata: {
          issue_id: issue.id,
          issue_number: issue.number,
          repository: issue.repository_url,
          url: issue.html_url,
          updated_at: issue.updated_at,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  }

  private mapGitHubLabelsToPriority(labels: any[]): string {
    if (!labels || !Array.isArray(labels)) return 'medium';
    
    const labelNames = labels.map(label => label.name?.toLowerCase() || '');
    
    if (labelNames.some(name => name.includes('urgent') || name.includes('critical'))) {
      return 'urgent';
    }
    if (labelNames.some(name => name.includes('high') || name.includes('important'))) {
      return 'high';
    }
    if (labelNames.some(name => name.includes('low') || name.includes('minor'))) {
      return 'low';
    }
    
    return 'medium';
  }

  private async findSyncMapping(
    integrationId: string,
    localTable: string,
    externalId: string
  ): Promise<SyncMapping | null> {
    const { data, error } = await supabase
      .from('sync_mappings')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('local_table', localTable)
      .eq('external_id', externalId)
      .single();

    if (error) return null;
    return data;
  }

  private async createSyncMapping(
    integrationId: string,
    localTable: string,
    localRecordId: string,
    externalId: string,
    externalType?: string
  ): Promise<SyncMapping> {
    const { data, error } = await supabase.rpc('create_sync_mapping', {
      p_integration_id: integrationId,
      p_local_table: localTable,
      p_local_record_id: localRecordId,
      p_external_id: externalId,
      p_external_type: externalType,
    });

    if (error) throw error;

    // Fetch the created mapping
    const { data: mapping } = await supabase
      .from('sync_mappings')
      .select('*')
      .eq('id', data)
      .single();

    return mapping!;
  }
}

export const integrationsService = new IntegrationsService();