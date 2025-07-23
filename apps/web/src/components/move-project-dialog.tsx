'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

type Goal = {
  id: string;
  title: string;
};

type MoveProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentGoalId: string;
};

export function MoveProjectDialog({
  open,
  onOpenChange,
  projectId,
  currentGoalId,
}: MoveProjectDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(currentGoalId);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    async function fetchGoals() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('You must be logged in to view goals');
        }

        const { data, error } = await supabase
          .from('goals')
          .select('id, title')
          .neq('id', currentGoalId) // Exclude current goal from the list
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setGoals(data || []);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (open) {
      fetchGoals();
    }
  }, [open, currentGoalId]);

  async function handleMoveProject() {
    if (!selectedGoalId) return;
    
    try {
      setIsMoving(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          goal_id: selectedGoalId,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;
      
      onOpenChange(false);
      router.refresh();
      
      // Navigate to the new goal's projects page
      router.push(`/dashboard/goals/${selectedGoalId}/projects`);
    } catch (error) {
      console.error('Error moving project:', error);
    } finally {
      setIsMoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move Project</DialogTitle>
          <DialogDescription>
            Select a goal to move this project to. This will move all tasks within this project as well.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other goals available to move to.
            </p>
          ) : (
            <Select 
              value={selectedGoalId} 
              onValueChange={setSelectedGoalId}
              disabled={isMoving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleMoveProject}
            disabled={isMoving || goals.length === 0}
          >
            {isMoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              'Move Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
