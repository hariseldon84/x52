import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundJob from 'react-native-background-job';
import { Platform } from 'react-native';

import { localDatabase } from './offline/database';
import { supabase } from './supabase';

export interface WidgetData {
  currentXP: number;
  currentLevel: number;
  currentStreak: number;
  todayTasks: {
    completed: number;
    total: number;
  };
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  recentAchievements: Array<{
    id: string;
    title: string;
    icon: string;
    unlockedAt: string;
  }>;
  lastUpdated: string;
}

export interface WidgetConfig {
  size: 'small' | 'medium' | 'large';
  showXP: boolean;
  showStreak: boolean;
  showTasks: boolean;
  showUpcoming: boolean;
  showAchievements: boolean;
  updateInterval: number; // minutes
  theme: 'light' | 'dark' | 'auto';
}

class WidgetService {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating: boolean = false;

  /**
   * Initialize widget service
   */
  async initialize(): Promise<void> {
    try {
      // Set up background updates
      await this.setupBackgroundUpdates();
      
      // Initial widget data update
      await this.updateWidgetData();
      
      console.log('Widget service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize widget service:', error);
    }
  }

  /**
   * Set up background updates for widget data
   */
  private async setupBackgroundUpdates(): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS background app refresh
      BackgroundJob.start({
        jobKey: 'widgetUpdate',
        period: 15000, // 15 seconds minimum for iOS
      });
    }

    // Set up periodic updates
    const config = await this.getWidgetConfig();
    const intervalMs = config.updateInterval * 60 * 1000; // Convert to milliseconds

    this.updateInterval = setInterval(() => {
      this.updateWidgetData();
    }, intervalMs);
  }

  /**
   * Update widget data from local database and sync with server
   */
  async updateWidgetData(): Promise<void> {
    if (this.isUpdating) return;

    this.isUpdating = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get data from local database (works offline)
      const [tasks, goals, achievements, streak, xpData] = await Promise.all([
        this.getTodayTasks(user.id),
        this.getUpcomingTasks(user.id),
        this.getRecentAchievements(user.id),
        this.getCurrentStreak(user.id),
        this.getUserXPData(user.id),
      ]);

      const widgetData: WidgetData = {
        currentXP: xpData.totalXP,
        currentLevel: xpData.level,
        currentStreak: streak,
        todayTasks: tasks,
        upcomingTasks: goals,
        recentAchievements: achievements,
        lastUpdated: new Date().toISOString(),
      };

      // Store widget data
      await AsyncStorage.setItem('widget_data', JSON.stringify(widgetData));

      // Update native widgets
      await this.updateNativeWidgets(widgetData);

    } catch (error) {
      console.error('Error updating widget data:', error);
      
      // Try to use cached data
      const cachedData = await AsyncStorage.getItem('widget_data');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        await this.updateNativeWidgets(data);
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Get today's task completion data
   */
  private async getTodayTasks(userId: string): Promise<{ completed: number; total: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasks = await localDatabase.getTasks(userId, true);
      
      const todayTasks = tasks.filter(task => {
        const taskDate = task.created_at.split('T')[0];
        return taskDate === today;
      });

      const completed = todayTasks.filter(task => task.completed).length;
      
      return {
        completed,
        total: todayTasks.length,
      };
    } catch (error) {
      console.error('Error getting today tasks:', error);
      return { completed: 0, total: 0 };
    }
  }

  /**
   * Get upcoming tasks and deadlines
   */
  private async getUpcomingTasks(userId: string): Promise<Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  }>> {
    try {
      const tasks = await localDatabase.getTasks(userId, false);
      const now = new Date();
      const upcoming = tasks
        .filter(task => task.due_date && new Date(task.due_date) > now)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
        .slice(0, 5)
        .map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.due_date!,
          priority: task.priority,
        }));

      return upcoming;
    } catch (error) {
      console.error('Error getting upcoming tasks:', error);
      return [];
    }
  }

  /**
   * Get recent achievements
   */
  private async getRecentAchievements(userId: string): Promise<Array<{
    id: string;
    title: string;
    icon: string;
    unlockedAt: string;
  }>> {
    try {
      // This would typically come from the achievements system
      // For now, return mock data
      return [
        {
          id: '1',
          title: 'Task Master',
          icon: '🏆',
          unlockedAt: new Date().toISOString(),
        },
      ];
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  /**
   * Get current streak
   */
  private async getCurrentStreak(userId: string): Promise<number> {
    try {
      // This would come from the streak system
      // For now, return mock data
      return 7;
    } catch (error) {
      console.error('Error getting current streak:', error);
      return 0;
    }
  }

  /**
   * Get user XP data
   */
  private async getUserXPData(userId: string): Promise<{ totalXP: number; level: number }> {
    try {
      // This would come from the XP system
      // For now, return mock data
      return {
        totalXP: 2500,
        level: 12,
      };
    } catch (error) {
      console.error('Error getting user XP data:', error);
      return { totalXP: 0, level: 1 };
    }
  }

  /**
   * Update native widgets with new data
   */
  private async updateNativeWidgets(data: WidgetData): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await this.updateiOSWidgets(data);
      } else if (Platform.OS === 'android') {
        await this.updateAndroidWidgets(data);
      }
    } catch (error) {
      console.error('Error updating native widgets:', error);
    }
  }

  /**
   * Update iOS widgets using WidgetKit
   */
  private async updateiOSWidgets(data: WidgetData): Promise<void> {
    try {
      // This would require native iOS code (Swift/WidgetKit)
      // For now, we'll simulate the data preparation
      
      const widgetUpdateData = {
        timeline: [
          {
            date: new Date().toISOString(),
            xp: data.currentXP,
            level: data.currentLevel,
            streak: data.currentStreak,
            tasksCompleted: data.todayTasks.completed,
            tasksTotal: data.todayTasks.total,
            upcomingTasks: data.upcomingTasks.slice(0, 3),
            recentAchievements: data.recentAchievements.slice(0, 2),
          },
        ],
      };

      // Store data that the native widget can access
      await AsyncStorage.setItem('ios_widget_data', JSON.stringify(widgetUpdateData));
      
      // In a real implementation, you would call a native method here
      // NativeModules.WidgetKit.reloadTimelines(['TaskQuestWidget']);
      
      console.log('iOS widget data prepared');
    } catch (error) {
      console.error('Error updating iOS widgets:', error);
    }
  }

  /**
   * Update Android widgets using App Widget framework
   */
  private async updateAndroidWidgets(data: WidgetData): Promise<void> {
    try {
      // This would require native Android code (Kotlin/Java)
      // For now, we'll simulate the data preparation
      
      const widgetUpdateData = {
        xp: data.currentXP,
        level: data.currentLevel,
        streak: data.currentStreak,
        tasksCompleted: data.todayTasks.completed,
        tasksTotal: data.todayTasks.total,
        upcomingCount: data.upcomingTasks.length,
        lastUpdated: data.lastUpdated,
      };

      // Store data that the native widget can access
      await AsyncStorage.setItem('android_widget_data', JSON.stringify(widgetUpdateData));
      
      // In a real implementation, you would call a native method here
      // NativeModules.AndroidWidget.updateWidgets(widgetUpdateData);
      
      console.log('Android widget data prepared');
    } catch (error) {
      console.error('Error updating Android widgets:', error);
    }
  }

  /**
   * Get widget configuration
   */
  async getWidgetConfig(): Promise<WidgetConfig> {
    try {
      const stored = await AsyncStorage.getItem('widget_config');
      if (stored) {
        return JSON.parse(stored);
      }

      // Default configuration
      return {
        size: 'medium',
        showXP: true,
        showStreak: true,
        showTasks: true,
        showUpcoming: true,
        showAchievements: false,
        updateInterval: 15, // 15 minutes
        theme: 'auto',
      };
    } catch (error) {
      console.error('Error getting widget config:', error);
      // Return default config
      return {
        size: 'medium',
        showXP: true,
        showStreak: true,
        showTasks: true,
        showUpcoming: true,
        showAchievements: false,
        updateInterval: 15,
        theme: 'auto',
      };
    }
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfig(config: Partial<WidgetConfig>): Promise<void> {
    try {
      const currentConfig = await this.getWidgetConfig();
      const newConfig = { ...currentConfig, ...config };
      
      await AsyncStorage.setItem('widget_config', JSON.stringify(newConfig));
      
      // Restart updates with new interval if changed
      if (config.updateInterval && config.updateInterval !== currentConfig.updateInterval) {
        await this.restartUpdates();
      }
      
      // Trigger immediate update if display settings changed
      await this.updateWidgetData();
      
    } catch (error) {
      console.error('Error updating widget config:', error);
    }
  }

  /**
   * Restart update intervals
   */
  private async restartUpdates(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    await this.setupBackgroundUpdates();
  }

  /**
   * Get current widget data
   */
  async getWidgetData(): Promise<WidgetData | null> {
    try {
      const stored = await AsyncStorage.getItem('widget_data');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting widget data:', error);
      return null;
    }
  }

  /**
   * Handle widget tap actions
   */
  async handleWidgetTap(action: string, data?: any): Promise<string> {
    switch (action) {
      case 'open_tasks':
        return '/tasks';
      case 'open_goals':
        return '/goals';
      case 'open_achievements':
        return '/achievements';
      case 'open_task':
        return data?.taskId ? `/tasks/${data.taskId}` : '/tasks';
      case 'open_goal':
        return data?.goalId ? `/goals/${data.goalId}` : '/goals';
      default:
        return '/dashboard';
    }
  }

  /**
   * Force immediate widget update
   */
  async forceUpdate(): Promise<void> {
    await this.updateWidgetData();
  }

  /**
   * Get widget analytics
   */
  async getWidgetAnalytics(): Promise<{
    tapCount: number;
    lastTapDate: string | null;
    mostTappedAction: string | null;
    updateFrequency: number;
  }> {
    try {
      const stored = await AsyncStorage.getItem('widget_analytics');
      if (stored) {
        return JSON.parse(stored);
      }

      return {
        tapCount: 0,
        lastTapDate: null,
        mostTappedAction: null,
        updateFrequency: 0,
      };
    } catch (error) {
      console.error('Error getting widget analytics:', error);
      return {
        tapCount: 0,
        lastTapDate: null,
        mostTappedAction: null,
        updateFrequency: 0,
      };
    }
  }

  /**
   * Track widget interaction
   */
  async trackWidgetTap(action: string): Promise<void> {
    try {
      const analytics = await this.getWidgetAnalytics();
      
      const updatedAnalytics = {
        tapCount: analytics.tapCount + 1,
        lastTapDate: new Date().toISOString(),
        mostTappedAction: action, // Simple implementation
        updateFrequency: analytics.updateFrequency,
      };

      await AsyncStorage.setItem('widget_analytics', JSON.stringify(updatedAnalytics));
    } catch (error) {
      console.error('Error tracking widget tap:', error);
    }
  }

  /**
   * Clean up widget service
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (Platform.OS === 'ios') {
      BackgroundJob.stop({
        jobKey: 'widgetUpdate',
      });
    }
  }
}

export const widgetService = new WidgetService();