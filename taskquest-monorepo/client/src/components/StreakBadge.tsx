import { Flame } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

export function StreakBadge() {
  const { current_streak, longest_streak, isLoading } = useStreak();
  
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-10" />
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border border-orange-200">
            <Flame className="h-4 w-4 mr-1.5 text-orange-500" />
            <span>{current_streak} day{current_streak !== 1 ? 's' : ''}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-white shadow-lg rounded-lg p-3 max-w-xs">
          <div className="space-y-1.5">
            <div className="flex items-center">
              <Flame className="h-4 w-4 mr-2 text-orange-500" />
              <span className="font-medium">{current_streak}-day streak</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {current_streak > 1 
                ? `You're on a ${current_streak}-day streak! Keep it going!`
                : 'Complete a task today to start your streak!'
              }
            </div>
            {longest_streak > 0 && (
              <div className="text-xs text-muted-foreground pt-1 border-t mt-2">
                Longest streak: {longest_streak} days
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
