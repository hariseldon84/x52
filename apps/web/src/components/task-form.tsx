'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Users, ChevronDown } from 'lucide-react';
import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type Contact = Database['public']['Tables']['contacts']['Row'];

interface TaskFormProps {
  projectId?: string;
  goalId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function TaskForm({ projectId, goalId, onSuccess, onCancel, isModal = false }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Load contacts for selection
  useEffect(() => {
    const loadContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        console.error('Error loading contacts:', err);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    loadContacts();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const taskData: TaskInsert = {
        user_id: session.user.id,
        title,
        description: description || null,
        priority,
        complexity,
        due_date: dueDate?.toISOString() || null,
        project_id: projectId || null,
        contact_id: selectedContact?.id || null,
      };

      const { error: insertError } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (insertError) {
        throw insertError;
      }

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setComplexity('medium');
      setDueDate(undefined);
      setSelectedContact(null);

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  const complexityColors = {
    simple: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    medium: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    complex: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };

  const xpValues = {
    simple: 25,
    medium: 50,
    complex: 100,
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the task..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="flex flex-wrap gap-2">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <Badge
                key={p}
                variant={priority === p ? 'default' : 'outline'}
                className={priority === p ? priorityColors[p] : 'cursor-pointer'}
                onClick={() => setPriority(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Complexity</Label>
          <div className="flex flex-wrap gap-2">
            {(['simple', 'medium', 'complex'] as const).map((c) => (
              <Badge
                key={c}
                variant={complexity === c ? 'default' : 'outline'}
                className={complexity === c ? complexityColors[c] : 'cursor-pointer'}
                onClick={() => setComplexity(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Earn {xpValues[complexity]} XP when completed
          </p>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="space-y-2">
          <Label>Related Contact (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Users className="mr-2 h-4 w-4" />
                {selectedContact ? selectedContact.name : 'Select a contact'}
                <ChevronDown className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <div className="max-h-48 overflow-y-auto">
                <div className="p-2 border-b">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setSelectedContact(null)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    No contact
                  </Button>
                </div>
                {isLoadingContacts ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Loading contacts...
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{contact.name}</div>
                        {contact.company && (
                          <div className="text-xs text-gray-500">{contact.company}</div>
                        )}
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          {selectedContact && (
            <p className="text-xs text-muted-foreground">
              This task will be linked to {selectedContact.name}
              {selectedContact.company && ` from ${selectedContact.company}`}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Due Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Creating...' : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </>
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (isModal) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Task</CardTitle>
        <CardDescription>
          Add a new task to help you achieve your goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}