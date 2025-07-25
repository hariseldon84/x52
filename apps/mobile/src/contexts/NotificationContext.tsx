import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { notificationService, NotificationData } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';

interface NotificationContextValue {
  initialized: boolean;
  hasPermission: boolean;
  scheduleNotification: (notification: NotificationData) => Promise<string | null>;
  cancelNotification: (identifier: string) => Promise<void>;
  sendImmediateNotification: (notification: NotificationData) => Promise<void>;
  updatePreferences: (preferences: any) => Promise<void>;
  getPreferences: () => Promise<any>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (initialized) {
      setupNotificationHandlers();
    }
  }, [initialized]);

  const initializeNotifications = async () => {
    try {
      const success = await notificationService.initialize();
      setHasPermission(success);
      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setInitialized(true);
    }
  };

  const setupNotificationHandlers = () => {
    return notificationService.setupNotificationListeners(
      (notification) => {
        // Handle received notification
        console.log('Notification received:', notification);
      },
      (response) => {
        // Handle notification tap
        handleNotificationResponse(response);
      }
    );
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    
    switch (data.type) {
      case 'task_reminder':
        if (data.taskId) {
          router.push(`/tasks/${data.taskId}`);
        } else {
          router.push('/tasks');
        }
        break;
      
      case 'achievement_unlock':
        router.push('/achievements');
        break;
      
      case 'streak_reminder':
        router.push('/dashboard');
        break;
      
      case 'contact_followup':
        if (data.contactId) {
          router.push(`/contacts/${data.contactId}`);
        } else {
          router.push('/contacts');
        }
        break;
      
      case 'goal_deadline':
        if (data.goalId) {
          router.push(`/goals/${data.goalId}`);
        } else {
          router.push('/goals');
        }
        break;
      
      default:
        router.push('/dashboard');
    }
  };

  const scheduleNotification = async (notification: NotificationData): Promise<string | null> => {
    if (!hasPermission) {
      console.warn('No notification permission');
      return null;
    }

    return await notificationService.scheduleNotification(notification);
  };

  const cancelNotification = async (identifier: string): Promise<void> => {
    await notificationService.cancelNotification(identifier);
  };

  const sendImmediateNotification = async (notification: NotificationData): Promise<void> => {
    if (!hasPermission) {
      console.warn('No notification permission');
      return;
    }

    await notificationService.sendImmediateNotification(notification);
  };

  const updatePreferences = async (preferences: any): Promise<void> => {
    await notificationService.updateNotificationPreferences(preferences);
  };

  const getPreferences = async (): Promise<any> => {
    return await notificationService.getNotificationPreferences();
  };

  const value: NotificationContextValue = {
    initialized,
    hasPermission,
    scheduleNotification,
    cancelNotification,
    sendImmediateNotification,
    updatePreferences,
    getPreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}