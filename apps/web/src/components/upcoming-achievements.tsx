'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Target, Star, Zap, ArrowRight, Plus, CheckSquare,
  Users, Calendar, MessageSquare, Flame, Eye, Award,
  TrendingUp, AlertCircle, Lightbulb
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type AchievementProgress = Database['public']['Tables']['achievement_progress']['Row'];

interface UpcomingAchievement extends Achievement {
  progress: AchievementProgress;
  progress_percentage: number;
  suggested_actions: string[];
}

const iconMap = {
  trophy: Trophy,
  award: Award,
  target: Target,
  star: Star,
  flame: Flame,
  zap: Zap,
  checkSquare: CheckSquare,
  users: Users,
  calendar: Calendar,
  messageCircle: MessageSquare,
  eye: Eye,
  trending: TrendingUp,
};

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-200',
  rare: 'bg-blue-100 text-blue-800 border-blue-200',
  epic: 'bg-purple-100 text-purple-800 border-purple-200',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const categoryColors = {
  productivity: 'text-green-600',
  social: 'text-blue-600',
  exploration: 'text-purple-600',
  mastery: 'text-orange-600',
};

// Generate action suggestions based on achievement criteria
const generateActionSuggestions = (achievement: Achievement): string[] => {
  const suggestions: string[] = [];
  
  // Extract criteria from achievement title and category for suggestions
  const title = achievement.title.toLowerCase();
  const category = achievement.category;
  
  if (title.includes('task') || title.includes('complete')) {
    suggestions.push('Complete more tasks to increase progress');
    if (title.includes('streak') || title.includes('consecutive')) {
      suggestions.push('Complete tasks daily to build your streak');
    }
  }
  
  if (title.includes('goal') || category === 'productivity') {
    suggestions.push('Create or update your goals');
    suggestions.push('Break down large goals into smaller tasks');
  }
  
  if (title.includes('contact') || title.includes('social') || category === 'social') {
    suggestions.push('Add new contacts to your CRM');
    suggestions.push('Log interactions with your contacts');
    suggestions.push('Set up follow-up reminders');
  }
  
  if (title.includes('xp') || title.includes('point')) {
    suggestions.push('Complete high-value tasks for more XP');
    suggestions.push('Maintain daily streaks for bonus XP');
  }
  
  if (title.includes('category') || title.includes('diverse')) {
    suggestions.push('Create tasks in different categories');
    suggestions.push('Explore all features of TaskQuest');
  }
  
  if (title.includes('day') || title.includes('week') || title.includes('month')) {
    suggestions.push('Stay consistent with daily activities');
    suggestions.push('Set up recurring tasks and reminders');
  }
  
  // Default suggestions if none match
  if (suggestions.length === 0) {
    switch (category) {
      case 'productivity':
        suggestions.push('Complete more tasks and goals');
        suggestions.push('Maintain consistent productivity habits');
        break;
      case 'social':
        suggestions.push('Use CRM features to manage contacts');
        suggestions.push('Log interactions and set follow-ups');
        break;
      case 'exploration':
        suggestions.push('Explore different features of TaskQuest');
        suggestions.push('Try new productivity workflows');
        break;
      case 'mastery':
        suggestions.push('Focus on consistent, long-term habits');
        suggestions.push('Master advanced features and workflows');
        break;
    }
  }
  
  return suggestions.slice(0, 2); // Limit to 2 suggestions
};

interface UpcomingAchievementsProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function UpcomingAchievements({ 
  limit = 4, 
  showHeader = true, 
  className = '' 
}: UpcomingAchievementsProps) {
  const [upcomingAchievements, setUpcomingAchievements] = useState<UpcomingAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadUpcomingAchievements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First, get progress records for the user with progress > 0
      const { data: progressData, error: progressError } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', user.id)
        .gt('progress_percentage', 0)
        .order('progress_percentage', { ascending: false })
        .limit(limit * 2); // Get more to account for filtering

      if (progressError) {
        console.error('Progress query error:', progressError);
        throw new Error(`Failed to load progress data: ${progressError.message || 'Unknown database error'}`);
      }

      // Handle null/empty progress data
      if (!progressData || progressData.length === 0) {
        setUpcomingAchievements([]);
        return;
      }

      // Get achievement IDs from progress data
      const achievementIds = progressData.map(p => p.achievement_id);

      // Get the achievement details
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .in('id', achievementIds)
        .eq('is_active', true);

      if (achievementsError) {
        console.error('Achievements query error:', achievementsError);
        throw new Error(`Failed to load achievements: ${achievementsError.message || 'Unknown database error'}`);
      }

      // Handle null/empty achievements data
      if (!achievementsData || achievementsData.length === 0) {
        setUpcomingAchievements([]);
        return;
      }

      // Check which achievements are not already unlocked
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userAchievementsError) {
        console.error('User achievements query error:', userAchievementsError);
        throw new Error(`Failed to load user achievements: ${userAchievementsError.message || 'Unknown database error'}`);
      }

      // Handle null userAchievements data
      const unlockedIds = new Set((userAchievements || []).map(ua => ua.achievement_id));

      // Create a map of achievements for quick lookup
      const achievementMap = new Map(achievementsData.map(achievement => [achievement.id, achievement]));

      // Combine progress and achievement data
      const upcoming: UpcomingAchievement[] = progressData
        .filter(progress => {
          // Only include if achievement exists and is not unlocked
          const achievement = achievementMap.get(progress.achievement_id);
          return achievement && !unlockedIds.has(progress.achievement_id);
        })
        .map(progress => {
          const achievement = achievementMap.get(progress.achievement_id);

          // Validate achievement data
          if (!achievement) {
            throw new Error('Achievement data is missing');
          }

          return {
            ...achievement,
            progress,
            progress_percentage: progress.progress_percentage,
            suggested_actions: generateActionSuggestions(achievement),
          };
        })
        .slice(0, limit);

      setUpcomingAchievements(upcoming);

    } catch (err: unknown) {
      console.error('Error loading upcoming achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load upcoming achievements');
    } finally {
      setIsLoading(false);
    }
  }, [limit, supabase]);

  useEffect(() => {
    loadUpcomingAchievements();
  }, [limit, loadUpcomingAchievements]);

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>Upcoming Achievements</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Target className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-600 text-sm">Loading progress...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>Upcoming Achievements</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <Button onClick={loadUpcomingAchievements} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingAchievements.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>Upcoming Achievements</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Great job!</h3>
            <p className="text-gray-600 text-sm mb-4">
              You don&apos;t have any achievements in progress right now.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/achievements">
                <Eye className="h-4 w-4 mr-2" />
                Explore Achievements
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>Upcoming Achievements</span>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/achievements">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            You&apos;re close to unlocking these achievements
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {upcomingAchievements.map((achievement) => {
          const IconComponent = achievement.icon_name 
            ? iconMap[achievement.icon_name as keyof typeof iconMap] 
            : Trophy;

          return (
            <div
              key={achievement.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <IconComponent className={`h-5 w-5 ${categoryColors[achievement.category]}`} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {achievement.title}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${rarityColors[achievement.rarity]}`}
                      >
                        {achievement.rarity}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs font-medium">
                        +{Math.round(achievement.xp_reward * (achievement.bonus_multiplier || 1))} XP
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {achievement.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-blue-600">
                        {Math.round(achievement.progress_percentage)}%
                      </span>
                    </div>
                    <Progress 
                      value={achievement.progress_percentage} 
                      className="h-2"
                    />
                  </div>
                  
                  {/* Action Suggestions */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 mb-1">
                      <Lightbulb className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-medium text-gray-700">Suggested actions:</span>
                    </div>
                    <div className="space-y-1">
                      {achievement.suggested_actions.map((action, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                          <span className="text-xs text-gray-600">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Quick Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tasks/new">
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/goals/new">
                <Target className="h-3 w-3 mr-1" />
                New Goal
              </Link>
            </Button>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/achievements" className="text-blue-600 hover:text-blue-700">
              <Trophy className="h-3 w-3 mr-1" />
              View All
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}