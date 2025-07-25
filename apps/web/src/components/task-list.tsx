'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Clock, Star, Edit, Trash2, Users } from 'lucide-react';
import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type Task = Database['public']['Tables']['tasks']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

export interface TaskWithContact extends Task {
  contact?: Contact | null;
}

interface TaskListProps {
  tasks: TaskWithContact[];
  showProject?: boolean;
  showContact?: boolean;
  onTaskUpdate?: () => void;
}

export function TaskList({ tasks, showProject = false, showContact = false, onTaskUpdate }: TaskListProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();

  const handleTaskCompletion = async (task: Task, completed: boolean) => {
    setUpdatingTasks(prev => new Set(prev).add(task.id));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed,
          status: completed ? 'completed' : 'todo',
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) {
        throw error;
      }

      if (onTaskUpdate) {
        onTaskUpdate();
      } else {
        router.refresh();
      }

      // Show XP notification if task was completed
      if (completed) {
        const xpEarned = task.complexity === 'simple' ? 25 : 
                        task.complexity === 'medium' ? 50 : 100;
        // TODO: Show toast notification with XP earned
        console.log(`+${xpEarned} XP earned!`);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // TODO: Show error toast
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      if (onTaskUpdate) {
        onTaskUpdate();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      // TODO: Show error toast
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  const complexityColors = {
    simple: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    medium: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    complex: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No tasks yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card key={task.id} className={`transition-all ${task.completed ? 'opacity-70' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div className="flex items-center h-5 pt-1">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => 
                    handleTaskCompletion(task, checked as boolean)
                  }
                  disabled={updatingTasks.has(task.id)}
                />
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Task Meta Information */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="outline" className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                  
                  <Badge variant="outline" className={complexityColors[task.complexity]}>
                    {task.complexity}
                  </Badge>

                  <Badge variant="outline" className={statusColors[task.status]}>
                    {task.status.replace('_', ' ')}
                  </Badge>

                  {showContact && task.contact && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{task.contact.name}</span>
                      {task.contact.company && (
                        <span className="text-gray-400">@ {task.contact.company}</span>
                      )}
                    </div>
                  )}

                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(task.due_date), 'MMM d')}</span>
                    </div>
                  )}

                  {task.xp_earned > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-current" />
                      <span>+{task.xp_earned} XP</span>
                    </div>
                  )}

                  {!task.completed && (
                    <div className="text-xs text-muted-foreground">
                      Earn {task.complexity === 'simple' ? 25 : task.complexity === 'medium' ? 50 : 100} XP
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}