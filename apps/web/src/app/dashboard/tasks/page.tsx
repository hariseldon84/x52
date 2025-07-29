import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, CheckSquare, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects:project_id (
        id,
        title,
        goals:goal_id (
          id,
          title
        )
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading tasks:', error);
  }

  const statusColors = {
    todo: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage all your tasks across goals and projects
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/goals">
            <Plus className="mr-2 h-4 w-4" /> 
            Select Goal to Add Task
          </Link>
        </Button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by creating a goal, then add projects and tasks to stay organized.
            </p>
            <Button asChild>
              <Link href="/dashboard/goals/new">
                Create Your First Goal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                      {task.status?.replace('_', ' ')}
                    </Badge>
                    <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    {task.projects && (
                      <span>
                        Project: {task.projects.title}
                      </span>
                    )}
                    {task.projects?.goals && (
                      <span>
                        Goal: {task.projects.goals.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {task.due_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <span>
                      {task.xp_earned || 0} XP
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}