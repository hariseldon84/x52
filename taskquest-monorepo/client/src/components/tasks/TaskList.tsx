import { useState, useEffect } from 'react';
import { Task, TaskFilters, TaskPriority, TaskStatus, TaskComplexity } from '@/types/task-management';
import { taskService } from '@/services/taskService';
import { useToast } from '@/components/ui/use-toast';
import { TaskItem } from './TaskItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskListProps {
  projectId?: string;
  goalId?: string;
  className?: string;
  showFilters?: boolean;
  limit?: number;
}

export function TaskList({ projectId, goalId, className, showFilters = true, limit }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Partial<TaskFilters>>({
    status: 'all',
    priority: 'all',
    complexity: 'all',
    due_date: 'all',
    search: '',
    project_id: projectId || 'all',
    goal_id: goalId || 'all',
  });
  
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const result = await taskService.getAll(filters);
      
      if (result.data) {
        setTasks(limit ? result.data.slice(0, limit) : result.data);
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  return (
    <div className={className}>
      {showFilters && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value as TaskStatus | 'all' })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={TaskStatus.Todo}>To Do</SelectItem>
                  <SelectItem value={TaskStatus.InProgress}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.Completed}>Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) => setFilters({ ...filters, priority: value as TaskPriority | 'all' })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value={TaskPriority.Low}>Low</SelectItem>
                  <SelectItem value={TaskPriority.Medium}>Medium</SelectItem>
                  <SelectItem value={TaskPriority.High}>High</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.due_date || 'all'}
                onValueChange={(value) => setFilters({ ...filters, due_date: value as 'today' | 'this_week' | 'overdue' | 'all' })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))
        ) : tasks.length > 0 ? (
          // Task list
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
            />
          ))
        ) : (
          // Empty state
          <div className="text-center py-12">
            <Icons.inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">No tasks found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filters.search || filters.status !== 'all' || filters.priority !== 'all' || filters.due_date !== 'all'
                ? 'Try adjusting your filters or create a new task.'
                : 'Get started by creating a new task.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
