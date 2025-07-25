'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, Trophy, Calendar, Clock, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Zap, BarChart3, PieChart,
  Star, Award, Activity, Eye, ArrowRight, Flag, Timer,
  Users, BookOpen, Briefcase, Heart, Home, Plus
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

type Goal = Database['public']['Tables']['goals']['Row'];

interface GoalAnalytics {
  goal: Goal;
  progressPercentage: number;
  daysRemaining: number;
  averageProgressPerDay: number;
  completionProbability: number;
  tasksCompleted: number;
  tasksTotal: number;
  xpEarned: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed' | 'overdue';
  insights: string[];
  recommendations: string[];
}

interface GoalCategoryStats {
  category: string;
  total: number;
  completed: number;
  completionRate: number;
  averageTimeToComplete: number;
  totalXP: number;
}

interface GoalAchievementAnalyticsProps {
  className?: string;
}

const categoryIcons: { [key: string]: any } = {
  personal: Heart,
  professional: Briefcase,
  health: Activity,
  learning: BookOpen,
  social: Users,
  home: Home,
  finance: Target,
  other: Flag,
};

const getCategoryIcon = (category: string) => {
  return categoryIcons[category] || Flag;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50 border-green-200';
    case 'on_track': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'at_risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'behind': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'on_track': return Target;
    case 'at_risk': return AlertCircle;
    case 'behind': return Clock;
    case 'overdue': return XCircle;
    default: return Target;
  }
};

export function GoalAchievementAnalytics({ className = '' }: GoalAchievementAnalyticsProps) {
  const [goalAnalytics, setGoalAnalytics] = useState<GoalAnalytics[]>([]);
  const [categoryStats, setCategoryStats] = useState<GoalCategoryStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    overallCompletionRate: 0,
    averageCompletionTime: 0,
    totalXPFromGoals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const analyzeGoalAchievements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all goals with related tasks
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select(`
          *,
          tasks(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      if (!goals || goals.length === 0) {
        setGoalAnalytics([]);
        setCategoryStats([]);
        return;
      }

      // Analyze each goal
      const analyzedGoals: GoalAnalytics[] = [];
      const categoryStatsMap: { [key: string]: GoalCategoryStats } = {};

      for (const goal of goals) {
        const tasks = goal.tasks || [];
        const completedTasks = tasks.filter(t => t.completed);
        const totalTasks = tasks.length;
        
        // Calculate progress
        const progressPercentage = goal.completed ? 100 : 
          totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        // Calculate time metrics
        const createdAt = parseISO(goal.created_at);
        const targetDate = goal.target_date ? parseISO(goal.target_date) : null;
        const completedAt = goal.completed_at ? parseISO(goal.completed_at) : null;
        const now = new Date();

        let daysRemaining = 0;
        let status: GoalAnalytics['status'] = 'on_track';

        if (goal.completed) {
          status = 'completed';
        } else if (targetDate) {
          daysRemaining = differenceInDays(targetDate, now);
          
          if (daysRemaining < 0) {
            status = 'overdue';
          } else if (daysRemaining <= 7 && progressPercentage < 80) {
            status = 'behind';
          } else if (daysRemaining <= 14 && progressPercentage < 60) {
            status = 'at_risk';
          }
        }

        // Calculate average progress per day
        const daysSinceCreated = Math.max(1, differenceInDays(now, createdAt));
        const averageProgressPerDay = progressPercentage / daysSinceCreated;

        // Calculate completion probability
        let completionProbability = 0;
        if (goal.completed) {
          completionProbability = 100;
        } else if (targetDate && daysRemaining > 0) {
          const requiredDailyProgress = (100 - progressPercentage) / daysRemaining;
          completionProbability = Math.max(0, Math.min(100, 
            100 - Math.abs(requiredDailyProgress - averageProgressPerDay) * 10
          ));
        }

        // Calculate XP earned from goal tasks
        const xpEarned = completedTasks.reduce((sum, task) => sum + (task.xp_earned || 0), 0);

        // Generate insights
        const insights: string[] = [];
        const recommendations: string[] = [];

        if (goal.completed) {
          const completionTime = completedAt && differenceInDays(completedAt, createdAt);
          insights.push(`Goal completed in ${completionTime} days`);
          insights.push(`Earned ${xpEarned} XP from ${completedTasks.length} tasks`);
        } else {
          insights.push(`${progressPercentage.toFixed(1)}% complete with ${completedTasks.length}/${totalTasks} tasks done`);
          if (averageProgressPerDay > 0) {
            insights.push(`Progressing at ${averageProgressPerDay.toFixed(1)}% per day on average`);
          }
          
          if (status === 'behind' || status === 'overdue') {
            recommendations.push('Consider breaking down remaining tasks into smaller steps');
            recommendations.push('Schedule dedicated time blocks for goal work');
            recommendations.push('Review and adjust timeline if needed');
          } else if (status === 'at_risk') {
            recommendations.push('Increase focus on this goal to stay on track');
            recommendations.push('Consider prioritizing goal-related tasks');
          } else {
            recommendations.push('Keep up the great progress!');
            recommendations.push('Consider setting stretch targets');
          }
        }

        analyzedGoals.push({
          goal,
          progressPercentage,
          daysRemaining,
          averageProgressPerDay,
          completionProbability,
          tasksCompleted: completedTasks.length,
          tasksTotal: totalTasks,
          xpEarned,
          status,
          insights,
          recommendations,
        });

        // Update category stats
        const category = goal.category || 'other';
        if (!categoryStatsMap[category]) {
          categoryStatsMap[category] = {
            category,
            total: 0,
            completed: 0,
            completionRate: 0,
            averageTimeToComplete: 0,
            totalXP: 0,
          };
        }

        categoryStatsMap[category].total++;
        categoryStatsMap[category].totalXP += xpEarned;
        
        if (goal.completed) {
          categoryStatsMap[category].completed++;
          if (completedAt) {
            const timeToComplete = differenceInDays(completedAt, createdAt);
            categoryStatsMap[category].averageTimeToComplete = 
              (categoryStatsMap[category].averageTimeToComplete * (categoryStatsMap[category].completed - 1) + timeToComplete) / 
              categoryStatsMap[category].completed;
          }
        }
      }

      // Calculate completion rates for categories
      Object.values(categoryStatsMap).forEach(stats => {
        stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
      });

      // Calculate overall stats
      const totalGoals = goals.length;
      const completedGoals = goals.filter(g => g.completed).length;
      const activeGoals = totalGoals - completedGoals;
      const overallCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
      const totalXPFromGoals = analyzedGoals.reduce((sum, g) => sum + g.xpEarned, 0);

      // Calculate average completion time
      const completedGoalsWithTime = goals.filter(g => g.completed && g.completed_at);
      const averageCompletionTime = completedGoalsWithTime.length > 0 
        ? completedGoalsWithTime.reduce((sum, g) => {
            const created = parseISO(g.created_at);
            const completed = parseISO(g.completed_at!);
            return sum + differenceInDays(completed, created);
          }, 0) / completedGoalsWithTime.length
        : 0;

      setGoalAnalytics(analyzedGoals);
      setCategoryStats(Object.values(categoryStatsMap));
      setOverallStats({
        totalGoals,
        activeGoals,
        completedGoals,
        overallCompletionRate,
        averageCompletionTime,
        totalXPFromGoals,
      });

    } catch (err: any) {
      console.error('Error analyzing goal achievements:', err);
      setError(err.message || 'Failed to analyze goal achievements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    analyzeGoalAchievements();
  }, []);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Analyzing goal achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={analyzeGoalAchievements} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (goalAnalytics.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No goals found</h3>
            <p className="text-gray-600 text-sm mb-4">
              Create your first goal to start tracking achievement analytics.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Target className="h-8 w-8 text-blue-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Goal Achievement Analytics</h2>
          <p className="text-gray-600">Track your progress and success patterns across all goals</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Goals</p>
                <p className="text-2xl font-bold text-blue-600">{overallStats.totalGoals}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {overallStats.activeGoals} active, {overallStats.completedGoals} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{overallStats.overallCompletionRate.toFixed(1)}%</p>
              </div>
              <Trophy className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Goal completion percentage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                <p className="text-2xl font-bold text-purple-600">{Math.round(overallStats.averageCompletionTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Days to complete goals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Goal XP</p>
                <p className="text-2xl font-bold text-orange-600">{overallStats.totalXPFromGoals.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Experience from goals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Performance by Category</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map((stats) => {
              const CategoryIcon = getCategoryIcon(stats.category);
              return (
                <div key={stats.category} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <CategoryIcon className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium capitalize">{stats.category}</h4>
                      <p className="text-xs text-gray-500">{stats.total} goals</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="font-medium">{stats.completionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.completionRate} className="h-2" />
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{stats.completed}/{stats.total} completed</span>
                      <span>{stats.totalXP} XP</span>
                    </div>
                    
                    {stats.averageTimeToComplete > 0 && (
                      <p className="text-xs text-gray-500">
                        Avg: {Math.round(stats.averageTimeToComplete)} days to complete
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Individual Goal Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Individual Goal Analysis</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goalAnalytics.map((analytics) => {
            const StatusIcon = getStatusIcon(analytics.status);
            const CategoryIcon = getCategoryIcon(analytics.goal.category || 'other');
            
            return (
              <Card key={analytics.goal.id} className={`border-2 ${getStatusColor(analytics.status)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <CategoryIcon className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <CardTitle className="text-lg">{analytics.goal.title}</CardTitle>
                        <p className="text-sm opacity-70 mt-1">{analytics.goal.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {analytics.goal.category || 'other'}
                      </Badge>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-medium">{analytics.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.progressPercentage} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{analytics.tasksCompleted}/{analytics.tasksTotal} tasks</span>
                      <span>{analytics.xpEarned} XP earned</span>
                    </div>
                  </div>

                  {/* Time and Probability */}
                  {!analytics.goal.completed && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Days Remaining</p>
                        <p className="font-medium">
                          {analytics.daysRemaining > 0 ? analytics.daysRemaining : 'Overdue'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Success Probability</p>
                        <p className="font-medium">{analytics.completionProbability.toFixed(0)}%</p>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  <div>
                    <h5 className="font-medium text-sm mb-2 flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>Insights</span>
                    </h5>
                    <ul className="space-y-1">
                      {analytics.insights.map((insight, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  {analytics.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2 flex items-center space-x-1">
                        <Star className="h-4 w-4" />
                        <span>Recommendations</span>
                      </h5>
                      <ul className="space-y-1">
                        {analytics.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                            <ArrowRight className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Goal Details */}
                  <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
                    <p>Created: {format(parseISO(analytics.goal.created_at), 'MMM dd, yyyy')}</p>
                    {analytics.goal.target_date && (
                      <p>Target: {format(parseISO(analytics.goal.target_date), 'MMM dd, yyyy')}</p>
                    )}
                    {analytics.goal.completed_at && (
                      <p>Completed: {format(parseISO(analytics.goal.completed_at), 'MMM dd, yyyy')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}