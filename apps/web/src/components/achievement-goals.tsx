'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, Trophy, Star, Calendar, Bell, Plus, Edit2, Trash2, 
  Save, X, CheckCircle, Clock, AlertCircle, Zap
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO, addDays, addWeeks, addMonths } from 'date-fns';

type Achievement = Database['public']['Tables']['achievements']['Row'];

interface AchievementGoal {
  id: string;
  user_id: string;
  achievement_id: string;
  target_date: string;
  reminder_enabled: boolean;
  reminder_frequency: 'daily' | 'weekly' | 'monthly';
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  achievement?: Achievement;
}

interface AchievementGoalsProps {
  userId?: string;
  achievementId?: string;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

const rarityColors = {
  common: 'bg-gray-100 text-gray-800',
  rare: 'bg-blue-100 text-blue-800',
  epic: 'bg-purple-100 text-purple-800',
  legendary: 'bg-yellow-100 text-yellow-800',
};

const categoryColors = {
  productivity: 'text-green-600',
  social: 'text-blue-600',
  exploration: 'text-purple-600',
  mastery: 'text-orange-600',
};

const frequencyLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export function AchievementGoals({ 
  userId, 
  achievementId, 
  trigger, 
  isOpen: externalIsOpen,
  onClose: externalOnClose 
}: AchievementGoalsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goals, setGoals] = useState<AchievementGoal[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AchievementGoal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    achievement_id: achievementId || '',
    target_date: format(addWeeks(new Date(), 2), 'yyyy-MM-dd'),
    reminder_enabled: true,
    reminder_frequency: 'weekly' as const,
    notes: '',
  });

  const supabase = createClient();

  // Handle external control
  const actualIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setIsOpen(false);
    }
    setEditingGoal(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      achievement_id: achievementId || '',
      target_date: format(addWeeks(new Date(), 2), 'yyyy-MM-dd'),
      reminder_enabled: true,
      reminder_frequency: 'weekly',
      notes: '',
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load existing goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('achievement_goals')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Load available achievements (locked with progress or no progress)
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Filter out already unlocked achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
      const availableAchievements = achievementsData.filter(a => !unlockedIds.has(a.id));

      setGoals(goalsData || []);
      setAvailableAchievements(availableAchievements);

    } catch (err: any) {
      console.error('Error loading achievement goals:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveGoal = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!formData.achievement_id) {
        throw new Error('Please select an achievement');
      }

      const goalData = {
        user_id: user.id,
        achievement_id: formData.achievement_id,
        target_date: formData.target_date,
        reminder_enabled: formData.reminder_enabled,
        reminder_frequency: formData.reminder_frequency,
        notes: formData.notes,
        is_active: true,
      };

      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('achievement_goals')
          .update({ ...goalData, updated_at: new Date().toISOString() })
          .eq('id', editingGoal.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new goal
        const { error } = await supabase
          .from('achievement_goals')
          .insert(goalData);

        if (error) throw error;
      }

      // Reload data
      await loadData();
      
      // Reset form and close editing
      setEditingGoal(null);
      resetForm();

    } catch (err: any) {
      console.error('Error saving achievement goal:', err);
      setError(err.message || 'Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('achievement_goals')
        .update({ is_active: false })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadData();
    } catch (err: any) {
      console.error('Error deleting achievement goal:', err);
      setError(err.message || 'Failed to delete goal');
    }
  };

  const editGoal = (goal: AchievementGoal) => {
    setEditingGoal(goal);
    setFormData({
      achievement_id: goal.achievement_id,
      target_date: format(parseISO(goal.target_date), 'yyyy-MM-dd'),
      reminder_enabled: goal.reminder_enabled,
      reminder_frequency: goal.reminder_frequency,
      notes: goal.notes,
    });
  };

  useEffect(() => {
    if (actualIsOpen) {
      loadData();
    }
  }, [actualIsOpen]);

  const dialogContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Target className="h-6 w-6 text-blue-500" />
        <div>
          <h2 className="text-xl font-semibold">Achievement Goals</h2>
          <p className="text-gray-600">Set targets and reminders for achievements you want to unlock</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Goal Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingGoal ? 'Edit Goal' : 'Set New Goal'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="achievement">Achievement</Label>
            <Select
              value={formData.achievement_id}
              onValueChange={(value) => setFormData({ ...formData, achievement_id: value })}
              disabled={!!achievementId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an achievement" />
              </SelectTrigger>
              <SelectContent>
                {availableAchievements.map((achievement) => (
                  <SelectItem key={achievement.id} value={achievement.id}>
                    <div className="flex items-center space-x-2">
                      <span>{achievement.title}</span>
                      <Badge className={`text-xs ${rarityColors[achievement.rarity]}`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_date">Target Date</Label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="reminder_frequency">Reminder Frequency</Label>
              <Select
                value={formData.reminder_frequency}
                onValueChange={(value: any) => setFormData({ ...formData, reminder_frequency: value })}
                disabled={!formData.reminder_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.reminder_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, reminder_enabled: checked })}
            />
            <Label>Enable reminders</Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about your strategy or motivation..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            {editingGoal && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingGoal(null);
                  resetForm();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button onClick={saveGoal} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Set Goal'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Goals */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Achievement Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.map((goal) => {
              const achievement = goal.achievement;
              const isOverdue = new Date(goal.target_date) < new Date();
              const daysUntil = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={goal.id}
                  className={`border rounded-lg p-4 ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{achievement?.title}</h4>
                        <Badge className={`text-xs ${rarityColors[achievement?.rarity || 'common']}`}>
                          {achievement?.rarity}
                        </Badge>
                        {goal.reminder_enabled && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {frequencyLabels[goal.reminder_frequency]}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {isOverdue 
                              ? `Overdue by ${Math.abs(daysUntil)} days`
                              : `${daysUntil} days remaining`
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span>+{achievement?.xp_reward} XP potential</span>
                        </div>
                      </div>
                      
                      {goal.notes && (
                        <p className="text-sm text-gray-600">{goal.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editGoal(goal)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGoal(goal.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      )}
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={actualIsOpen} onOpenChange={externalOnClose || setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Achievement Goals</DialogTitle>
          </DialogHeader>
          {dialogContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Return as standalone component if no trigger
  return dialogContent;
}

// Database migration for achievement_goals table
export const achievementGoalsMigration = `
-- Create achievement_goals table
CREATE TABLE IF NOT EXISTS achievement_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_frequency TEXT CHECK (reminder_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id, is_active) WHERE is_active = true
);

-- Enable RLS
ALTER TABLE achievement_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own achievement goals" ON achievement_goals
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_achievement_goals_user_id ON achievement_goals(user_id);
CREATE INDEX idx_achievement_goals_achievement_id ON achievement_goals(achievement_id);
CREATE INDEX idx_achievement_goals_target_date ON achievement_goals(target_date);
CREATE INDEX idx_achievement_goals_active ON achievement_goals(is_active) WHERE is_active = true;
`;