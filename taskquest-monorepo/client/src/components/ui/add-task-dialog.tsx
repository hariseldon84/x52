import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type InsertTask } from "@shared/schema";
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
import { Plus, Zap } from "lucide-react";

interface AddTaskDialogProps {
  children?: React.ReactNode;
  goalId?: number;
  projectId?: number;
  contactId?: number;
}

export default function AddTaskDialog({ children, goalId, projectId, contactId }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ["/api/goals"],
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: open,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: open,
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema.extend({
      dueDate: insertTaskSchema.shape.dueDate.optional(),
    })),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      complexity: "simple",
      xpReward: 25,
      goalId: goalId || null,
      projectId: projectId || null,
      contactId: contactId || null,
      dueDate: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Task Created!",
        description: "Your new task has been added successfully.",
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
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTask) => {
    // Set XP based on complexity
    const xpMap = {
      simple: 25,
      medium: 75,
      complex: 150
    };
    data.xpReward = xpMap[data.complexity as keyof typeof xpMap] || 25;
    
    createMutation.mutate(data);
  };

  const complexity = form.watch("complexity");
  const xpPreview = {
    simple: 25,
    medium: 75,
    complex: 150
  }[complexity as keyof typeof xpPreview] || 25;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-accent-blue hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="github-secondary border-github-border text-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Create New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter task title..."
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
                      placeholder="Enter task description..."
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
                name="complexity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Complexity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="github-dark border-github-border text-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="github-secondary border-github-border">
                        <SelectItem value="simple" className="text-primary">Simple</SelectItem>
                        <SelectItem value="medium" className="text-primary">Medium</SelectItem>
                        <SelectItem value="complex" className="text-primary">Complex</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-primary">XP Reward: <span className="font-bold text-orange-400">{xpPreview} XP</span></span>
            </div>

            {!goalId && (
              <FormField
                control={form.control}
                name="goalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Goal (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                      <FormControl>
                        <SelectTrigger className="github-dark border-github-border text-primary">
                          <SelectValue placeholder="Select goal..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="github-secondary border-github-border">
                        {goals.map((goal: any) => (
                          <SelectItem key={goal.id} value={goal.id.toString()} className="text-primary">
                            {goal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!projectId && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Project (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                      <FormControl>
                        <SelectTrigger className="github-dark border-github-border text-primary">
                          <SelectValue placeholder="Select project..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="github-secondary border-github-border">
                        {projects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()} className="text-primary">
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!contactId && (
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Contact (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                      <FormControl>
                        <SelectTrigger className="github-dark border-github-border text-primary">
                          <SelectValue placeholder="Select contact..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="github-secondary border-github-border">
                        {contacts.map((contact: any) => (
                          <SelectItem key={contact.id} value={contact.id.toString()} className="text-primary">
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Due Date (Optional)</FormLabel>
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
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}