'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TaskCompletionReports } from '@/components/task-completion-reports';
import { ProductivityPatterns } from '@/components/productivity-patterns';
import { GoalAchievementAnalytics } from '@/components/goal-achievement-analytics';
import { WellnessInsights } from '@/components/wellness-insights';
import { ContactInteractionAnalytics } from '@/components/contact-interaction-analytics';
import { 
  TrendingUp, TrendingDown, Target, Award, Users, Calendar,
  Activity, Zap, Heart, Brain, Clock, BarChart3, PieChart,
  AlertTriangle, CheckCircle, Star, Flame, Trophy, Eye,
  LineChart, ArrowUp, ArrowDown, Minus, FileText, Network
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type AnalyticsSummary = Database['public']['Tables']['user_analytics_summary']['Row'];
type ProductivityInsight = Database['public']['Tables']['productivity_insights']['Row'];

interface DashboardMetrics {
  todayScore: number;
  weeklyScore: number;
  monthlyScore: number;
  tasksToday: number;
  tasksWeek: number;
  tasksMonth: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  currentLevel: number;
  goalsActive: number;
  goalsCompleted: number;
  contactsTotal: number;
  achievementsUnlocked: number;
  wellnessScore: number;
  productivityTrend: 'up' | 'down' | 'stable';
  wellnessTrend: 'up' | 'down' | 'stable';
}

interface ChartData {
  date: string;
  tasks: number;
  xp: number;
  productivity: number;
  wellness: number;
}

interface AnalyticsDashboardProps {
  className?: string;
}

const scoreColors = {
  excellent: 'text-green-600 bg-green-50 border-green-200',
  good: 'text-blue-600 bg-blue-50 border-blue-200',
  average: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  poor: 'text-red-600 bg-red-50 border-red-200',
};

const getScoreColor = (score: number) => {
  if (score >= 8) return scoreColors.excellent;
  if (score >= 6) return scoreColors.good;
  if (score >= 4) return scoreColors.average;
  return scoreColors.poor;
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return ArrowUp;
    case 'down': return ArrowDown;
    default: return Minus;
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return 'text-green-500';
    case 'down': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

export function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const supabase = createClient();

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load current metrics
      const today = new Date();
      const weekStart = startOfWeek(today);
      const monthStart = startOfMonth(today);

      // Get basic stats
      const [
        { data: todayTasks }, 
        { data: weekTasks }, 
        { data: monthTasks },
        { data: streakData },
        { data: totalXPData },
        { data: levelData },
        { data: goalsData },
        { data: contactsData },
        { data: achievementsData }
      ] = await Promise.all([
        // Today's tasks
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('completed_at', format(today, 'yyyy-MM-dd')),
        
        // Week's tasks
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('completed_at', format(weekStart, 'yyyy-MM-dd')),
        
        // Month's tasks
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('completed_at', format(monthStart, 'yyyy-MM-dd')),
        
        // Streak data
        supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // Total XP
        supabase.rpc('get_user_total_xp', { user_id: user.id }),
        
        // Current level
        supabase.rpc('get_user_level', { user_id: user.id }),
        
        // Goals data
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id),
        
        // Contacts count
        supabase
          .from('contacts')
          .select('id')
          .eq('user_id', user.id),
        
        // Achievements count
        supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', user.id)
      ]);

      // Calculate scores using database functions
      const { data: productivityScore } = await supabase.rpc('calculate_productivity_score', { 
        p_user_id: user.id 
      });
      
      const { data: wellnessScore } = await supabase.rpc('calculate_wellness_score', { 
        p_user_id: user.id 
      });

      // Get recent analytics summaries for trends
      const { data: recentSummaries } = await supabase
        .from('user_analytics_summary')
        .select('*')
        .eq('user_id', user.id)
        .gte('summary_date', format(subDays(today, 7), 'yyyy-MM-dd'))
        .order('summary_date', { ascending: true });

      // Generate chart data
      const chartData: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get tasks for this date
        const { data: dayTasks } = await supabase
          .from('tasks')
          .select('xp_earned')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('completed_at', dateStr)
          .lt('completed_at', format(subDays(date, -1), 'yyyy-MM-dd'));

        const summary = recentSummaries?.find(s => s.summary_date === dateStr);

        chartData.push({
          date: format(date, 'MMM dd'),
          tasks: dayTasks?.length || 0,
          xp: dayTasks?.reduce((sum, task) => sum + (task.xp_earned || 0), 0) || 0,
          productivity: summary?.productivity_score || 0,
          wellness: summary?.wellness_score || 5,
        });
      }

      // Calculate trends
      const productivityTrend = recentSummaries && recentSummaries.length >= 2
        ? recentSummaries[recentSummaries.length - 1].productivity_score > recentSummaries[recentSummaries.length - 2].productivity_score
          ? 'up' : recentSummaries[recentSummaries.length - 1].productivity_score < recentSummaries[recentSummaries.length - 2].productivity_score
          ? 'down' : 'stable'
        : 'stable';

      const wellnessTrend = recentSummaries && recentSummaries.length >= 2
        ? recentSummaries[recentSummaries.length - 1].wellness_score > recentSummaries[recentSummaries.length - 2].wellness_score
          ? 'up' : recentSummaries[recentSummaries.length - 1].wellness_score < recentSummaries[recentSummaries.length - 2].wellness_score
          ? 'down' : 'stable'
        : 'stable' as const;

      const dashboardMetrics: DashboardMetrics = {
        todayScore: productivityScore || 0,
        weeklyScore: recentSummaries?.slice(-7).reduce((sum, s) => sum + s.productivity_score, 0) / Math.min(7, recentSummaries?.length || 1) || 0,
        monthlyScore: recentSummaries?.reduce((sum, s) => sum + s.productivity_score, 0) / Math.max(1, recentSummaries?.length || 1) || 0,
        tasksToday: todayTasks?.length || 0,
        tasksWeek: weekTasks?.length || 0,
        tasksMonth: monthTasks?.length || 0,
        currentStreak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        totalXP: totalXPData || 0,
        currentLevel: levelData || 1,
        goalsActive: goalsData?.filter(g => !g.completed).length || 0,
        goalsCompleted: goalsData?.filter(g => g.completed).length || 0,
        contactsTotal: contactsData?.length || 0,
        achievementsUnlocked: achievementsData?.length || 0,
        wellnessScore: wellnessScore || 5,
        productivityTrend,
        wellnessTrend,
      };

      setMetrics(dashboardMetrics);
      setChartData(chartData);

      // Load insights
      const { data: insightsData } = await supabase
        .from('productivity_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setInsights(insightsData || []);

      // Generate new insights if needed
      await supabase.rpc('generate_productivity_insights', { p_user_id: user.id });

    } catch (err: any) {
      console.error('Error loading analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadAnalyticsData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <BarChart3 className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Insights into your productivity patterns and progress</p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Productivity */}
        <Card className={`border-2 ${getScoreColor(metrics.todayScore)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-70">Today's Score</p>
                <p className="text-2xl font-bold">{metrics.todayScore.toFixed(1)}/10</p>
              </div>
              <div className="p-3 bg-white bg-opacity-50 rounded-full">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {(() => {
                const TrendIcon = getTrendIcon(metrics.productivityTrend);
                return <TrendIcon className={`h-3 w-3 ${getTrendColor(metrics.productivityTrend)}`} />;
              })()}
              <span className="text-xs opacity-70">{metrics.tasksToday} tasks completed</span>
            </div>
          </CardContent>
        </Card>

        {/* Wellness Score */}
        <Card className={`border-2 ${getScoreColor(metrics.wellnessScore)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-70">Wellness</p>
                <p className="text-2xl font-bold">{metrics.wellnessScore.toFixed(1)}/10</p>
              </div>
              <div className="p-3 bg-white bg-opacity-50 rounded-full">
                <Heart className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {(() => {
                const TrendIcon = getTrendIcon(metrics.wellnessTrend);
                return <TrendIcon className={`h-3 w-3 ${getTrendColor(metrics.wellnessTrend)}`} />;
              })()}
              <span className="text-xs opacity-70">Work-life balance</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.currentStreak}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">Best: {metrics.longestStreak} days</span>
            </div>
          </CardContent>
        </Card>

        {/* Total XP */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Level {metrics.currentLevel}</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalXP.toLocaleString()} XP</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">{metrics.achievementsUnlocked} achievements</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weekly Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span>7-Day Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chartData.map((data, index) => (
                    <div key={data.date} className="flex items-center space-x-4">
                      <div className="w-16 text-sm text-gray-600">{data.date}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Tasks: {data.tasks}</span>
                          <span>{data.xp} XP</span>
                        </div>
                        <Progress value={(data.tasks / Math.max(...chartData.map(d => d.tasks)) || 1) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Target className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{metrics.goalsActive}</p>
                    <p className="text-xs text-blue-700">Active Goals</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{metrics.goalsCompleted}</p>
                    <p className="text-xs text-green-700">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Users className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-600">{metrics.contactsTotal}</p>
                    <p className="text-xs text-purple-700">Contacts</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-600">{metrics.achievementsUnlocked}</p>
                    <p className="text-xs text-yellow-700">Achievements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <TaskCompletionReports />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <ProductivityPatterns />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <GoalAchievementAnalytics />
        </TabsContent>

        <TabsContent value="wellness" className="space-y-4">
          <WellnessInsights />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactInteractionAnalytics />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => (
                <Card key={insight.id} className={`border-l-4 ${
                  insight.priority_level === 'critical' ? 'border-l-red-500' :
                  insight.priority_level === 'high' ? 'border-l-orange-500' :
                  insight.priority_level === 'medium' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="h-4 w-4 text-blue-500" />
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {insight.insight_category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                        {insight.is_actionable && insight.action_recommendations && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {(insight.action_recommendations as string[]).map((rec, index) => (
                                <li key={index} className="flex items-center space-x-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((insight.confidence_score || 0) * 100)}% confidence
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No insights yet</h3>
                <p className="text-gray-600 text-sm">
                  Complete more tasks and goals to generate personalized insights.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}