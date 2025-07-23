import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
}

export function useStreak() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState<StreakData>({
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: new Date().toISOString().split('T')[0]
  });

  // Check if a date is yesterday compared to another date
  const isYesterday = (date1: Date, date2: Date): boolean => {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
    return diffDays === 1;
  };

  // Check if two dates are on the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Update the streak in the database
  const updateStreak = async (): Promise<StreakData | null> => {
    if (!user) return null;

    try {
      const today = new Date();
      const lastActivity = new Date(streak.last_activity_date);
      
      let newStreak = { ...streak };
      
      // If we already updated the streak today, return the current streak
      if (isSameDay(today, lastActivity)) {
        return streak;
      }
      
      // Check if the last activity was yesterday (maintain streak)
      if (isYesterday(today, lastActivity)) {
        newStreak.current_streak += 1;
      } else {
        // If not yesterday and not today, reset streak
        newStreak.current_streak = 1;
      }
      
      // Update longest streak if needed
      if (newStreak.current_streak > newStreak.longest_streak) {
        newStreak.longest_streak = newStreak.current_streak;
      }
      
      // Update last activity date to today
      newStreak.last_activity_date = today.toISOString().split('T')[0];
      
      // Update the database
      const { data, error } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: user.id,
          current_streak: newStreak.current_streak,
          longest_streak: newStreak.longest_streak,
          last_activity_date: newStreak.last_activity_date,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      if (data) {
        const updatedStreak = {
          current_streak: data.current_streak,
          longest_streak: data.longest_streak,
          last_activity_date: data.last_activity_date
        };
        
        setStreak(updatedStreak);
        return updatedStreak;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating streak:', error);
      toast({
        title: 'Error',
        description: 'Failed to update streak',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Fetch the current streak from the database
  const fetchStreak = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      if (data) {
        setStreak({
          current_streak: data.current_streak || 0,
          longest_streak: data.longest_streak || 0,
          last_activity_date: data.last_activity_date || new Date().toISOString().split('T')[0]
        });
      } else {
        // Initialize streak for new users
        const today = new Date().toISOString().split('T')[0];
        setStreak({
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: today
        });
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
      toast({
        title: 'Error',
        description: 'Failed to load streak data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize streak data
  useEffect(() => {
    if (user) {
      fetchStreak();
    }
  }, [user]);

  return {
    ...streak,
    isLoading,
    updateStreak,
    refreshStreak: fetchStreak
  };
}
