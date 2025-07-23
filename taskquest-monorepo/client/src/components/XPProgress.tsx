import { useXP } from '@/contexts/XPContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function XPProgress({ showLevel = true, className = '' }: { showLevel?: boolean; className?: string }) {
  const { level, xpInCurrentLevel, xpToNextLevel, levelProgress, isLoading } = useXP();
  
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {showLevel && <Skeleton className="h-5 w-16" />}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {showLevel && (
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            Level {level}
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(levelProgress)}% to next level
          </div>
        </div>
      )}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-white shadow-lg rounded-lg p-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Level {level}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(levelProgress)}% complete
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{xpInCurrentLevel.toLocaleString()} XP</span>
                <span className="text-muted-foreground">
                  {xpToNextLevel.toLocaleString()} XP to next level
                </span>
              </div>
              <div className="pt-1 text-xs text-muted-foreground">
                {xpInCurrentLevel.toLocaleString()} / {(xpInCurrentLevel + xpToNextLevel).toLocaleString()} XP
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
