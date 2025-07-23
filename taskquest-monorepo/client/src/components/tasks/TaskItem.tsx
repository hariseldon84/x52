import { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types/task-management';
import { taskService } from '@/services/taskService';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

interface TaskItemProps {
  task: Task;
  onTaskUpdated?: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  className?: string;
}

const priorityColors = {
  [TaskPriority.Low]: 'bg-blue-100 text-blue-800',
  [TaskPriority.Medium]: 'bg-yellow-100 text-yellow-800',
  [TaskPriority.High]: 'bg-red-100 text-red-800',
};

const complexityIcons = {
  simple: <Icons.star className="h-4 w-4 text-green-500" />,
  medium: <Icons.star className="h-4 w-4 text-yellow-500" />,
  complex: <Icons.star className="h-4 w-4 text-red-500" />,
};

export function TaskItem({ task, onTaskUpdated, onTaskDeleted, className }: TaskItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isCompleted = task.status === TaskStatus.Completed;

  const toggleTaskStatus = async () => {
    try {
      setIsLoading(true);
      const newStatus = isCompleted ? TaskStatus.Todo : TaskStatus.Completed;
      
      if (newStatus === TaskStatus.Completed) {
        const result = await taskService.complete(task.id);
        if (result.data) {
          onTaskUpdated?.(result.data.task);
          toast({
            title: 'Task completed!',
            description: `You earned ${result.data.xpEarned} XP!`,
          });
        } else if (result.error) {
          throw new Error(result.error);
        }
      } else {
        const result = await taskService.update(task.id, { status: newStatus });
        if (result.data) {
          onTaskUpdated?.(result.data);
        } else if (result.error) {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        setIsLoading(true);
        const result = await taskService.delete(task.id);
        if (!result.error) {
          onTaskDeleted?.(task.id);
          toast({
            title: 'Task deleted',
            description: 'The task has been removed',
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete task',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className={cn(
        'flex items-start p-4 border rounded-lg bg-white shadow-sm transition-all hover:shadow-md',
        isCompleted && 'opacity-70',
        className
      )}
    >
      <div className="flex items-center h-5 mt-0.5">
        <Checkbox
          id={`task-${task.id}`}
          checked={isCompleted}
          onCheckedChange={toggleTaskStatus}
          disabled={isLoading}
          className="h-5 w-5 rounded-full"
        />
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </label>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs font-medium',
                priorityColors[task.priority as TaskPriority] || 'bg-gray-100 text-gray-800'
              )}
            >
              {task.priority}
            </Badge>
            
            <div className="text-muted-foreground">
              {complexityIcons[task.complexity as keyof typeof complexityIcons]}
            </div>
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center">
              <Icons.calendar className="h-3.5 w-3.5 mr-1" />
              <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          {task.xp_earned > 0 && (
            <div className="flex items-center ml-4">
              <Icons.zap className="h-3.5 w-3.5 mr-1 text-yellow-500" />
              <span className="font-medium text-yellow-600">{task.xp_earned} XP</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="ml-4 flex items-center
        ">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isLoading}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Icons.trash className="h-4 w-4" />
          <span className="sr-only">Delete task</span>
        </Button>
      </div>
    </div>
  );
}
