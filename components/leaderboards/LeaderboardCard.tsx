// Epic 7, Story 7.2: Leaderboard Card Component

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp,
  Star,
  Target,
  Zap,
  Sparkles
} from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types/social';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  maxScore: number;
  category: string;
  isCurrentUser?: boolean;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'xp':
      return <Star className="h-4 w-4" />;
    case 'tasks':
      return <Target className="h-4 w-4" />;
    case 'streak':
      return <Zap className="h-4 w-4" />;
    case 'level':
      return <TrendingUp className="h-4 w-4" />;
    case 'achievements':
      return <Sparkles className="h-4 w-4" />;
    default:
      return <Trophy className="h-4 w-4" />;
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
};

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    case 2:
      return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    case 3:
      return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
    default:
      if (rank <= 10) {
        return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
      }
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
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
    case 'level':
      return `Level ${score}`;
    case 'achievements':
      return `${score} achievements`;
    default:
      return score.toString();
  }
};

export function LeaderboardCard({ 
  entry, 
  maxScore, 
  category,
  isCurrentUser = false,
  className = '' 
}: LeaderboardCardProps) {
  const progressPercentage = maxScore > 0 ? (entry.score / maxScore) * 100 : 0;
  const rankIcon = getRankIcon(entry.rank);

  return (
    <Card className={`
      transition-all duration-200 hover:shadow-md
      ${isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}
      ${className}
    `}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Rank and User Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Rank */}
            <div className="flex items-center gap-2">
              {rankIcon || (
                <Badge className={`text-sm font-bold px-2 py-1 ${getRankBadgeColor(entry.rank)}`}>
                  #{entry.rank}
                </Badge>
              )}
            </div>

            {/* User Avatar and Info */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.user?.avatar_url} />
              <AvatarFallback>
                {entry.user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm truncate">
                  {entry.user?.full_name || 'Unknown User'}
                </h4>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="mt-1">
                <Progress 
                  value={progressPercentage} 
                  className="h-2 w-full"
                />
              </div>
            </div>
          </div>

          {/* Right side - Score and Category */}
          <div className="flex flex-col items-end gap-1 ml-3">
            <div className="flex items-center gap-1 text-sm font-bold">
              {getCategoryIcon(category)}
              <span>{formatScore(entry.score, category)}</span>
            </div>
            
            {progressPercentage > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {progressPercentage.toFixed(1)}% of leader
              </span>
            )}
          </div>
        </div>

        {/* Achievement indicators for top performers */}
        {entry.rank <= 3 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-center">
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  entry.rank === 1 
                    ? 'border-yellow-400 text-yellow-600 dark:text-yellow-400' 
                    : entry.rank === 2
                    ? 'border-gray-400 text-gray-600 dark:text-gray-400'
                    : 'border-amber-400 text-amber-600 dark:text-amber-400'
                }`}
              >
                {entry.rank === 1 && '🥇 Champion'}
                {entry.rank === 2 && '🥈 Runner-up'}
                {entry.rank === 3 && '🥉 Third Place'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}