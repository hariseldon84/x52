'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, ArrowRight, Plus, Target, CheckSquare, Users, 
  Calendar, Star, TrendingUp, Award, Zap, Clock, Eye
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type AchievementProgress = Database['public']['Tables']['achievement_progress']['Row'];

interface ProgressSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
  icon: React.ComponentType<any>;
  category: 'productivity' | 'social' | 'exploration' | 'mastery';
  priority: 'high' | 'medium' | 'low';
  achievement?: Achievement;
  progressData?: AchievementProgress;
}

interface ProgressSuggestionsProps {
  limit?: number;
  showHeader?: boolean;
  category?: string;
  className?: string;
}

const iconMap = {
  plus: Plus,
  target: Target,
  checkSquare: CheckSquare,
  users: Users,
  calendar: Calendar,
  star: Star,
  trendingUp: TrendingUp,
  award: Award,
  zap: Zap,
  clock: Clock,
  eye: Eye,
};

const categoryColors = {
  productivity: 'text-green-600 bg-green-50 border-green-200',
  social: 'text-blue-600 bg-blue-50 border-blue-200',
  exploration: 'text-purple-600 bg-purple-50 border-purple-200',
  mastery: 'text-orange-600 bg-orange-50 border-orange-200',
};

const priorityColors = {
  high: 'border-l-red-400 bg-red-50',
  medium: 'border-l-yellow-400 bg-yellow-50',
  low: 'border-l-gray-400 bg-gray-50',
};

// Generate intelligent suggestions based on user's current progress and patterns
const generateSuggestions = async (supabase: any, userId: string): Promise<ProgressSuggestion[]> => {
  const suggestions: ProgressSuggestion[] = [];

  try {
    // Get user's current progress and activity patterns
    const { data: progressData } = await supabase
      .from('achievement_progress')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .gt('progress_percentage', 0)
      .is('completed_at', null)
      .order('progress_percentage', { ascending: false })
      .limit(10);

    // Get user's recent activity to understand patterns
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('created_at', { ascending: false });

    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Analyze patterns and generate suggestions
    const taskCount = recentTasks?.length || 0;
    const goalCount = goals?.length || 0;
    const contactCount = contacts?.length || 0;

    // Task-related suggestions
    if (taskCount < 3) {
      suggestions.push({
        id: 'create-tasks',
        title: 'Create More Tasks',
        description: 'You have fewer tasks this week. Creating more tasks will help you build momentum and unlock productivity achievements.',
        action: 'Add Task',
        actionUrl: '/dashboard/tasks/new',
        icon: Plus,
        category: 'productivity',
        priority: 'high',
      });
    }

    // Goal-related suggestions
    if (goalCount === 0) {
      suggestions.push({
        id: 'create-goal',
        title: 'Set Your First Goal',
        description: 'Setting goals helps you stay focused and unlocks achievement progress. Start with a simple, achievable goal.',
        action: 'Create Goal',
        actionUrl: '/dashboard/goals/new',
        icon: Target,
        category: 'productivity',
        priority: 'high',
      });
    }

    // Social/CRM suggestions
    if (contactCount < 5) {
      suggestions.push({
        id: 'add-contacts',
        title: 'Build Your Network',
        description: 'Adding contacts to your CRM helps you stay organized and unlocks social achievements.',
        action: 'Add Contact',
        actionUrl: '/dashboard/contacts/new',
        icon: Users,
        category: 'social',
        priority: 'medium',
      });
    }

    // Progress-based suggestions from achievements
    if (progressData?.length) {
      progressData.slice(0, 3).forEach((progress, index) => {
        const achievement = progress.achievement;
        if (!achievement) return;

        let suggestion: Partial<ProgressSuggestion> = {
          id: `achievement-${achievement.id}`,
          achievement,
          progressData: progress,
          category: achievement.category as any,
          priority: progress.progress_percentage > 75 ? 'high' : 'medium',
        };

        const title = achievement.title.toLowerCase();
        
        if (title.includes('task') && title.includes('complete')) {
          suggestion = {
            ...suggestion,
            title: `Complete More Tasks (${Math.round(progress.progress_percentage)}%)`,
            description: `You're ${Math.round(progress.progress_percentage)}% towards "${achievement.title}". Keep completing tasks to unlock this achievement!`,
            action: 'Complete Tasks',
            actionUrl: '/dashboard/tasks',
            icon: CheckSquare,
          };
        } else if (title.includes('goal')) {
          suggestion = {
            ...suggestion,
            title: `Work on Goals (${Math.round(progress.progress_percentage)}%)`,
            description: `You're making progress on "${achievement.title}". Update your goals to get closer to unlocking it.`,
            action: 'View Goals',
            actionUrl: '/dashboard/goals',
            icon: Target,
          };
        } else if (title.includes('contact') || title.includes('social')) {
          suggestion = {
            ...suggestion,
            title: `Expand Your Network (${Math.round(progress.progress_percentage)}%)`,
            description: `You're ${Math.round(progress.progress_percentage)}% towards "${achievement.title}". Add more contacts or log interactions.`,
            action: 'Manage Contacts',
            actionUrl: '/dashboard/contacts',
            icon: Users,
          };
        } else if (title.includes('streak') || title.includes('consecutive')) {
          suggestion = {
            ...suggestion,
            title: `Maintain Your Streak (${Math.round(progress.progress_percentage)}%)`,
            description: `Keep your momentum going for "${achievement.title}". Complete tasks daily to build your streak.`,
            action: 'Complete Task',
            actionUrl: '/dashboard/tasks/new',
            icon: TrendingUp,
          };
        } else {
          suggestion = {
            ...suggestion,
            title: `Progress on "${achievement.title}" (${Math.round(progress.progress_percentage)}%)`,
            description: `You're making good progress! Continue using TaskQuest features to unlock this achievement.`,
            action: 'View Achievement',
            actionUrl: '/dashboard/achievements',
            icon: Award,
          };
        }

        suggestions.push(suggestion as ProgressSuggestion);
      });
    }

    // Feature exploration suggestions
    suggestions.push({
      id: 'explore-achievements',
      title: 'Explore All Achievements',
      description: 'Discover all available achievements and see what you can work towards.',
      action: 'View Achievements',
      actionUrl: '/dashboard/achievements',
      icon: Eye,
      category: 'exploration',
      priority: 'low',
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
  }

  return suggestions;
};

export function ProgressSuggestions({ 
  limit = 5, 
  showHeader = true, 
  category,
  className = '' 
}: ProgressSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProgressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const allSuggestions = await generateSuggestions(supabase, user.id);
      
      // Filter by category if specified
      let filteredSuggestions = category 
        ? allSuggestions.filter(s => s.category === category)
        : allSuggestions;

      // Sort by priority and limit
      filteredSuggestions = filteredSuggestions
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, limit);

      setSuggestions(filteredSuggestions);

    } catch (err: any) {
      console.error('Error loading suggestions:', err);
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [limit, category]);

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span>Suggested Actions</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-600 text-sm">Loading suggestions...</p>
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
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span>Suggested Actions</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <Button onClick={loadSuggestions} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span>Suggested Actions</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">
              You're doing great! Keep using TaskQuest to unlock more suggestions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>Suggested Actions</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Smart recommendations to help you unlock achievements
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const IconComponent = suggestion.icon;

          return (
            <div
              key={suggestion.id}
              className={`
                border-l-4 rounded-lg p-4 transition-colors hover:shadow-sm
                ${priorityColors[suggestion.priority]}
                ${categoryColors[suggestion.category]}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-white bg-opacity-50 rounded-full">
                      <IconComponent className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {suggestion.title}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {suggestion.description}
                    </p>
                    {suggestion.achievement && (
                      <div className="flex items-center space-x-1 text-yellow-600 mb-2">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-xs">
                          +{suggestion.achievement.xp_reward} XP potential
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={suggestion.actionUrl}>
                    {suggestion.action}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}