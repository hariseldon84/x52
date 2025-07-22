import { useEffect, useState } from 'react';
import { StreakService } from './streak.service';
import { useSupabase } from '@/lib/supabase/provider';

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export function useStreak(): StreakData {
  const { session } = useSupabase();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastActivityDate, setLastActivityDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const streakService = new StreakService();

  const fetchStreak = async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await streakService.getCurrentStreak(session.user.id);
      setCurrentStreak(data.currentStreak);
      setLongestStreak(data.longestStreak);
      setLastActivityDate(data.lastActivityDate);
    } catch (err) {
      console.error('Failed to fetch streak:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch streak data'));
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStreak();
  }, [session?.user?.id]);

  // Refresh function to manually update streak data
  const refresh = async () => {
    await fetchStreak();
  };

  return {
    currentStreak,
    longestStreak,
    lastActivityDate,
    isLoading,
    error,
    refresh,
  };
}
