import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Calendar, User, Target, Zap, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";

interface TaskItemProps {
  task: {
    id: number;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    complexity: "simple" | "medium" | "complex";
    status: "pending" | "completed" | "cancelled";
    xpReward: number;
    dueDate?: string;
    goalId?: number;
    contactId?: number;
    createdAt: string;
    goal?: { name: string };
    contact?: { name: string };
  };
}

export default function TaskItem({ task }: TaskItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { status: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${task.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (task.status !== "completed") {
        toast({
          title: "Task Completed! 🎉",
          description: `You earned ${task.xpReward} XP!`,
          variant: "default",
        });
      }
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
        description: "Failed to update task",
        variant: "destructive",
      });
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (checked: boolean) => {
    if (task.status === "completed" && !checked) return; // Prevent unchecking completed tasks
    setIsUpdating(true);
    updateTaskMutation.mutate({ status: checked ? "completed" : "pending" });
  };

  const priorityColors = {
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const complexityColors = {
    simple: "bg-green-500/10 text-green-400 border-green-500/20",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    complex: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";

  return (
    <Card className={`github-secondary border-github-border transition-colors ${
      task.status === "completed" 
        ? "opacity-75" 
        : isOverdue 
          ? "border-red-500/30" 
          : "hover:border-blue-500/30"
    }`}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-0.5">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={handleStatusChange}
              disabled={isUpdating}
              className="border-github-border data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <h3 className={`font-medium text-primary truncate ${
                task.status === "completed" ? "line-through text-secondary" : ""
              }`}>
                {task.title}
              </h3>
            </div>

            {task.description && (
              <p className="text-sm text-secondary mb-2 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center flex-wrap gap-2 mb-2">
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
              <Badge variant="outline" className={complexityColors[task.complexity]}>
                {task.complexity}
              </Badge>
              <div className="flex items-center space-x-1 text-xs text-orange-400">
                <Zap className="w-3 h-3" />
                <span>{task.xpReward} XP</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-secondary">
              <div className="flex items-center space-x-4">
                {task.goal && (
                  <div className="flex items-center space-x-1">
                    <Target className="w-3 h-3" />
                    <span className="truncate max-w-24">{task.goal.name}</span>
                  </div>
                )}
                {task.contact && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-24">{task.contact.name}</span>
                  </div>
                )}
              </div>

              {task.dueDate && (
                <div className={`flex items-center space-x-1 ${
                  isOverdue ? "text-red-400" : "text-secondary"
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(task.dueDate), "MMM d")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}