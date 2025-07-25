// Epic 7, Story 7.3: Create Guild Dialog Component

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Target, 
  BookOpen, 
  Dumbbell, 
  Palette, 
  Briefcase,
  Heart,
  Globe,
  Lock
} from 'lucide-react';
import type { CreateGuildRequest } from '@/lib/types/social';

const guildSchema = z.object({
  name: z.string().min(3, 'Guild name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['productivity', 'learning', 'fitness', 'creativity', 'business', 'social']),
  max_members: z.number().min(2).max(1000).default(100),
  is_public: z.boolean().default(true),
});

type GuildFormData = z.infer<typeof guildSchema>;

interface CreateGuildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateGuildRequest) => Promise<void>;
  isLoading?: boolean;
}

const guildCategories = [
  {
    value: 'productivity',
    label: 'Productivity',
    description: 'Focus on productivity, time management, and efficiency',
    icon: Target,
  },
  {
    value: 'learning',
    label: 'Learning & Education',
    description: 'Share knowledge, study groups, and skill development',
    icon: BookOpen,
  },
  {
    value: 'fitness',
    label: 'Health & Fitness',
    description: 'Fitness goals, wellness, and healthy lifestyle',
    icon: Dumbbell,
  },
  {
    value: 'creativity',
    label: 'Creative Arts',
    description: 'Art, writing, music, and creative projects',
    icon: Palette,
  },
  {
    value: 'business',
    label: 'Business & Career',
    description: 'Professional development and business goals',
    icon: Briefcase,
  },
  {
    value: 'social',
    label: 'Social & Community',
    description: 'General social interaction and community building',
    icon: Heart,
  },
] as const;

export function CreateGuildDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateGuildDialogProps) {
  const form = useForm<GuildFormData>({
    resolver: zodResolver(guildSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'productivity',
      max_members: 100,
      is_public: true,
    },
  });

  const selectedCategory = form.watch('category');
  const isPublic = form.watch('is_public');

  const handleSubmit = async (data: GuildFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating guild:', error);
    }
  };

  const selectedCategoryInfo = guildCategories.find(cat => cat.value === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Guild</DialogTitle>
          <DialogDescription>
            Start a community around shared interests and goals.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Guild Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guild Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter guild name" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a unique and memorable name for your guild.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {guildCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{category.label}</div>
                                <div className="text-xs text-gray-500">{category.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedCategoryInfo && (
                    <FormDescription>
                      {selectedCategoryInfo.description}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your guild's purpose and goals..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help others understand what your guild is about.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Members */}
            <FormField
              control={form.control}
              name="max_members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Members</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={1000}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Set the maximum number of members for your guild (2-1000).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Public/Private Toggle */}
            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      {isPublic ? (
                        <>
                          <Globe className="h-4 w-4 text-green-600" />
                          Public Guild
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-orange-600" />
                          Private Guild
                        </>
                      )}
                    </FormLabel>
                    <FormDescription>
                      {isPublic 
                        ? 'Anyone can discover and join this guild.' 
                        : 'Members must be invited to join this guild.'
                      }
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Guild Preview */}
            <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900">
              <h4 className="font-semibold mb-2">Guild Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {form.watch('name') || 'Your Guild Name'} • 
                    {selectedCategoryInfo?.label} • 
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                {form.watch('description') && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {form.watch('description')}
                  </p>
                )}
                <div className="text-xs text-gray-500">
                  Max {form.watch('max_members')} members
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Guild'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}