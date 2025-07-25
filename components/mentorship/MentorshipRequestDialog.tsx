// Epic 7, Story 7.4: Mentorship Request Dialog Component

import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Plus } from 'lucide-react';
import type { MentorProfile } from '@/lib/types/social';

const requestSchema = z.object({
  message: z.string().min(50, 'Please provide a detailed message (at least 50 characters)').max(1000),
  goals: z.array(z.string()).min(1, 'Please specify at least one goal'),
  newGoal: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface MentorshipRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentor: MentorProfile | null;
  onSubmit: (mentorId: string, message: string, goals: string[]) => Promise<void>;
  isLoading?: boolean;
}

const commonGoals = [
  'Career Advancement',
  'Skill Development',
  'Leadership Skills',
  'Time Management',
  'Work-Life Balance',
  'Technical Skills',
  'Communication Skills',
  'Problem Solving',
  'Goal Setting',
  'Networking',
  'Personal Branding',
  'Interview Preparation',
];

export function MentorshipRequestDialog({
  open,
  onOpenChange,
  mentor,
  onSubmit,
  isLoading = false,
}: MentorshipRequestDialogProps) {
  const [customGoals, setCustomGoals] = useState<string[]>([]);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      message: '',
      goals: [],
      newGoal: '',
    },
  });

  const selectedGoals = form.watch('goals');
  const newGoal = form.watch('newGoal');

  const handleSubmit = async (data: RequestFormData) => {
    if (!mentor) return;

    try {
      const allGoals = [...data.goals, ...customGoals];
      await onSubmit(mentor.user_id, data.message, allGoals);
      form.reset();
      setCustomGoals([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending mentorship request:', error);
    }
  };

  const addCustomGoal = () => {
    if (newGoal.trim() && !customGoals.includes(newGoal.trim())) {
      setCustomGoals([...customGoals, newGoal.trim()]);
      form.setValue('newGoal', '');
    }
  };

  const removeCustomGoal = (goal: string) => {
    setCustomGoals(customGoals.filter(g => g !== goal));
  };

  const toggleGoal = (goal: string) => {
    const current = form.getValues('goals');
    if (current.includes(goal)) {
      form.setValue('goals', current.filter(g => g !== goal));
    } else {
      form.setValue('goals', [...current, goal]);
    }
  };

  if (!mentor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Mentorship</DialogTitle>
          <DialogDescription>
            Send a mentorship request to {mentor.user?.full_name}
          </DialogDescription>
        </DialogHeader>

        {/* Mentor Preview */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={mentor.user?.avatar_url} />
            <AvatarFallback>
              {mentor.user?.full_name?.charAt(0) || 'M'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="font-semibold">{mentor.user?.full_name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mentor.experience_level.charAt(0).toUpperCase() + mentor.experience_level.slice(1)} • 
              {mentor.expertise_areas.slice(0, 2).join(', ')}
              {mentor.expertise_areas.length > 2 && ` +${mentor.expertise_areas.length - 2} more`}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Introduction Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Introduce yourself and explain why you'd like this person as your mentor. What specific help are you seeking?"
                      className="resize-none"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be specific about your background, current situation, and what you hope to achieve through mentorship.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Goals Selection */}
            <FormField
              control={form.control}
              name="goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentorship Goals</FormLabel>
                  <FormDescription>
                    Select the areas where you'd like guidance and support.
                  </FormDescription>
                  
                  <div className="space-y-3">
                    {/* Common Goals */}
                    <div className="flex flex-wrap gap-2">
                      {commonGoals.map((goal) => (
                        <Button
                          key={goal}
                          type="button"
                          variant={selectedGoals.includes(goal) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleGoal(goal)}
                        >
                          {goal}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Goals */}
                    {customGoals.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {customGoals.map((goal) => (
                          <Badge
                            key={goal}
                            variant="secondary"
                            className="px-3 py-1 flex items-center gap-1"
                          >
                            {goal}
                            <button
                              type="button"
                              onClick={() => removeCustomGoal(goal)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Add Custom Goal */}
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="newGoal"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Add a custom goal..."
                                {...field}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomGoal();
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomGoal}
                        disabled={!newGoal?.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Goals Summary */}
            {(selectedGoals.length > 0 || customGoals.length > 0) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Selected Goals:</h4>
                <div className="flex flex-wrap gap-1">
                  {[...selectedGoals, ...customGoals].map((goal, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || selectedGoals.length === 0 && customGoals.length === 0}
              >
                {isLoading ? 'Sending Request...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}