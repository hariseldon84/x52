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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, Clock, CheckCircle, XCircle, Pause, Edit2, Trash2, Plus, Calendar 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

type FollowUp = Database['public']['Tables']['follow_ups']['Row'];
type FollowUpStatus = Database['public']['Enums']['follow_up_status'];

interface FollowUpListProps {
  contactId: string;
  followUps: FollowUp[];
  onUpdate: () => void;
}

interface FollowUpFormData {
  title: string;
  description: string;
  scheduled_date: string;
  is_recurring: boolean;
  recurrence_pattern: string;
  recurrence_interval: number;
}

const statusIcons = {
  pending: Bell,
  completed: CheckCircle,
  snoozed: Pause,
  cancelled: XCircle,
};

const statusColors = {
  pending: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  snoozed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  pending: 'Pending',
  completed: 'Completed',
  snoozed: 'Snoozed',
  cancelled: 'Cancelled',
};

const recurrencePatterns = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function FollowUpList({ contactId, followUps, onUpdate }: FollowUpListProps) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [formData, setFormData] = useState<FollowUpFormData>({
    title: '',
    description: '',
    scheduled_date: new Date().toISOString().slice(0, 16),
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
  });

  const supabase = createClient();

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduled_date: new Date().toISOString().slice(0, 16),
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_interval: 1,
    });
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('follow_ups')
        .insert([{
          contact_id: contactId,
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          scheduled_date: new Date(formData.scheduled_date).toISOString(),
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        }]);

      if (error) throw error;

      setIsAddFormOpen(false);
      resetForm();
      onUpdate();
    } catch (err: any) {
      console.error('Error adding follow-up:', err);
      alert('Failed to add follow-up: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFollowUpStatus = async (followUpId: string, status: FollowUpStatus, snoozeUntil?: string) => {
    try {
      const updateData: any = { 
        status,
        completed_date: status === 'completed' ? new Date().toISOString() : null,
      };

      if (status === 'snoozed' && snoozeUntil) {
        updateData.snooze_until = new Date(snoozeUntil).toISOString();
      }

      const { error } = await supabase
        .from('follow_ups')
        .update(updateData)
        .eq('id', followUpId);

      if (error) throw error;

      // If this was a recurring follow-up and it's being completed, create the next occurrence
      if (status === 'completed') {
        const followUp = followUps.find(f => f.id === followUpId);
        if (followUp && followUp.is_recurring && followUp.recurrence_pattern && followUp.recurrence_interval) {
          await createNextRecurrence(followUp);
        }
      }

      onUpdate();
    } catch (err: any) {
      console.error('Error updating follow-up:', err);
      alert('Failed to update follow-up: ' + err.message);
    }
  };

  const createNextRecurrence = async (followUp: FollowUp) => {
    if (!followUp.recurrence_pattern || !followUp.recurrence_interval) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentDate = new Date(followUp.scheduled_date);
      let nextDate: Date;

      switch (followUp.recurrence_pattern) {
        case 'daily':
          nextDate = addDays(currentDate, followUp.recurrence_interval);
          break;
        case 'weekly':
          nextDate = addWeeks(currentDate, followUp.recurrence_interval);
          break;
        case 'monthly':
          nextDate = addMonths(currentDate, followUp.recurrence_interval);
          break;
        case 'yearly':
          nextDate = addYears(currentDate, followUp.recurrence_interval);
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('follow_ups')
        .insert([{
          contact_id: followUp.contact_id,
          user_id: user.id,
          title: followUp.title,
          description: followUp.description,
          scheduled_date: nextDate.toISOString(),
          is_recurring: followUp.is_recurring,
          recurrence_pattern: followUp.recurrence_pattern,
          recurrence_interval: followUp.recurrence_interval,
        }]);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error creating next recurrence:', err);
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('follow_ups')
        .delete()
        .eq('id', followUpId);

      if (error) throw error;

      onUpdate();
    } catch (err: any) {
      console.error('Error deleting follow-up:', err);
      alert('Failed to delete follow-up: ' + err.message);
    }
  };

  const handleSnoozeFollowUp = async (followUpId: string) => {
    if (!snoozeDate) {
      alert('Please select a snooze date');
      return;
    }

    await handleUpdateFollowUpStatus(followUpId, 'snoozed', snoozeDate);
    setSnoozeDate('');
  };

  const isOverdue = (scheduledDate: string, status: FollowUpStatus) => {
    if (status !== 'pending') return false;
    return new Date(scheduledDate) < new Date();
  };

  const sortedFollowUps = [...followUps].sort((a, b) => {
    // Sort by status priority (pending first, then by date)
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
  });

  const FollowUpForm = ({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Follow-up Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="What do you need to follow up on?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional details about this follow-up..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduled_date">Scheduled Date & Time</Label>
        <Input
          type="datetime-local"
          value={formData.scheduled_date}
          onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={formData.is_recurring}
            onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
          />
          <Label>Make this a recurring follow-up</Label>
        </div>

        {formData.is_recurring && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label>Recurrence Pattern</Label>
              <Select
                value={formData.recurrence_pattern}
                onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(recurrencePatterns).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Every</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={formData.recurrence_interval}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  recurrence_interval: parseInt(e.target.value) || 1 
                })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Creating...' : 'Create Follow-up'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsAddFormOpen(false);
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
        <h3 className="text-lg font-semibold">Follow-up Reminders</h3>
        <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Follow-up Reminder</DialogTitle>
            </DialogHeader>
            <FollowUpForm onSubmit={handleAddFollowUp} />
          </DialogContent>
        </Dialog>
      </div>

      {followUps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No follow-ups scheduled</h3>
            <p className="text-gray-600 mb-4">Set up follow-up reminders to stay in touch regularly.</p>
            <Button onClick={() => setIsAddFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Follow-up
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedFollowUps.map((followUp) => {
            const IconComponent = statusIcons[followUp.status];
            const overdue = isOverdue(followUp.scheduled_date, followUp.status);

            return (
              <Card key={followUp.id} className={overdue ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <IconComponent className={`h-5 w-5 mt-0.5 ${
                          overdue ? 'text-red-500' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{followUp.title}</h4>
                          <Badge className={statusColors[followUp.status]}>
                            {statusLabels[followUp.status]}
                          </Badge>
                          {followUp.is_recurring && (
                            <Badge variant="outline">
                              Recurring
                            </Badge>
                          )}
                          {overdue && (
                            <Badge className="bg-red-100 text-red-800">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {format(new Date(followUp.scheduled_date), 'PPp')}
                        </p>
                        {followUp.snooze_until && followUp.status === 'snoozed' && (
                          <p className="text-sm text-blue-600 mb-2">
                            Snoozed until {format(new Date(followUp.snooze_until), 'PPp')}
                          </p>
                        )}
                        {followUp.description && (
                          <p className="text-sm text-gray-700 mb-2">{followUp.description}</p>
                        )}
                        {followUp.is_recurring && followUp.recurrence_pattern && (
                          <p className="text-xs text-gray-500">
                            Repeats every {followUp.recurrence_interval} {followUp.recurrence_pattern.slice(0, -2)}
                            {followUp.recurrence_interval > 1 ? followUp.recurrence_pattern.slice(-1) : ''}
                          </p>
                        )}

                        {/* Action buttons for pending follow-ups */}
                        {followUp.status === 'pending' && (
                          <div className="flex items-center space-x-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateFollowUpStatus(followUp.id, 'completed')}
                              className="h-7 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                            <div className="flex items-center space-x-1">
                              <Input
                                type="datetime-local"
                                value={snoozeDate}
                                onChange={(e) => setSnoozeDate(e.target.value)}
                                className="h-7 text-xs w-40"
                                placeholder="Snooze until..."
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSnoozeFollowUp(followUp.id)}
                                className="h-7 text-xs"
                                disabled={!snoozeDate}
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Snooze
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {followUp.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateFollowUpStatus(followUp.id, 'cancelled')}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFollowUp(followUp.id)}
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
    </div>
  );
}