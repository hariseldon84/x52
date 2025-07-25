// Epic 7, Story 7.2: Productivity Leaderboards Service

import { supabase } from '@/lib/supabase';
import type { 
  Leaderboard, 
  LeaderboardEntry
} from '@/lib/types/social';

interface LeaderboardStats {
  xp_earned: number;
  tasks_completed: number;
  current_streak: number;
  goals_completed: number;
  level: number;
  achievements_unlocked: number;
}

export class LeaderboardService {
  /**
   * Get global leaderboards with different categories
   */
  async getLeaderboards(options: {
    category?: string;
    period_type?: 'daily' | 'weekly' | 'monthly' | 'all_time';
    limit?: number;
  } = {}): Promise<LeaderboardEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('leaderboard_entries')
      .select(`
        *,
        user:profiles!leaderboard_entries_user_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        leaderboard:leaderboards!leaderboard_entries_leaderboard_id_fkey(
          id,
          name,
          category,
          period_type
        )
      `);

    if (options.category) {
      query = query.eq('leaderboard.category', options.category);
    }

    if (options.period_type) {
      query = query.eq('leaderboard.period_type', options.period_type);
    }

    query = query
      .eq('leaderboard.is_active', true)
      .order('rank', { ascending: true })
      .limit(options.limit || 50);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get user's position in leaderboards
   */
  async getUserRankings(userId?: string): Promise<{
    xp_rank: number | null;
    tasks_rank: number | null;
    streak_rank: number | null;
    level_rank: number | null;
    achievements_rank: number | null;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select(`
        rank,
        leaderboard:leaderboards!leaderboard_entries_leaderboard_id_fkey(
          category
        )
      `)
      .eq('user_id', targetUserId)
      .eq('leaderboard.is_active', true)
      .eq('leaderboard.period_type', 'all_time');

    if (error) throw error;

    const rankings = {
      xp_rank: null as number | null,
      tasks_rank: null as number | null,
      streak_rank: null as number | null,
      level_rank: null as number | null,
      achievements_rank: null as number | null,
    };

    data?.forEach(entry => {
      const category = entry.leaderboard?.category;
      switch (category) {
        case 'xp':
          rankings.xp_rank = entry.rank;
          break;
        case 'tasks':
          rankings.tasks_rank = entry.rank;
          break;
        case 'streak':
          rankings.streak_rank = entry.rank;
          break;
        case 'level':
          rankings.level_rank = entry.rank;
          break;
        case 'achievements':
          rankings.achievements_rank = entry.rank;
          break;
      }
    });

    return rankings;
  }

  /**
   * Update all leaderboards (called by cron job)
   */
  async updateAllLeaderboards(): Promise<void> {
    const periods = ['daily', 'weekly', 'monthly', 'all_time'] as const;
    const categories = ['xp', 'tasks', 'streak', 'level', 'achievements'];

    for (const period of periods) {
      for (const category of categories) {
        await this.updateLeaderboard(category, period);
      }
    }
  }

  /**
   * Update specific leaderboard
   */
  private async updateLeaderboard(
    category: string, 
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<void> {
    // Get or create leaderboard
    let leaderboard = await this.getOrCreateLeaderboard(category, period);
    
    // Calculate user stats for the period
    const userStats = await this.calculateUserStats(period);
    
    // Sort users by category
    const sortedUsers = this.sortUsersByCategory(userStats, category);
    
    // Update leaderboard entries
    await this.updateLeaderboardEntries(leaderboard.id, sortedUsers, category);
  }

  /**
   * Get or create leaderboard for category and period
   */
  private async getOrCreateLeaderboard(
    category: string, 
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<Leaderboard> {
    const { start_date, end_date } = this.getPeriodDates(period);
    
    // Try to find existing leaderboard
    const { data: existing } = await supabase
      .from('leaderboards')
      .select('*')
      .eq('category', category)
      .eq('period_type', period)
      .eq('is_active', true)
      .gte('start_date', start_date)
      .single();

    if (existing) {
      return existing;
    }

    // Create new leaderboard
    const { data: newLeaderboard, error } = await supabase
      .from('leaderboards')
      .insert([{
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} - ${period.replace('_', ' ')}`,
        category,
        period_type: period,
        start_date,
        end_date: period !== 'all_time' ? end_date : null,
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;
    return newLeaderboard;
  }

  /**
   * Calculate user stats for period
   */
  private async calculateUserStats(
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<Map<string, LeaderboardStats & { user_id: string }>> {
    const { start_date } = this.getPeriodDates(period);
    const userStats = new Map<string, LeaderboardStats & { user_id: string }>();

    // Get all users who opted into leaderboards
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('show_in_leaderboards', true);

    if (!users) return userStats;

    for (const user of users) {
      const stats = await this.getUserStatsForPeriod(user.id, start_date, period);
      userStats.set(user.id, { ...stats, user_id: user.id });
    }

    return userStats;
  }

  /**
   * Get user stats for specific period
   */
  private async getUserStatsForPeriod(
    userId: string, 
    startDate: string, 
    period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<LeaderboardStats> {
    const dateFilter = period !== 'all_time' ? `AND created_at >= '${startDate}'` : '';

    // Get tasks completed
    const { data: tasks } = await supabase
      .from('tasks')
      .select('xp_earned')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', period !== 'all_time' ? startDate : '1970-01-01');

    // Get goals completed
    const { data: goals } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', period !== 'all_time' ? startDate : '1970-01-01');

    // Get user level and current streak
    const { data: profile } = await supabase
      .from('profiles')
      .select('level, total_xp')
      .eq('id', userId)
      .single();

    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    // Get achievements unlocked
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .gte('unlocked_at', period !== 'all_time' ? startDate : '1970-01-01');

    return {
      xp_earned: tasks?.reduce((sum, task) => sum + (task.xp_earned || 0), 0) || 0,
      tasks_completed: tasks?.length || 0,
      current_streak: streak?.current_streak || 0,
      goals_completed: goals?.length || 0,
      level: profile?.level || 1,
      achievements_unlocked: achievements?.length || 0,
    };
  }

  /**
   * Sort users by category
   */
  private sortUsersByCategory(
    userStats: Map<string, LeaderboardStats & { user_id: string }>, 
    category: string
  ): Array<{ user_id: string; score: number }> {
    const users = Array.from(userStats.values());
    
    let sortedUsers: Array<{ user_id: string; score: number }>;

    switch (category) {
      case 'xp':
        sortedUsers = users.map(user => ({
          user_id: user.user_id,
          score: user.xp_earned,
        }));
        break;
      case 'tasks':
        sortedUsers = users.map(user => ({
          user_id: user.user_id,
          score: user.tasks_completed,
        }));
        break;
      case 'streak':
        sortedUsers = users.map(user => ({
          user_id: user.user_id,
          score: user.current_streak,
        }));
        break;
      case 'level':
        sortedUsers = users.map(user => ({
          user_id: user.user_id,
          score: user.level,
        }));
        break;
      case 'achievements':
        sortedUsers = users.map(user => ({
          user_id: user.user_id,
          score: user.achievements_unlocked,
        }));
        break;
      default:
        sortedUsers = users.map(user => ({
          user_id: user.user_id,
          score: user.xp_earned,
        }));
    }

    return sortedUsers
      .sort((a, b) => b.score - a.score)
      .slice(0, 100); // Top 100 users
  }

  /**
   * Update leaderboard entries
   */
  private async updateLeaderboardEntries(
    leaderboardId: string, 
    sortedUsers: Array<{ user_id: string; score: number }>,
    category: string
  ): Promise<void> {
    // Delete existing entries
    await supabase
      .from('leaderboard_entries')
      .delete()
      .eq('leaderboard_id', leaderboardId);

    // Insert new entries
    const entries = sortedUsers.map((user, index) => ({
      leaderboard_id: leaderboardId,
      user_id: user.user_id,
      rank: index + 1,
      score: user.score,
    }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('leaderboard_entries')
        .insert(entries);

      if (error) throw error;
    }
  }

  /**
   * Get period date ranges
   */
  private getPeriodDates(period: 'daily' | 'weekly' | 'monthly' | 'all_time'): {
    start_date: string;
    end_date: string;
  } {
    const now = new Date();
    let start_date: Date;
    let end_date: Date;

    switch (period) {
      case 'daily':
        start_date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + 1);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        start_date = new Date(now);
        start_date.setDate(now.getDate() - dayOfWeek);
        start_date.setHours(0, 0, 0, 0);
        end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + 7);
        break;
      case 'monthly':
        start_date = new Date(now.getFullYear(), now.getMonth(), 1);
        end_date = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'all_time':
      default:
        start_date = new Date('1970-01-01');
        end_date = new Date('2099-12-31');
        break;
    }

    return {
      start_date: start_date.toISOString(),
      end_date: end_date.toISOString(),
    };
  }

  /**
   * Toggle user leaderboard participation
   */
  async toggleLeaderboardParticipation(participate: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ show_in_leaderboards: participate })
      .eq('id', user.id);

    if (error) throw error;
  }

  /**
   * Get leaderboard participation status
   */
  async getParticipationStatus(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('show_in_leaderboards')
      .eq('id', user.id)
      .single();

    if (error) return false;
    return data?.show_in_leaderboards ?? false;
  }

  /**
   * Get top performers for different categories
   */
  async getTopPerformers(category: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select(`
        *,
        user:profiles!leaderboard_entries_user_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        leaderboard:leaderboards!leaderboard_entries_leaderboard_id_fkey(
          category,
          period_type
        )
      `)
      .eq('leaderboard.category', category)
      .eq('leaderboard.period_type', 'all_time')
      .eq('leaderboard.is_active', true)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

export const leaderboardService = new LeaderboardService();