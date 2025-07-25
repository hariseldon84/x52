// Epic 7, Story 7.2: Leaderboards Page

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  TrendingUp,
  RefreshCw,
  Crown
} from 'lucide-react';
import { LeaderboardTabs } from '@/components/leaderboards/LeaderboardTabs';
import { leaderboardService } from '@/lib/services/leaderboardService';
import { useToast } from '@/hooks/use-toast';
import type { LeaderboardEntry } from '@/lib/types/social';

export default function LeaderboardsPage() {
  const [topPerformers, setTopPerformers] = useState<{
    xp: LeaderboardEntry[];
    tasks: LeaderboardEntry[];
    streak: LeaderboardEntry[];
  }>({
    xp: [],
    tasks: [],
    streak: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTopPerformers();
  }, []);

  const loadTopPerformers = async () => {
    try {
      const [xpTop, tasksTop, streakTop] = await Promise.all([
        leaderboardService.getTopPerformers('xp', 3),
        leaderboardService.getTopPerformers('tasks', 3),
        leaderboardService.getTopPerformers('streak', 3),
      ]);

      setTopPerformers({
        xp: xpTop,
        tasks: tasksTop,
        streak: streakTop,
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading top performers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load top performers.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadTopPerformers();
      toast({
        title: 'Refreshed',
        description: 'Leaderboard data has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh leaderboard data.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderTopPerformer = (entry: LeaderboardEntry, rank: number, category: string) => {
    if (!entry) return null;

    const getRankIcon = (rank: number) => {
      switch (rank) {
        case 1:
          return <Crown className="h-4 w-4 text-yellow-500" />;
        case 2:
          return <Medal className="h-4 w-4 text-gray-400" />;
        case 3:
          return <Award className="h-4 w-4 text-amber-600" />;
        default:
          return null;
      }
    };

    const formatScore = (score: number, category: string) => {
      switch (category) {
        case 'xp':
          return `${score.toLocaleString()} XP`;
        case 'tasks':
          return `${score} tasks`;
        case 'streak':
          return `${score} days`;
        default:
          return score.toString();
      }
    };

    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
        {getRankIcon(rank)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {entry.user?.full_name || 'Unknown User'}
          </p>
          <p className="text-xs text-gray-500">
            {formatScore(entry.score, category)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Leaderboards
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            See how you rank among the community
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          className="mt-4 sm:mt-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Top Performers Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Top XP Earners */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top XP Earners
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPerformers.xp.length > 0 ? (
              topPerformers.xp.map((entry, index) => 
                renderTopPerformer(entry, index + 1, 'xp')
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Task Completers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Top Task Completers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPerformers.tasks.length > 0 ? (
              topPerformers.tasks.map((entry, index) => 
                renderTopPerformer(entry, index + 1, 'tasks')
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Streak Holders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Top Streak Holders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPerformers.streak.length > 0 ? (
              topPerformers.streak.map((entry, index) => 
                renderTopPerformer(entry, index + 1, 'streak')
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Leaderboard Tabs */}
      <LeaderboardTabs />

      {/* Motivation Section */}
      <Card className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <CardContent className="p-6 text-center">
          <Trophy className="h-12 w-12 mx-auto text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ready to Climb the Rankings?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete tasks, maintain streaks, and earn XP to improve your leaderboard position!
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Badge variant="outline" className="bg-white dark:bg-gray-800">
              📝 Complete Tasks
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-gray-800">
              🔥 Maintain Streaks
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-gray-800">
              🎯 Earn XP
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-gray-800">
              🏆 Join Challenges
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}