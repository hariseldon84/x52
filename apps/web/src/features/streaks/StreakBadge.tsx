import React from 'react';
import { useStreak } from './useStreak';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakBadge({ 
  className, 
  showLabel = true, 
  size = 'md' 
}: StreakBadgeProps) {
  const { currentStreak, isLoading } = useStreak();
  
  // Don't show badge if there's no active streak
  if (isLoading || currentStreak === 0) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const flameSize = {
    sm: 14,
    md: 16,
    lg: 20,
  }[size];

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium',
        'shadow-[0_2px_10px_rgba(249,115,22,0.3)]',
        sizeClasses[size],
        className
      )}
    >
      <Flame 
        size={flameSize} 
        className="fill-current" 
        style={{
          filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))',
        }}
      />
      <span className="font-bold">{currentStreak}</span>
      {showLabel && (
        <span className="hidden sm:inline">
          day{currentStreak !== 1 ? 's' : ''} streak
        </span>
      )}
    </div>
  );
}

// Export a version with a default label for convenience
export function StreakBadgeWithLabel(props: Omit<StreakBadgeProps, 'showLabel'>) {
  return <StreakBadge {...props} showLabel={true} />;
}
