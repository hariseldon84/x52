// Epic 8, Story 8.1: Calendar Integration Service

import { supabase } from '@/lib/supabase';
import type { 
  CalendarConnection,
  UserCalendar,
  CalendarEvent,
  TaskCalendarSync,
  CalendarSyncLog,
  CalendarProvider,
  SyncSettings
} from '@/lib/types/calendar';

export class CalendarService {
  /**
   * Get user's calendar connections
   */
  async getConnections(): Promise<CalendarConnection[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('calendar_connections')
      .select(`
        *,
        calendars:user_calendars(
          *
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Connect Google Calendar
   */
  async connectGoogleCalendar(authCode: string): Promise<CalendarConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Exchange auth code for tokens using Google OAuth
    const tokenResponse = await this.exchangeGoogleAuthCode(authCode);
    
    // Get user's calendar info
    const userInfo = await this.getGoogleUserInfo(tokenResponse.access_token);
    
    const connectionData = {
      user_id: user.id,
      provider: 'google' as CalendarProvider,
      provider_account_id: userInfo.id,
      provider_account_email: userInfo.email,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      scope: tokenResponse.scope,
    };

    const { data, error } = await supabase
      .from('calendar_connections')
      .upsert([connectionData])
      .select()
      .single();

    if (error) throw error;

    // Fetch and sync calendars
    await this.syncUserCalendars(data.id);
    
    return data;
  }

  /**
   * Connect Outlook Calendar
   */
  async connectOutlookCalendar(authCode: string): Promise<CalendarConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Exchange auth code for tokens using Microsoft Graph OAuth
    const tokenResponse = await this.exchangeOutlookAuthCode(authCode);
    
    // Get user's profile info
    const userInfo = await this.getOutlookUserInfo(tokenResponse.access_token);
    
    const connectionData = {
      user_id: user.id,
      provider: 'outlook' as CalendarProvider,
      provider_account_id: userInfo.id,
      provider_account_email: userInfo.mail || userInfo.userPrincipalName,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      scope: tokenResponse.scope,
    };

    const { data, error } = await supabase
      .from('calendar_connections')
      .upsert([connectionData])
      .select()
      .single();

    if (error) throw error;

    // Fetch and sync calendars
    await this.syncUserCalendars(data.id);
    
    return data;
  }

  /**
   * Disconnect calendar
   */
  async disconnectCalendar(connectionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('calendar_connections')
      .update({ is_active: false })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get user's calendars
   */
  async getUserCalendars(connectionId?: string): Promise<UserCalendar[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('user_calendars')
      .select(`
        *,
        connection:calendar_connections!user_calendars_connection_id_fkey(
          id,
          provider,
          provider_account_email
        )
      `)
      .order('is_primary', { ascending: false })
      .order('calendar_name');

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Update calendar selection
   */
  async updateCalendarSelection(
    calendarId: string, 
    isSelected: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('user_calendars')
      .update({ is_selected: isSelected })
      .eq('id', calendarId);

    if (error) throw error;

    // Trigger sync if calendar was selected
    if (isSelected) {
      await this.syncCalendarEvents(calendarId);
    }
  }

  /**
   * Sync user's calendars from provider
   */
  async syncUserCalendars(connectionId: string): Promise<void> {
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError) throw connError;

    let calendars: any[] = [];
    
    if (connection.provider === 'google') {
      calendars = await this.getGoogleCalendars(connection.access_token);
    } else if (connection.provider === 'outlook') {
      calendars = await this.getOutlookCalendars(connection.access_token);
    }

    const calendarData = calendars.map(cal => ({
      connection_id: connectionId,
      calendar_id: cal.id,
      calendar_name: cal.summary || cal.name,
      is_primary: cal.primary || false,
      is_selected: cal.primary || false, // Auto-select primary calendar
      color: cal.backgroundColor || cal.color,
      time_zone: cal.timeZone,
      access_role: cal.accessRole || 'reader',
    }));

    const { error } = await supabase
      .from('user_calendars')
      .upsert(calendarData, { onConflict: 'connection_id,calendar_id' });

    if (error) throw error;
  }

  /**
   * Sync calendar events
   */
  async syncCalendarEvents(calendarId: string): Promise<void> {
    const { data: calendar, error: calError } = await supabase
      .from('user_calendars')
      .select(`
        *,
        connection:calendar_connections!user_calendars_connection_id_fkey(*)
      `)
      .eq('id', calendarId)
      .single();

    if (calError) throw calError;

    const connection = calendar.connection;
    let events: any[] = [];

    // Sync events from the last 30 days to next 90 days
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    if (connection.provider === 'google') {
      events = await this.getGoogleEvents(
        connection.access_token,
        calendar.calendar_id,
        timeMin,
        timeMax
      );
    } else if (connection.provider === 'outlook') {
      events = await this.getOutlookEvents(
        connection.access_token,
        calendar.calendar_id,
        timeMin,
        timeMax
      );
    }

    const eventData = events.map(event => ({
      calendar_id: calendarId,
      event_id: event.id,
      title: event.summary || event.subject,
      description: event.description || event.body?.content,
      start_time: event.start?.dateTime || event.start?.date,
      end_time: event.end?.dateTime || event.end?.date,
      is_all_day: !event.start?.dateTime,
      location: event.location?.displayName || event.location,
      attendees: JSON.stringify(event.attendees || []),
      creator_email: event.creator?.email || event.organizer?.emailAddress?.address,
      status: event.status?.toLowerCase() || 'confirmed',
      visibility: event.visibility || 'default',
      recurrence_rule: event.recurrence?.[0],
      is_recurring: !!event.recurrence,
      etag: event.etag,
    }));

    const { error } = await supabase
      .from('calendar_events')
      .upsert(eventData, { onConflict: 'calendar_id,event_id' });

    if (error) throw error;

    // Update last sync time
    await supabase
      .from('calendar_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);
  }

  /**
   * Create task from calendar event
   */
  async createTaskFromEvent(eventId: string, calendarId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('calendar_id', calendarId)
      .single();

    if (eventError) throw eventError;

    // Create task
    const taskData = {
      user_id: user.id,
      title: event.title,
      description: `Task created from calendar event: ${event.title}\n\n${event.description || ''}`,
      due_date: event.start_time,
      priority: 'medium',
      complexity: 'medium',
      tags: ['calendar-import'],
    };

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (taskError) throw taskError;

    // Link event to task
    await supabase
      .from('calendar_events')
      .update({ task_id: task.id })
      .eq('id', eventId);

    // Create sync record
    await supabase
      .from('task_calendar_sync')
      .insert([{
        task_id: task.id,
        calendar_id: calendarId,
        sync_direction: 'calendar_to_task',
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
      }]);

    return task.id;
  }

  /**
   * Create calendar event from task
   */
  async createEventFromTask(taskId: string, calendarId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError) throw taskError;

    const { data: calendar, error: calError } = await supabase
      .from('user_calendars')
      .select(`
        *,
        connection:calendar_connections!user_calendars_connection_id_fkey(*)
      `)
      .eq('id', calendarId)
      .single();

    if (calError) throw calError;

    const connection = calendar.connection;
    let eventId: string;

    // Create event based on provider
    if (connection.provider === 'google') {
      eventId = await this.createGoogleEvent(
        connection.access_token,
        calendar.calendar_id,
        task
      );
    } else if (connection.provider === 'outlook') {
      eventId = await this.createOutlookEvent(
        connection.access_token,
        calendar.calendar_id,
        task
      );
    } else {
      throw new Error('Unsupported calendar provider');
    }

    // Create sync record
    await supabase
      .from('task_calendar_sync')
      .upsert([{
        task_id: taskId,
        calendar_id: calendarId,
        event_id: eventId,
        sync_direction: 'task_to_calendar',
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
      }], { onConflict: 'task_id,calendar_id' });

    return eventId;
  }

  /**
   * Update sync settings
   */
  async updateSyncSettings(
    connectionId: string, 
    settings: Partial<SyncSettings>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('calendar_connections')
      .update({ sync_settings: settings })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(connectionId?: string, limit: number = 50): Promise<CalendarSyncLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('calendar_sync_logs')
      .select(`
        *,
        connection:calendar_connections!calendar_sync_logs_connection_id_fkey(
          provider,
          provider_account_email
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

  // Private helper methods for API calls
  private async exchangeGoogleAuthCode(authCode: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: authCode,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${window.location.origin}/integrations/calendar/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange Google auth code');
    return response.json();
  }

  private async exchangeOutlookAuthCode(authCode: string): Promise<any> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: authCode,
        client_id: process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        redirect_uri: `${window.location.origin}/integrations/calendar/outlook/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange Outlook auth code');
    return response.json();
  }

  private async getGoogleUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get Google user info');
    return response.json();
  }

  private async getOutlookUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get Outlook user info');
    return response.json();
  }

  private async getGoogleCalendars(accessToken: string): Promise<any[]> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get Google calendars');
    const data = await response.json();
    return data.items || [];
  }

  private async getOutlookCalendars(accessToken: string): Promise<any[]> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get Outlook calendars');
    const data = await response.json();
    return data.value || [];
  }

  private async getGoogleEvents(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<any[]> {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) throw new Error('Failed to get Google events');
    const data = await response.json();
    return data.items || [];
  }

  private async getOutlookEvents(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<any[]> {
    const params = new URLSearchParams({
      startDateTime: timeMin,
      endDateTime: timeMax,
      $orderby: 'start/dateTime',
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) throw new Error('Failed to get Outlook events');
    const data = await response.json();
    return data.value || [];
  }

  private async createGoogleEvent(
    accessToken: string,
    calendarId: string,
    task: any
  ): Promise<string> {
    const eventData = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.due_date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(new Date(task.due_date).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) throw new Error('Failed to create Google event');
    const data = await response.json();
    return data.id;
  }

  private async createOutlookEvent(
    accessToken: string,
    calendarId: string,
    task: any
  ): Promise<string> {
    const eventData = {
      subject: task.title,
      body: {
        contentType: 'text',
        content: task.description,
      },
      start: {
        dateTime: task.due_date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(new Date(task.due_date).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) throw new Error('Failed to create Outlook event');
    const data = await response.json();
    return data.id;
  }
}

export const calendarService = new CalendarService();