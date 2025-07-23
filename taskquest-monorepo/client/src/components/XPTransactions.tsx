import { useXP } from '@/contexts/XPContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Clock, Zap, Trophy, Star, Award } from 'lucide-react';

const getTransactionIcon = (sourceType: string) => {
  switch (sourceType) {
    case 'task_completion':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'streak_bonus':
      return <Award className="h-4 w-4 text-yellow-500" />;
    case 'level_up':
      return <Trophy className="h-4 w-4 text-blue-500" />;
    case 'daily_challenge':
      return <Star className="h-4 w-4 text-purple-500" />;
    default:
      return <Zap className="h-4 w-4 text-amber-500" />;
  }
};

const getTransactionLabel = (sourceType: string) => {
  switch (sourceType) {
    case 'task_completion':
      return 'Task completed';
    case 'streak_bonus':
      return 'Streak bonus';
    case 'level_up':
      return 'Level up reward';
    case 'daily_challenge':
      return 'Daily challenge';
    default:
      return 'XP earned';
  }
};

export function XPTransactions({ limit = 5 }: { limit?: number }) {
  const { recentTransactions, isLoading } = useXP();
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    );
  }
  
  if (recentTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-10 w-10 text-muted-foreground mb-2" />
        <h3 className="text-sm font-medium text-muted-foreground">No recent activity</h3>
        <p className="text-xs text-muted-foreground mt-1">Complete tasks to earn XP!</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {recentTransactions.slice(0, limit).map((transaction) => (
        <div key={transaction.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              {getTransactionIcon(transaction.source_type)}
            </div>
            <div>
              <p className="text-sm font-medium">
                {getTransactionLabel(transaction.source_type)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">+{transaction.amount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
