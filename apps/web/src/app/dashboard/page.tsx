import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, Award, Flame } from 'lucide-react';
import Link from 'next/link';
import { UpcomingAchievements } from '@/components/upcoming-achievements';
import { ProgressSuggestions } from '@/components/progress-suggestions';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirect('/auth/signin');
  }

  // Fetch user's goals and recent tasks
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .order('due_date', { ascending: true })
    .limit(5);

  // Get user's total XP
  const { data: totalXP } = await supabase
    .rpc('get_user_total_xp', { user_id: session.user.id });

  // Get user's current streak
  const { data: streak } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', session.user.id)
    .single();

  const activeGoals = goals?.filter(g => !g.completed).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}!
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/goals/new">
            <Plus className="mr-2 h-4 w-4" /> New Goal
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals}</div>
            <p className="text-xs text-muted-foreground">
              {activeGoals === 0 ? 'No active goals' : `${activeGoals} in progress`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalXP || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total XP earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {streak?.current_streak || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              {streak?.current_streak ? 'Keep it up! 🔥' : 'Complete a task to start!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Achievements Section */}
      <UpcomingAchievements limit={4} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Goals</CardTitle>
            <CardDescription>Your most recently updated goals</CardDescription>
          </CardHeader>
          <CardContent>
            {goals?.length ? (
              <div className="space-y-4">
                {goals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{goal.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {goal.completed ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/goals/${goal.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No goals yet</p>
                <Button asChild>
                  <Link href="/dashboard/goals/new">Create your first goal</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Tasks due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks?.length ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No upcoming tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Suggestions */}
        <ProgressSuggestions limit={4} />
      </div>
    </div>
  );
}
