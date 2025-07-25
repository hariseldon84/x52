'use client';

import { useState } from 'react';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Phone, Mail, Calendar, Users, MessageSquare, CheckSquare, Edit2, Trash2, Plus 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';

type ContactInteraction = Database['public']['Tables']['contact_interactions']['Row'];
type InteractionType = Database['public']['Enums']['interaction_type'];

interface InteractionHistoryProps {
  contactId: string;
  interactions: ContactInteraction[];
  onUpdate: () => void;
}

interface InteractionFormData {
  type: InteractionType;
  title: string;
  description: string;
  duration_minutes: number | null;
  interaction_date: string;
}

const interactionTypeIcons = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  social: Users,
  task: CheckSquare,
  note: MessageSquare,
};

const interactionTypeColors = {
  call: 'bg-green-100 text-green-800',
  meeting: 'bg-blue-100 text-blue-800',
  email: 'bg-purple-100 text-purple-800',
  social: 'bg-pink-100 text-pink-800',
  task: 'bg-orange-100 text-orange-800',
  note: 'bg-gray-100 text-gray-800',
};

const interactionTypeLabels = {
  call: 'Phone Call',
  meeting: 'Meeting',
  email: 'Email',
  social: 'Social',
  task: 'Task',
  note: 'Note',
};

export function InteractionHistory({ contactId, interactions, onUpdate }: InteractionHistoryProps) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<ContactInteraction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InteractionFormData>({
    type: 'note',
    title: '',
    description: '',
    duration_minutes: null,
    interaction_date: new Date().toISOString().slice(0, 16), // Format for datetime-local input
  });

  const supabase = createClient();

  const resetForm = () => {
    setFormData({
      type: 'note',
      title: '',
      description: '',
      duration_minutes: null,
      interaction_date: new Date().toISOString().slice(0, 16),
    });
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('contact_interactions')
        .insert([{
          contact_id: contactId,
          user_id: user.id,
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          duration_minutes: formData.duration_minutes,
          interaction_date: new Date(formData.interaction_date).toISOString(),
        }]);

      if (error) throw error;

      setIsAddFormOpen(false);
      resetForm();
      onUpdate();
    } catch (err: any) {
      console.error('Error adding interaction:', err);
      alert('Failed to add interaction: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInteraction) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contact_interactions')
        .update({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          duration_minutes: formData.duration_minutes,
          interaction_date: new Date(formData.interaction_date).toISOString(),
        })
        .eq('id', editingInteraction.id);

      if (error) throw error;

      setEditingInteraction(null);
      resetForm();
      onUpdate();
    } catch (err: any) {
      console.error('Error updating interaction:', err);
      alert('Failed to update interaction: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    if (!confirm('Are you sure you want to delete this interaction?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_interactions')
        .delete()
        .eq('id', interactionId);

      if (error) throw error;

      onUpdate();
    } catch (err: any) {
      console.error('Error deleting interaction:', err);
      alert('Failed to delete interaction: ' + err.message);
    }
  };

  const startEditInteraction = (interaction: ContactInteraction) => {
    setEditingInteraction(interaction);
    setFormData({
      type: interaction.type,
      title: interaction.title,
      description: interaction.description || '',
      duration_minutes: interaction.duration_minutes,
      interaction_date: new Date(interaction.interaction_date).toISOString().slice(0, 16),
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const InteractionForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Interaction Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: InteractionType) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(interactionTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interaction_date">Date & Time</Label>
          <Input
            type="datetime-local"
            value={formData.interaction_date}
            onChange={(e) => setFormData({ ...formData, interaction_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of the interaction"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed notes about the interaction..."
          rows={3}
        />
      </div>

      {(formData.type === 'call' || formData.type === 'meeting') && (
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.duration_minutes || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              duration_minutes: e.target.value ? parseInt(e.target.value) : null 
            })}
            placeholder="How long was the interaction?"
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : (isEdit ? 'Update Interaction' : 'Add Interaction')}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsAddFormOpen(false);
            setEditingInteraction(null);
            resetForm();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Interaction History</h3>
        <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Log Interaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log New Interaction</DialogTitle>
            </DialogHeader>
            <InteractionForm onSubmit={handleAddInteraction} />
          </DialogContent>
        </Dialog>
      </div>

      {interactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interactions yet</h3>
            <p className="text-gray-600 mb-4">Start logging interactions to track your relationship history.</p>
            <Button onClick={() => setIsAddFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log First Interaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const IconComponent = interactionTypeIcons[interaction.type];
            return (
              <Card key={interaction.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-gray-500 mt-0.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{interaction.title}</h4>
                          <Badge className={interactionTypeColors[interaction.type]}>
                            {interactionTypeLabels[interaction.type]}
                          </Badge>
                          {interaction.duration_minutes && (
                            <Badge variant="outline">
                              {formatDuration(interaction.duration_minutes)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {format(new Date(interaction.interaction_date), 'PPp')}
                        </p>
                        {interaction.description && (
                          <p className="text-sm text-gray-700">{interaction.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditInteraction(interaction)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInteraction(interaction.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Interaction Dialog */}
      <Dialog open={!!editingInteraction} onOpenChange={(open) => {
        if (!open) {
          setEditingInteraction(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Interaction</DialogTitle>
          </DialogHeader>
          <InteractionForm onSubmit={handleEditInteraction} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}