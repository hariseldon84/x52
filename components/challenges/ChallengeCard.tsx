// Epic 7, Story 7.1: Challenge Card Component

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  Star, 
  Target,
  Zap,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow, format, isPast, isFuture } from 'date-fns';
import type { Challenge } from '@/lib/types/social';

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin?: (challengeId: string) => void;
  onLeave?: (challengeId: string) => void;
  onView?: (challengeId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const getChallengeTypeIcon = (type: Challenge['challenge_type']) => {
  switch (type) {
    case 'most_xp':
      return <Star className="h-4 w-4" />;
    case 'most_tasks':
      return <Target className="h-4 w-4" />;
    case 'longest_streak':
      return <Zap className="h-4 w-4" />;
    case 'custom':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Trophy className="h-4 w-4" />;
  }
};

const getChallengeTypeLabel = (type: Challenge['challenge_type']) => {
  switch (type) {
    case 'most_xp':
      return 'Most XP';
    case 'most_tasks':
      return 'Most Tasks';
    case 'longest_streak':
      return 'Longest Streak';
    case 'custom':
      return 'Custom';
    default:
      return type;
  }
};

const getStatusColor = (status: Challenge['status']) => {
  switch (status) {
    case 'upcoming':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'completed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

export function ChallengeCard({ 
  challenge, 
  onJoin, 
  onLeave, 
  onView, 
  isLoading = false,
  className = ''
}: ChallengeCardProps) {
  const startDate = new Date(challenge.start_date);
  const endDate = new Date(challenge.end_date);
  const now = new Date();
  
  const isUpcoming = isFuture(startDate);
  const isActive = !isPast(endDate) && !isFuture(startDate);
  const isCompleted = isPast(endDate);
  
  const participantProgress = challenge.max_participants > 0 
    ? (challenge.participant_count || 0) / challenge.max_participants * 100
    : 0;

  const canJoin = challenge.is_public && 
    !challenge.is_participant && 
    (challenge.status === 'upcoming' || challenge.status === 'active') &&
    (challenge.participant_count || 0) < challenge.max_participants;

  const canLeave = challenge.is_participant && 
    (challenge.status === 'upcoming' || challenge.status === 'active');

  const handleAction = () => {
    if (isLoading) return;
    
    if (canJoin && onJoin) {
      onJoin(challenge.id);
    } else if (canLeave && onLeave) {
      onLeave(challenge.id);
    } else if (onView) {
      onView(challenge.id);
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {challenge.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${getStatusColor(challenge.status)}`}>
                {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getChallengeTypeIcon(challenge.challenge_type)}
                <span className="ml-1">{getChallengeTypeLabel(challenge.challenge_type)}</span>
              </Badge>
              {!challenge.is_public && (
                <Badge variant="secondary" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
          </div>
          
          {challenge.creator && (
            <Avatar className="h-8 w-8 ml-3">
              <AvatarImage src={challenge.creator.avatar_url} />
              <AvatarFallback>
                {challenge.creator.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {challenge.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {challenge.description}
          </p>
        )}

        <div className="space-y-3">
          {/* Participants */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>
                {challenge.participant_count || 0} / {challenge.max_participants} participants
              </span>
            </div>
            {challenge.is_participant && challenge.user_rank && (
              <Badge variant="outline" className="text-xs">
                Rank #{challenge.user_rank}
              </Badge>
            )}
          </div>

          {/* Progress bar for participants */}
          {challenge.max_participants > 0 && (
            <Progress value={participantProgress} className="h-2" />
          )}

          {/* Timing */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              {isUpcoming && (
                <span className="text-blue-600 dark:text-blue-400">
                  Starts {formatDistanceToNow(startDate, { addSuffix: true })}
                </span>
              )}
              {isActive && (
                <span className="text-green-600 dark:text-green-400">
                  Ends {formatDistanceToNow(endDate, { addSuffix: true })}
                </span>
              )}
              {isCompleted && (
                <span className="text-gray-500">
                  Ended {formatDistanceToNow(endDate, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Prize */}
          {challenge.prize_xp > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <Trophy className="h-4 w-4" />
              <span>{challenge.prize_xp} XP Prize</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <div className="flex gap-2 w-full">
          {canJoin && (
            <Button 
              onClick={handleAction}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Joining...' : 'Join Challenge'}
            </Button>
          )}
          
          {canLeave && (
            <Button 
              onClick={handleAction}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? 'Leaving...' : 'Leave Challenge'}
            </Button>
          )}
          
          {!canJoin && !canLeave && (
            <Button 
              onClick={handleAction}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              View Details
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}