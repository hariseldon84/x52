import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function NewGoalPage() {
  async function createGoal(formData: FormData) {
    'use server';
    
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const dueDate = formData.get('dueDate') as string;
    
    // Basic validation
    if (!title || !dueDate) {
      return { error: 'Title and due date are required' };
    }

    const { error } = await supabase
      .from('goals')
      .insert([
        { 
          title, 
          description,
          due_date: dueDate,
          user_id: session.user.id,
          progress: 0,
          completed: false
        },
      ]);

    if (error) {
      return { error: error.message };
    }

    redirect('/dashboard/goals');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Goal</h1>
          <p className="text-muted-foreground">
            Create a new goal to work towards
          </p>
        </div>
      </div>

      <form action={createGoal} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="title">Goal Title *</Label>
          <Input 
            id="title" 
            name="title" 
            placeholder="E.g., Learn Next.js" 
            required 
          />
          <p className="text-sm text-muted-foreground">
            A clear, concise title for your goal
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            name="description" 
            placeholder="What do you want to achieve?"
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Add more details about your goal (optional)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input 
            type="date" 
            name="dueDate" 
            required
            min={format(new Date(), 'yyyy-MM-dd')}
          />
          <p className="text-sm text-muted-foreground">
            When do you want to achieve this by?
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button variant="outline" asChild type="button">
            <Link href="/dashboard/goals">
              Cancel
            </Link>
          </Button>
          <Button type="submit">Create Goal</Button>
        </div>
      </form>
    </div>
  );
}
