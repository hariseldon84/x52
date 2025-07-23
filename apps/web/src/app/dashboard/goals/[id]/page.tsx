import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default async function GoalPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirect('/auth/signin');
  }

  // Fetch the specific goal
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!goal) {
    return notFound();
  }

  // Fetch tasks for this goal
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('goal_id', params.id)
    .order('due_date', { ascending: true });

  // Calculate progress
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(task => task.completed).length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard/goals">
                <ChevronUp className="h-4 w-4 transform rotate-90" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
            <Badge variant={goal.completed ? 'default' : 'secondary'}>
              {goal.completed ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            {goal.description || 'No description provided.'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/goals/${goal.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/goals/${goal.id}/delete`}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Your current progress on this goal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span>{completedTasks} of {totalTasks} tasks</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-right text-sm font-medium">{progress}%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due Date</CardTitle>
            <CardDescription>When this goal should be completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {format(new Date(goal.due_date), 'MMMM d, yyyy')}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(goal.due_date) > new Date() ? 'Due in ' : 'Overdue by '}
              {Math.ceil(
                (new Date(goal.due_date).getTime() - new Date().getTime()) / 
                (1000 * 60 * 60 * 24)
              )} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rewards</CardTitle>
            <CardDescription>Earn XP for completing tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <div className="text-lg font-medium">{goal.xp_value || 0} XP</div>
                <div className="text-sm text-muted-foreground">
                  {completedTasks > 0 ? `${completedTasks * 10} XP earned` : 'Complete tasks to earn XP'}
                </div>
              </div>
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2">
                <span className="text-amber-600 dark:text-amber-400 text-2xl">✨</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Button asChild>
          <Link href={`/dashboard/goals/${goal.id}/tasks/new`}>
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Link>
        </Button>
      </div>

      {tasks && tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className={task.completed ? 'opacity-70' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={task.completed}
                      readOnly
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between">
                      <h3 className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No tasks yet for this goal</p>
            <Button asChild>
              <Link href={`/dashboard/goals/${goal.id}/tasks/new`}>
                <Plus className="mr-2 h-4 w-4" /> Add your first task
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
