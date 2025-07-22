import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema, type InsertContact } from "@shared/schema";
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
import { Plus, Users } from "lucide-react";

interface AddContactDialogProps {
  children?: React.ReactNode;
}

export default function AddContactDialog({ children }: AddContactDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      priority: "medium",
      tags: [],
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      return await apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Contact Added!",
        description: "Your new contact has been added successfully.",
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
        description: "Failed to create contact",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    // Convert tags string to array
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-accent-orange hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="github-secondary border-github-border text-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center">
            <Users className="w-5 h-5 mr-2 text-orange-400" />
            Add New Contact
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full name..."
                      className="github-dark border-github-border text-primary"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        className="github-dark border-github-border text-primary"
                        {...field}
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
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company name"
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
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary">Position</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Job title"
                        className="github-dark border-github-border text-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      <SelectItem value="low" className="text-primary">Low Priority</SelectItem>
                      <SelectItem value="medium" className="text-primary">Medium Priority</SelectItem>
                      <SelectItem value="high" className="text-primary">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="client, friend, colleague (comma separated)"
                      className="github-dark border-github-border text-primary"
                      {...field}
                      value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this contact..."
                      className="github-dark border-github-border text-primary resize-none"
                      rows={3}
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
                className="bg-accent-orange hover:bg-orange-600 text-white"
              >
                {createMutation.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}