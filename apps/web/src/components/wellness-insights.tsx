'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Heart, Brain, Zap, Clock, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Activity, Moon, Sun, Coffee,
  Battery, Shield, Target, Eye, Star, Flame, Award,
  BarChart3, LineChart, PieChart, Timer, Users, BookOpen,
  Home, Briefcase, Smile, Frown, Meh, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, subDays, parseISO, differenceInHours, startOfWeek, endOfWeek } from 'date-fns';

interface WellnessMetrics {
  currentScore: number;
  weeklyAverage: number;
  trend: 'improving' | 'declining' | 'stable';
  burnoutRisk: 'low' | 'moderate' | 'high' | 'critical';
  workLifeBalance: number;
  stressLevel: number;
  energyLevel: number;
  satisfactionLevel: number;
  sleepQuality: number;
  workloadIntensity: number;
  socialConnection: number;
}

interface BurnoutIndicator {
  type: 'workload' | 'schedule' | 'satisfaction' | 'energy' | 'social' | 'sleep';
  level: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendations: string[];
  priority: number;
}

interface WellnessInsight {
  id: string;
  title: string;
  description: string;
  category: 'positive' | 'concern' | 'warning' | 'critical';
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  trends: string[];
}

interface WorkPattern {
  averageWorkingHours: number;
  peakWorkingHours: { start: number; end: number };
  weekendWork: number;
  consecutiveWorkDays: number;
  taskIntensity: number;
  meetingLoad: number;
}

interface WellnessInsightsProps {
  className?: string;
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getRiskIcon = (risk: string) => {
  switch (risk) {
    case 'low': return CheckCircle;
    case 'moderate': return Eye;
    case 'high': return AlertTriangle;
    case 'critical': return AlertTriangle;
    default: return Eye;
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return ArrowUp;
    case 'declining': return ArrowDown;
    default: return Minus;
  }
};

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'improving': return 'text-green-500';
    case 'declining': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

const getMoodIcon = (score: number) => {
  if (score >= 8) return Smile;
  if (score >= 6) return Meh;
  return Frown;
};

const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
};

export function WellnessInsights({ className = '' }: WellnessInsightsProps) {
  const [metrics, setMetrics] = useState<WellnessMetrics | null>(null);
  const [burnoutIndicators, setBurnoutIndicators] = useState<BurnoutIndicator[]>([]);
  const [insights, setInsights] = useState<WellnessInsight[]>([]);
  const [workPattern, setWorkPattern] = useState<WorkPattern | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const analyzeWellnessMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const today = new Date();
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      // Get wellness data
      const { data: wellnessData } = await supabase
        .from('wellness_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', format(monthAgo, 'yyyy-MM-dd'))
        .order('recorded_at', { ascending: true });

      // Get recent productivity sessions
      const { data: sessions } = await supabase
        .from('productivity_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('session_start', format(monthAgo, 'yyyy-MM-dd'))
        .order('session_start', { ascending: true });

      // Get recent tasks for workload analysis
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', format(monthAgo, 'yyyy-MM-dd'))
        .order('completed_at', { ascending: true });

      // Calculate current wellness score using database function
      const { data: currentWellnessScore } = await supabase.rpc('calculate_wellness_score', {
        p_user_id: user.id
      });

      // Process wellness metrics
      const recentWellness = wellnessData?.slice(-7) || [];
      const weeklyAverage = recentWellness.length > 0
        ? recentWellness.reduce((sum, w) => sum + (w.wellness_score || 5), 0) / recentWellness.length
        : 5;

      // Calculate trend
      const trend = recentWellness.length >= 2
        ? recentWellness[recentWellness.length - 1].wellness_score > recentWellness[0].wellness_score
          ? 'improving' : recentWellness[recentWellness.length - 1].wellness_score < recentWellness[0].wellness_score
          ? 'declining' : 'stable'
        : 'stable' as const;

      // Analyze work patterns
      const workingHours: number[] = [];
      const weekendHours: number[] = [];
      const dailyTaskCounts: { [key: string]: number } = {};

      if (sessions) {
        sessions.forEach(session => {
          const sessionDate = parseISO(session.session_start);
          const dayOfWeek = sessionDate.getDay();
          const hour = sessionDate.getHours();
          
          workingHours.push(hour);
          
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendHours.push(hour);
          }
        });
      }

      if (tasks) {
        tasks.forEach(task => {
          if (task.completed_at) {
            const date = format(parseISO(task.completed_at), 'yyyy-MM-dd');
            dailyTaskCounts[date] = (dailyTaskCounts[date] || 0) + 1;
          }
        });
      }

      const averageWorkingHours = workingHours.length > 0 
        ? workingHours.length / Math.max(1, Object.keys(dailyTaskCounts).length) 
        : 0;
      
      const taskIntensity = Object.values(dailyTaskCounts).length > 0
        ? Object.values(dailyTaskCounts).reduce((sum, count) => sum + count, 0) / Object.values(dailyTaskCounts).length
        : 0;

      const workPatternAnalysis: WorkPattern = {
        averageWorkingHours,
        peakWorkingHours: { start: 9, end: 17 }, // Could be calculated from data
        weekendWork: weekendHours.length,
        consecutiveWorkDays: 5, // Could be calculated
        taskIntensity,
        meetingLoad: 0, // Would need meeting data
      };

      // Calculate individual wellness components
      const latestWellness = recentWellness[recentWellness.length - 1];
      const workLifeBalance = latestWellness?.work_life_balance || 5;
      const stressLevel = latestWellness?.stress_level || 5;
      const energyLevel = latestWellness?.energy_level || 5;
      const satisfactionLevel = latestWellness?.job_satisfaction || 5;
      const sleepQuality = latestWellness?.sleep_quality || 5;
      const socialConnection = latestWellness?.social_connection || 5;

      // Calculate burnout risk
      const burnoutScore = (
        (10 - stressLevel) * 0.25 +
        energyLevel * 0.2 +
        workLifeBalance * 0.2 +
        satisfactionLevel * 0.15 +
        sleepQuality * 0.1 +
        socialConnection * 0.1
      );

      const burnoutRisk = burnoutScore >= 7 ? 'low' :
                         burnoutScore >= 5 ? 'moderate' :
                         burnoutScore >= 3 ? 'high' : 'critical';

      const wellnessMetrics: WellnessMetrics = {
        currentScore: currentWellnessScore || 5,
        weeklyAverage,
        trend,
        burnoutRisk,
        workLifeBalance,
        stressLevel,
        energyLevel,
        satisfactionLevel,
        sleepQuality,
        workloadIntensity: Math.min(10, taskIntensity),
        socialConnection,
      };

      // Generate burnout indicators
      const indicators: BurnoutIndicator[] = [];

      // Workload indicator
      if (taskIntensity > 10) {
        indicators.push({
          type: 'workload',
          level: 'high',
          description: 'High task volume detected',
          impact: 'May lead to exhaustion and reduced quality',
          recommendations: [
            'Consider delegating or postponing non-critical tasks',
            'Break large tasks into smaller chunks',
            'Schedule buffer time between tasks',
          ],
          priority: 1,
        });
      }

      // Stress indicator
      if (stressLevel > 7) {
        indicators.push({
          type: 'schedule',
          level: stressLevel > 8 ? 'critical' : 'high',
          description: 'Elevated stress levels detected',
          impact: 'High stress can impact decision-making and health',
          recommendations: [
            'Practice stress management techniques',
            'Take regular breaks throughout the day',
            'Consider meditation or breathing exercises',
            'Review and adjust current commitments',
          ],
          priority: stressLevel > 8 ? 0 : 1,
        });
      }

      // Energy indicator
      if (energyLevel < 4) {
        indicators.push({
          type: 'energy',
          level: energyLevel < 3 ? 'critical' : 'high',
          description: 'Low energy levels detected',
          impact: 'May affect productivity and motivation',
          recommendations: [
            'Ensure adequate sleep (7-9 hours)',
            'Take short walks or exercise breaks',
            'Review nutrition and hydration habits',
            'Consider energy management techniques',
          ],
          priority: energyLevel < 3 ? 0 : 2,
        });
      }

      // Work-life balance indicator
      if (workLifeBalance < 5) {
        indicators.push({
          type: 'schedule',
          level: workLifeBalance < 3 ? 'critical' : 'moderate',
          description: 'Work-life balance concerns',
          impact: 'Poor balance can lead to burnout and relationship strain',
          recommendations: [
            'Set clear boundaries between work and personal time',
            'Schedule regular personal activities',
            'Consider flexible work arrangements',
            'Practice saying no to non-essential commitments',
          ],
          priority: workLifeBalance < 3 ? 0 : 3,
        });
      }

      // Sleep quality indicator
      if (sleepQuality < 5) {
        indicators.push({
          type: 'sleep',
          level: sleepQuality < 3 ? 'high' : 'moderate',
          description: 'Sleep quality concerns detected',
          impact: 'Poor sleep affects cognitive function and recovery',
          recommendations: [
            'Maintain consistent sleep schedule',
            'Create relaxing bedtime routine',
            'Avoid screens 1 hour before bed',
            'Consider sleep environment improvements',
          ],
          priority: sleepQuality < 3 ? 1 : 4,
        });
      }

      // Sort indicators by priority
      indicators.sort((a, b) => a.priority - b.priority);

      // Generate insights
      const generatedInsights: WellnessInsight[] = [];

      // Positive insights
      if (wellnessMetrics.currentScore >= 7) {
        generatedInsights.push({
          id: 'wellness-positive',
          title: 'Strong Wellness Score',
          description: `Your current wellness score of ${wellnessMetrics.currentScore.toFixed(1)} indicates good overall well-being.`,
          category: 'positive',
          confidence: 85,
          actionable: true,
          recommendations: [
            'Keep up your current wellness practices',
            'Consider mentoring others on wellness strategies',
            'Document what\'s working well for future reference',
          ],
          trends: [`${trend} trend over the past week`],
        });
      }

      // Burnout risk insights
      if (burnoutRisk === 'high' || burnoutRisk === 'critical') {
        generatedInsights.push({
          id: 'burnout-risk',
          title: 'Burnout Risk Detected',
          description: `Multiple indicators suggest ${burnoutRisk} burnout risk. Immediate attention recommended.`,
          category: burnoutRisk === 'critical' ? 'critical' : 'warning',
          confidence: 90,
          actionable: true,
          recommendations: [
            'Reduce workload where possible',
            'Schedule time for recovery activities',
            'Consider speaking with a manager or counselor',
            'Prioritize sleep and self-care',
          ],
          trends: ['Multiple wellness indicators below optimal levels'],
        });
      }

      // Work pattern insights
      if (workPatternAnalysis.weekendWork > 5) {
        generatedInsights.push({
          id: 'weekend-work',
          title: 'Weekend Work Pattern',
          description: `Significant weekend work detected (${workPatternAnalysis.weekendWork} sessions).`,
          category: 'concern',
          confidence: 75,
          actionable: true,
          recommendations: [
            'Protect weekend time for rest and recovery',
            'Review workload distribution throughout the week',
            'Set boundaries around weekend availability',
          ],
          trends: ['Consistent weekend work pattern'],
        });
      }

      setMetrics(wellnessMetrics);
      setBurnoutIndicators(indicators);
      setInsights(generatedInsights);
      setWorkPattern(workPatternAnalysis);

    } catch (err: any) {
      console.error('Error analyzing wellness metrics:', err);
      setError(err.message || 'Failed to analyze wellness metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    analyzeWellnessMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Analyzing wellness metrics...</p>
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
            <Button onClick={analyzeWellnessMetrics} variant="outline">
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
        <Heart className="h-8 w-8 text-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wellness Insights</h2>
          <p className="text-gray-600">Monitor your well-being and prevent burnout</p>
        </div>
      </div>

      {/* Critical Alerts */}
      {burnoutIndicators.some(i => i.level === 'critical') && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical wellness concerns detected.</strong> Please consider taking immediate action to address burnout risk factors.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Wellness Score */}
      <Card className={`border-2 ${getRiskColor(metrics.burnoutRisk)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Overall Wellness</h3>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-3xl font-bold">{metrics.currentScore.toFixed(1)}/10</span>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const TrendIcon = getTrendIcon(metrics.trend);
                    return <TrendIcon className={`h-4 w-4 ${getTrendColor(metrics.trend)}`} />;
                  })()}
                  <span className="text-sm text-gray-600 capitalize">{metrics.trend}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getRiskColor(metrics.burnoutRisk)}`}>
                {(() => {
                  const RiskIcon = getRiskIcon(metrics.burnoutRisk);
                  return <RiskIcon className="h-4 w-4" />;
                })()}
                <span className="text-sm font-medium capitalize">{metrics.burnoutRisk} Risk</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Weekly avg: {metrics.weeklyAverage.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wellness Components */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Battery className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-gray-600">Energy</p>
            <p className={`text-xl font-bold ${getScoreColor(metrics.energyLevel)}`}>
              {metrics.energyLevel.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-gray-600">Stress</p>
            <p className={`text-xl font-bold ${getScoreColor(10 - metrics.stressLevel)}`}>
              {metrics.stressLevel.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-gray-600">Balance</p>
            <p className={`text-xl font-bold ${getScoreColor(metrics.workLifeBalance)}`}>
              {metrics.workLifeBalance.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            {(() => {
              const MoodIcon = getMoodIcon(metrics.satisfactionLevel);
              return <MoodIcon className="h-6 w-6 mx-auto mb-2 text-purple-500" />;
            })()}
            <p className="text-sm text-gray-600">Satisfaction</p>
            <p className={`text-xl font-bold ${getScoreColor(metrics.satisfactionLevel)}`}>
              {metrics.satisfactionLevel.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Moon className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-sm text-gray-600">Sleep</p>
            <p className={`text-xl font-bold ${getScoreColor(metrics.sleepQuality)}`}>
              {metrics.sleepQuality.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-pink-500" />
            <p className="text-sm text-gray-600">Social</p>
            <p className={`text-xl font-bold ${getScoreColor(metrics.socialConnection)}`}>
              {metrics.socialConnection.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Burnout Indicators */}
      {burnoutIndicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Burnout Risk Factors</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {burnoutIndicators.map((indicator, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${getRiskColor(indicator.level)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{indicator.description}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {indicator.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{indicator.impact}</p>
                    
                    <div>
                      <h5 className="font-medium text-sm mb-2">Recommendations:</h5>
                      <ul className="space-y-1">
                        {indicator.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                            <Star className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Work Pattern Analysis */}
      {workPattern && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Work Pattern Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{workPattern.averageWorkingHours.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">Daily average</p>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Activity className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{workPattern.taskIntensity.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Tasks per day</p>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{workPattern.weekendWork}</p>
                <p className="text-xs text-gray-500">Weekend sessions</p>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Flame className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{workPattern.consecutiveWorkDays}</p>
                <p className="text-xs text-gray-500">Consecutive days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Wellness Insights</h3>
          
          <div className="space-y-3">
            {insights.map((insight) => (
              <Card key={insight.id} className={`border-l-4 ${
                insight.category === 'critical' ? 'border-l-red-500' :
                insight.category === 'warning' ? 'border-l-orange-500' :
                insight.category === 'concern' ? 'border-l-yellow-500' :
                'border-l-green-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-500" />
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {insight.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      
                      {insight.actionable && insight.recommendations.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {insight.recommendations.map((rec, index) => (
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
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}