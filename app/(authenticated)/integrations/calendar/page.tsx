// Epic 8, Story 8.1: Calendar Integration Page

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  Settings, 
  Plus, 
  Check, 
  X,
  Clock,
  ExternalLink,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { CalendarConnectionCard } from '@/components/integrations/CalendarConnectionCard';
import { CalendarSelectionDialog } from '@/components/integrations/CalendarSelectionDialog';
import { SyncSettingsDialog } from '@/components/integrations/SyncSettingsDialog';
import { calendarService } from '@/lib/services/calendarService';
import type { CalendarConnection, UserCalendar, CalendarSyncLog } from '@/lib/types/calendar';

const CALENDAR_PROVIDERS = {
  google: {
    name: 'Google Calendar',
    icon: '📅',
    color: 'bg-blue-500',
    description: 'Sync with Google Calendar and Gmail',
    features: ['Two-way sync', 'Meeting detection', 'Smart scheduling'],
    oauth_url: `https://accounts.google.com/oauth2/auth?${new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/integrations/calendar/google/callback`,
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    })}`,
  },
  outlook: {
    name: 'Outlook Calendar',
    icon: '📧',
    color: 'bg-blue-600',
    description: 'Sync with Outlook and Microsoft 365',
    features: ['Two-way sync', 'Teams integration', 'Enterprise support'],
    oauth_url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/integrations/calendar/outlook/callback`,
      scope: 'https://graph.microsoft.com/calendars.readwrite offline_access',
      response_type: 'code',
      prompt: 'consent',
    })}`,
  },
};

export default function CalendarIntegrationsPage() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [syncLogs, setSyncLogs] = useState<CalendarSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [showCalendarSelection, setShowCalendarSelection] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      
      const [connectionsData, calendarsData, logsData] = await Promise.all([
        calendarService.getConnections(),
        calendarService.getUserCalendars(),
        calendarService.getSyncLogs(undefined, 10),
      ]);
      
      setConnections(connectionsData);
      setCalendars(calendarsData);
      setSyncLogs(logsData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar integrations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      setIsConnecting(provider);
      
      const providerConfig = CALENDAR_PROVIDERS[provider];
      window.location.href = providerConfig.oauth_url;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Connection Error',
        description: `Failed to connect ${provider} calendar. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectCalendar = async (connectionId: string) => {
    try {
      await calendarService.disconnectCalendar(connectionId);
      
      toast({
        title: 'Calendar Disconnected',
        description: 'Calendar has been disconnected successfully.',
      });
      
      await loadCalendarData();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect calendar. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncCalendars = async (connectionId?: string) => {
    try {
      if (connectionId) {
        // Sync specific connection
        const connection = connections.find(c => c.id === connectionId);
        if (connection?.calendars) {
          for (const calendar of connection.calendars.filter(c => c.is_selected)) {
            await calendarService.syncCalendarEvents(calendar.id);
          }
        }
      } else {
        // Sync all selected calendars
        for (const calendar of calendars.filter(c => c.is_selected)) {
          await calendarService.syncCalendarEvents(calendar.id);
        }
      }
      
      toast({
        title: 'Sync Complete',
        description: 'Calendar events have been synchronized.',
      });
      
      await loadCalendarData();
    } catch (error) {
      console.error('Error syncing calendars:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to sync calendar events. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCalendarToggle = async (calendarId: string, isSelected: boolean) => {
    try {
      await calendarService.updateCalendarSelection(calendarId, isSelected);
      
      setCalendars(prev => 
        prev.map(cal => 
          cal.id === calendarId ? { ...cal, is_selected: isSelected } : cal
        )
      );
      
      if (isSelected) {
        toast({
          title: 'Calendar Enabled',
          description: 'Calendar sync has been enabled and events are being synchronized.',
        });
      } else {
        toast({
          title: 'Calendar Disabled',
          description: 'Calendar sync has been disabled.',
        });
      }
    } catch (error) {
      console.error('Error toggling calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar settings.',
        variant: 'destructive',
      });
    }
  };

  const getProviderStats = () => {
    const activeConnections = connections.filter(c => c.is_active).length;
    const selectedCalendars = calendars.filter(c => c.is_selected).length;
    const recentSync = syncLogs.find(log => log.status === 'completed');
    
    return {
      activeConnections,
      selectedCalendars,
      lastSync: recentSync?.completed_at,
      syncErrors: syncLogs.filter(log => log.status === 'failed').length,
    };
  };

  const stats = getProviderStats();

  return (
    <div className=\"container mx-auto py-8 px-4\">
      {/* Header */}
      <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8\">
        <div>
          <h1 className=\"text-3xl font-bold text-gray-900 dark:text-gray-100\">
            Calendar Integration
          </h1>
          <p className=\"text-gray-600 dark:text-gray-400 mt-2\">
            Sync your tasks with Google Calendar and Outlook
          </p>
        </div>
        <div className=\"flex gap-2 mt-4 sm:mt-0\">
          <Button 
            onClick={() => handleSyncCalendars()}
            disabled={stats.selectedCalendars === 0}
            variant=\"outline\"
          >
            <RefreshCw className=\"h-4 w-4 mr-2\" />
            Sync All
          </Button>
          <Button 
            onClick={() => setShowSyncSettings(true)}
            variant=\"outline\"
          >
            <Settings className=\"h-4 w-4 mr-2\" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6 mb-8\">
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Connected Accounts</CardTitle>
            <Calendar className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.activeConnections}</div>
            <p className=\"text-xs text-muted-foreground\">
              Active integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Synced Calendars</CardTitle>
            <Check className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.selectedCalendars}</div>
            <p className=\"text-xs text-muted-foreground\">
              Calendars enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Last Sync</CardTitle>
            <Clock className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'Never'}
            </div>
            <p className=\"text-xs text-muted-foreground\">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleTimeString() : 'No sync yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Sync Errors</CardTitle>
            <AlertCircle className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{stats.syncErrors}</div>
            <p className=\"text-xs text-muted-foreground\">
              Recent failures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts */}
      <div className=\"mb-8\">
        <h2 className=\"text-xl font-semibold mb-4\">Connected Accounts</h2>
        
        {connections.length === 0 ? (
          <Card>
            <CardContent className=\"text-center py-12\">
              <Calendar className=\"h-16 w-16 mx-auto text-gray-400 mb-4\" />
              <h3 className=\"text-lg font-medium text-gray-900 dark:text-gray-100 mb-2\">
                No Calendar Accounts Connected
              </h3>
              <p className=\"text-gray-500 dark:text-gray-400 mb-6\">
                Connect your Google Calendar or Outlook to start syncing tasks with your calendar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
            {connections.map((connection) => (
              <CalendarConnectionCard
                key={connection.id}
                connection={connection}
                onDisconnect={handleDisconnectCalendar}
                onSync={handleSyncCalendars}
                onManageCalendars={() => {
                  setSelectedConnection(connection.id);
                  setShowCalendarSelection(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available Providers */}
      <div className=\"mb-8\">
        <h2 className=\"text-xl font-semibold mb-4\">Available Calendar Providers</h2>
        
        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
          {Object.entries(CALENDAR_PROVIDERS).map(([key, provider]) => {
            const isConnected = connections.some(c => c.provider === key && c.is_active);
            
            return (
              <Card key={key} className={isConnected ? 'border-green-200 bg-green-50 dark:bg-green-950' : ''}>
                <CardHeader>
                  <div className=\"flex items-center justify-between\">
                    <div className=\"flex items-center gap-3\">
                      <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-xl`}>
                        {provider.icon}
                      </div>
                      <div>
                        <CardTitle className=\"text-lg\">{provider.name}</CardTitle>
                        <CardDescription>{provider.description}</CardDescription>
                      </div>
                    </div>
                    {isConnected && (
                      <Badge variant=\"secondary\" className=\"bg-green-100 text-green-800\">
                        <Check className=\"h-3 w-3 mr-1\" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className=\"space-y-4\">
                    <div>
                      <h4 className=\"font-medium mb-2\">Features:</h4>
                      <ul className=\"text-sm text-gray-600 dark:text-gray-400 space-y-1\">
                        {provider.features.map((feature, index) => (
                          <li key={index} className=\"flex items-center gap-2\">
                            <Zap className=\"h-3 w-3 text-blue-500\" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button
                      onClick={() => handleConnectCalendar(key as 'google' | 'outlook')}
                      disabled={isConnected || isConnecting === key}
                      className=\"w-full\"
                    >
                      {isConnecting === key ? (
                        <>
                          <RefreshCw className=\"h-4 w-4 mr-2 animate-spin\" />
                          Connecting...
                        </>
                      ) : isConnected ? (
                        <>
                          <Check className=\"h-4 w-4 mr-2\" />
                          Connected
                        </>
                      ) : (
                        <>
                          <Plus className=\"h-4 w-4 mr-2\" />
                          Connect {provider.name}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Sync Activity */}
      {syncLogs.length > 0 && (
        <div>
          <h2 className=\"text-xl font-semibold mb-4\">Recent Sync Activity</h2>
          
          <Card>
            <CardContent className=\"p-0\">
              <div className=\"divide-y divide-gray-200 dark:divide-gray-700\">
                {syncLogs.map((log) => (
                  <div key={log.id} className=\"p-4 flex items-center justify-between\">
                    <div className=\"flex items-center gap-3\">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'completed' ? 'bg-green-500' :
                        log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className=\"font-medium\">
                          {log.connection?.provider} Calendar Sync
                        </p>
                        <p className=\"text-sm text-gray-600 dark:text-gray-400\">
                          {log.connection?.provider_account_email} • {log.sync_type}
                        </p>
                      </div>
                    </div>
                    
                    <div className=\"text-right\">
                      <p className=\"text-sm font-medium\">
                        {log.events_processed} events processed
                      </p>
                      <p className=\"text-xs text-gray-500\">
                        {new Date(log.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <CalendarSelectionDialog
        open={showCalendarSelection}
        onOpenChange={setShowCalendarSelection}
        connectionId={selectedConnection}
        onCalendarToggle={handleCalendarToggle}
      />
      
      <SyncSettingsDialog
        open={showSyncSettings}
        onOpenChange={setShowSyncSettings}
        connections={connections}
      />
    </div>
  );
}