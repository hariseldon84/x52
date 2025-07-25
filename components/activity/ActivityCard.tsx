// Epic 7, Story 7.5: Activity Card Component

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Trophy,
  Target,
  Zap,
  BookOpen,
  Users,
  Calendar,
  Award
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import type { SocialActivity } from '@/lib/types/social';

interface ActivityCardProps {
  activity: SocialActivity;
  onLike?: (activityId: string) => void;
  onComment?: (activityId: string) => void;
  onShare?: (activityId: string) => void;
  onHide?: (activityId: string) => void;
  onReport?: (activityId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'achievement_unlock':
      return <Award className="h-4 w-4 text-yellow-500" />;
    case 'level_up':
      return <Trophy className="h-4 w-4 text-purple-500" />;
    case 'task_complete':
      return <Target className="h-4 w-4 text-green-500" />;
    case 'streak_milestone':
      return <Zap className="h-4 w-4 text-orange-500" />;
    case 'goal_complete':
      return <BookOpen className="h-4 w-4 text-blue-500" />;
    case 'challenge_win':
      return <Trophy className="h-4 w-4 text-gold-500" />;
    case 'guild_join':
      return <Users className="h-4 w-4 text-indigo-500" />;
    case 'share':
      return <Share2 className="h-4 w-4 text-gray-500" />;
    default:
      return <Calendar className="h-4 w-4 text-gray-500" />;
  }
};

const getActivityTypeLabel = (type: string) => {
  switch (type) {
    case 'achievement_unlock':
      return 'Achievement Unlocked';
    case 'level_up':
      return 'Level Up';
    case 'task_complete':
      return 'Task Completed';
    case 'streak_milestone':
      return 'Streak Milestone';
    case 'goal_complete':
      return 'Goal Achieved';
    case 'challenge_win':
      return 'Challenge Victory';
    case 'guild_join':
      return 'Joined Guild';
    case 'share':
      return 'Shared';
    case 'milestone':
      return 'Milestone';
    default:
      return 'Activity';
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'achievement_unlock':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'level_up':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'task_complete':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'streak_milestone':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'goal_complete':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'challenge_win':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    case 'guild_join':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

export function ActivityCard({ 
  activity, 
  onLike, 
  onComment, 
  onShare,
  onHide,
  onReport,
  isLoading = false,
  className = '' 
}: ActivityCardProps) {
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    if (isLoading || !onLike) return;
    onLike(activity.id);
  };

  const handleComment = () => {
    if (isLoading || !onComment) return;
    onComment(activity.id);
    setShowComments(true);
  };

  const handleShare = () => {
    if (isLoading || !onShare) return;
    onShare(activity.id);
  };

  const handleHide = () => {
    if (onHide) onHide(activity.id);
  };

  const handleReport = () => {
    if (onReport) onReport(activity.id);
  };

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={activity.user?.avatar_url} />
              <AvatarFallback>
                {activity.user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {activity.user?.full_name || 'Unknown User'}
                </h4>
                <Badge className={`text-xs ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                  <span className="ml-1">{getActivityTypeLabel(activity.activity_type)}</span>
                </Badge>
                {activity.user?.level && (
                  <Badge variant="secondary" className="text-xs">
                    Level {activity.user.level}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleHide}>
                Hide this activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReport}>
                Report activity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Activity Title */}
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {activity.title}
          </h3>

          {/* Activity Description */}
          {activity.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activity.description}
            </p>
          )}

          {/* Activity Metadata */}
          {activity.metadata && (
            <div className="space-y-2">
              {/* XP Gained */}
              {activity.metadata.xp_gained && (
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-600">
                    +{activity.metadata.xp_gained} XP
                  </span>
                </div>
              )}

              {/* Challenge Details */}
              {activity.metadata.challenge_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  <span>
                    Challenge: <span className="font-medium">{activity.metadata.challenge_name}</span>
                  </span>
                </div>
              )}

              {/* Guild Details */}
              {activity.metadata.guild_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>
                    Guild: <span className="font-medium">{activity.metadata.guild_name}</span>
                  </span>
                </div>
              )}

              {/* Achievement Details */}
              {activity.metadata.achievement_name && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      {activity.metadata.achievement_name}
                    </span>
                  </div>
                  {activity.metadata.achievement_description && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {activity.metadata.achievement_description}
                    </p>
                  )}
                </div>
              )}

              {/* Shared Activity */}
              {activity.metadata.shared_activity_id && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Share2 className="h-4 w-4" />
                    <span>
                      Originally by <span className="font-medium">{activity.metadata.original_user}</span>
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">
                    {activity.metadata.original_title}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLoading}
            className={`flex items-center gap-1 ${
              activity.is_liked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${activity.is_liked ? 'fill-current' : ''}`} />
            <span className="text-sm">{activity.like_count || 0}</span>
          </Button>

          {/* Comment Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComment}
            disabled={isLoading}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{activity.comment_count || 0}</span>
          </Button>

          {/* Share Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            disabled={isLoading}
            className="flex items-center gap-1 text-gray-500 hover:text-green-500"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-sm">Share</span>
          </Button>
        </div>

        {/* Visibility Indicator */}
        <Badge variant="outline" className="text-xs">
          {activity.visibility === 'public' ? '🌐 Public' : 
           activity.visibility === 'friends' ? '👥 Friends' : '🔒 Private'}
        </Badge>
      </CardFooter>

      {/* Comments Section (expandable) */}
      {showComments && activity.comment_count > 0 && (
        <div className="border-t p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Comments section would go here
          </div>
        </div>
      )}
    </Card>
  );
}