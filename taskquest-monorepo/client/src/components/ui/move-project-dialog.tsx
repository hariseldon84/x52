import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, MoveVertical } from "lucide-react";
import { Goal } from "@shared/schema";

interface MoveProjectDialogProps {
  projectId: number;
  currentGoalId: number | null;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export default function MoveProjectDialog({ 
  projectId, 
  currentGoalId,
  onSuccess, 
  children 
}: MoveProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all goals for the dropdown
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["/api/goals"],
    enabled: open, // Only fetch when dialog is open
    select: (data: any) => 
      (Array.isArray(data) ? data : []).filter((goal: Goal) => goal.id !== currentGoalId)
  });

  // Set initial selected goal when goals load
  useEffect(() => {
    if (goals.length > 0) {
      setSelectedGoalId(goals[0]?.id?.toString() || "");
    }
  }, [goals]);

  const moveMutation = useMutation({
    mutationFn: async (goalId: number | null) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}/move`, { goalId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Project Moved!",
        description: "Project has been moved successfully.",
        variant: "default",
      });
      
      setOpen(false);
      onSuccess?.();
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
        description: "Failed to move project",
        variant: "destructive",
      });
    },
  });

  const handleMove = () => {
    const goalId = selectedGoalId === "none" ? null : parseInt(selectedGoalId);
    moveMutation.mutate(goalId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoveVertical className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="github-secondary border-github-border">
        <DialogHeader>
          <DialogTitle className="text-primary">Move Project</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Select a goal to move this project to, or select "No Goal" to move it to your general projects.
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">
              Move to Goal
            </label>
            <Select 
              value={selectedGoalId} 
              onValueChange={setSelectedGoalId}
              disabled={isLoading || moveMutation.isPending}
            >
              <SelectTrigger className="github-secondary border-github-border text-primary">
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent className="github-secondary border-github-border">
                <SelectItem value="none">No Goal (General Projects)</SelectItem>
                {goals.map((goal: Goal) => (
                  <SelectItem key={goal.id} value={goal.id.toString()}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-github-border text-primary hover:bg-github-secondary"
              disabled={moveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-accent-blue hover:bg-blue-600 text-white"
              onClick={handleMove}
              disabled={isLoading || moveMutation.isPending}
            >
              {moveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move Project"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
