import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { ProjectCard } from '@/components/project-card';

export default async function GoalProjectsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('goal_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link href={`/dashboard/goals/${params.id}/projects/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects?.length === 0 && (
          <div className="text-muted-foreground text-center col-span-full py-12">
            No projects yet. Create your first project to get started.
          </div>
        )}
      </div>
    </div>
  );
}
