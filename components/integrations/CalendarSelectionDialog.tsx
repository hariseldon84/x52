// Epic 8, Story 8.1: Calendar Selection Dialog Component

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar,
  Check,
  Clock,
  Users,
  Lock,
  RefreshCw
} from 'lucide-react';
import { calendarService } from '@/lib/services/calendarService';
import type { UserCalendar } from '@/lib/types/calendar';

interface CalendarSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string | null;
  onCalendarToggle: (calendarId: string, isSelected: boolean) => void;
}

export function CalendarSelectionDialog({
  open,
  onOpenChange,
  connectionId,
  onCalendarToggle,
}: CalendarSelectionDialogProps) {
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (open && connectionId) {
      loadCalendars();
    }
  }, [open, connectionId]);

  const loadCalendars = async () => {
    if (!connectionId) return;
    
    try {
      setIsLoading(true);
      const data = await calendarService.getUserCalendars(connectionId);
      setCalendars(data);
    } catch (error) {
      console.error('Error loading calendars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCalendars = async () => {
    if (!connectionId) return;
    
    try {
      setIsRefreshing(true);
      await calendarService.syncUserCalendars(connectionId);
      await loadCalendars();
    } catch (error) {
      console.error('Error refreshing calendars:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleCalendar = async (calendar: UserCalendar) => {
    const newSelection = !calendar.is_selected;
    
    // Optimistically update UI
    setCalendars(prev => 
      prev.map(cal => 
        cal.id === calendar.id 
          ? { ...cal, is_selected: newSelection }
          : cal
      )
    );
    
    // Call parent handler
    onCalendarToggle(calendar.id, newSelection);
  };

  const getAccessRoleInfo = (role: string) => {
    switch (role) {
      case 'owner':
        return { icon: <Users className=\"h-3 w-3\" />, label: 'Owner', color: 'bg-green-100 text-green-800' };
      case 'writer':
        return { icon: <Check className=\"h-3 w-3\" />, label: 'Write', color: 'bg-blue-100 text-blue-800' };
      case 'reader':
        return { icon: <Lock className=\"h-3 w-3\" />, label: 'Read Only', color: 'bg-gray-100 text-gray-800' };
      default:
        return { icon: <Calendar className=\"h-3 w-3\" />, label: role, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const selectedCount = calendars.filter(c => c.is_selected).length;
  const connection = calendars[0]?.connection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=\"max-w-2xl\">
        <DialogHeader>
          <DialogTitle className=\"flex items-center gap-2\">
            <Calendar className=\"h-5 w-5\" />
            Manage Calendars
          </DialogTitle>
          <DialogDescription>
            {connection && (
              <>
                Select which {connection.provider} calendars to sync with TaskQuest.
                <br />
                <span className=\"text-sm text-gray-500\">
                  Connected as: {connection.provider_account_email}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className=\"space-y-4\">
          {/* Header with refresh button */}
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-2\">
              <span className=\"text-sm font-medium\">
                {selectedCount} of {calendars.length} calendars selected
              </span>
            </div>
            
            <Button
              onClick={handleRefreshCalendars}
              disabled={isRefreshing}
              size=\"sm\"
              variant=\"outline\"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Calendar List */}
          <ScrollArea className=\"h-80 border rounded-lg\">
            {isLoading ? (
              <div className=\"p-8 text-center\">
                <RefreshCw className=\"h-8 w-8 animate-spin mx-auto mb-2 text-gray-400\" />
                <p className=\"text-gray-500\">Loading calendars...</p>
              </div>
            ) : calendars.length === 0 ? (
              <div className=\"p-8 text-center\">
                <Calendar className=\"h-8 w-8 mx-auto mb-2 text-gray-400\" />
                <p className=\"text-gray-500\">No calendars found</p>
              </div>
            ) : (
              <div className=\"divide-y divide-gray-200 dark:divide-gray-700\">
                {calendars.map((calendar) => {
                  const accessInfo = getAccessRoleInfo(calendar.access_role);
                  
                  return (
                    <div key={calendar.id} className=\"p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors\">
                      <div className=\"flex items-center justify-between\">
                        <div className=\"flex items-center gap-3 flex-1 min-w-0\">
                          <Switch
                            checked={calendar.is_selected}
                            onCheckedChange={() => handleToggleCalendar(calendar)}
                            disabled={calendar.access_role === 'reader'}
                          />
                          
                          <div 
                            className=\"w-4 h-4 rounded-full flex-shrink-0\" 
                            style={{ backgroundColor: calendar.color || '#3b82f6' }}
                          />
                          
                          <div className=\"flex-1 min-w-0\">
                            <div className=\"flex items-center gap-2\">
                              <h4 className=\"font-medium truncate\">
                                {calendar.calendar_name}
                              </h4>
                              
                              {calendar.is_primary && (
                                <Badge variant=\"outline\" className=\"text-xs\">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            
                            <div className=\"flex items-center gap-3 mt-1\">
                              <Badge 
                                variant=\"secondary\" 
                                className={`text-xs ${accessInfo.color}`}
                              >
                                {accessInfo.icon}
                                <span className=\"ml-1\">{accessInfo.label}</span>
                              </Badge>
                              
                              {calendar.time_zone && (
                                <span className=\"text-xs text-gray-500 flex items-center gap-1\">
                                  <Clock className=\"h-3 w-3\" />
                                  {calendar.time_zone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {calendar.access_role === 'reader' && (
                        <p className=\"text-xs text-yellow-600 dark:text-yellow-400 mt-2 ml-7\">
                          Read-only calendars cannot be synced for task creation
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Sync Information */}
          {selectedCount > 0 && (
            <div className=\"bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3\">
              <div className=\"flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2\">
                <Check className=\"h-4 w-4\" />
                <span className=\"text-sm font-medium\">Sync Configuration</span>
              </div>
              <ul className=\"text-sm text-blue-700 dark:text-blue-300 space-y-1\">
                <li>• Tasks with due dates will create calendar events</li>
                <li>• Calendar events can be converted to tasks</li>
                <li>• Meetings will suggest follow-up tasks</li>
                <li>• Sync respects your timezone settings</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className=\"flex gap-2 pt-4\">
            <Button onClick={() => onOpenChange(false)} className=\"flex-1\">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}