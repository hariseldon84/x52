// Epic 7, Story 7.5: Social Activity Feed Service

import { supabase } from '@/lib/supabase';
import type { 
  SocialActivity, 
  ActivityInteraction,
  CreateActivityRequest,
  ActivityStats
} from '@/lib/types/social';

export class ActivityFeedService {
  /**
   * Get activity feed for current user
   */
  async getActivityFeed(options: {
    type?: 'following' | 'friends' | 'public' | 'personal';
    limit?: number;
    offset?: number;
  } = {}): Promise<SocialActivity[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('social_activities')
      .select(`
        *,
        user:profiles!social_activities_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        ),
        interactions:activity_interactions(
          id,
          interaction_type,
          user_id
        )
      `);

    // Filter based on feed type
    switch (options.type) {
      case 'personal':
        query = query.eq('user_id', user.id);
        break;
      
      case 'friends':
        // Get activities from friends only
        const { data: friendIds } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');
        
        if (friendIds && friendIds.length > 0) {
          query = query.in('user_id', friendIds.map(f => f.friend_id));
        } else {
          return []; // No friends, return empty feed
        }
        break;
      
      case 'following':
        // Get activities from users the current user follows
        const { data: followingIds } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (followingIds && followingIds.length > 0) {
          query = query.in('user_id', followingIds.map(f => f.following_id));
        } else {
          return []; // Not following anyone, return empty feed
        }
        break;
      
      case 'public':
      default:
        // Public feed - activities with public visibility
        query = query.eq('visibility', 'public');
        break;
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Process interactions for each activity
    return data.map(activity => ({
      ...activity,
      like_count: activity.interactions?.filter((i: any) => i.interaction_type === 'like').length || 0,
      comment_count: activity.interactions?.filter((i: any) => i.interaction_type === 'comment').length || 0,
      is_liked: activity.interactions?.some((i: any) => i.interaction_type === 'like' && i.user_id === user.id) || false,
    }));
  }

  /**
   * Create a new activity
   */
  async createActivity(data: CreateActivityRequest): Promise<SocialActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const activityData = {
      ...data,
      user_id: user.id,
    };

    const { data: activity, error } = await supabase
      .from('social_activities')
      .insert([activityData])
      .select(`
        *,
        user:profiles!social_activities_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        )
      `)
      .single();

    if (error) throw error;
    return {
      ...activity,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      interactions: [],
    };
  }

  /**
   * Like or unlike an activity
   */
  async toggleLike(activityId: string): Promise<{ liked: boolean; like_count: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('activity_interactions')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .eq('interaction_type', 'like')
      .single();

    if (existingLike) {
      // Unlike - remove the like
      const { error } = await supabase
        .from('activity_interactions')
        .delete()
        .eq('id', existingLike.id);

      if (error) throw error;

      // Get updated like count
      const { count } = await supabase
        .from('activity_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activityId)
        .eq('interaction_type', 'like');

      return { liked: false, like_count: count || 0 };
    } else {
      // Like - add the like
      const { error } = await supabase
        .from('activity_interactions')
        .insert([{
          activity_id: activityId,
          user_id: user.id,
          interaction_type: 'like',
        }]);

      if (error) throw error;

      // Get updated like count
      const { count } = await supabase
        .from('activity_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activityId)
        .eq('interaction_type', 'like');

      return { liked: true, like_count: count || 0 };
    }
  }

  /**
   * Add a comment to an activity
   */
  async addComment(activityId: string, content: string): Promise<ActivityInteraction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('activity_interactions')
      .insert([{
        activity_id: activityId,
        user_id: user.id,
        interaction_type: 'comment',
        content,
      }])
      .select(`
        *,
        user:profiles!activity_interactions_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get comments for an activity
   */
  async getActivityComments(activityId: string, limit: number = 20): Promise<ActivityInteraction[]> {
    const { data, error } = await supabase
      .from('activity_interactions')
      .select(`
        *,
        user:profiles!activity_interactions_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('activity_id', activityId)
      .eq('interaction_type', 'comment')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Delete a comment (only by comment author)
   */
  async deleteComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('activity_interactions')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)
      .eq('interaction_type', 'comment');

    if (error) throw error;
  }

  /**
   * Share an activity (reshare)
   */
  async shareActivity(activityId: string, message?: string): Promise<SocialActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the original activity
    const { data: originalActivity } = await supabase
      .from('social_activities')
      .select(`
        *,
        user:profiles!social_activities_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('id', activityId)
      .single();

    if (!originalActivity) throw new Error('Activity not found');

    // Create share activity
    const shareData = {
      activity_type: 'share' as const,
      title: message || `Shared ${originalActivity.user?.full_name}'s ${originalActivity.activity_type}`,
      description: message,
      visibility: 'public' as const,
      metadata: {
        shared_activity_id: activityId,
        original_user: originalActivity.user?.full_name,
        original_title: originalActivity.title,
      },
    };

    return this.createActivity(shareData);
  }

  /**
   * Report an activity
   */
  async reportActivity(activityId: string, reason: string, details?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('activity_reports')
      .insert([{
        activity_id: activityId,
        reported_by: user.id,
        reason,
        details,
      }]);

    if (error) throw error;
  }

  /**
   * Hide an activity from user's feed
   */
  async hideActivity(activityId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('hidden_activities')
      .upsert([{
        activity_id: activityId,
        user_id: user.id,
      }]);

    if (error) throw error;
  }

  /**
   * Get activity statistics for a user
   */
  async getActivityStats(userId?: string): Promise<ActivityStats> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const [activitiesData, interactionsData, followersData] = await Promise.all([
      supabase
        .from('social_activities')
        .select('id, activity_type', { count: 'exact' })
        .eq('user_id', targetUserId),
      
      supabase
        .from('activity_interactions')
        .select('interaction_type')
        .eq('activity_id', 'ANY(SELECT id FROM social_activities WHERE user_id = $1)', targetUserId),
      
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', targetUserId)
    ]);

    const activities = activitiesData.data || [];
    const interactions = interactionsData.data || [];

    return {
      total_activities: activitiesData.count || 0,
      total_likes: interactions.filter(i => i.interaction_type === 'like').length,
      total_comments: interactions.filter(i => i.interaction_type === 'comment').length,
      total_shares: activities.filter(a => a.activity_type === 'share').length,
      followers_count: followersData.count || 0,
      activity_types: activities.reduce((acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get trending activities
   */
  async getTrendingActivities(timeframe: 'day' | 'week' | 'month' = 'day', limit: number = 20): Promise<SocialActivity[]> {
    const timeFilter = new Date();
    switch (timeframe) {
      case 'day':
        timeFilter.setDate(timeFilter.getDate() - 1);
        break;
      case 'week':
        timeFilter.setDate(timeFilter.getDate() - 7);
        break;
      case 'month':
        timeFilter.setDate(timeFilter.getDate() - 30);
        break;
    }

    const { data, error } = await supabase
      .from('social_activities')
      .select(`
        *,
        user:profiles!social_activities_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        ),
        interactions:activity_interactions(
          id,
          interaction_type,
          user_id
        )
      `)
      .eq('visibility', 'public')
      .gte('created_at', timeFilter.toISOString())
      .limit(limit * 3); // Get more to sort by engagement

    if (error) throw error;

    // Calculate engagement score and sort
    const activitiesWithScore = data.map(activity => {
      const likes = activity.interactions?.filter((i: any) => i.interaction_type === 'like').length || 0;
      const comments = activity.interactions?.filter((i: any) => i.interaction_type === 'comment').length || 0;
      const engagementScore = likes + (comments * 2); // Comments weigh more

      return {
        ...activity,
        like_count: likes,
        comment_count: comments,
        engagement_score: engagementScore,
        is_liked: false, // Would need current user context
      };
    });

    // Sort by engagement score and return top results
    return activitiesWithScore
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, limit);
  }

  /**
   * Get activities by hashtag
   */
  async getActivitiesByHashtag(hashtag: string, limit: number = 20): Promise<SocialActivity[]> {
    const { data, error } = await supabase
      .from('social_activities')
      .select(`
        *,
        user:profiles!social_activities_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        ),
        interactions:activity_interactions(
          id,
          interaction_type,
          user_id
        )
      `)
      .eq('visibility', 'public')
      .or(`title.ilike.%#${hashtag}%,description.ilike.%#${hashtag}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(activity => ({
      ...activity,
      like_count: activity.interactions?.filter((i: any) => i.interaction_type === 'like').length || 0,
      comment_count: activity.interactions?.filter((i: any) => i.interaction_type === 'comment').length || 0,
      is_liked: false, // Would need current user context
    }));
  }

  /**
   * Follow/unfollow a user
   */
  async toggleFollow(userId: string): Promise<{ following: boolean; followers_count: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (user.id === userId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    if (existingFollow) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', existingFollow.id);

      if (error) throw error;

      // Get updated followers count
      const { count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      return { following: false, followers_count: count || 0 };
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert([{
          follower_id: user.id,
          following_id: userId,
        }]);

      if (error) throw error;

      // Get updated followers count
      const { count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      return { following: true, followers_count: count || 0 };
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId?: string, limit: number = 50): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        follower:profiles!user_follows_follower_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        ),
        created_at
      `)
      .eq('following_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId?: string, limit: number = 50): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        following:profiles!user_follows_following_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        ),
        created_at
      `)
      .eq('follower_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Create activity automatically from system events
   */
  async createSystemActivity(
    userId: string,
    activityType: string,
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.createActivity({
        activity_type: activityType as any,
        title,
        description,
        visibility: 'public',
        metadata,
      });
    } catch (error) {
      // Log error but don't throw - system activities shouldn't break core functionality
      console.error('Failed to create system activity:', error);
    }
  }
}

export const activityFeedService = new ActivityFeedService();