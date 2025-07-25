// Epic 7, Story 7.4: Mentor Card Component

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, 
  Users, 
  Clock, 
  BookOpen,
  Calendar,
  MessageCircle
} from 'lucide-react';
import type { MentorProfile } from '@/lib/types/social';

interface MentorCardProps {
  mentor: MentorProfile;
  onRequest?: (mentorId: string) => void;
  onMessage?: (mentorId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const getExperienceLevelColor = (level: string) => {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'intermediate':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'advanced':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'expert':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getAvailabilityText = (availability: string[]) => {
  if (availability.includes('weekdays') && availability.includes('weekends')) {
    return 'Available 7 days a week';
  } else if (availability.includes('weekdays')) {
    return 'Available weekdays';
  } else if (availability.includes('weekends')) {
    return 'Available weekends';
  } else if (availability.includes('evenings')) {
    return 'Available evenings';
  }
  return 'Flexible schedule';
};

export function MentorCard({ 
  mentor, 
  onRequest, 
  onMessage, 
  isLoading = false,
  className = '' 
}: MentorCardProps) {
  const handleRequest = () => {
    if (isLoading || !onRequest) return;
    onRequest(mentor.user_id);
  };

  const handleMessage = () => {
    if (isLoading || !onMessage) return;
    onMessage(mentor.user_id);
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={mentor.user?.avatar_url} />
            <AvatarFallback className="text-lg">
              {mentor.user?.full_name?.charAt(0) || 'M'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {mentor.user?.full_name || 'Unknown Mentor'}
            </CardTitle>
            
            <div className="flex items-center gap-2 mt-1 mb-2">
              <Badge className={`text-xs ${getExperienceLevelColor(mentor.experience_level)}`}>
                {mentor.experience_level.charAt(0).toUpperCase() + mentor.experience_level.slice(1)}
              </Badge>
              
              {mentor.average_rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">
                    {mentor.average_rating.toFixed(1)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                <span>{mentor.active_mentees || 0} mentees</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {mentor.bio}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Expertise Areas */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Expertise
          </h4>
          <div className="flex flex-wrap gap-1">
            {mentor.expertise_areas.slice(0, 4).map((area, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
            {mentor.expertise_areas.length > 4 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                +{mentor.expertise_areas.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>{getAvailabilityText(mentor.availability)}</span>
        </div>

        {/* Session Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{mentor.session_duration} min sessions</span>
          </div>
          
          {mentor.hourly_rate && (
            <div className="font-medium text-green-600">
              ${mentor.hourly_rate}/hr
            </div>
          )}
        </div>

        {/* Languages */}
        {mentor.languages && mentor.languages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">Languages</h4>
            <div className="flex flex-wrap gap-1">
              {mentor.languages.map((language, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 flex gap-2">
        <Button 
          onClick={handleRequest}
          disabled={isLoading || !mentor.is_available}
          className="flex-1"
        >
          {isLoading ? 'Requesting...' : 'Request Mentorship'}
        </Button>
        
        <Button 
          onClick={handleMessage}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}