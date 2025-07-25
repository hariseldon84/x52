'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskList, TaskWithContact } from './task-list';
import { ContactForm } from './contact-form';
import { InteractionHistory } from './interaction-history';
import { FollowUpList } from './follow-up-list';
import { 
  ArrowLeft, Edit2, Mail, Phone, Building, User, Calendar, 
  MessageSquare, CheckSquare, History, Bell, Plus 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInteraction = Database['public']['Tables']['contact_interactions']['Row'];
type FollowUp = Database['public']['Tables']['follow_ups']['Row'];

interface ContactDetailProps {
  contact: Contact;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  vip: 'bg-purple-100 text-purple-800',
};

const priorityLabels = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  vip: 'VIP',
};

export function ContactDetail({ contact: initialContact }: ContactDetailProps) {
  const [contact, setContact] = useState<Contact>(initialContact);
  const [tasks, setTasks] = useState<TaskWithContact[]>([]);
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const router = useRouter();
  const supabase = createClient();

  const loadContactData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load tasks for this contact with contact information
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('contact_id', contact.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Load interactions for this contact
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('contact_interactions')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('user_id', user.id)
        .order('interaction_date', { ascending: false });

      if (interactionsError) throw interactionsError;

      // Load follow-ups for this contact
      const { data: followUpsData, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (followUpsError) throw followUpsError;

      setTasks(tasksData || []);
      setInteractions(interactionsData || []);
      setFollowUps(followUpsData || []);

    } catch (err: any) {
      console.error('Error loading contact data:', err);
      setError(err.message || 'Failed to load contact data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContactData();
  }, [contact.id]);

  const handleEditContact = (updatedContact: Contact) => {
    setContact(updatedContact);
    setIsEditFormOpen(false);
  };

  const formatLastContactDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);
  const pendingFollowUps = followUps.filter(followUp => followUp.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/contacts')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Contacts</span>
          </Button>
        </div>
        <Button onClick={() => setIsEditFormOpen(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Contact
        </Button>
      </div>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {contact.avatar_url ? (
                  <img src={contact.avatar_url} alt={contact.name} className="rounded-full" />
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-gray-200 rounded-full">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                )}
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
                {contact.role && contact.company && (
                  <p className="text-lg text-gray-600">
                    {contact.role} at {contact.company}
                  </p>
                )}
                {contact.role && !contact.company && (
                  <p className="text-lg text-gray-600">{contact.role}</p>
                )}
                {!contact.role && contact.company && (
                  <p className="text-lg text-gray-600">{contact.company}</p>
                )}
              </div>
            </div>
            <Badge className={priorityColors[contact.priority]}>
              {priorityLabels[contact.priority]}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {contact.email && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <a 
                    href={`mailto:${contact.email}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <a 
                    href={`tel:${contact.phone}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              
              {contact.company && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{contact.company}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Last contact: {formatLastContactDate(contact.last_contact_date)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <CheckSquare className="h-4 w-4" />
                <span>{completedTasks.length} completed tasks</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <History className="h-4 w-4" />
                <span>{interactions.length} interactions logged</span>
              </div>
            </div>
          </div>
          
          {contact.notes && (
            <div className="mt-4">
              <div className="flex items-start space-x-2 text-gray-600">
                <MessageSquare className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">Notes</p>
                  <p className="text-sm">{contact.notes}</p>
                </div>
              </div>
            </div>
          )}
          
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {contact.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-sm text-gray-600">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                <p className="text-sm text-gray-600">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <History className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{interactions.length}</p>
                <p className="text-sm text-gray-600">Interactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingFollowUps.length}</p>
                <p className="text-sm text-gray-600">Follow-ups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Tasks, Interactions, and Follow-ups */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="interactions">
            Interactions ({interactions.length})
          </TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups ({followUps.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <Button
              onClick={() => router.push(`/dashboard/goals/new?contactId=${contact.id}`)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-8">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                <p className="text-gray-600 mb-4">Create your first task for this contact.</p>
                <Button onClick={() => router.push(`/dashboard/goals/new?contactId=${contact.id}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TaskList 
              tasks={tasks} 
              onTaskUpdate={loadContactData}
              showProject={true}
            />
          )}
        </TabsContent>
        
        <TabsContent value="interactions" className="space-y-4">
          <InteractionHistory 
            contactId={contact.id}
            interactions={interactions}
            onUpdate={loadContactData}
          />
        </TabsContent>
        
        <TabsContent value="followups" className="space-y-4">
          <FollowUpList 
            contactId={contact.id}
            followUps={followUps}
            onUpdate={loadContactData}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Contact Form Modal */}
      <ContactForm
        contact={contact}
        onSave={handleEditContact}
        onCancel={() => setIsEditFormOpen(false)}
        isOpen={isEditFormOpen}
      />
    </div>
  );
}