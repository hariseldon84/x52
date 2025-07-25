'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  BarChart3, Calendar, Download, Filter, TrendingUp, TrendingDown,
  Clock, Target, Zap, Award, PieChart, LineChart, Activity,
  FileText, Eye, CheckCircle, AlertCircle, Trophy
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskCompletionData {
  date: string;
  count: number;
  xp: number;
  avgComplexity: number;
  complexityBreakdown: {
    simple: number;
    medium: number;
    complex: number;
  };
}

interface ReportFilters {
  dateRange: DateRange | undefined;
  complexity: string;
  project: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
}

interface CompletionStats {
  totalTasks: number;
  totalXP: number;
  avgTasksPerDay: number;
  avgXPPerTask: number;
  completionRate: number;
  bestDay: { date: string; count: number };
  mostProductiveHour: number;
  complexityDistribution: {
    simple: number;
    medium: number;
    complex: number;
  };
}

interface TaskCompletionReportsProps {
  className?: string;
}

export function TaskCompletionReports({ className = '' }: TaskCompletionReportsProps) {
  const [reportData, setReportData] = useState<TaskCompletionData[]>([]);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    complexity: 'all',
    project: 'all',
    timeframe: 'daily',
  });

  const supabase = createClient();

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!filters.dateRange?.from || !filters.dateRange?.to) return;

      const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd');
      const toDate = format(filters.dateRange.to, 'yyyy-MM-dd');

      // Build query
      let query = supabase
        .from('tasks')
        .select(`
          *,
          goals(title),
          projects(name)
        `)
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', fromDate)
        .lte('completed_at', toDate + ' 23:59:59')
        .order('completed_at', { ascending: true });

      // Apply complexity filter
      if (filters.complexity !== 'all') {
        query = query.eq('complexity', filters.complexity);
      }

      const { data: tasks, error: tasksError } = await query;
      if (tasksError) throw tasksError;

      // Process data based on timeframe
      const processedData = processTaskData(tasks || [], filters.timeframe);
      setReportData(processedData);

      // Calculate statistics
      const calculatedStats = calculateStats(tasks || [], filters.dateRange);
      setStats(calculatedStats);

    } catch (err: any) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const processTaskData = (tasks: any[], timeframe: 'daily' | 'weekly' | 'monthly'): TaskCompletionData[] => {
    const grouped: { [key: string]: any[] } = {};

    tasks.forEach(task => {
      let key: string;
      const date = parseISO(task.completed_at);

      switch (timeframe) {
        case 'weekly':
          key = format(startOfWeek(date), 'yyyy-MM-dd');
          break;
        case 'monthly':
          key = format(startOfMonth(date), 'yyyy-MM-dd');
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(task);
    });

    return Object.entries(grouped).map(([date, tasks]) => {
      const complexityBreakdown = {
        simple: tasks.filter(t => t.complexity === 'simple').length,
        medium: tasks.filter(t => t.complexity === 'medium').length,
        complex: tasks.filter(t => t.complexity === 'complex').length,
      };

      const totalComplexityScore = 
        complexityBreakdown.simple * 1 + 
        complexityBreakdown.medium * 2 + 
        complexityBreakdown.complex * 3;

      return {
        date: format(parseISO(date), timeframe === 'monthly' ? 'MMM yyyy' : timeframe === 'weekly' ? 'MMM dd' : 'MMM dd'),
        count: tasks.length,
        xp: tasks.reduce((sum, t) => sum + (t.xp_earned || 0), 0),
        avgComplexity: tasks.length > 0 ? totalComplexityScore / tasks.length : 0,
        complexityBreakdown,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateStats = (tasks: any[], dateRange: DateRange): CompletionStats => {
    if (!dateRange.from || !dateRange.to) {
      return {
        totalTasks: 0,
        totalXP: 0,
        avgTasksPerDay: 0,
        avgXPPerTask: 0,
        completionRate: 0,
        bestDay: { date: '', count: 0 },
        mostProductiveHour: 9,
        complexityDistribution: { simple: 0, medium: 0, complex: 0 },
      };
    }

    const totalTasks = tasks.length;
    const totalXP = tasks.reduce((sum, t) => sum + (t.xp_earned || 0), 0);
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    
    // Find best day
    const dailyCount: { [key: string]: number } = {};
    const hourlyCount: { [key: number]: number } = {};
    
    tasks.forEach(task => {
      const date = format(parseISO(task.completed_at), 'yyyy-MM-dd');
      const hour = parseISO(task.completed_at).getHours();
      
      dailyCount[date] = (dailyCount[date] || 0) + 1;
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    });

    const bestDay = Object.entries(dailyCount)
      .sort(([,a], [,b]) => b - a)[0] || ['', 0];

    const mostProductiveHour = Object.entries(hourlyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '9';

    const complexityDistribution = {
      simple: tasks.filter(t => t.complexity === 'simple').length,
      medium: tasks.filter(t => t.complexity === 'medium').length,
      complex: tasks.filter(t => t.complexity === 'complex').length,
    };

    return {
      totalTasks,
      totalXP,
      avgTasksPerDay: daysDiff > 0 ? totalTasks / daysDiff : 0,
      avgXPPerTask: totalTasks > 0 ? totalXP / totalTasks : 0,
      completionRate: 100, // Could be calculated based on created vs completed
      bestDay: { 
        date: bestDay[0] ? format(parseISO(bestDay[0]), 'MMM dd, yyyy') : '', 
        count: bestDay[1] 
      },
      mostProductiveHour: parseInt(mostProductiveHour),
      complexityDistribution,
    };
  };

  const exportReport = () => {
    if (!reportData.length) return;

    const csvContent = [
      ['Date', 'Tasks Completed', 'XP Earned', 'Simple', 'Medium', 'Complex'].join(','),
      ...reportData.map(row => [
        row.date,
        row.count,
        row.xp,
        row.complexityBreakdown.simple,
        row.complexityBreakdown.medium,
        row.complexityBreakdown.complex,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-completion-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadReportData();
  }, [filters]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading completion reports...</p>
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
            <Button onClick={loadReportData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task Completion Reports</h2>
            <p className="text-gray-600">Analyze your task completion patterns and trends</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={exportReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <DatePickerWithRange
                selected={filters.dateRange}
                onSelect={(range) => setFilters({ ...filters, dateRange: range })}
                className="w-full"
              />
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm font-medium mb-2">View By</label>
              <Select
                value={filters.timeframe}
                onValueChange={(value: any) => setFilters({ ...filters, timeframe: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Complexity Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Complexity</label>
              <Select
                value={filters.complexity}
                onValueChange={(value) => setFilters({ ...filters, complexity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <Button onClick={loadReportData} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalTasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.avgTasksPerDay.toFixed(1)} per day average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total XP</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalXP.toLocaleString()}</p>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.avgXPPerTask.toFixed(0)} XP per task
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Best Day</p>
                  <p className="text-lg font-bold text-green-600">{stats.bestDay.count} tasks</p>
                </div>
                <Trophy className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.bestDay.date || 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Peak Hour</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.mostProductiveHour}:00</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Most productive time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LineChart className="h-5 w-5" />
            <span>Task Completion Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.length > 0 ? (
            <div className="space-y-4">
              {/* Simple Bar Chart */}
              <div className="space-y-3">
                {reportData.map((data, index) => (
                  <div key={data.date} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{data.date}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-blue-600">{data.count} tasks</span>
                        <span className="text-purple-600">{data.xp} XP</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div 
                        className="bg-blue-200 h-6 rounded"
                        style={{ 
                          width: `${Math.max(10, (data.count / Math.max(...reportData.map(d => d.count))) * 100)}%` 
                        }}
                      >
                        <div 
                          className="bg-blue-500 h-full rounded flex items-center justify-center"
                          style={{ 
                            width: `${(data.xp / Math.max(...reportData.map(d => d.xp))) * 100}%`
                          }}
                        >
                          <span className="text-white text-xs font-medium px-2">
                            {data.count}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Complexity Breakdown */}
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Simple: {data.complexityBreakdown.simple}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span>Medium: {data.complexityBreakdown.medium}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span>Complex: {data.complexityBreakdown.complex}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No data for selected period</h3>
              <p className="text-gray-600 text-sm">
                Try adjusting your date range or filters to see completion data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complexity Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Task Complexity Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.complexityDistribution.simple}</div>
                <div className="text-sm text-green-700">Simple Tasks</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.totalTasks > 0 ? Math.round((stats.complexityDistribution.simple / stats.totalTasks) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.complexityDistribution.medium}</div>
                <div className="text-sm text-yellow-700">Medium Tasks</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.totalTasks > 0 ? Math.round((stats.complexityDistribution.medium / stats.totalTasks) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.complexityDistribution.complex}</div>
                <div className="text-sm text-red-700">Complex Tasks</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.totalTasks > 0 ? Math.round((stats.complexityDistribution.complex / stats.totalTasks) * 100) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}