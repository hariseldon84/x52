// Epic 8, Story 8.1: Calendar Connection Card Component

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Settings, 
  Unplug, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CalendarConnection } from '@/lib/types/calendar';

interface CalendarConnectionCardProps {
  connection: CalendarConnection;
  onDisconnect: (connectionId: string) => void;
  onSync: (connectionId: string) => void;
  onManageCalendars: () => void;
}

export function CalendarConnectionCard({
  connection,
  onDisconnect,
  onSync,
  onManageCalendars,
}: CalendarConnectionCardProps) {
  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'google':
        return {
          name: 'Google Calendar',
          icon: '📅',
          color: 'bg-blue-500',
          url: 'https://calendar.google.com',
        };
      case 'outlook':
        return {
          name: 'Outlook Calendar',
          icon: '📧',
          color: 'bg-blue-600',
          url: 'https://outlook.live.com/calendar',
        };
      default:
        return {
          name: provider,
          icon: '📅',
          color: 'bg-gray-500',
          url: '#',
        };
    }
  };

  const providerInfo = getProviderInfo(connection.provider);
  const selectedCalendars = connection.calendars?.filter(c => c.is_selected) || [];
  const totalCalendars = connection.calendars?.length || 0;
  
  const isTokenExpired = connection.token_expires_at 
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  const lastSyncText = connection.last_sync_at
    ? formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })
    : 'Never synced';

  return (
    <Card className={`${!connection.is_active ? 'opacity-50' : ''}`}>
      <CardHeader>
        <div className=\"flex items-center justify-between\">
          <div className=\"flex items-center gap-3\">
            <div className={`w-10 h-10 rounded-lg ${providerInfo.color} flex items-center justify-center text-white text-xl`}>
              {providerInfo.icon}
            </div>
            <div>
              <CardTitle className=\"text-lg\">{providerInfo.name}</CardTitle>
              <p className=\"text-sm text-gray-600 dark:text-gray-400\">
                {connection.provider_account_email}
              </p>
            </div>
          </div>
          
          <div className=\"flex items-center gap-2\">
            {isTokenExpired && (
              <Badge variant=\"destructive\">
                <AlertCircle className=\"h-3 w-3 mr-1\" />
                Expired
              </Badge>
            )}
            
            {connection.is_active && !isTokenExpired && (
              <Badge variant=\"secondary\" className=\"bg-green-100 text-green-800\">
                <CheckCircle className=\"h-3 w-3 mr-1\" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className=\"space-y-4\">
        {/* Calendar Stats */}
        <div className=\"grid grid-cols-2 gap-4 text-sm\">
          <div className=\"flex items-center gap-2\">
            <Calendar className=\"h-4 w-4 text-gray-500\" />
            <span>
              {selectedCalendars.length} of {totalCalendars} calendars
            </span>
          </div>
          
          <div className=\"flex items-center gap-2\">
            <Clock className=\"h-4 w-4 text-gray-500\" />
            <span>{lastSyncText}</span>
          </div>
        </div>

        {/* Selected Calendars Preview */}
        {selectedCalendars.length > 0 && (
          <div>
            <h4 className=\"text-sm font-medium mb-2\">Selected Calendars:</h4>
            <div className=\"space-y-1\">
              {selectedCalendars.slice(0, 3).map((calendar) => (
                <div key={calendar.id} className=\"flex items-center gap-2 text-sm\">
                  <div 
                    className=\"w-3 h-3 rounded-full\" 
                    style={{ backgroundColor: calendar.color || '#3b82f6' }}
                  />
                  <span className=\"truncate\">{calendar.calendar_name}</span>
                  {calendar.is_primary && (
                    <Badge variant=\"outline\" className=\"text-xs\">Primary</Badge>
                  )}
                </div>
              ))}
              {selectedCalendars.length > 3 && (
                <p className=\"text-xs text-gray-500\">
                  +{selectedCalendars.length - 3} more calendars
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sync Settings Summary */}
        <div className=\"bg-gray-50 dark:bg-gray-800 rounded-lg p-3\">
          <div className=\"grid grid-cols-2 gap-2 text-xs\">
            <div>
              <span className=\"text-gray-500\">Auto Sync:</span>
              <span className=\"ml-1 font-medium\">
                {connection.sync_settings?.auto_sync_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <span className=\"text-gray-500\">Interval:</span>
              <span className=\"ml-1 font-medium\">
                {connection.sync_settings?.sync_interval_minutes || 15}m
              </span>
            </div>
            <div>
              <span className=\"text-gray-500\">Task Creation:</span>
              <span className=\"ml-1 font-medium\">
                {connection.sync_settings?.create_tasks_from_events ? 'On' : 'Off'}
              </span>
            </div>
            <div>
              <span className=\"text-gray-500\">Event Creation:</span>
              <span className=\"ml-1 font-medium\">
                {connection.sync_settings?.create_events_from_tasks ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className=\"flex flex-wrap gap-2\">
          <Button
            onClick={() => onSync(connection.id)}
            disabled={!connection.is_active || selectedCalendars.length === 0}
            size=\"sm\"
            variant=\"outline\"
          >
            <RefreshCw className=\"h-4 w-4 mr-2\" />
            Sync Now
          </Button>
          
          <Button
            onClick={onManageCalendars}
            disabled={!connection.is_active}
            size=\"sm\"
            variant=\"outline\"
          >
            <Settings className=\"h-4 w-4 mr-2\" />
            Manage
          </Button>
          
          <Button
            onClick={() => window.open(providerInfo.url, '_blank')}
            size=\"sm\"
            variant=\"outline\"
          >
            <ExternalLink className=\"h-4 w-4 mr-2\" />
            Open
          </Button>
          
          <Button
            onClick={() => onDisconnect(connection.id)}
            size=\"sm\"
            variant=\"outline\"
            className=\"text-red-600 border-red-200 hover:bg-red-50\"
          >
            <Unplug className=\"h-4 w-4 mr-2\" />
            Disconnect
          </Button>
        </div>

        {/* Warning Messages */}
        {isTokenExpired && (
          <div className=\"bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3\">
            <div className=\"flex items-center gap-2 text-red-800 dark:text-red-200\">
              <AlertCircle className=\"h-4 w-4\" />
              <p className=\"text-sm font-medium\">Authentication Expired</p>
            </div>
            <p className=\"text-sm text-red-600 dark:text-red-300 mt-1\">
              Please reconnect your {providerInfo.name} account to continue syncing.
            </p>
          </div>
        )}

        {selectedCalendars.length === 0 && connection.is_active && (
          <div className=\"bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3\">
            <div className=\"flex items-center gap-2 text-yellow-800 dark:text-yellow-200\">
              <AlertCircle className=\"h-4 w-4\" />
              <p className=\"text-sm font-medium\">No Calendars Selected</p>
            </div>
            <p className=\"text-sm text-yellow-600 dark:text-yellow-300 mt-1\">
              Select calendars to start syncing with TaskQuest.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}