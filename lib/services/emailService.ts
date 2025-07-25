// Epic 8, Story 8.4: Email Integration Service

import { supabase } from '@/lib/supabase';
import type { 
  EmailConnection,
  EmailProcessingRule,
  ProcessedEmail,
  EmailSyncLog,
  EmailSearchResult,
  CreateRuleRequest,
  EmailStats,
  EmailProvider
} from '@/lib/types/email';

export class EmailService {
  /**
   * Get user's email connections
   */
  async getConnections(): Promise<EmailConnection[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Connect Gmail account
   */
  async connectGmail(authCode: string): Promise<EmailConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Exchange auth code for access token
    const tokenResponse = await this.exchangeGmailAuthCode(authCode);
    
    // Get user profile
    const profileInfo = await this.getGmailProfile(tokenResponse.access_token);
    
    const connectionData = {
      user_id: user.id,
      provider: 'gmail' as EmailProvider,
      email_address: profileInfo.emailAddress,
      provider_account_id: profileInfo.id,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      connection_config: {
        profile: profileInfo,
        scopes: tokenResponse.scope?.split(' ') || [],
      },
    };

    const { data, error } = await supabase
      .from('email_connections')
      .upsert([connectionData], { onConflict: 'user_id,provider,email_address' })
      .select()
      .single();

    if (error) throw error;

    // Start initial sync
    await this.syncEmails(data.id);
    
    return data;
  }

  /**
   * Connect Outlook account
   */
  async connectOutlook(authCode: string): Promise<EmailConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Exchange auth code for access token
    const tokenResponse = await this.exchangeOutlookAuthCode(authCode);
    
    // Get user profile
    const profileInfo = await this.getOutlookProfile(tokenResponse.access_token);
    
    const connectionData = {
      user_id: user.id,
      provider: 'outlook' as EmailProvider,
      email_address: profileInfo.mail || profileInfo.userPrincipalName,
      provider_account_id: profileInfo.id,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      connection_config: {
        profile: profileInfo,
        scopes: tokenResponse.scope?.split(' ') || [],
      },
    };

    const { data, error } = await supabase
      .from('email_connections')
      .upsert([connectionData], { onConflict: 'user_id,provider,email_address' })
      .select()
      .single();

    if (error) throw error;

    // Start initial sync
    await this.syncEmails(data.id);
    
    return data;
  }

  /**
   * Disconnect email account
   */
  async disconnectEmail(connectionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('email_connections')
      .update({ is_active: false })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get processing rules
   */
  async getProcessingRules(): Promise<EmailProcessingRule[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('email_processing_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create processing rule
   */
  async createProcessingRule(ruleData: CreateRuleRequest): Promise<EmailProcessingRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('email_processing_rules')
      .insert([{
        ...ruleData,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update processing rule
   */
  async updateProcessingRule(ruleId: string, updates: Partial<CreateRuleRequest>): Promise<EmailProcessingRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('email_processing_rules')
      .update(updates)
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete processing rule
   */
  async deleteProcessingRule(ruleId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('email_processing_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get processed emails
   */
  async getProcessedEmails(connectionId?: string, limit: number = 50): Promise<ProcessedEmail[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('processed_emails')
      .select(`
        *,
        connection:email_connections!processed_emails_connection_id_fkey(
          provider,
          email_address
        ),
        rule:email_processing_rules!processed_emails_rule_id_fkey(
          rule_name
        ),
        task:tasks!processed_emails_task_id_fkey(
          id,
          title,
          status
        )
      `)
      .order('received_date', { ascending: false })
      .limit(limit);

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Search processed emails
   */
  async searchEmails(searchTerm: string, connectionId?: string): Promise<EmailSearchResult[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('search_processed_emails', {
      p_user_id: user.id,
      p_search_term: searchTerm,
      p_connection_id: connectionId,
      p_limit: 50,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Process email to create task
   */
  async processEmailToTask(emailId: string, ruleId?: string): Promise<string> {
    const { data, error } = await supabase.rpc('process_email_to_task', {
      p_email_id: emailId,
      p_rule_id: ruleId,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sync emails from provider
   */
  async syncEmails(connectionId: string): Promise<void> {
    const connection = await this.getConnectionById(connectionId);
    if (!connection) throw new Error('Connection not found');

    if (connection.provider === 'gmail') {
      await this.syncGmailEmails(connection);
    } else if (connection.provider === 'outlook') {
      await this.syncOutlookEmails(connection);
    }
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(connectionId?: string, limit: number = 20): Promise<EmailSyncLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('email_sync_logs')
      .select(`
        *,
        connection:email_connections!email_sync_logs_connection_id_fkey(
          provider,
          email_address
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

  /**
   * Get email statistics
   */
  async getEmailStats(connectionId?: string): Promise<EmailStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Build the base query
    let emailQuery = supabase
      .from('processed_emails')
      .select('processing_status, task_id, received_date', { count: 'exact' });

    if (connectionId) {
      emailQuery = emailQuery.eq('connection_id', connectionId);
    }

    const { data: emails, count: totalEmails } = await emailQuery;
    
    if (!emails) {
      return {
        total_emails: 0,
        processed_emails: 0,
        pending_emails: 0,
        failed_emails: 0,
        tasks_created: 0,
      };
    }

    const stats = emails.reduce((acc, email) => {
      switch (email.processing_status) {
        case 'processed':
          acc.processed_emails++;
          if (email.task_id) acc.tasks_created++;
          break;
        case 'pending':
          acc.pending_emails++;
          break;
        case 'failed':
          acc.failed_emails++;
          break;
      }
      return acc;
    }, {
      total_emails: totalEmails || 0,
      processed_emails: 0,
      pending_emails: 0,
      failed_emails: 0,
      tasks_created: 0,
    });

    // Get last sync time
    if (connectionId) {
      const { data: lastSync } = await supabase
        .from('email_sync_logs')
        .select('completed_at')
        .eq('connection_id', connectionId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSync?.completed_at) {
        stats.last_sync = lastSync.completed_at;
      }
    }

    return stats;
  }

  // Private helper methods
  private async exchangeGmailAuthCode(code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: `${window.location.origin}/integrations/email/gmail/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange Gmail auth code');
    return response.json();
  }

  private async exchangeOutlookAuthCode(code: string): Promise<any> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        redirect_uri: `${window.location.origin}/integrations/email/outlook/callback`,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Mail.Read offline_access',
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange Outlook auth code');
    return response.json();
  }

  private async getGmailProfile(accessToken: string): Promise<any> {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get Gmail profile');
    return response.json();
  }

  private async getOutlookProfile(accessToken: string): Promise<any> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get Outlook profile');
    return response.json();
  }

  private async syncGmailEmails(connection: EmailConnection): Promise<void> {
    // Log sync start
    const { data: syncLog } = await supabase
      .from('email_sync_logs')
      .insert([{
        connection_id: connection.id,
        sync_type: 'incremental',
        status: 'started',
      }])
      .select()
      .single();

    try {
      // Get messages from Gmail API
      const messages = await this.getGmailMessages(connection.access_token);
      
      let processed = 0;
      let imported = 0;
      let tasksCreated = 0;

      for (const message of messages) {
        const emailData = await this.processGmailMessage(connection, message);
        
        // Store email
        const { data: email } = await supabase
          .from('processed_emails')
          .upsert([emailData], { onConflict: 'connection_id,message_id' })
          .select()
          .single();

        if (email) {
          imported++;

          // Find matching rule and auto-process if configured
          const { data: matchingRuleId } = await supabase.rpc('find_matching_email_rule', {
            p_user_id: connection.user_id,
            p_from_address: email.from_address,
            p_to_addresses: email.to_addresses,
            p_subject: email.subject || '',
            p_body_text: email.body_text || '',
            p_has_attachments: email.has_attachments,
            p_folder_name: email.folder_name || '',
          });

          if (matchingRuleId) {
            try {
              await this.processEmailToTask(email.id, matchingRuleId);
              tasksCreated++;
            } catch (error) {
              console.error('Failed to create task from email:', error);
            }
          }
        }
        processed++;
      }

      // Update sync log
      await supabase
        .from('email_sync_logs')
        .update({
          status: 'completed',
          emails_processed: processed,
          emails_imported: imported,
          tasks_created: tasksCreated,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog?.id);

      // Update connection last sync
      await supabase
        .from('email_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connection.id);

    } catch (error) {
      console.error('Gmail sync error:', error);
      
      // Update sync log with error
      await supabase
        .from('email_sync_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog?.id);
    }
  }

  private async syncOutlookEmails(connection: EmailConnection): Promise<void> {
    // Similar implementation for Outlook using Microsoft Graph API
    console.log('Outlook sync implementation would go here');
  }

  private async getGmailMessages(accessToken: string): Promise<any[]> {
    const messages: any[] = [];
    let pageToken: string | undefined;

    do {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) break;
      
      const data = await response.json();
      if (data.messages) {
        messages.push(...data.messages);
      }
      pageToken = data.nextPageToken;
    } while (pageToken && messages.length < 500); // Limit for initial sync

    return messages;
  }

  private async processGmailMessage(connection: EmailConnection, message: any): Promise<any> {
    // Fetch full message details
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
        },
      }
    );

    const fullMessage = await response.json();
    const headers = fullMessage.payload?.headers || [];
    
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const extractTextFromPayload = (payload: any): string => {
      if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
      if (payload.parts) {
        for (const part of payload.parts) {
          const text = extractTextFromPayload(part);
          if (text) return text;
        }
      }
      return '';
    };

    return {
      connection_id: connection.id,
      message_id: message.id,
      thread_id: message.threadId,
      from_address: getHeader('from'),
      to_addresses: [getHeader('to')],
      cc_addresses: getHeader('cc') ? [getHeader('cc')] : [],
      subject: getHeader('subject'),
      body_text: extractTextFromPayload(fullMessage.payload),
      received_date: new Date(parseInt(fullMessage.internalDate)).toISOString(),
      has_attachments: fullMessage.payload?.parts?.some((p: any) => p.filename) || false,
      labels: fullMessage.labelIds || [],
      processing_status: 'pending',
    };
  }

  private async getConnectionById(connectionId: string): Promise<EmailConnection | null> {
    const { data, error } = await supabase
      .from('email_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error) return null;
    return data;
  }
}

export const emailService = new EmailService();