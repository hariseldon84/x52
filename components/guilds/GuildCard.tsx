// Epic 7, Story 7.3: Guild Card Component

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  MessageCircle, 
  Shield, 
  Crown,
  Lock,
  Globe,
  Trophy,
  TrendingUp,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Guild } from '@/lib/types/social';

interface GuildCardProps {
  guild: Guild;
  onJoin?: (guildId: string) => void;
  onLeave?: (guildId: string) => void;
  onView?: (guildId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'productivity':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'learning':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'fitness':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'creativity':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'business':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'social':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getRoleIcon = (role?: string) => {
  switch (role) {
    case 'leader':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'moderator':
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
};

export function GuildCard({ 
  guild, 
  onJoin, 
  onLeave, 
  onView, 
  isLoading = false,
  className = '' 
}: GuildCardProps) {
  const memberProgress = guild.max_members > 0 
    ? (guild.member_count / guild.max_members) * 100 
    : 0;

  const canJoin = guild.is_public && 
    !guild.is_member && 
    guild.member_count < guild.max_members;

  const canLeave = guild.is_member && guild.user_role !== 'leader';

  const handleAction = () => {
    if (isLoading) return;
    
    if (canJoin && onJoin) {
      onJoin(guild.id);
    } else if (canLeave && onLeave) {
      onLeave(guild.id);
    } else if (onView) {
      onView(guild.id);
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate flex items-center gap-2">
              {guild.name}
              {guild.is_member && getRoleIcon(guild.user_role)}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${getCategoryColor(guild.category)}`}>
                {guild.category.charAt(0).toUpperCase() + guild.category.slice(1)}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${guild.is_public ? 'text-green-600' : 'text-orange-600'}`}
              >
                {guild.is_public ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>
              {guild.is_member && (
                <Badge variant="secondary" className="text-xs">
                  Member
                </Badge>
              )}
            </div>
          </div>
          
          {guild.creator && (
            <Avatar className="h-8 w-8 ml-3">
              <AvatarImage src={guild.creator.avatar_url} />
              <AvatarFallback>
                {guild.creator.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {guild.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {guild.description}
          </p>
        )}

        <div className="space-y-3">
          {/* Member Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>
                {guild.member_count} / {guild.max_members} members
              </span>
            </div>
            {guild.member_count > 0 && (
              <div className="flex -space-x-1">
                {/* Show member avatars preview - would need member data */}
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800"></div>
                <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800"></div>
                <div className="h-6 w-6 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800"></div>
              </div>
            )}
          </div>

          {/* Progress bar for members */}
          {guild.max_members > 0 && (
            <Progress value={memberProgress} className="h-2" />
          )}

          {/* Guild Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MessageCircle className="h-4 w-4" />
              <span>Discussions</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Trophy className="h-4 w-4" />
              <span>Challenges</span>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Created {formatDistanceToNow(new Date(guild.created_at), { addSuffix: true })}</span>
          </div>
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
              {isLoading ? 'Joining...' : 'Join Guild'}
            </Button>
          )}
          
          {canLeave && (
            <Button 
              onClick={handleAction}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? 'Leaving...' : 'Leave Guild'}
            </Button>
          )}
          
          {!canJoin && !canLeave && (
            <Button 
              onClick={handleAction}
              disabled={isLoading}
              variant={guild.is_member ? 'default' : 'outline'}
              className="flex-1"
            >
              {guild.is_member ? 'Open Guild' : 'View Details'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}