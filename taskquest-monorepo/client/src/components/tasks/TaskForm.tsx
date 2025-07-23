import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Task, TaskFormData, TaskPriority, TaskComplexity } from '@/types/task-management';
import { taskService } from '@/services/taskService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { Icons } from '@/components/icons';
import { z } from 'zod';

// Define the form schema
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  project_id: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  complexity: z.enum(['simple', 'medium', 'complex']).default('medium'),
  due_date: z.date().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task?: Task;
  projectId?: string;
  goalId?: string;
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
  className?: string;
}

export function TaskForm({ task, projectId, goalId, onSuccess, onCancel, className }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const defaultValues: Partial<TaskFormValues> = {
    title: task?.title || '',
    description: task?.description || '',
    project_id: task?.project_id || projectId || null,
    priority: (task?.priority as TaskPriority) || TaskPriority.Medium,
    complexity: (task?.complexity as TaskComplexity) || TaskComplexity.Medium,
    due_date: task?.due_date ? new Date(task.due_date) : null,
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = form;

  const selectedDueDate = watch('due_date');
  const selectedPriority = watch('priority');
  const selectedComplexity = watch('complexity');

  const priorities = [
    { value: 'low', label: 'Low', icon: <Icons.arrowDown className="h-4 w-4" /> },
    { value: 'medium', label: 'Medium', icon: <Icons.equal className="h-4 w-4" /> },
    { value: 'high', label: 'High', icon: <Icons.arrowUp className="h-4 w-4" /> },
  ];

  const complexities = [
    { value: 'simple', label: 'Simple', xp: '25 XP' },
    { value: 'medium', label: 'Medium', xp: '50 XP' },
    { value: 'complex', label: 'Complex', xp: '100 XP' },
  ];

  const calculateXP = (complexity: string): number => {
    switch (complexity) {
      case 'simple': return 25;
      case 'complex': return 100;
      case 'medium':
      default: return 50;
    }
  };

  const onSubmit = async (data: TaskFormValues) => {
    try {
      setIsLoading(true);
      
      const taskData = {
        ...data,
        due_date: data.due_date ? data.due_date.toISOString() : null,
        xp_earned: 0, // Will be set when task is completed
      };

      let result;
      if (task) {
        // Update existing task
        result = await taskService.update(task.id, taskData);
      } else {
        // Create new task
        result = await taskService.create({
          ...taskData,
          status: 'todo',
          project_id: projectId || null,
          goal_id: goalId || null,
        });
      }

      if (result.data) {
        toast({
          title: task ? 'Task updated' : 'Task created',
          description: task ? 'Your task has been updated.' : 'Your task has been created.',
        });
        onSuccess?.(result.data);
        if (!task) {
          reset(); // Reset form for new entries
        }
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              placeholder="Task title"
              className={errors.title ? 'border-destructive' : ''}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Add details about this task..."
              className="min-h-[100px]"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <div className="flex space-x-2">
                {priorities.map((priority) => (
                  <Button
                    key={priority.value}
                    type="button"
                    variant={selectedPriority === priority.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1"
                    onClick={() => setValue('priority', priority.value as TaskPriority, { shouldValidate: true })}
                  >
                    {priority.icon}
                    <span>{priority.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Complexity</label>
              <div className="flex space-x-2">
                {complexities.map((complexity) => (
                  <Button
                    key={complexity.value}
                    type="button"
                    variant={selectedComplexity === complexity.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 flex-col h-auto py-2"
                    onClick={() => setValue('complexity', complexity.value as TaskComplexity, { shouldValidate: true })}
                  >
                    <span>{complexity.label}</span>
                    <span className="text-xs opacity-70">{complexity.xp}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDueDate ? (
                      format(selectedDueDate, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDueDate || undefined}
                    onSelect={(date) => {
                      setValue('due_date', date || null, { shouldValidate: true });
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {selectedDueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-xs h-auto p-0 text-muted-foreground"
                  onClick={() => setValue('due_date', null, { shouldValidate: true })}
                >
                  Clear date
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
