'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, Calendar, TrendingUp, Brain, Lightbulb, Activity,
  Sun, Moon, Coffee, Sunset, Target, Zap, AlertCircle,
  BarChart3, Eye, CheckCircle, Star, Award
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO } from 'date-fns';

interface ProductivityPattern {
  type: 'peak_hours' | 'peak_days' | 'productivity_trend' | 'task_patterns';
  title: string;
  description: string;
  data: any;
  insights: string[];
  recommendations: string[];
  confidence: number;
}

interface HourlyData {
  hour: number;
  tasks: number;
  xp: number;
  avgComplexity: number;
}

interface DailyData {
  dayOfWeek: number;
  dayName: string;
  tasks: number;
  xp: number;
  avgComplexity: number;
}

interface ProductivityPatternsProps {
  className?: string;
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getTimeIcon = (hour: number) => {
  if (hour >= 6 && hour < 12) return Sun;
  if (hour >= 12 && hour < 17) return Coffee;
  if (hour >= 17 && hour < 21) return Sunset;
  return Moon;
};

const getTimeLabel = (hour: number) => {
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

export function ProductivityPatterns({ className = '' }: ProductivityPatternsProps) {
  const [patterns, setPatterns] = useState<ProductivityPattern[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const analyzeProductivityPatterns = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get task data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: true });

      if (tasksError) throw tasksError;

      if (!tasks || tasks.length === 0) {
        setPatterns([]);
        return;
      }

      // Analyze hourly patterns
      const hourlyStats: { [hour: number]: { tasks: number; xp: number; complexities: string[] } } = {};
      const dailyStats: { [day: number]: { tasks: number; xp: number; complexities: string[] } } = {};

      tasks.forEach(task => {
        const completedAt = parseISO(task.completed_at);
        const hour = completedAt.getHours();
        const dayOfWeek = completedAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0 = Monday

        // Hourly stats
        if (!hourlyStats[hour]) {
          hourlyStats[hour] = { tasks: 0, xp: 0, complexities: [] };
        }
        hourlyStats[hour].tasks++;
        hourlyStats[hour].xp += task.xp_earned || 0;
        hourlyStats[hour].complexities.push(task.complexity || 'simple');

        // Daily stats
        if (!dailyStats[adjustedDay]) {
          dailyStats[adjustedDay] = { tasks: 0, xp: 0, complexities: [] };
        }
        dailyStats[adjustedDay].tasks++;
        dailyStats[adjustedDay].xp += task.xp_earned || 0;
        dailyStats[adjustedDay].complexities.push(task.complexity || 'simple');
      });

      // Process hourly data
      const hourlyDataArray: HourlyData[] = Array.from({ length: 24 }, (_, hour) => {
        const stats = hourlyStats[hour] || { tasks: 0, xp: 0, complexities: [] };
        const avgComplexity = stats.complexities.length > 0
          ? stats.complexities.reduce((sum, c) => sum + (c === 'simple' ? 1 : c === 'medium' ? 2 : 3), 0) / stats.complexities.length
          : 0;

        return {
          hour,
          tasks: stats.tasks,
          xp: stats.xp,
          avgComplexity,
        };
      });

      // Process daily data
      const dailyDataArray: DailyData[] = Array.from({ length: 7 }, (_, day) => {
        const stats = dailyStats[day] || { tasks: 0, xp: 0, complexities: [] };
        const avgComplexity = stats.complexities.length > 0
          ? stats.complexities.reduce((sum, c) => sum + (c === 'simple' ? 1 : c === 'medium' ? 2 : 3), 0) / stats.complexities.length
          : 0;

        return {
          dayOfWeek: day,
          dayName: dayNames[day],
          tasks: stats.tasks,
          xp: stats.xp,
          avgComplexity,
        };
      });

      setHourlyData(hourlyDataArray);
      setDailyData(dailyDataArray);

      // Generate patterns
      const generatedPatterns: ProductivityPattern[] = [];

      // Peak hours pattern
      const peakHours = hourlyDataArray
        .sort((a, b) => b.tasks - a.tasks)
        .slice(0, 3)
        .filter(h => h.tasks > 0);

      if (peakHours.length > 0) {
        const peakHour = peakHours[0];
        const TimeIcon = getTimeIcon(peakHour.hour);
        
        generatedPatterns.push({
          type: 'peak_hours',
          title: 'Peak Productivity Hours',
          description: `Your most productive time is ${peakHour.hour}:00 with ${peakHour.tasks} tasks completed on average.`,
          data: peakHours,
          insights: [
            `You complete ${peakHour.tasks} tasks during your peak hour (${peakHour.hour}:00)`,
            `Your peak hours are in the ${getTimeLabel(peakHour.hour).toLowerCase()}`,
            `Peak hours account for ${Math.round((peakHours.reduce((sum, h) => sum + h.tasks, 0) / tasks.length) * 100)}% of your productivity`,
          ],
          recommendations: [
            `Schedule your most important tasks between ${peakHours[0].hour}:00-${peakHours[peakHours.length - 1].hour + 1}:00`,
            'Block calendar time during your peak hours for focused work',
            'Avoid meetings during your most productive hours',
            'Save low-energy tasks for off-peak times',
          ],
          confidence: Math.min(95, 60 + (peakHour.tasks * 5)),
        });
      }

      // Peak days pattern
      const peakDays = dailyDataArray
        .sort((a, b) => b.tasks - a.tasks)
        .slice(0, 3)
        .filter(d => d.tasks > 0);

      if (peakDays.length > 0) {
        const peakDay = peakDays[0];
        
        generatedPatterns.push({
          type: 'peak_days',
          title: 'Most Productive Days',
          description: `${peakDay.dayName} is your most productive day with ${peakDay.tasks} tasks completed on average.`,
          data: peakDays,
          insights: [
            `${peakDay.dayName} is your most productive day`,
            `You complete ${peakDay.tasks} tasks on ${peakDay.dayName}s`,
            `Your productivity varies by ${Math.round(((Math.max(...dailyDataArray.map(d => d.tasks)) - Math.min(...dailyDataArray.map(d => d.tasks))) / Math.max(...dailyDataArray.map(d => d.tasks))) * 100)}% throughout the week`,
          ],
          recommendations: [
            `Plan important work and complex tasks for ${peakDay.dayName}s`,
            'Consider lighter schedules on less productive days',
            'Use productive days for challenging or high-priority work',
            'Plan rest or administrative tasks on slower days',
          ],
          confidence: Math.min(90, 50 + (peakDay.tasks * 3)),
        });
      }

      // Productivity trend analysis
      const weeklyTasks = tasks.reduce((acc, task) => {
        const week = Math.floor((new Date().getTime() - parseISO(task.completed_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
        acc[week] = (acc[week] || 0) + 1;
        return acc;
      }, {} as { [week: number]: number });

      const trendData = Object.entries(weeklyTasks)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .slice(0, 4);

      if (trendData.length >= 2) {
        const recentWeek = trendData[0][1];
        const previousWeek = trendData[1][1];
        const trendDirection = recentWeek > previousWeek ? 'increasing' : recentWeek < previousWeek ? 'decreasing' : 'stable';
        const changePercent = previousWeek > 0 ? Math.round(((recentWeek - previousWeek) / previousWeek) * 100) : 0;

        generatedPatterns.push({
          type: 'productivity_trend',
          title: 'Productivity Trend',
          description: `Your productivity is ${trendDirection} with a ${Math.abs(changePercent)}% change this week.`,
          data: { trend: trendDirection, change: changePercent, weeklyData: trendData },
          insights: [
            `Your task completion is ${trendDirection} by ${Math.abs(changePercent)}%`,
            `Recent week: ${recentWeek} tasks, Previous week: ${previousWeek} tasks`,
            `Average weekly completion: ${Math.round(Object.values(weeklyTasks).reduce((sum, tasks) => sum + tasks, 0) / Object.keys(weeklyTasks).length)}`,
          ],
          recommendations: 
            trendDirection === 'decreasing' ? [
              'Consider reducing task load to prevent burnout',
              'Focus on completing fewer, higher-impact tasks',
              'Review and adjust your current goals',
              'Take breaks to restore energy and motivation',
            ] : trendDirection === 'increasing' ? [
              'Great momentum! Keep up the consistent progress',
              'Consider taking on more challenging tasks',
              'Set stretch goals to maintain growth',
              'Share your productivity strategies with others',
            ] : [
              'Your productivity is steady and consistent',
              'Consider mixing in some variety to prevent stagnation',
              'Look for opportunities to optimize your workflows',
              'Maintain your current successful habits',
            ],
          confidence: 75,
        });
      }

      setPatterns(generatedPatterns);

    } catch (err: any) {
      console.error('Error analyzing productivity patterns:', err);
      setError(err.message || 'Failed to analyze productivity patterns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    analyzeProductivityPatterns();
  }, []);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Analyzing productivity patterns...</p>
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
            <Button onClick={analyzeProductivityPatterns} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Not enough data</h3>
            <p className="text-gray-600 text-sm">
              Complete more tasks over time to generate productivity pattern insights.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Brain className="h-8 w-8 text-purple-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productivity Patterns</h2>
          <p className="text-gray-600">AI-powered insights into your work patterns and optimal times</p>
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Hourly Productivity Heatmap</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {hourlyData.map((data) => {
              const intensity = Math.min(100, (data.tasks / Math.max(...hourlyData.map(h => h.tasks)) || 1) * 100);
              const TimeIcon = getTimeIcon(data.hour);
              
              return (
                <div 
                  key={data.hour}
                  className={`
                    p-3 rounded-lg text-center transition-all hover:scale-105 cursor-pointer
                    ${intensity > 75 ? 'bg-green-500 text-white' :
                      intensity > 50 ? 'bg-green-400 text-white' :
                      intensity > 25 ? 'bg-green-300 text-gray-800' :
                      intensity > 0 ? 'bg-green-200 text-gray-700' :
                      'bg-gray-100 text-gray-400'}
                  `}
                  title={`${data.hour}:00 - ${data.tasks} tasks, ${data.xp} XP`}
                >
                  <TimeIcon className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs font-medium">{data.hour}:00</div>
                  <div className="text-xs">{data.tasks}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>Least productive</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <div className="w-3 h-3 bg-green-300 rounded"></div>
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <div className="w-3 h-3 bg-green-500 rounded"></div>
            </div>
            <span>Most productive</span>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Pattern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Weekly Productivity Pattern</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dailyData.map((data) => {
              const maxTasks = Math.max(...dailyData.map(d => d.tasks));
              const intensity = maxTasks > 0 ? (data.tasks / maxTasks) * 100 : 0;
              
              return (
                <div 
                  key={data.dayOfWeek}
                  className="text-center p-4 rounded-lg border transition-all hover:shadow-md"
                >
                  <div className="font-medium text-sm mb-2">{data.dayName}</div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{data.tasks}</div>
                  <div className="text-xs text-gray-500">{data.xp} XP</div>
                  <div className="mt-2">
                    <div 
                      className="bg-blue-200 h-2 rounded-full"
                      style={{ width: '100%' }}
                    >
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${intensity}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {patterns.map((pattern, index) => (
          <Card key={index} className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-purple-500" />
                  <span>{pattern.title}</span>
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {pattern.confidence}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{pattern.description}</p>
              
              {/* Key Insights */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
                  <Activity className="h-4 w-4" />
                  <span>Key Insights</span>
                </h4>
                <ul className="space-y-1">
                  {pattern.insights.map((insight, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Recommendations */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>Recommendations</span>
                </h4>
                <ul className="space-y-1">
                  {pattern.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                      <Star className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}