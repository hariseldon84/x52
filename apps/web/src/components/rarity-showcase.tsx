'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Crown, Star, Trophy, Award, Zap, Sparkles, Diamond, Gem
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Achievement = Database['public']['Tables']['achievements']['Row'];

interface RarityInfo {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  multiplier: number;
  color: string;
  borderColor: string;
  bgGradient: string;
  examples: Achievement[];
  count: number;
  unlockedCount: number;
}

interface RarityShowcaseProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

const rarityConfig = {
  common: {
    label: 'Common',
    description: 'Everyday accomplishments that form the foundation of your productivity journey.',
    icon: Award,
    multiplier: 1.0,
    color: 'text-gray-700',
    borderColor: 'border-gray-300',
    bgGradient: 'from-gray-50 to-gray-100',
  },
  rare: {
    label: 'Rare',
    description: 'Notable achievements that require consistent effort and dedication.',
    icon: Star,
    multiplier: 1.25,
    color: 'text-blue-700',
    borderColor: 'border-blue-300',
    bgGradient: 'from-blue-50 to-blue-100',
  },
  epic: {
    label: 'Epic',
    description: 'Impressive milestones that showcase serious commitment to productivity.',
    icon: Trophy,
    multiplier: 1.5,
    color: 'text-purple-700',
    borderColor: 'border-purple-300',
    bgGradient: 'from-purple-50 to-purple-100',
  },
  legendary: {
    label: 'Legendary',
    description: 'Extraordinary feats that mark you as a true productivity master.',
    icon: Crown,
    multiplier: 2.0,
    color: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    bgGradient: 'from-yellow-50 to-yellow-100',
  },
};

export function RarityShowcase({ trigger, isOpen: externalIsOpen, onClose: externalOnClose }: RarityShowcaseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rarityInfo, setRarityInfo] = useState<RarityInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Handle external control
  const actualIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setIsOpen(false);
    }
  };

  const loadRarityData = async () => {
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
        .order('sort_order', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Load user achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));

      // Group achievements by rarity and get examples
      const rarityData: RarityInfo[] = Object.entries(rarityConfig).map(([rarity, config]) => {
        const rarityAchievements = achievements.filter(a => a.rarity === rarity);
        const unlockedRarityAchievements = rarityAchievements.filter(a => unlockedIds.has(a.id));
        
        // Get 3 representative examples (mix of unlocked and locked)
        const examples = [
          ...unlockedRarityAchievements.slice(0, 2),
          ...rarityAchievements.filter(a => !unlockedIds.has(a.id)).slice(0, 1)
        ]
        .filter(Boolean)
        .slice(0, 3);

        return {
          rarity: rarity as any,
          ...config,
          examples,
          count: rarityAchievements.length,
          unlockedCount: unlockedRarityAchievements.length,
        };
      });

      setRarityInfo(rarityData);

    } catch (err: any) {
      console.error('Error loading rarity data:', err);
      setError(err.message || 'Failed to load rarity information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (actualIsOpen) {
      loadRarityData();
    }
  }, [actualIsOpen]);

  const dialogContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Achievement Rarity System</h2>
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-gray-600">
          Achievements are ranked by rarity, with higher rarities providing bonus XP rewards
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading rarity information...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rarity Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rarityInfo.map((info) => {
              const IconComponent = info.icon;
              return (
                <Card key={info.rarity} className={`text-center bg-gradient-to-br ${info.bgGradient} border-2 ${info.borderColor}`}>
                  <CardContent className="p-4">
                    <IconComponent className={`h-8 w-8 mx-auto mb-2 ${info.color}`} />
                    <h3 className={`font-bold ${info.color}`}>{info.label}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {info.unlockedCount}/{info.count} unlocked
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {info.multiplier}x XP
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Rarity Information */}
          <div className="space-y-4">
            {rarityInfo.map((info) => {
              const IconComponent = info.icon;
              return (
                <Card key={info.rarity} className={`bg-gradient-to-r ${info.bgGradient} border-l-4 ${info.borderColor}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-6 w-6 ${info.color}`} />
                        <div>
                          <h3 className={`text-lg font-semibold ${info.color}`}>
                            {info.label} Achievements
                          </h3>
                          <p className="text-sm text-gray-600">{info.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold text-yellow-600">
                            {info.multiplier}x XP Multiplier
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {info.unlockedCount} of {info.count} unlocked
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Examples:</h4>
                      {info.examples.length > 0 ? (
                        <div className="grid gap-2">
                          {info.examples.map((achievement) => (
                            <div 
                              key={achievement.id}
                              className="flex items-center justify-between p-2 bg-white bg-opacity-50 rounded"
                            >
                              <div>
                                <span className="font-medium text-sm">{achievement.title}</span>
                                <p className="text-xs text-gray-600">{achievement.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs font-medium">
                                    {Math.round(achievement.xp_reward * (achievement.bonus_multiplier || 1))} XP
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No achievements in this rarity yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tips */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Gem className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900 mb-2">Pro Tips</h4>
                  <ul className="space-y-1 text-sm text-purple-800">
                    <li>• Focus on rare and epic achievements for better XP rewards</li>
                    <li>• Legendary achievements often require long-term consistency</li>
                    <li>• Complete category milestones for additional bonus achievements</li>
                    <li>• Hidden achievements provide surprise rewards when discovered</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={actualIsOpen} onOpenChange={externalOnClose || setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Achievement Rarity System</DialogTitle>
          </DialogHeader>
          {dialogContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Return as standalone component if no trigger
  return dialogContent;
}