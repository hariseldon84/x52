'use client';

import { useState } from 'react';
import { AchievementWithStatus } from './achievement-gallery';
import { SocialShareDialog } from './social-share-dialog';
import { AchievementGoals } from './achievement-goals';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Trophy, Lock, Star, Calendar, Share2, CheckCircle,
  // Achievement icons
  Award, Target, Crown, Flame, Zap, Medal, Gem, Diamond,
  ThumbsUp, TrendingUp, Brain, UserPlus, Users, Globe, Network,
  MessageCircle, Link, Flag, Eye, Folder, Briefcase, Sunrise,
  Moon, CheckSquare, Package, Archive, CloudLightning, Cpu, BellRing,
  Shuffle, RotateCcw, Layers, Share, Timer
} from 'lucide-react';
import { format } from 'date-fns';

interface AchievementCardProps {
  achievement: AchievementWithStatus;
}

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-200',
  rare: 'bg-blue-100 text-blue-800 border-blue-200',
  epic: 'bg-purple-100 text-purple-800 border-purple-200',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const rarityGradients = {
  common: 'from-gray-50 to-gray-100',
  rare: 'from-blue-50 to-blue-100',
  epic: 'from-purple-50 to-purple-100',
  legendary: 'from-yellow-50 to-yellow-100',
};

const categoryColors = {
  productivity: 'text-green-600',
  social: 'text-blue-600',
  exploration: 'text-purple-600',
  mastery: 'text-orange-600',
};

const iconMap = {
  // Basic icons
  trophy: Trophy,
  award: Award,
  target: Target,
  crown: Crown,
  star: Star,
  flame: Flame,
  fire: Flame,
  zap: Zap,
  lightning: CloudLightning,
  medal: Medal,
  gem: Gem,
  diamond: Diamond,
  
  // Productivity icons
  checkSquare: CheckSquare,
  thumbsUp: ThumbsUp,
  trending: TrendingUp,
  brain: Brain,
  
  // Social icons
  userPlus: UserPlus,
  users: Users,
  globe: Globe,
  network: Network,
  messageCircle: MessageCircle,
  link: Link,
  share2: Share,
  
  // Exploration icons
  flag: Flag,
  eye: Eye,
  folder: Folder,
  briefcase: Briefcase,
  sunrise: Sunrise,
  moon: Moon,
  calendar: Calendar,
  
  // Mastery icons
  checkCircle: CheckCircle,
  package: Package,
  archive: Archive,
  cpu: Cpu,
  bellRing: BellRing,
  shuffle: Shuffle,
  layers: Layers,
  timer: Timer,
  refresh: RotateCcw,
};

const rarityLabels = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const categoryLabels = {
  productivity: 'Productivity',
  social: 'Social',
  exploration: 'Exploration',
  mastery: 'Mastery',
};

export function AchievementCard({ achievement }: AchievementCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const IconComponent = achievement.icon_name ? iconMap[achievement.icon_name as keyof typeof iconMap] : Trophy;
  const isUnlocked = achievement.is_unlocked;
  const hasProgress = achievement.progress && achievement.progress.progress_percentage > 0;
  const progressPercentage = achievement.progress?.progress_percentage || 0;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the details modal
    setShowShareDialog(true);
  };

  return (
    <>
      <Card 
        className={`
          transition-all duration-200 hover:shadow-lg cursor-pointer
          ${isUnlocked 
            ? `border-2 ${rarityColors[achievement.rarity]} bg-gradient-to-br ${rarityGradients[achievement.rarity]}` 
            : 'border-gray-200 bg-gray-50 opacity-75'
          }
        `}
        onClick={() => setShowDetails(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`
                p-3 rounded-full 
                ${isUnlocked 
                  ? `${rarityColors[achievement.rarity]} bg-opacity-20` 
                  : 'bg-gray-200'
                }
              `}>
                {isUnlocked ? (
                  <IconComponent className={`h-6 w-6 ${categoryColors[achievement.category]}`} />
                ) : (
                  <Lock className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                  {achievement.title}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${rarityColors[achievement.rarity]}`}
                  >
                    {rarityLabels[achievement.rarity]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[achievement.category]}
                  </Badge>
                </div>
              </div>
            </div>
            
            {isUnlocked && (
              <div className="text-right">
                <div className="flex items-center space-x-1 text-yellow-600">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">
                    +{achievement.user_achievement?.xp_earned || 0} XP
                  </span>
                </div>
                {achievement.user_achievement?.unlocked_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(achievement.user_achievement.unlocked_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className={`text-sm mb-3 ${isUnlocked ? 'text-gray-700' : 'text-gray-500'}`}>
            {achievement.description}
          </p>
          
          {!isUnlocked && hasProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
          
          {!isUnlocked && !hasProgress && (
            <div className="text-center py-2">
              <Lock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Keep playing to unlock!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievement Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className={`
                p-3 rounded-full 
                ${isUnlocked 
                  ? `${rarityColors[achievement.rarity]} bg-opacity-20` 
                  : 'bg-gray-200'
                }
              `}>
                {isUnlocked ? (
                  <IconComponent className={`h-8 w-8 ${categoryColors[achievement.category]}`} />
                ) : (
                  <Lock className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{achievement.title}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={rarityColors[achievement.rarity]}
                  >
                    {rarityLabels[achievement.rarity]}
                  </Badge>
                  <Badge variant="outline">
                    {categoryLabels[achievement.category]}
                  </Badge>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-700">{achievement.description}</p>
            
            {isUnlocked ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Achievement Unlocked!</span>
                  </div>
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">
                      +{achievement.user_achievement?.xp_earned || 0} XP
                    </span>
                  </div>
                </div>
                
                {achievement.user_achievement?.unlocked_at && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Unlocked on {format(new Date(achievement.user_achievement.unlocked_at), 'PPPP')}
                    </span>
                  </div>
                )}
                
                <Button 
                  onClick={handleShare} 
                  variant="secondary" 
                  className="w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Achievement
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {hasProgress ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <p className="text-xs text-gray-500 text-center">
                      You're on your way to unlocking this achievement!
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">This achievement is locked</p>
                    <p className="text-xs text-gray-400 mb-4">
                      Complete the requirements to unlock it and earn XP!
                    </p>
                    <Button 
                      onClick={() => setShowGoalDialog(true)} 
                      variant="outline" 
                      size="sm"
                    >
                      <Target className="h-3 w-3 mr-1" />
                      Set Goal
                    </Button>
                  </div>
                )}
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Potential Reward</span>
                  </div>
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">
                      Up to {Math.round(achievement.xp_reward * (achievement.bonus_multiplier || 1))} XP
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Share Dialog */}
      {isUnlocked && (
        <SocialShareDialog
          achievement={achievement}
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* Achievement Goal Dialog */}
      {!isUnlocked && (
        <AchievementGoals
          achievementId={achievement.id}
          isOpen={showGoalDialog}
          onClose={() => setShowGoalDialog(false)}
        />
      )}
    </>
  );
}