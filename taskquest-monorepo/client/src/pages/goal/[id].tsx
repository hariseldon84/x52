import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Goal, ProjectWithStats } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, ArrowLeft, Plus, Zap, ListChecks } from "lucide-react";
import AddProjectDialog from "@/components/ui/add-project-dialog";
import ProjectCard from "@/components/ui/project-card";
import { format } from "date-fns";
import Link from "next/link";

export default function GoalDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();

  // Fetch goal details
  const { data: goal, isLoading: isLoadingGoal } = useQuery({
    queryKey: [`/api/goals/${id}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/goals/${id}`);
      return response as Goal;
    },
    enabled: !!id && isAuthenticated,
  });

  // Fetch projects for this goal
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects, 
    refetch: refetchProjects 
  } = useQuery({
    queryKey: [`/api/goals/${id}/projects`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/goals/${id}/projects`);
      return response as ProjectWithStats[];
    },
    enabled: !!id && isAuthenticated,
  });

  // Handle unauthorized access
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to view this page.",
        variant: "destructive",
      });
      router.push("/api/login");
    }
  }, [isAuthenticated, isLoadingAuth, router, toast]);

  // Calculate progress percentage
  const progressPercentage = goal?.targetXP 
    ? (goal.earnedXP / goal.targetXP) * 100 
    : 0;

  // Handle project updates
  const handleProjectUpdated = () => {
    refetchProjects();
  };

  if (isLoadingAuth || isLoadingGoal) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center space-x-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
          <p>Goal not found or you don't have permission to view it.</p>
        </div>
        <Button onClick={() => router.push("/goals")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Goals
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/goals")}
          className="text-secondary hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Goals
        </Button>
      </div>

      {/* Goal Header */}
      <Card className="github-secondary border-github-border mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-xl font-semibold text-primary">
                  {goal.name}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    goal.status === 'active' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : goal.status === 'completed' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  }`}
                >
                  {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                </Badge>
              </div>
              
              {goal.description && (
                <p className="text-sm text-secondary mt-2">{goal.description}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <AddProjectDialog 
                goalId={goal.id} 
                onSuccess={handleProjectUpdated}
              >
                <Button size="sm" className="bg-accent-blue hover:bg-blue-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Project
                </Button>
              </AddProjectDialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* XP Progress */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-secondary">
                <Zap className="w-4 h-4 mr-1.5 text-yellow-400" />
                <span>XP Progress</span>
              </div>
              <span className="font-medium text-primary">
                {goal.earnedXP} / {goal.targetXP} XP
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 ease-in-out"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-medium text-white/90">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Goal Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center text-secondary">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p>{format(new Date(goal.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
            
            {goal.targetDate && (
              <div className="flex items-center text-secondary">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Target Date</p>
                  <p>{format(new Date(goal.targetDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center text-secondary">
              <ListChecks className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Projects</p>
                <p>{projects.length} {projects.length === 1 ? 'Project' : 'Projects'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Projects</h2>
          <div className="text-sm text-secondary">
            {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
          </div>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onProjectUpdated={handleProjectUpdated}
              />
            ))}
          </div>
        ) : (
          <Card className="github-secondary border-github-border p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <ListChecks className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-primary">No projects yet</h3>
              <p className="text-sm text-secondary max-w-md">
                Get started by creating your first project for this goal. Break down your goal into manageable projects.
              </p>
              <AddProjectDialog 
                goalId={goal.id}
                onSuccess={handleProjectUpdated}
              >
                <Button className="mt-2 bg-accent-blue hover:bg-blue-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </AddProjectDialog>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
