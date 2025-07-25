import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

export interface NotificationData {
  type: 'task_reminder' | 'achievement_unlock' | 'streak_reminder' | 'contact_followup' | 'goal_deadline';
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledDate?: Date;
  recurring?: 'daily' | 'weekly' | 'monthly';
  userId: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Initialize notification permissions and push token
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification');
        return false;
      }

      // Get push token
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.expoPushToken = pushToken.data;

      // Store token in Supabase for server-side notifications
      await this.registerPushToken(pushToken.data);

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerPushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      // Store locally for quick access
      await AsyncStorage.setItem('push_token', token);
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievement Unlocks',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('streak-reminders', {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#FF9500',
    });

    await Notifications.setNotificationChannelAsync('contact-followups', {
      name: 'Contact Follow-ups',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#5856D6',
    });

    await Notifications.setNotificationChannelAsync('goal-deadlines', {
      name: 'Goal Deadlines',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
      sound: 'default',
    });
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(notification: NotificationData): Promise<string | null> {
    try {
      const channelId = this.getChannelId(notification.type);
      
      const notificationRequest: Notifications.NotificationRequestInput = {
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: notification.scheduledDate 
          ? { date: notification.scheduledDate }
          : null,
      };

      const identifier = await Notifications.scheduleNotificationAsync(notificationRequest);
      
      // Store notification in local database for management
      await this.storeScheduledNotification(identifier, notification);
      
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule recurring notification
   */
  async scheduleRecurringNotification(notification: NotificationData): Promise<string | null> {
    if (!notification.recurring || !notification.scheduledDate) {
      return null;
    }

    try {
      const trigger: Notifications.NotificationTriggerInput = this.getRecurringTrigger(
        notification.recurring,
        notification.scheduledDate
      );

      const channelId = this.getChannelId(notification.type);

      const notificationRequest: Notifications.NotificationRequestInput = {
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger,
      };

      const identifier = await Notifications.scheduleNotificationAsync(notificationRequest);
      
      await this.storeScheduledNotification(identifier, notification);
      
      return identifier;
    } catch (error) {
      console.error('Error scheduling recurring notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await this.removeStoredNotification(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all notifications for user
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('scheduled_notifications');
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Send immediate local notification
   */
  async sendImmediateNotification(notification: NotificationData): Promise<void> {
    try {
      const channelId = this.getChannelId(notification.type);

      await Notifications.presentNotificationAsync({
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId }),
      });
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  /**
   * Handle notification interactions
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        onNotificationReceived?.(notification);
      }
    );

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        onNotificationResponse?.(response);
      }
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Get notification channel ID based on type
   */
  private getChannelId(type: NotificationData['type']): string {
    const channelMap = {
      'task_reminder': 'task-reminders',
      'achievement_unlock': 'achievements',
      'streak_reminder': 'streak-reminders',
      'contact_followup': 'contact-followups',
      'goal_deadline': 'goal-deadlines',
    };

    return channelMap[type] || 'default';
  }

  /**
   * Get recurring trigger configuration
   */
  private getRecurringTrigger(
    recurring: 'daily' | 'weekly' | 'monthly',
    date: Date
  ): Notifications.NotificationTriggerInput {
    const trigger: any = {
      repeats: true,
    };

    switch (recurring) {
      case 'daily':
        trigger.hour = date.getHours();
        trigger.minute = date.getMinutes();
        break;
      case 'weekly':
        trigger.weekday = date.getDay() + 1; // Expo uses 1-7, JS uses 0-6
        trigger.hour = date.getHours();
        trigger.minute = date.getMinutes();
        break;
      case 'monthly':
        trigger.day = date.getDate();
        trigger.hour = date.getHours();
        trigger.minute = date.getMinutes();
        break;
    }

    return trigger;
  }

  /**
   * Store scheduled notification info locally
   */
  private async storeScheduledNotification(
    identifier: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scheduled_notifications');
      const notifications = stored ? JSON.parse(stored) : [];
      
      notifications.push({
        identifier,
        ...notification,
        scheduledAt: new Date().toISOString(),
      });

      await AsyncStorage.setItem(
        'scheduled_notifications',
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error('Error storing scheduled notification:', error);
    }
  }

  /**
   * Remove stored notification info
   */
  private async removeStoredNotification(identifier: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scheduled_notifications');
      if (!stored) return;

      const notifications = JSON.parse(stored);
      const filtered = notifications.filter(
        (n: any) => n.identifier !== identifier
      );

      await AsyncStorage.setItem(
        'scheduled_notifications',
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error removing stored notification:', error);
    }
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    taskReminders: boolean;
    achievementUnlocks: boolean;
    streakReminders: boolean;
    contactFollowups: boolean;
    goalDeadlines: boolean;
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      // Store locally
      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        return JSON.parse(stored);
      }

      // Default preferences
      return {
        taskReminders: true,
        achievementUnlocks: true,
        streakReminders: true,
        contactFollowups: true,
        goalDeadlines: true,
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {};
    }
  }
}

export const notificationService = new NotificationService();