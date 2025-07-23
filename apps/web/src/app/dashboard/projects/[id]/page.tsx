import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, PauseCircle } from 'lucide-react';
import Link from 'next/link';

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!project) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Project not found</h2>
        <p className="text-muted-foreground mb-4">
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const statusIcons = {
    active: <Circle className="h-4 w-4 fill-green-500 text-green-500" />,
    completed: <CheckCircle className="h-4 w-4 fill-green-500 text-green-500" />,
    paused: <PauseCircle className="h-4 w-4 fill-yellow-500 text-yellow-500" />,
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <Badge variant="outline" className="flex items-center gap-1">
              {statusIcons[project.status]}
              <span className="capitalize">{project.status}</span>
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit</Button>
          <Button>Add Task</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completion</span>
                <span className="font-medium">{Math.round(project.progress)}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
              <div className="text-sm text-muted-foreground">
                {project.completed_task_count} of {project.task_count} tasks completed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {project.task_count > 0 ? (
              <div className="space-y-4">
                {/* Task list will go here */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 rounded" />
                      <span>Example Task</span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      To Do
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No tasks yet</p>
                <Button>Create your first task</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
