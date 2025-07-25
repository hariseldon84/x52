// Epic 9, Story 9.4: Context-Aware Notification System Service

import { supabase } from '@/lib/supabase';
import type {
  NotificationPreferences,
  UserContext,
  SmartNotification,
  NotificationDeliveryHistory,
  NotificationRule,
  NotificationBatch,
  UpdateNotificationPreferencesRequest,
  UpdateUserContextRequest,
  CreateNotificationRequest,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationInteractionRequest,
  NotificationStats,
  NotificationInsights,
  ContextAnalysis,
  NotificationType,
  NotificationChannel,
  PriorityLevel,
  NotificationStatus,
  UserActivity,
  LocationType,
  DeviceType,
  FocusModeType,
} from '@/lib/types/notifications';

export class NotificationService {
  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Create default preferences if they don't exist
      const defaultPreferences = {
        user_id: user.id,
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: true,
        in_app_notifications: true,
        context_awareness_enabled: true,
        location_based_notifications: false,
        time_based_optimization: true,
        activity_based_filtering: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        quiet_hours_timezone: 'UTC',
        focus_mode_enabled: false,
        focus_mode_schedule: [],
        do_not_disturb_keywords: [],
        urgent_priority_immediate: true,
        high_priority_delay_minutes: 15,
        medium_priority_delay_minutes: 60,
        low_priority_delay_minutes: 240,
        max_notifications_per_hour: 10,
        batch_similar_notifications: true,
        notification_cooldown_minutes: 5,
      };

      const { data: newPrefs, error: createError } = await supabase
        .from('notification_preferences')
        .insert([defaultPreferences])
        .select()
        .single();

      if (createError) throw createError;
      return newPrefs;
    }

    return data;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    request: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's current context
   */
  async getUserContext(): Promise<UserContext> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Create default context if not found
      const defaultContext = {
        user_id: user.id,
        current_activity: 'working' as UserActivity,
        current_device: 'desktop' as DeviceType,
        context_data: {},
        context_confidence: 0.5,
        is_available: true,
        is_in_focus_mode: false,
        response_patterns: {},
        notification_preferences: {},
      };

      const { data: newContext, error: createError } = await supabase
        .from('user_context')
        .insert([defaultContext])
        .select()
        .single();

      if (createError) throw createError;
      return newContext;
    }

    return data;
  }

  /**
   * Update user context
   */
  async updateUserContext(request: UpdateUserContextRequest): Promise<UserContext> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: success, error } = await supabase.rpc('update_user_context', {
      p_user_id: user.id,
      p_activity: request.current_activity,
      p_location_type: request.current_location_type,
      p_device: request.current_device,
      p_is_available: request.is_available,
      p_context_data: request.context_data,
    });

    if (error) throw error;

    // Return updated context
    return this.getUserContext();
  }

  /**
   * Get user's notifications
   */
  async getNotifications(
    status?: NotificationStatus,
    limit: number = 50
  ): Promise<SmartNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('smart_notifications')
      .select(`
        *,
        related_task:tasks!smart_notifications_related_task_id_fkey(
          id,
          title,
          status,
          priority
        ),
        related_project:projects!smart_notifications_related_project_id_fkey(
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Create a smart notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<string> {
    const { data: notificationId, error } = await supabase.rpc('create_smart_notification', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_notification_type: request.notification_type,
      p_title: request.title,
      p_message: request.message,
      p_related_task_id: request.related_task_id,
      p_priority_level: request.priority_level || 'medium',
      p_channels: request.channels || ['in_app'],
    });

    if (error) throw error;
    return notificationId;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('smart_notifications')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('smart_notifications')
      .update({
        dismissed: true,
        status: 'dismissed',
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Handle notification interaction
   */
  async handleNotificationInteraction(
    request: NotificationInteractionRequest
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update notification based on action
    const updates: Partial<SmartNotification> = {
      action_taken: request.action,
    };

    if (request.action === 'clicked') {
      updates.clicked = true;
      updates.read_at = new Date().toISOString();
    } else if (request.action === 'dismissed') {
      updates.dismissed = true;
      updates.status = 'dismissed' as NotificationStatus;
    }

    const { error } = await supabase
      .from('smart_notifications')
      .update(updates)
      .eq('id', request.notification_id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Record interaction in delivery history
    const { error: historyError } = await supabase
      .from('notification_delivery_history')
      .update({
        response_action: request.action,
        user_feedback: request.feedback,
        opened_at: request.action === 'clicked' ? new Date().toISOString() : undefined,
      })
      .eq('notification_id', request.notification_id)
      .eq('user_id', user.id);

    // Don't throw error if history update fails - it's not critical
    return true;
  }

  /**
   * Get notification rules
   */
  async getNotificationRules(): Promise<NotificationRule[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create notification rule
   */
  async createNotificationRule(request: CreateNotificationRuleRequest): Promise<NotificationRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const ruleData = {
      user_id: user.id,
      rule_name: request.rule_name,
      rule_type: request.rule_type,
      description: request.description,
      conditions: request.conditions,
      actions: request.actions,
      priority: request.priority || 0,
    };

    const { data, error } = await supabase
      .from('notification_rules')
      .insert([ruleData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update notification rule
   */
  async updateNotificationRule(
    ruleId: string,
    request: UpdateNotificationRuleRequest
  ): Promise<NotificationRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_rules')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete notification rule
   */
  async deleteNotificationRule(ruleId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Get notification delivery history
   */
  async getDeliveryHistory(limit: number = 100): Promise<NotificationDeliveryHistory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_delivery_history')
      .select('*')
      .eq('user_id', user.id)
      .order('delivered_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(limit?: number): Promise<number> {
    const { data: processedCount, error } = await supabase.rpc('process_scheduled_notifications', {
      p_limit: limit || 50,
    });

    if (error) throw error;
    return processedCount || 0;
  }

  /**
   * Analyze current context for notification delivery
   */
  async analyzeCurrentContext(): Promise<ContextAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [context, preferences] = await Promise.all([
      this.getUserContext(),
      this.getNotificationPreferences(),
    ]);

    // Calculate context score components
    const currentHour = new Date().getHours();
    const quietStart = parseInt(preferences.quiet_hours_start.split(':')[0]);
    const quietEnd = parseInt(preferences.quiet_hours_end.split(':')[0]);

    // Time appropriateness
    let timeAppropriate = 0.8;
    if (preferences.quiet_hours_enabled) {
      if ((quietStart > quietEnd && (currentHour >= quietStart || currentHour < quietEnd)) ||
          (quietStart <= quietEnd && currentHour >= quietStart && currentHour < quietEnd)) {
        timeAppropriate = 0.2;
      }
    }

    // Activity compatibility
    const activityCompatibility = context.current_activity === 'working' ? 0.9 :
                                 context.current_activity === 'break' ? 0.7 :
                                 context.current_activity === 'meeting' ? 0.2 : 0.5;

    // Availability status
    const availabilityStatus = context.is_available ? 0.9 : 0.3;

    // Focus state impact
    const focusStateImpact = context.is_in_focus_mode ? 0.2 : 0.8;

    // Overall context score
    const currentContextScore = (
      timeAppropriate * 0.3 +
      activityCompatibility * 0.3 +
      availabilityStatus * 0.3 +
      focusStateImpact * 0.1
    );

    // Determine preferred channels based on context
    const preferredChannels: NotificationChannel[] = [];
    if (preferences.in_app_notifications && context.current_device === 'desktop') {
      preferredChannels.push('in_app');
    }
    if (preferences.push_notifications && context.current_device === 'mobile') {
      preferredChannels.push('push');
    }
    if (preferences.email_notifications && currentContextScore < 0.5) {
      preferredChannels.push('email');
    }

    // Generate recommendations
    const recommendations = {
      optimal_delivery_time: currentContextScore >= 0.7 ? undefined : 
                           new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes later
      preferred_channels: preferredChannels,
      context_improvements: [
        timeAppropriate < 0.5 ? 'Consider waiting until outside quiet hours' : '',
        context.is_in_focus_mode ? 'User is in focus mode - only urgent notifications recommended' : '',
        !context.is_available ? 'User is marked as unavailable' : '',
      ].filter(Boolean),
    };

    return {
      current_context_score: currentContextScore,
      context_factors: {
        time_appropriateness: timeAppropriate,
        activity_compatibility: activityCompatibility,
        availability_status: availabilityStatus,
        focus_state_impact: focusStateImpact,
      },
      recommendations,
      predicted_user_response: {
        likelihood_to_engage: currentContextScore * 0.8,
        expected_response_time: currentContextScore > 0.7 ? 300 : 1800, // 5 min vs 30 min
        preferred_action: context.current_activity === 'working' ? 'quick_view' : 'detailed_view',
      },
    };
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get notification counts
    const { data: notifications } = await supabase
      .from('smart_notifications')
      .select('status, delivered_at, read_at, clicked, dismissed, channels')
      .eq('user_id', user.id);

    // Get delivery history
    const { data: deliveryHistory } = await supabase
      .from('notification_delivery_history')
      .select('delivery_channel, delivered_at, opened_at, response_time_seconds, was_useful')
      .eq('user_id', user.id);

    // Get today's notifications
    const { count: todayCount } = await supabase
      .from('smart_notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', new Date().toISOString().split('T')[0]);

    const totalNotifications = notifications?.length || 0;
    const deliveredNotifications = notifications?.filter(n => n.status === 'delivered').length || 0;
    const clickedNotifications = notifications?.filter(n => n.clicked).length || 0;
    const dismissedNotifications = notifications?.filter(n => n.dismissed).length || 0;

    const deliveryRate = totalNotifications > 0 ? deliveredNotifications / totalNotifications : 0;
    const clickThroughRate = deliveredNotifications > 0 ? clickedNotifications / deliveredNotifications : 0;
    const dismissalRate = deliveredNotifications > 0 ? dismissedNotifications / deliveredNotifications : 0;

    // Calculate average response time
    const responseTimes = deliveryHistory?.filter(h => h.response_time_seconds).map(h => h.response_time_seconds) || [];
    const averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time!, 0) / responseTimes.length : 0;

    // Find most effective channel
    const channelStats = deliveryHistory?.reduce((acc, h) => {
      acc[h.delivery_channel] = (acc[h.delivery_channel] || 0) + (h.opened_at ? 1 : 0);
      return acc;
    }, {} as Record<string, number>) || {};

    const mostEffectiveChannel = Object.entries(channelStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as NotificationChannel || 'in_app';

    // Calculate peak hours
    const hourlyActivity = deliveryHistory?.reduce((acc, h) => {
      const hour = new Date(h.delivered_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>) || {};

    const peakHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.padStart(2, '0')}:00`);

    // Calculate user satisfaction (based on useful feedback)
    const usefulFeedback = deliveryHistory?.filter(h => h.was_useful === true).length || 0;
    const totalFeedback = deliveryHistory?.filter(h => h.was_useful !== null).length || 0;
    const userSatisfactionScore = totalFeedback > 0 ? usefulFeedback / totalFeedback : 0.5;

    // Estimate context accuracy (simplified)
    const contextAccuracy = 0.75; // Would be calculated from actual context evaluation data

    return {
      total_notifications: totalNotifications,
      delivered_notifications: deliveredNotifications,
      delivery_rate: deliveryRate,
      average_response_time: averageResponseTime,
      click_through_rate: clickThroughRate,
      dismissal_rate: dismissalRate,
      context_accuracy: contextAccuracy,
      notifications_today: todayCount || 0,
      most_effective_channel: mostEffectiveChannel,
      peak_notification_hours: peakHours,
      user_satisfaction_score: userSatisfactionScore,
    };
  }

  /**
   * Get notification insights
   */
  async getNotificationInsights(): Promise<NotificationInsights> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [stats, deliveryHistory, rules] = await Promise.all([
      this.getNotificationStats(),
      this.getDeliveryHistory(200),
      this.getNotificationRules(),
    ]);

    // Channel performance analysis
    const channelPerformance = deliveryHistory.reduce((acc, h) => {
      if (!acc[h.delivery_channel]) {
        acc[h.delivery_channel] = { total: 0, opened: 0, satisfied: 0 };
      }
      acc[h.delivery_channel].total++;
      if (h.opened_at) acc[h.delivery_channel].opened++;
      if (h.was_useful === true) acc[h.delivery_channel].satisfied++;
      return acc;
    }, {} as Record<NotificationChannel, { total: number; opened: number; satisfied: number }>);

    const channelPerformanceRates = Object.entries(channelPerformance).reduce((acc, [channel, data]) => {
      acc[channel as NotificationChannel] = {
        delivery_rate: 1.0, // Assume all were delivered if in history
        response_rate: data.total > 0 ? data.opened / data.total : 0,
        user_satisfaction: data.total > 0 ? data.satisfied / data.total : 0,
      };
      return acc;
    }, {} as Record<NotificationChannel, { delivery_rate: number; response_rate: number; user_satisfaction: number }>);

    // Time-based performance
    const hourlyPerformance = deliveryHistory.reduce((acc, h) => {
      const hour = new Date(h.delivered_at).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      acc[hourKey] = (acc[hourKey] || 0) + (h.opened_at ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    // Context-based performance (simplified)
    const contextPerformance = {
      'working': 0.8,
      'break': 0.9,
      'meeting': 0.2,
      'offline': 0.1,
    };

    // User behavior patterns
    const responseTimes = deliveryHistory.filter(h => h.response_time_seconds).map(h => h.response_time_seconds!);
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    const responseTimePatterns = {
      'immediate': responseTimes.filter(t => t < 60).length,
      'quick': responseTimes.filter(t => t >= 60 && t < 300).length,
      'delayed': responseTimes.filter(t => t >= 300).length,
    };

    // Generate improvement recommendations
    const improvements: string[] = [];
    
    if (stats.dismissal_rate > 0.3) {
      improvements.push('High dismissal rate detected - consider reducing notification frequency');
    }
    
    if (stats.context_accuracy < 0.7) {
      improvements.push('Context awareness could be improved - update your activity status more frequently');
    }
    
    if (stats.click_through_rate < 0.2) {
      improvements.push('Low engagement with notifications - consider more personalized content');
    }

    const bestChannel = Object.entries(channelPerformanceRates)
      .sort(([,a], [,b]) => b.response_rate - a.response_rate)[0];
    
    if (bestChannel && bestChannel[1].response_rate > 0.5) {
      improvements.push(`${bestChannel[0]} notifications perform best for you - consider using this channel more`);
    }

    return {
      delivery_effectiveness: {
        channel_performance: channelPerformanceRates,
        time_based_performance: hourlyPerformance,
        context_based_performance: contextPerformance,
      },
      user_behavior_patterns: {
        preferred_delivery_times: stats.peak_notification_hours,
        response_time_patterns: responseTimePatterns,
        activity_preferences: {
          'working': 0.8,
          'break': 0.9,
          'meeting': 0.2,
          'commuting': 0.4,
          'offline': 0.1,
          'sleeping': 0.0,
        },
        channel_preferences: Object.entries(channelPerformanceRates).reduce((acc, [channel, data]) => {
          acc[channel as NotificationChannel] = data.response_rate;
          return acc;
        }, {} as Record<NotificationChannel, number>),
      },
      optimization_opportunities: {
        suggested_rule_changes: rules.map(rule => ({
          rule_id: rule.id,
          current_performance: rule.success_rate || 0.5,
          suggested_change: 'Consider adjusting timing conditions',
          expected_improvement: 0.1,
        })),
        timing_optimizations: [
          {
            notification_type: 'task_due' as NotificationType,
            current_timing: 'immediate',
            suggested_timing: '15 minutes delay during focus mode',
            confidence: 0.8,
          },
        ],
      },
      improvement_recommendations: improvements,
    };
  }

  /**
   * Create a focus session
   */
  async startFocusSession(
    focusType: FocusModeType,
    durationMinutes: number,
    notificationRules?: Record<string, any>
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Update user context to focus mode
    await this.updateUserContext({
      is_in_focus_mode: true,
      focus_mode_type: focusType,
      focus_mode_until: endTime.toISOString(),
    });

    return true;
  }

  /**
   * End focus session
   */
  async endFocusSession(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await this.updateUserContext({
      is_in_focus_mode: false,
      focus_mode_type: undefined,
      focus_mode_until: undefined,
    });

    return true;
  }

  /**
   * Get notification batches
   */
  async getNotificationBatches(): Promise<NotificationBatch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_batches')
      .select(`
        *,
        items:notification_batch_items(
          *,
          notification:smart_notifications(*)
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_delivery_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const notificationService = new NotificationService();