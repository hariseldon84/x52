// Epic 7, Story 7.6: Friend Card Component

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  UserMinus, 
  Trophy,
  Zap,
  MoreHorizontal,
  Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import type { Friendship } from '@/lib/types/social';

interface FriendCardProps {
  friendship: Friendship;
  onMessage?: (friendId: string) => void;
  onRemove?: (friendId: string) => void;
  onBlock?: (friendId: string) => void;
  onViewProfile?: (friendId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function FriendCard({ 
  friendship, 
  onMessage, 
  onRemove,
  onBlock,
  onViewProfile,
  isLoading = false,
  className = '' 
}: FriendCardProps) {
  const friend = friendship.friend;

  const handleMessage = () => {
    if (isLoading || !onMessage) return;
    onMessage(friend.id);
  };

  const handleRemove = () => {
    if (isLoading || !onRemove) return;
    onRemove(friend.id);
  };

  const handleBlock = () => {
    if (onBlock) onBlock(friend.id);
  };

  const handleViewProfile = () => {
    if (onViewProfile) onViewProfile(friend.id);
  };

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={friend?.avatar_url} />
                <AvatarFallback className="text-lg">
                  {friend?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Online Status Indicator */}
              {friendship.is_online && (
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate cursor-pointer hover:text-blue-600" 
                  onClick={handleViewProfile}>
                {friend?.full_name || 'Unknown User'}
              </h4>
              
              <div className="flex items-center gap-2 mt-1">
                {friend?.level && (
                  <Badge variant="outline" className="text-xs">
                    Level {friend.level}
                  </Badge>
                )}
                
                <span className="text-xs text-gray-500">
                  {friendship.is_online 
                    ? 'Online now' 
                    : friend?.last_active_at 
                      ? `Last seen ${formatDistanceToNow(new Date(friend.last_active_at), { addSuffix: true })}`
                      : 'Offline'
                  }
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewProfile}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemove}>
                Remove Friend
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlock} className="text-red-600">
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Friend Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {friend?.total_xp?.toLocaleString() || 0} XP
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Level {friend?.level || 1}
              </span>
            </div>
          </div>

          {/* Friendship Duration */}
          <div className="text-xs text-gray-500">
            Friends since {formatDistanceToNow(new Date(friendship.created_at), { addSuffix: true })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 flex gap-2">
        <Button 
          onClick={handleMessage}
          disabled={isLoading}
          className="flex-1"
          size="sm"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Message
        </Button>
        
        <Button 
          onClick={handleViewProfile}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Profile
        </Button>
      </CardFooter>
    </Card>
  );
}