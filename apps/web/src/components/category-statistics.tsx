'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, Users, Eye, Award, Trophy, Star, Target, Crown
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

interface CategoryStats {
  category: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  total: number;
  unlocked: number;
  completionPercentage: number;
  totalXP: number;
  earnedXP: number;
  rarityBreakdown: {
    common: { total: number; unlocked: number };
    rare: { total: number; unlocked: number };
    epic: { total: number; unlocked: number };
    legendary: { total: number; unlocked: number };
  };
  nextMilestone?: {
    percentage: number;
    title: string;
    xp: number;
  };
}

interface CategoryStatisticsProps {
  showHeader?: boolean;
  className?: string;
  compact?: boolean;
}

const categoryConfig = {
  productivity: {
    label: 'Productivity',
    icon: TrendingUp,
    color: 'text-green-600 bg-green-50 border-green-200',
    bgGradient: 'from-green-50 to-green-100',
  },
  social: {
    label: 'Social',
    icon: Users,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    bgGradient: 'from-blue-50 to-blue-100',
  },
  exploration: {
    label: 'Exploration',
    icon: Eye,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    bgGradient: 'from-purple-50 to-purple-100',
  },
  mastery: {
    label: 'Mastery',
    icon: Award,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    bgGradient: 'from-orange-50 to-orange-100',
  },
};

const rarityColors = {
  common: 'text-gray-600',
  rare: 'text-blue-600',
  epic: 'text-purple-600',
  legendary: 'text-yellow-600',
};

const rarityIcons = {
  common: Trophy,
  rare: Star,
  epic: Target,
  legendary: Crown,
};

export function CategoryStatistics({ 
  showHeader = true, 
  className = '',
  compact = false 
}: CategoryStatisticsProps) {
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadCategoryStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load all achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .eq('is_hidden', false)
        .neq('unlock_criteria->type', 'category_completion_percentage')
        .neq('unlock_criteria->type', 'overall_completion_percentage');

      if (achievementsError) throw achievementsError;

      // Load user achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      // Load category completion achievements to show next milestones
      const { data: categoryAchievements, error: categoryAchievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .eq('unlock_criteria->type', 'category_completion_percentage');

      if (categoryAchievementsError) throw categoryAchievementsError;

      const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
      const unlockedCategoryIds = new Set(
        userAchievements
          .filter(ua => categoryAchievements.some(ca => ca.id === ua.achievement_id))
          .map(ua => ua.achievement_id)
      );

      // Calculate statistics for each category
      const stats: CategoryStats[] = Object.entries(categoryConfig).map(([category, config]) => {
        const categoryAchievements = achievements.filter(a => a.category === category);
        const unlockedCategoryAchievements = categoryAchievements.filter(a => unlockedIds.has(a.id));

        // Calculate rarity breakdown
        const rarityBreakdown = {
          common: { 
            total: categoryAchievements.filter(a => a.rarity === 'common').length,
            unlocked: unlockedCategoryAchievements.filter(a => a.rarity === 'common').length
          },
          rare: { 
            total: categoryAchievements.filter(a => a.rarity === 'rare').length,
            unlocked: unlockedCategoryAchievements.filter(a => a.rarity === 'rare').length
          },
          epic: { 
            total: categoryAchievements.filter(a => a.rarity === 'epic').length,
            unlocked: unlockedCategoryAchievements.filter(a => a.rarity === 'epic').length
          },
          legendary: { 
            total: categoryAchievements.filter(a => a.rarity === 'legendary').length,
            unlocked: unlockedCategoryAchievements.filter(a => a.rarity === 'legendary').length
          },
        };

        const total = categoryAchievements.length;
        const unlocked = unlockedCategoryAchievements.length;
        const completionPercentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

        // Calculate XP totals
        const totalXP = categoryAchievements.reduce((sum, achievement) => {
          const multiplier = achievement.bonus_multiplier || 1;
          return sum + Math.round(achievement.xp_reward * multiplier);
        }, 0);

        const earnedXP = unlockedCategoryAchievements.reduce((sum, achievement) => {
          const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
          return sum + (userAchievement?.xp_earned || 0);
        }, 0);

        // Find next milestone for this category
        const categoryMilestones = categoryAchievements
          .filter(ca => 
            ca.unlock_criteria?.type === 'category_completion_percentage' &&
            ca.unlock_criteria?.category === category &&
            !unlockedCategoryIds.has(ca.id)
          )
          .sort((a, b) => (a.unlock_criteria?.percentage || 0) - (b.unlock_criteria?.percentage || 0));

        const nextMilestone = categoryMilestones[0] ? {
          percentage: categoryMilestones[0].unlock_criteria?.percentage || 0,
          title: categoryMilestones[0].title,
          xp: Math.round(categoryMilestones[0].xp_reward * (categoryMilestones[0].bonus_multiplier || 1)),
        } : undefined;

        return {
          category,
          label: config.label,
          icon: config.icon,
          color: config.color,
          total,
          unlocked,
          completionPercentage,
          totalXP,
          earnedXP,
          rarityBreakdown,
          nextMilestone,
        };
      });

      setCategoryStats(stats);

    } catch (err: any) {
      console.error('Error loading category statistics:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryStatistics();
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Category Progress</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-600 text-sm">Loading statistics...</p>
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
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Category Progress</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Category Progress</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {categoryStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.category} className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${stat.color}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{stat.label}</span>
                    <span className="text-sm text-gray-600">
                      {stat.unlocked}/{stat.total}
                    </span>
                  </div>
                  <Progress value={stat.completionPercentage} className="h-2" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-semibold">Category Progress</h2>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryStats.map((stat) => {
          const IconComponent = stat.icon;
          
          return (
            <Card key={stat.category} className={`bg-gradient-to-br ${categoryConfig[stat.category as keyof typeof categoryConfig].bgGradient}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{stat.label}</h3>
                      <p className="text-sm text-gray-600">
                        {stat.unlocked} of {stat.total} unlocked
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stat.completionPercentage}%</div>
                    <div className="text-xs text-gray-600">Complete</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress value={stat.completionPercentage} className="h-3" />
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{stat.earnedXP} XP earned</span>
                    <span>{stat.totalXP} XP total</span>
                  </div>
                </div>

                {/* Rarity Breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stat.rarityBreakdown).map(([rarity, counts]) => {
                    const RarityIcon = rarityIcons[rarity as keyof typeof rarityIcons];
                    return (
                      <div key={rarity} className="flex items-center space-x-2">
                        <RarityIcon className={`h-4 w-4 ${rarityColors[rarity as keyof typeof rarityColors]}`} />
                        <span className="text-sm capitalize">{rarity}:</span>
                        <span className="text-sm font-medium">
                          {counts.unlocked}/{counts.total}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Next Milestone */}
                {stat.nextMilestone && (
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Next Goal</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {stat.nextMilestone.percentage}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {stat.nextMilestone.title} (+{stat.nextMilestone.xp} XP)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}