import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

type StreakData = Database['public']['Tables']['user_streaks']['Row'];

export class StreakService {
  private supabase = createClient();

  /**
   * Get or create streak record for the current user
   */
  async getOrCreateStreak(userId: string): Promise<StreakData> {
    const { data: streak, error: fetchError } = await this.supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching streak:', fetchError);
      throw fetchError;
    }

    // If no streak exists, create one
    if (!streak) {
      const { data: newStreak, error: createError } = await this.supabase
        .from('user_streaks')
        .insert([{
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating streak:', createError);
        throw createError;
      }
      return newStreak;
    }

    return streak;
  }

  /**
   * Update streak when a task is completed
   */
  async updateStreakOnTaskCompletion(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewRecord: boolean;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get or create streak record
    const streak = await this.getOrCreateStreak(userId);
    let currentStreak = streak.current_streak;
    let longestStreak = streak.longest_streak;
    let isNewRecord = false;

    // Check if we need to update the streak
    const lastActivityDate = streak.last_activity_date 
      ? new Date(streak.last_activity_date).toISOString().split('T')[0]
      : null;

    if (lastActivityDate === today) {
      // Already updated today, no change needed
      return { currentStreak, longestStreak, isNewRecord };
    }

    if (!lastActivityDate || lastActivityDate === yesterdayStr) {
      // Increment streak (new day or first time)
      currentStreak += 1;
    } else if (lastActivityDate < yesterdayStr) {
      // Reset streak if more than one day has passed
      currentStreak = 1;
    }

    // Update longest streak if needed
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      isNewRecord = true;
    }

    // Update the database
    const { error: updateError } = await this.supabase
      .from('user_streaks')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating streak:', updateError);
      throw updateError;
    }

    return { currentStreak, longestStreak, isNewRecord };
  }

  /**
   * Get current streak information for a user
   */
  async getCurrentStreak(userId: string) {
    const { data, error } = await this.supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting streak:', error);
      throw error;
    }

    return {
      currentStreak: data?.current_streak || 0,
      longestStreak: data?.longest_streak || 0,
      lastActivityDate: data?.last_activity_date || null,
    };
  }
}
