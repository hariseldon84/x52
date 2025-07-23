import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { xpService, XPTransaction } from '@/services/taskService';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '@/lib/supabase';

interface XPContextType {
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  xpInCurrentLevel: number;
  levelProgress: number;
  addXP: (amount: number, source: string) => Promise<void>;
  isLoading: boolean;
  recentTransactions: XPTransaction[];
  currentStreak: number;
  longestStreak: number;
  refreshXP: () => Promise<void>;
}

const XPContext = createContext<XPContextType | undefined>(undefined);

export function XPProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = useSupabase();
  
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [xpInCurrentLevel, setXpInCurrentLevel] = useState(0);
  const [levelProgress, setLevelProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<XPTransaction[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // Calculate level and XP requirements
  const calculateLevelInfo = (xp: number) => {
    const newLevel = Math.max(1, Math.floor(Math.sqrt(xp / 100)));
    const xpForCurrentLevel = Math.pow(newLevel, 2) * 100;
    const xpForNextLevel = Math.pow(newLevel + 1, 2) * 100;
    const newXpInCurrentLevel = xp - xpForCurrentLevel;
    const newXpToNextLevel = xpForNextLevel - xp;
    const newLevelProgress = (newXpInCurrentLevel / (xpForNextLevel - xpForCurrentLevel)) * 100;

    return {
      level: newLevel,
      xpInCurrentLevel: newXpInCurrentLevel,
      xpToNextLevel: newXpToNextLevel,
      levelProgress: Math.min(100, Math.max(0, newLevelProgress))
    };
  };

  // Fetch XP data
  const fetchXPData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get XP transactions
      const { data: transactions, error: txError } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (txError) throw txError;
      
      // Calculate total XP
      const xp = transactions?.reduce((sum: number, t: XPTransaction) => sum + t.amount, 0) || 0;
      
      // Calculate level info
      const levelInfo = calculateLevelInfo(xp);
      
      // Update state
      setTotalXP(xp);
      setLevel(levelInfo.level);
      setXpInCurrentLevel(levelInfo.xpInCurrentLevel);
      setXpToNextLevel(levelInfo.xpToNextLevel);
      setLevelProgress(levelInfo.levelProgress);
      setRecentTransactions(transactions || []);
      
      // Fetch streak data
      const { data: streakData, error: streakError } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id)
        .single();
      
      if (!streakError && streakData) {
        setCurrentStreak(streakData.current_streak || 0);
        setLongestStreak(streakData.longest_streak || 0);
      }
      
    } catch (error) {
      console.error('Error fetching XP data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load XP data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add XP and show level up notification if applicable
  const addXP = async (amount: number, source: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Record the transaction
      const { data: transaction, error } = await xpService.recordTransaction({
        amount,
        source_type: source as any,
        metadata: { source }
      });
      
      if (error) throw error;
      
      // Update local state
      const newTotalXP = totalXP + amount;
      const oldLevel = level;
      
      const levelInfo = calculateLevelInfo(newTotalXP);
      const newLevel = levelInfo.level;
      
      setTotalXP(newTotalXP);
      setLevel(newLevel);
      setXpInCurrentLevel(levelInfo.xpInCurrentLevel);
      setXpToNextLevel(levelInfo.xpToNextLevel);
      setLevelProgress(levelInfo.levelProgress);
      
      // Update recent transactions
      if (transaction) {
        setRecentTransactions(prev => [transaction, ...prev].slice(0, 10));
      }
      
      // Show level up notification if level increased
      if (newLevel > oldLevel) {
        toast({
          title: '🎉 Level Up!',
          description: `You've reached level ${newLevel}!`,
          duration: 5000,
        });
      }
      
      // Show XP gained notification
      toast({
        title: `+${amount} XP`,
        description: `Earned for ${source}`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error adding XP:', error);
      toast({
        title: 'Error',
        description: 'Failed to record XP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription for XP updates
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch
    fetchXPData();
    
    // Subscribe to XP transactions
    const subscription = supabase
      .channel('xp_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'xp_transactions',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          const newTransaction = payload.new as XPTransaction;
          setRecentTransactions(prev => [newTransaction, ...prev].slice(0, 10));
          
          // Update total XP and level info
          const newTotal = totalXP + newTransaction.amount;
          const levelInfo = calculateLevelInfo(newTotal);
          
          setTotalXP(newTotal);
          setLevel(levelInfo.level);
          setXpInCurrentLevel(levelInfo.xpInCurrentLevel);
          setXpToNextLevel(levelInfo.xpToNextLevel);
          setLevelProgress(levelInfo.levelProgress);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <XPContext.Provider 
      value={{
        totalXP,
        level,
        xpToNextLevel,
        xpInCurrentLevel,
        levelProgress,
        addXP,
        isLoading,
        recentTransactions,
        currentStreak,
        longestStreak,
        refreshXP: fetchXPData,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  const context = useContext(XPContext);
  if (context === undefined) {
    throw new Error('useXP must be used within an XPProvider');
  }
  return context;
}
