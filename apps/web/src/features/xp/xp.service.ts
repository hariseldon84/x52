import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

type XPEvent = Database['public']['Tables']['xp_events']['Insert'];

// Define milestone levels and their XP rewards
export const STREAK_MILESTONES = [
  { streak: 3, xp: 10, message: '3-day streak! Keep it going! 🚀' },
  { streak: 7, xp: 25, message: '1-week streak! Amazing! 🌟' },
  { streak: 14, xp: 50, message: '2-week streak! You\'re on fire! 🔥' },
  { streak: 30, xp: 100, message: '1-month streak! Unstoppable! 🏆' },
  { streak: 60, xp: 250, message: '2-month streak! Legendary! 🏅' },
  { streak: 90, xp: 500, message: '3-month streak! Master of consistency! 🎖️' },
  { streak: 180, xp: 1000, message: '6-month streak! Absolute champion! 🏆' },
  { streak: 365, xp: 2500, message: '1-year streak! A true TaskQuest legend! 🌈' },
];

export class XPService {
  private supabase = createClient();

  /**
   * Award XP to a user
   */
  async awardXP(userId: string, xp: number, eventType: string, description: string): Promise<void> {
    const { error } = await this.supabase
      .from('xp_events')
      .insert([{
        user_id: userId,
        xp_amount: xp,
        event_type: eventType,
        description,
      }]);

    if (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  /**
   * Get total XP for a user
   */
  async getTotalXP(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_user_total_xp', { user_id: userId });

    if (error) {
      console.error('Error getting total XP:', error);
      throw error;
    }

    return data || 0;
  }

  /**
   * Check for and award milestone XP for streaks
   */
  async checkAndAwardStreakMilestone(userId: string, currentStreak: number): Promise<{ xpAwarded: number; message: string | null }> {
    const milestone = STREAK_MILESTONES.find(m => m.streak === currentStreak);
    
    if (!milestone) {
      return { xpAwarded: 0, message: null };
    }

    try {
      // Check if user already received this milestone
      const { data: existingAward } = await this.supabase
        .from('xp_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'streak_milestone')
        .eq('description', `${milestone.streak}-day streak`)
        .single();

      if (existingAward) {
        return { xpAwarded: 0, message: null }; // Already awarded
      }

      // Award XP for the milestone
      await this.awardXP(
        userId,
        milestone.xp,
        'streak_milestone',
        `${milestone.streak}-day streak`
      );

      return { 
        xpAwarded: milestone.xp, 
        message: `+${milestone.xp} XP! ${milestone.message}` 
      };
    } catch (error) {
      console.error('Error awarding streak milestone XP:', error);
      return { xpAwarded: 0, message: null };
    }
  }

  /**
   * Get user's current level based on total XP
   * Using a simple formula where each level requires (level * 100) XP
   */
  async getUserLevel(userId: string): Promise<{ level: number; currentXP: number; xpToNextLevel: number; progress: number }> {
    const totalXP = await this.getTotalXP(userId);
    
    // Simple leveling formula: each level requires (level * 100) XP
    let level = 0;
    let xpForNextLevel = 100;
    let xpForCurrentLevel = 0;
    let xp = totalXP;
    
    while (xp >= xpForNextLevel) {
      xp -= xpForNextLevel;
      level++;
      xpForCurrentLevel = xpForNextLevel;
      xpForNextLevel = (level + 1) * 100;
    }
    
    return {
      level,
      currentXP: xp,
      xpToNextLevel: xpForNextLevel,
      progress: (xp / xpForNextLevel) * 100,
    };
  }
}
