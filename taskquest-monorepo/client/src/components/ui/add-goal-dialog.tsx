import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoalSchema, type InsertGoal } from "@shared/schema";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";

interface AddGoalDialogProps {
  children?: React.ReactNode;
}

export default function AddGoalDialog({ children }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertGoal>({
    resolver: zodResolver(insertGoalSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "medium",
      targetXP: 1000,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertGoal) => {
      return await apiRequest("POST", "/api/goals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Goal Created!",
        description: "Your new goal has been created successfully.",
        variant: "default",
      });
      form.reset();
      setOpen(false);
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
        description: "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertGoal) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-accent-blue hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="github-secondary border-github-border text-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-400" />
            Create New Goal
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Goal Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter goal name..."
                      className="github-dark border-github-border text-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your goal..."
                      className="github-dark border-github-border text-primary resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="github-dark border-github-border text-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="github-secondary border-github-border">
                        <SelectItem value="low" className="text-primary">Low</SelectItem>
                        <SelectItem value="medium" className="text-primary">Medium</SelectItem>
                        <SelectItem value="high" className="text-primary">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetXP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Target XP</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                        placeholder="1000"
                        className="github-dark border-github-border text-primary"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="github-dark border-github-border text-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Target Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="github-dark border-github-border text-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-github-border text-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-accent-blue hover:bg-blue-600 text-white"
              >
                {createMutation.isPending ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}