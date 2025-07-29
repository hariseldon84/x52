import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Target, FolderOpen } from 'lucide-react';

export default async function NewTaskPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's goals and projects
  const { data: goals, error } = await supabase
    .from('goals')
    .select(`
      *,
      projects (
        id,
        title,
        status
      )
    `)
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading goals:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Task</h1>
          <p className="text-muted-foreground">
            Select a goal and project to create your task
          </p>
        </div>
      </div>

      {!goals || goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a goal first before adding tasks.
            </p>
            <Button asChild>
              <Link href="/dashboard/goals/new">
                Create Your First Goal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span className="truncate">{goal.title}</span>
                </CardTitle>
                {goal.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {goal.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {goal.projects?.length || 0} project(s)
                  </div>
                  
                  {goal.projects && goal.projects.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select a project:</p>
                      {goal.projects.map((project) => (
                        <Button
                          key={project.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link href={`/dashboard/goals/${goal.id}/tasks/new?projectId=${project.id}`}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {project.title}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        No projects yet
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <Link href={`/dashboard/goals/${goal.id}/projects/new`}>
                          Create Project First
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}