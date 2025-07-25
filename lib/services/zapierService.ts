// Epic 8, Story 8.6: Zapier Integration Service

import { supabase } from '@/lib/supabase';
import type { 
  ZapierWebhook,
  ZapierWebhookEvent,
  ZapierAppConfig,
  ZapierIncomingRequest,
  ZapierTriggerRegistry,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  CreateAppConfigRequest,
  UpdateAppConfigRequest,
  ZapierStats,
  WebhookTestResult,
  ProcessingStatus
} from '@/lib/types/zapier';

export class ZapierService {
  private readonly webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  /**
   * Get user's Zapier webhooks
   */
  async getWebhooks(): Promise<ZapierWebhook[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('zapier_webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(id: string): Promise<ZapierWebhook | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('zapier_webhooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Create new Zapier webhook
   */
  async createWebhook(request: CreateWebhookRequest): Promise<ZapierWebhook> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate unique webhook URL and secret
    const webhookId = crypto.randomUUID();
    const webhookUrl = `${this.webhookBaseUrl}/api/zapier/webhook/${webhookId}`;
    const secretToken = this.generateSecretToken();

    const webhookData = {
      user_id: user.id,
      webhook_url: webhookUrl,
      webhook_name: request.webhook_name,
      description: request.description,
      zapier_hook_id: request.zapier_hook_id,
      secret_token: secretToken,
      trigger_events: request.trigger_events,
      filter_conditions: request.filter_conditions || {},
      payload_template: request.payload_template,
      include_metadata: request.include_metadata !== false,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('zapier_webhooks')
      .insert([webhookData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: string, request: UpdateWebhookRequest): Promise<ZapierWebhook> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('zapier_webhooks')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('zapier_webhooks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Test webhook by sending a sample payload
   */
  async testWebhook(id: string, sampleData?: Record<string, any>): Promise<WebhookTestResult> {
    const webhook = await this.getWebhook(id);
    if (!webhook) {
      return { success: false, error: 'Webhook not found', payload_sent: {} };
    }

    // Create test payload
    const testPayload = this.buildTestPayload(webhook, sampleData);

    try {
      // Send webhook (in a real implementation, this would use a proper webhook URL from Zapier)
      const response = await fetch(webhook.webhook_url.replace('/api/zapier/webhook/', '/api/zapier/test/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Secret': webhook.secret_token,
        },
        body: JSON.stringify(testPayload),
      });

      const responseBody = await response.text();

      return {
        success: response.ok,
        response_status: response.status,
        response_body: responseBody,
        payload_sent: testPayload,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        payload_sent: testPayload,
      };
    }
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(webhookId?: string, limit: number = 50): Promise<ZapierWebhookEvent[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('zapier_webhook_events')
      .select(`
        *,
        webhook:zapier_webhooks!zapier_webhook_events_webhook_id_fkey(
          webhook_name,
          webhook_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (webhookId) {
      query = query.eq('webhook_id', webhookId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Retry failed webhook event
   */
  async retryWebhookEvent(eventId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the event and associated webhook
    const { data: event, error: eventError } = await supabase
      .from('zapier_webhook_events')
      .select(`
        *,
        webhook:zapier_webhooks!zapier_webhook_events_webhook_id_fkey(*)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) return false;
    if (!event.webhook || event.webhook.user_id !== user.id) return false;

    try {
      // Send the webhook
      const success = await this.sendWebhookEvent(event, event.webhook);
      
      if (success) {
        // Update event status
        await supabase
          .from('zapier_webhook_events')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString(),
            retry_count: event.retry_count + 1,
          })
          .eq('id', eventId);

        // Update webhook success count
        await supabase
          .from('zapier_webhooks')
          .update({
            success_count: event.webhook.success_count + 1,
          })
          .eq('id', event.webhook_id);
      }

      return success;
    } catch (error) {
      console.error('Failed to retry webhook event:', error);
      return false;
    }
  }

  /**
   * Get app configurations
   */
  async getAppConfigs(): Promise<ZapierAppConfig[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('zapier_app_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create app configuration
   */
  async createAppConfig(request: CreateAppConfigRequest): Promise<ZapierAppConfig> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate webhook URL and secret
    const configId = crypto.randomUUID();
    const webhookUrl = `${this.webhookBaseUrl}/api/zapier/incoming/${configId}`;
    const webhookSecret = this.generateSecretToken();

    const configData = {
      user_id: user.id,
      config_name: request.config_name,
      description: request.description,
      app_id: request.app_id,
      auth_type: request.auth_type,
      incoming_webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
      supported_actions: request.supported_actions,
      action_mappings: request.action_mappings,
      validation_rules: request.validation_rules || {},
      require_authentication: request.require_authentication !== false,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('zapier_app_configs')
      .insert([configData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Process incoming Zapier request
   */
  async processIncomingRequest(
    configId: string,
    actionType: string,
    headers: Record<string, any>,
    payload: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ProcessingStatus> {
    try {
      const { data: requestId, error } = await supabase.rpc('process_zapier_incoming_request', {
        p_config_id: configId,
        p_action_type: actionType,
        p_headers: headers,
        p_payload: payload,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
      });

      if (error) throw error;

      // Get the processing result
      const { data: request } = await supabase
        .from('zapier_incoming_requests')
        .select('processing_status')
        .eq('id', requestId)
        .single();

      return request?.processing_status || 'failed';
    } catch (error) {
      console.error('Failed to process incoming Zapier request:', error);
      return 'failed';
    }
  }

  /**
   * Get incoming requests
   */
  async getIncomingRequests(configId?: string, limit: number = 50): Promise<ZapierIncomingRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('zapier_incoming_requests')
      .select(`
        *,
        app_config:zapier_app_configs!zapier_incoming_requests_app_config_id_fkey(
          config_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (configId) {
      query = query.eq('app_config_id', configId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get available triggers
   */
  async getTriggerRegistry(): Promise<ZapierTriggerRegistry[]> {
    const { data, error } = await supabase
      .from('zapier_trigger_registry')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get Zapier statistics
   */
  async getStats(): Promise<ZapierStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get webhook stats
    const { data: webhooks } = await supabase
      .from('zapier_webhooks')
      .select('is_active, total_triggers, success_count, error_count, last_triggered_at')
      .eq('user_id', user.id);

    // Get app config stats
    const { data: configs } = await supabase
      .from('zapier_app_configs')
      .select('total_requests, last_used_at')
      .eq('user_id', user.id);

    // Get recent request stats
    const { data: requests } = await supabase
      .from('zapier_incoming_requests')
      .select('processing_status, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const totalWebhooks = webhooks?.length || 0;
    const activeWebhooks = webhooks?.filter(w => w.is_active).length || 0;
    const totalTriggers = webhooks?.reduce((sum, w) => sum + w.total_triggers, 0) || 0;
    const successfulTriggers = webhooks?.reduce((sum, w) => sum + w.success_count, 0) || 0;
    const failedTriggers = webhooks?.reduce((sum, w) => sum + w.error_count, 0) || 0;
    const lastTrigger = webhooks?.reduce((latest, w) => {
      if (!w.last_triggered_at) return latest;
      if (!latest) return w.last_triggered_at;
      return w.last_triggered_at > latest ? w.last_triggered_at : latest;
    }, null as string | null);

    const totalIncomingRequests = configs?.reduce((sum, c) => sum + c.total_requests, 0) || 0;
    const successfulRequests = requests?.filter(r => r.processing_status === 'processed').length || 0;
    const failedRequests = requests?.filter(r => r.processing_status === 'failed').length || 0;
    const lastRequest = configs?.reduce((latest, c) => {
      if (!c.last_used_at) return latest;
      if (!latest) return c.last_used_at;
      return c.last_used_at > latest ? c.last_used_at : latest;
    }, null as string | null);

    return {
      total_webhooks: totalWebhooks,
      active_webhooks: activeWebhooks,
      total_triggers: totalTriggers,
      successful_triggers: successfulTriggers,
      failed_triggers: failedTriggers,
      total_incoming_requests: totalIncomingRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      last_trigger: lastTrigger || undefined,
      last_request: lastRequest || undefined,
    };
  }

  /**
   * Send webhook event to Zapier
   */
  private async sendWebhookEvent(event: ZapierWebhookEvent, webhook: ZapierWebhook): Promise<boolean> {
    try {
      // In a real implementation, this would send to the actual Zapier webhook URL
      // For now, we'll simulate the webhook sending
      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Secret': webhook.secret_token,
        },
        body: JSON.stringify(event.payload_sent),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      return false;
    }
  }

  /**
   * Build test payload for webhook testing
   */
  private buildTestPayload(webhook: ZapierWebhook, sampleData?: Record<string, any>): Record<string, any> {
    const defaultData = {
      id: 'test-record-id',
      title: 'Test Task',
      description: 'This is a test task for webhook testing',
      priority: 'medium',
      status: 'todo',
      created_at: new Date().toISOString(),
      user: {
        email: 'user@example.com',
        name: 'Test User',
      },
    };

    const data = { ...defaultData, ...sampleData };
    let payload = JSON.parse(JSON.stringify(webhook.payload_template));

    // Simple template replacement (in production, use a proper template engine)
    const replaceTemplateVars = (obj: any, data: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const value = this.getNestedValue(data, path.trim());
          return value !== undefined ? value : match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(item => replaceTemplateVars(item, data));
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceTemplateVars(value, data);
        }
        return result;
      }
      return obj;
    };

    payload = replaceTemplateVars(payload, data);

    if (webhook.include_metadata) {
      payload.metadata = {
        webhook_id: webhook.id,
        webhook_name: webhook.webhook_name,
        timestamp: new Date().toISOString(),
        test_mode: true,
      };
    }

    return payload;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Generate a secure secret token
   */
  private generateSecretToken(): string {
    return crypto.randomUUID() + '-' + Date.now().toString(36);
  }

  /**
   * Validate webhook signature (for incoming requests)
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implementation would depend on Zapier's signature format
    // This is a simplified version
    const expectedSignature = `sha256=${crypto.randomUUID()}`; // Replace with actual HMAC calculation
    return signature === expectedSignature;
  }
}

export const zapierService = new ZapierService();