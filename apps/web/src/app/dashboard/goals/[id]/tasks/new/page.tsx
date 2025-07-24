import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function NewTaskPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirect('/login');
  }

  // Fetch the goal to get the project
  const { data: goal } = await supabase
    .from('goals')
    .select('*, projects(*)')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single();

  if (!goal) {
    return notFound();
  }

  // Get the first project under this goal, or we'll create a default one
  let projectId = goal.projects?.[0]?.id;

  // If no project exists, create a default one
  if (!projectId) {
    const { data: newProject } = await supabase
      .from('projects')
      .insert([{
        goal_id: goal.id,
        user_id: session.user.id,
        title: `${goal.title} - Main Project`,
        description: `Default project for ${goal.title}`,
        status: 'active',
      }])
      .select()
      .single();

    projectId = newProject?.id;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/goals/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Task</h1>
          <p className="text-muted-foreground">
            Add a new task for "{goal.title}"
          </p>
        </div>
      </div>

      <TaskForm 
        projectId={projectId} 
        goalId={params.id}
        onSuccess={() => {
          redirect(`/dashboard/goals/${params.id}`);
        }}
      />
    </div>
  );
}