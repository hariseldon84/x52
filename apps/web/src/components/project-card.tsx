import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { MoreVertical, CheckCircle, PauseCircle, Circle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Link from 'next/link';
import { useState } from 'react';
import { MoveProjectDialog } from './move-project-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  task_count: number;
  completed_task_count: number;
  goal_id: string;
};

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const statusIcons = {
    active: <Circle className="h-3 w-3 fill-green-500 text-green-500" />,
    completed: <CheckCircle className="h-3 w-3 fill-green-500 text-green-500" />,
    paused: <PauseCircle className="h-3 w-3 fill-yellow-500 text-yellow-500" />,
  } as const;

  return (
    <>
      <MoveProjectDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        projectId={project.id}
        currentGoalId={project.goal_id}
      />
      <DeleteProjectDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        projectId={project.id}
        projectTitle={project.title}
      />
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                {project.title}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {statusIcons[project.status]}
              <span className="text-sm text-muted-foreground capitalize">
                {project.status}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/projects/${project.id}/edit`} className="w-full">
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsMoveDialogOpen(true)}>
                Move to Another Goal
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setIsDeleteDialogOpen(true);
                }}
              >
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {project.description || 'No description'}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{Math.round(project.progress)}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {project.completed_task_count} of {project.task_count} tasks completed
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
