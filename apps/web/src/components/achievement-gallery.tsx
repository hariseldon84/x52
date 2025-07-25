'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AchievementCard } from './achievement-card';
import { AchievementGoals } from './achievement-goals';
import { CategoryStatistics } from './category-statistics';
import { RarityShowcase } from './rarity-showcase';
import { 
  Trophy, Search, Filter, Award, Target, Users, Eye, Star, Crown 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];
type AchievementProgress = Database['public']['Tables']['achievement_progress']['Row'];

export interface AchievementWithStatus extends Achievement {
  user_achievement?: UserAchievement | null;
  progress?: AchievementProgress | null;
  is_unlocked: boolean;
}

interface FilterState {
  category: string;
  rarity: string;
  status: string;
  search: string;
}

const categoryLabels = {
  productivity: 'Productivity',
  social: 'Social',
  exploration: 'Exploration',
  mastery: 'Mastery',
};

const rarityLabels = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const rarityColors = {
  common: 'bg-gray-100 text-gray-800',
  rare: 'bg-blue-100 text-blue-800',
  epic: 'bg-purple-100 text-purple-800',
  legendary: 'bg-yellow-100 text-yellow-800',
};

export function AchievementGallery() {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [filteredAchievements, setFilteredAchievements] = useState<AchievementWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    rarity: 'all',
    status: 'all',
    search: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showRarity, setShowRarity] = useState(false);

  const supabase = createClient();

  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Load user's unlocked achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      // Load achievement progress
      const { data: progressData, error: progressError } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Combine data
      const achievementsWithStatus: AchievementWithStatus[] = achievementsData.map(achievement => {
        const userAchievement = userAchievementsData.find(ua => ua.achievement_id === achievement.id);
        const progress = progressData.find(p => p.achievement_id === achievement.id);
        
        return {
          ...achievement,
          user_achievement: userAchievement || null,
          progress: progress || null,
          is_unlocked: !!userAchievement,
        };
      });

      setAchievements(achievementsWithStatus);
      setFilteredAchievements(achievementsWithStatus);

    } catch (err: any) {
      console.error('Error loading achievements:', err);
      setError(err.message || 'Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  // Filter achievements
  useEffect(() => {
    let filtered = achievements;

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(achievement =>
        achievement.title.toLowerCase().includes(search) ||
        achievement.description.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(achievement => achievement.category === filters.category);
    }

    // Rarity filter
    if (filters.rarity !== 'all') {
      filtered = filtered.filter(achievement => achievement.rarity === filters.rarity);
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'unlocked') {
        filtered = filtered.filter(achievement => achievement.is_unlocked);
      } else if (filters.status === 'locked') {
        filtered = filtered.filter(achievement => !achievement.is_unlocked);
      } else if (filters.status === 'in_progress') {
        filtered = filtered.filter(achievement => !achievement.is_unlocked && achievement.progress);
      }
    }

    // Filter out hidden achievements that aren't unlocked
    filtered = filtered.filter(achievement => 
      !achievement.is_hidden || achievement.is_unlocked
    );

    setFilteredAchievements(filtered);
  }, [achievements, filters]);

  const clearFilters = () => {
    setFilters({
      category: 'all',
      rarity: 'all',
      status: 'all',
      search: '',
    });
  };

  // Calculate statistics
  const stats = {
    total: achievements.filter(a => !a.is_hidden || a.is_unlocked).length,
    unlocked: achievements.filter(a => a.is_unlocked).length,
    inProgress: achievements.filter(a => !a.is_unlocked && a.progress && a.progress.progress_percentage > 0).length,
    totalXPEarned: achievements
      .filter(a => a.is_unlocked)
      .reduce((sum, a) => sum + (a.user_achievement?.xp_earned || 0), 0),
  };

  const completionPercentage = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={loadAchievements} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
            <p className="text-gray-600">Track your progress and unlock new milestones</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowRarity(true)} variant="outline">
            <Crown className="h-4 w-4 mr-2" />
            Rarity Guide
          </Button>
          <Button onClick={() => setShowGoals(true)} variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Set Goals
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.unlocked}</p>
                <p className="text-sm text-gray-600">Unlocked</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{completionPercentage}% complete</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalXPEarned}</p>
                <p className="text-sm text-gray-600">Total XP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Discovered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Progress */}
      <CategoryStatistics />

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search achievements..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters({ ...filters, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rarity
                  </label>
                  <Select
                    value={filters.rarity}
                    onValueChange={(value) => setFilters({ ...filters, rarity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rarities</SelectItem>
                      {Object.entries(rarityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unlocked">Unlocked</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>Showing {filteredAchievements.length} of {stats.total} achievements</span>
                <div className="flex space-x-4">
                  {Object.entries(categoryLabels).map(([category, label]) => {
                    const count = filteredAchievements.filter(a => a.category === category).length;
                    return count > 0 ? (
                      <Badge key={category} variant="outline">
                        {label}: {count}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Achievement Grid */}
      {filteredAchievements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No achievements match your filters
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or filters to find more achievements.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
            />
          ))}
        </div>
      )}

      {/* Achievement Goals Dialog */}
      <AchievementGoals
        isOpen={showGoals}
        onClose={() => setShowGoals(false)}
      />

      {/* Rarity Showcase Dialog */}
      <RarityShowcase
        isOpen={showRarity}
        onClose={() => setShowRarity(false)}
      />
    </div>
  );
}