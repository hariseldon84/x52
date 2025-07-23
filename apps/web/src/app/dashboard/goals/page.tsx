import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function GoalsPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirect('/auth/signin');
  }

  // Fetch user's goals with task counts
  const { data: goals } = await supabase
    .from('goals')
    .select(`
      *,
      tasks: tasks(count)
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">
            Manage your goals and track your progress
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/goals/new">
            <Plus className="mr-2 h-4 w-4" /> New Goal
          </Link>
        </Button>
      </div>

      {goals?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Link key={goal.id} href={`/dashboard/goals/${goal.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{goal.title}</CardTitle>
                    <Badge variant={goal.completed ? 'default' : 'secondary'}>
                      {goal.completed ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                  <CardDescription>{goal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">Tasks:</span>
                      <span>{(goal as any).tasks?.[0]?.count || 0}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(goal.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${goal.progress || 0}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="text-center p-8">
          <h3 className="text-lg font-medium mb-2">No goals yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first goal to get started on your productivity journey.
          </p>
          <Button asChild>
            <Link href="/dashboard/goals/new">
              <Plus className="mr-2 h-4 w-4" /> Create Goal
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
