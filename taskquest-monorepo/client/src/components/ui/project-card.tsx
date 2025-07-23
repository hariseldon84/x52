import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle, 
  Pencil, 
  Trash2, 
  MoveVertical,
  ListChecks,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ProjectWithStats } from "@/services/projectService";
import EditProjectDialog from "./edit-project-dialog";
import MoveProjectDialog from "./move-project-dialog";
import DeleteProjectDialog from "./delete-project-dialog";

interface ProjectCardProps {
  project: ProjectWithStats;
  onProjectUpdated?: () => void;
  className?: string;
}

export default function ProjectCard({ project, onProjectUpdated, className = "" }: ProjectCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const statusIcons = {
    active: <PlayCircle className="w-4 h-4 mr-1" />,
    completed: <CheckCircle2 className="w-4 h-4 mr-1" />,
    paused: <PauseCircle className="w-4 h-4 mr-1" />
  };

  const statusColors = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    paused: "bg-orange-500/10 text-orange-400 border-orange-500/20"
  };

  const priorityColors = {
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20"
  };

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'paused') => {
    try {
      setIsUpdating(true);
      await apiRequest("PATCH", `/api/projects/${project.id}/status`, { status: newStatus });
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Project Updated",
        description: `Project marked as ${newStatus}.`,
        variant: "default",
      });
      
      onProjectUpdated?.();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProjectDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    onProjectUpdated?.();
  };

  const handleProjectMoved = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    onProjectUpdated?.();
  };

  return (
    <Card className={`github-secondary border-github-border hover:border-blue-500/30 transition-colors ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-primary">{project.name}</h3>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <EditProjectDialog project={project} onSuccess={onProjectUpdated}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                  </Button>
                </EditProjectDialog>
                <MoveProjectDialog 
                  projectId={project.id} 
                  currentGoalId={project.goalId} 
                  onSuccess={handleProjectMoved}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoveVertical className="h-3 w-3 text-muted-foreground hover:text-primary" />
                  </Button>
                </MoveProjectDialog>
                <DeleteProjectDialog 
                  projectId={project.id} 
                  projectName={project.name} 
                  onSuccess={handleProjectDeleted}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DeleteProjectDialog>
              </div>
            </div>
            
            {project.description && (
              <p className="text-sm text-secondary mt-1 line-clamp-2">{project.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${priorityColors[project.priority as keyof typeof priorityColors] || ''}`}
            >
              {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  disabled={isUpdating}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="github-secondary border-github-border">
                <DropdownMenuItem 
                  className="hover:bg-github-tertiary cursor-pointer"
                  onClick={() => handleStatusChange('active')}
                  disabled={project.status === 'active' || isUpdating}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  <span>Mark as Active</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-github-tertiary cursor-pointer"
                  onClick={() => handleStatusChange('paused')}
                  disabled={project.status === 'paused' || isUpdating}
                >
                  <PauseCircle className="mr-2 h-4 w-4" />
                  <span>Pause Project</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-github-tertiary cursor-pointer"
                  onClick={() => handleStatusChange('completed')}
                  disabled={project.status === 'completed' || isUpdating}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  <span>Mark as Completed</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-github-border" />
                <MoveProjectDialog 
                  projectId={project.id} 
                  currentGoalId={project.goalId}
                  onSuccess={handleProjectMoved}
                >
                  <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-github-tertiary w-full">
                    <MoveVertical className="mr-2 h-4 w-4" />
                    <span>Move to Another Goal</span>
                  </div>
                </MoveProjectDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress and Stats */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-secondary">
            <div className="flex items-center">
              <ListChecks className="w-3 h-3 mr-1.5" />
              <span>Progress</span>
            </div>
            <span className="font-medium">
              {project.completedTaskCount} of {project.taskCount} tasks
            </span>
          </div>
          
          <div className="relative">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 ease-in-out"
                style={{ width: `${project.completionPercentage}%` }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-medium text-white/90">
                {project.completionPercentage}%
              </span>
            </div>
          </div>
          
          {project.targetDate && (
            <div className="flex items-center text-xs text-secondary">
              <Calendar className="w-3 h-3 mr-1.5 flex-shrink-0" />
              <span>Due {new Date(project.targetDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
