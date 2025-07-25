import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Target, Calendar, Zap, MoreVertical, Play, Pause, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";
import EditGoalDialog from "./edit-goal-dialog";
import DeleteGoalDialog from "./delete-goal-dialog";

interface GoalCardProps {
  goal: {
    id: number;
    name: string;
    description?: string;
    priority: "low" | "medium" | "high";
    status: "active" | "completed" | "paused";
    targetXP: number;
    currentXP: number;
    startDate?: string;
    targetDate?: string;
    createdAt: string;
  };
}

export default function GoalCard({ goal }: GoalCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateGoalMutation = useMutation({
    mutationFn: async (data: { status: string }) => {
      return await apiRequest("PATCH", `/api/goals/${goal.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Goal Updated",
        description: "Goal status updated successfully.",
        variant: "default",
      });
      setIsUpdating(false);
    },
    onError: (error) => {
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
        description: "Failed to update goal",
        variant: "destructive",
      });
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    setIsUpdating(true);
    updateGoalMutation.mutate({ status: newStatus });
  };

  const progressPercentage = goal.targetXP > 0 ? (goal.currentXP / goal.targetXP) * 100 : 0;

  const priorityColors = {
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const statusColors = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    paused: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  const statusIcons = {
    active: Play,
    completed: CheckCircle2,
    paused: Pause,
  };

  const StatusIcon = statusIcons[goal.status];

  const handleDeleteSuccess = () => {
    // Invalidate queries to refresh the goals list
    queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  return (
    <Card className="github-secondary border-github-border hover:border-blue-500/30 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-primary">{goal.name}</h3>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <EditGoalDialog goal={goal}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                  </Button>
                </EditGoalDialog>
                <DeleteGoalDialog goalId={goal.id} goalName={goal.name} onSuccess={handleDeleteSuccess}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DeleteGoalDialog>
              </div>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <h3 className="font-medium text-primary truncate">{goal.name}</h3>
              <Badge 
                variant="outline" 
                className={`text-xs ${priorityColors[goal.priority]}`}
              >
                {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${statusColors[goal.status]}`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </Badge>
            </div>
            {goal.description && (
              <p className="text-sm text-secondary mb-3 line-clamp-2">{goal.description}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4 text-secondary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="github-secondary border-github-border">
              {goal.status !== "active" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("active")}
                  disabled={isUpdating}
                  className="text-primary hover:bg-green-500/10"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {goal.status !== "paused" && goal.status !== "completed" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("paused")}
                  disabled={isUpdating}
                  className="text-primary hover:bg-orange-500/10"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {goal.status !== "completed" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("completed")}
                  disabled={isUpdating}
                  className="text-primary hover:bg-blue-500/10"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>XP Progress</span>
              <span className="flex items-center">
                <Zap className="w-3 h-3 text-yellow-400 mr-1" />
                {goal.currentXP} / {goal.targetXP} XP
                <span className="ml-1">({Math.round(progressPercentage)}%)</span>
              </span>
            </div>
            <div className="relative">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-700/50">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 ease-in-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white">
                {progressPercentage > 30 ? (
                  <span className="text-white/90">
                    {progressPercentage < 100 ? 
                      `${Math.round(goal.targetXP - goal.currentXP)} XP to go!` : 
                      'Goal completed! 🎉'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={priorityColors[goal.priority]}>
              {goal.priority}
            </Badge>
            <Badge variant="outline" className={statusColors[goal.status]}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {goal.status}
            </Badge>
          </div>
          
          {goal.targetDate && (
            <div className="flex items-center space-x-1 text-xs text-secondary">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(goal.targetDate), "MMM d")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}