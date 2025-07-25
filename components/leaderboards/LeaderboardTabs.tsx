// Epic 7, Story 7.2: Leaderboard Tabs Component

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Star, 
  Target, 
  Zap, 
  TrendingUp, 
  Sparkles,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { LeaderboardCard } from './LeaderboardCard';
import { leaderboardService } from '@/lib/services/leaderboardService';
import { useToast } from '@/hooks/use-toast';
import type { LeaderboardEntry } from '@/lib/types/social';

interface LeaderboardTabsProps {
  className?: string;
}

const categories = [
  {
    id: 'xp',
    label: 'Experience Points',
    icon: Star,
    description: 'Total XP earned',
  },
  {
    id: 'tasks',
    label: 'Tasks Completed',
    icon: Target,
    description: 'Number of tasks completed',
  },
  {
    id: 'streak',
    label: 'Daily Streak',
    icon: Zap,
    description: 'Longest daily streak',
  },
  {
    id: 'level',
    label: 'User Level',
    icon: TrendingUp,
    description: 'Current user level',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Sparkles,
    description: 'Achievements unlocked',
  },
];

const periods = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'all_time', label: 'All Time' },
] as const;

export function LeaderboardTabs({ className = '' }: LeaderboardTabsProps) {
  const [activeCategory, setActiveCategory] = useState('xp');
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [leaderboardData, setLeaderboardData] = useState<Record<string, LeaderboardEntry[]>>({});
  const [userRankings, setUserRankings] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboards();
    loadUserRankings();
    loadParticipationStatus();
  }, [activePeriod]);

  const loadLeaderboards = async () => {
    try {
      setIsLoading(true);
      const data: Record<string, LeaderboardEntry[]> = {};
      
      for (const category of categories) {
        const entries = await leaderboardService.getLeaderboards({
          category: category.id,
          period_type: activePeriod,
          limit: 50,
        });
        data[category.id] = entries;
      }
      
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leaderboards. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserRankings = async () => {
    try {
      const rankings = await leaderboardService.getUserRankings();
      setUserRankings(rankings);
    } catch (error) {
      console.error('Error loading user rankings:', error);
    }
  };

  const loadParticipationStatus = async () => {
    try {
      const status = await leaderboardService.getParticipationStatus();
      setIsParticipating(status);
    } catch (error) {
      console.error('Error loading participation status:', error);
    }
  };

  const handleParticipationToggle = async (participate: boolean) => {
    try {
      await leaderboardService.toggleLeaderboardParticipation(participate);
      setIsParticipating(participate);
      
      toast({
        title: participate ? 'Joined Leaderboards' : 'Left Leaderboards',
        description: participate 
          ? 'You will now appear in public leaderboards.'
          : 'You have been removed from public leaderboards.',
      });

      // Reload data to reflect changes
      if (participate) {
        await loadLeaderboards();
        await loadUserRankings();
      }
    } catch (error) {
      console.error('Error toggling participation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update participation status.',
        variant: 'destructive',
      });
    }
  };

  const getCurrentUserEntry = (entries: LeaderboardEntry[]) => {
    // This would need to be implemented based on your auth system
    // For now, returning null
    return null;
  };

  const getMaxScore = (entries: LeaderboardEntry[]) => {
    return entries.length > 0 ? Math.max(...entries.map(e => e.score)) : 0;
  };

  const renderLeaderboard = (category: string) => {
    const entries = leaderboardData[category] || [];
    const maxScore = getMaxScore(entries);
    const currentUserEntry = getCurrentUserEntry(entries);

    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!isParticipating) {
      return (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <EyeOff className="h-16 w-16 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Join the Leaderboards</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enable leaderboard participation to see your ranking and compete with others.
              </p>
              <Button onClick={() => handleParticipationToggle(true)}>
                Join Leaderboards
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    if (entries.length === 0) {
      return (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Target className="h-16 w-16 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No leaderboard data for this category and time period yet.
              </p>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {entries.map((entry) => (
          <LeaderboardCard
            key={entry.id}
            entry={entry}
            maxScore={maxScore}
            category={category}
            isCurrentUser={currentUserEntry?.id === entry.id}
          />
        ))}
      </div>
    );
  };

  const userRank = userRankings[`${activeCategory}_rank`];

  return (
    <div className={className}>
      {/* Header with Settings */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Leaderboards</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Compete with others and track your progress
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Leaderboard Participation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Show your progress in public leaderboards
              </p>
            </div>
            <Switch
              checked={isParticipating}
              onCheckedChange={handleParticipationToggle}
            />
          </div>
        </Card>
      )}

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {periods.map((period) => (
          <Button
            key={period.id}
            variant={activePeriod === period.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePeriod(period.id)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* User's Current Rank Summary */}
      {isParticipating && userRank && (
        <Card className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-semibold">Your Current Rank</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                #{userRank} in {categories.find(c => c.id === activeCategory)?.label}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.label} - {periods.find(p => p.id === activePeriod)?.label}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              </CardHeader>
              <CardContent>
                {renderLeaderboard(category.id)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}