'use client';

// Epic 9, Story 9.6: Predictive Analytics and Insights Dashboard

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Brain, 
  AlertTriangle, 
  Clock, 
  Target, 
  Zap,
  Activity,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { predictiveAnalyticsService } from '@/lib/services/predictiveAnalyticsService';
import {
  ProductivityInsights,
  GoalCompletionPrediction,
  WorkloadPrediction,
  BottleneckPrediction,
  TimingRecommendation,
  WeeklyInsight,
  ProductivityForecast,
  PeriodType,
  TaskType,
  BottleneckType
} from '@/lib/types/predictiveAnalytics';

export default function PredictiveAnalyticsPage() {
  const [insights, setInsights] = useState<ProductivityInsights | null>(null);
  const [goalPredictions, setGoalPredictions] = useState<GoalCompletionPrediction[]>([]);
  const [workloadForecasts, setWorkloadForecasts] = useState<WorkloadPrediction[]>([]);
  const [bottleneckPredictions, setBottleneckPredictions] = useState<BottleneckPrediction[]>([]);
  const [timingRecommendations, setTimingRecommendations] = useState<TimingRecommendation[]>([]);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('creative');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [
        insightsData,
        goalsData,
        workloadData,
        bottlenecksData,
        timingData,
        weeklyData
      ] = await Promise.all([
        predictiveAnalyticsService.getProductivityInsights(),
        predictiveAnalyticsService.getGoalPredictions(),
        predictiveAnalyticsService.getWorkloadPredictions(),
        predictiveAnalyticsService.getBottleneckPredictions(),
        predictiveAnalyticsService.getTimingRecommendations(),
        predictiveAnalyticsService.getWeeklyInsights()
      ]);

      setInsights(insightsData);
      setGoalPredictions(goalsData);
      setWorkloadForecasts(workloadData);
      setBottleneckPredictions(bottlenecksData);
      setTimingRecommendations(timingData);
      setWeeklyInsights(weeklyData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWorkloadForecast = async () => {
    try {
      const forecast = await predictiveAnalyticsService.generateWorkloadForecast({
        period_type: selectedPeriod,
        periods_ahead: 1,
        include_capacity_recommendations: true
      });
      setWorkloadForecasts([forecast, ...workloadForecasts]);
    } catch (error) {
      console.error('Error generating forecast:', error);
    }
  };

  const analyzeBottlenecks = async () => {
    try {
      const bottlenecks = await predictiveAnalyticsService.analyzeBottlenecks({
        analysis_period_days: 30,
        severity_threshold: 0.5,
        include_prevention_strategies: true
      });
      setBottleneckPredictions([...bottlenecks, ...bottleneckPredictions]);
    } catch (error) {
      console.error('Error analyzing bottlenecks:', error);
    }
  };

  const generateTimingRecommendations = async () => {
    try {
      const recommendations = await predictiveAnalyticsService.generateTimingRecommendations({
        task_types: [selectedTaskType],
        include_environmental_factors: true
      });
      setTimingRecommendations([...recommendations, ...timingRecommendations]);
    } catch (error) {
      console.error('Error generating timing recommendations:', error);
    }
  };

  const generateWeeklyInsight = async () => {
    try {
      const insight = await predictiveAnalyticsService.generateWeeklyInsights({
        period_type: 'week',
        include_predictions: true
      });
      setWeeklyInsights([insight, ...weeklyInsights]);
    } catch (error) {
      console.error('Error generating weekly insight:', error);
    }
  };

  const getBurnoutRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProductivityTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 0.8) return 'text-red-600 bg-red-50';
    if (severity >= 0.6) return 'text-orange-600 bg-orange-50';
    if (severity >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatProbability = (probability: number) => {
    return `${Math.round(probability * 100)}%`;
  };

  const formatHours = (hours: number[]) => {
    return hours.map(h => `${h}:00`).join(', ');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading predictive analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Predictive Analytics</h1>
          <p className="text-gray-600 mt-2">AI-powered insights and productivity forecasts</p>
        </div>
        <Button onClick={loadAnalyticsData} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics Overview */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Current Productivity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{Math.round(insights.current_productivity_score * 100)}%</span>
                {getProductivityTrendIcon(insights.productivity_trend)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Consistency: {Math.round(insights.productivity_consistency * 100)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Goal Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">{insights.goals_likely_to_complete}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                At risk: {insights.goals_at_risk}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Capacity Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-2xl font-bold">{Math.round(insights.current_capacity_utilization * 100)}%</span>
                  <span className="text-sm text-gray-500">{insights.optimal_capacity_hours}h</span>
                </div>
                <Progress value={insights.current_capacity_utilization * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Burnout Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <Badge className={getBurnoutRiskColor(insights.burnout_risk_level)}>
                  {insights.burnout_risk_level.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Peak hours: {formatHours(insights.peak_performance_hours)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goal Predictions</TabsTrigger>
          <TabsTrigger value="workload">Workload Forecasts</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          <TabsTrigger value="timing">Optimal Timing</TabsTrigger>
          <TabsTrigger value="insights">Weekly Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {insights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Immediate Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <span>Immediate Actions</span>
                  </CardTitle>
                  <CardDescription>Actions you can take right now</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.immediate_actions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{action}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Optimizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span>Weekly Optimizations</span>
                  </CardTitle>
                  <CardDescription>Improvements for this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.weekly_optimizations.map((optimization, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{optimization}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Long-term Improvements */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span>Long-term Improvements</span>
                  </CardTitle>
                  <CardDescription>Strategic improvements for sustained growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.long_term_improvements.map((improvement, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <ChevronRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{improvement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Bottlenecks */}
              {insights.active_bottlenecks.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Active Bottlenecks</span>
                    </CardTitle>
                    <CardDescription>Current productivity bottlenecks that need attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.active_bottlenecks.map((bottleneck, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">
                              {bottleneck.bottleneck_type.replace('_', ' ').toUpperCase()}
                            </h4>
                            <Badge className={getSeverityColor(bottleneck.severity_score)}>
                              Severity: {Math.round(bottleneck.severity_score * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Impact: {Math.round(bottleneck.productivity_impact * 100)}% productivity loss
                          </p>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Resolution Strategies:</p>
                            {bottleneck.resolution_strategies.map((strategy, strategyIndex) => (
                              <div key={strategyIndex} className="flex items-start space-x-2">
                                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{strategy}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Goal Predictions Tab */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Completion Predictions</CardTitle>
              <CardDescription>AI predictions for your current goals</CardDescription>
            </CardHeader>
            <CardContent>
              {goalPredictions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No goal predictions available. Create some goals to see predictions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goalPredictions.map((prediction) => (
                    <div key={prediction.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{prediction.goal?.title}</h4>
                          <p className="text-sm text-gray-600">{prediction.goal?.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatProbability(prediction.completion_probability)}
                          </div>
                          <Badge variant={prediction.completion_probability > 0.7 ? 'default' : 'destructive'}>
                            {prediction.completion_probability > 0.7 ? 'On Track' : 'At Risk'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Progress:</span>
                          <div className="mt-1">
                            <Progress value={prediction.current_progress_percentage} className="h-2" />
                            <span className="text-xs text-gray-500">
                              {Math.round(prediction.current_progress_percentage)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Tasks Remaining:</span>
                          <span className="ml-2 font-medium">{prediction.tasks_remaining}</span>
                        </div>
                      </div>

                      {prediction.predicted_completion_date && (
                        <div className="mt-3 text-sm">
                          <span className="text-gray-500">Predicted Completion:</span>
                          <span className="ml-2 font-medium">
                            {new Date(prediction.predicted_completion_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {prediction.estimated_hours_remaining && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Estimated Hours:</span>
                          <span className="ml-2 font-medium">{prediction.estimated_hours_remaining}h</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workload Forecasts Tab */}
        <TabsContent value="workload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workload Capacity Forecasts</CardTitle>
              <CardDescription>Predicted workload and capacity recommendations</CardDescription>
              <div className="flex space-x-2">
                <Select value={selectedPeriod} onValueChange={(value: PeriodType) => setSelectedPeriod(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={generateWorkloadForecast}>Generate Forecast</Button>
              </div>
            </CardHeader>
            <CardContent>
              {workloadForecasts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No workload forecasts available. Generate a forecast to see predictions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workloadForecasts.slice(0, 3).map((forecast) => (
                    <div key={forecast.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {forecast.period_type.charAt(0).toUpperCase() + forecast.period_type.slice(1)} Forecast
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(forecast.prediction_period_start).toLocaleDateString()} - 
                            {new Date(forecast.prediction_period_end).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getBurnoutRiskColor(
                          forecast.burnout_risk_score > 0.7 ? 'high' : 
                          forecast.burnout_risk_score > 0.4 ? 'medium' : 'low'
                        )}>
                          Burnout Risk: {Math.round(forecast.burnout_risk_score * 100)}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{forecast.predicted_capacity_hours}h</div>
                          <div className="text-sm text-gray-500">Predicted Capacity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{forecast.optimal_task_count}</div>
                          <div className="text-sm text-gray-500">Optimal Tasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(forecast.workload_utilization * 100)}%
                          </div>
                          <div className="text-sm text-gray-500">Utilization</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {Math.round(forecast.confidence_level * 100)}%
                          </div>
                          <div className="text-sm text-gray-500">Confidence</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Capacity Recommendations</h5>
                          <div className="space-y-1">
                            {forecast.capacity_recommendations.map((rec, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Schedule Optimizations</h5>
                          <div className="space-y-1">
                            {forecast.schedule_optimizations.map((opt, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <Clock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{opt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Productivity Bottleneck Analysis</CardTitle>
              <CardDescription>Identify and prevent productivity bottlenecks</CardDescription>
              <Button onClick={analyzeBottlenecks} className="w-fit">
                <Brain className="w-4 h-4 mr-2" />
                Analyze Bottlenecks
              </Button>
            </CardHeader>
            <CardContent>
              {bottleneckPredictions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No bottlenecks detected. Run analysis to identify potential issues.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bottleneckPredictions.map((bottleneck) => (
                    <div key={bottleneck.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {bottleneck.bottleneck_type.replace('_', ' ').toUpperCase()}
                          </h4>
                          <p className="text-sm text-gray-600 capitalize">
                            Category: {bottleneck.bottleneck_category}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getSeverityColor(bottleneck.severity_score)}>
                            Severity: {Math.round(bottleneck.severity_score * 100)}%
                          </Badge>
                          <div className="text-sm text-gray-500">
                            Impact: {Math.round(bottleneck.productivity_impact * 100)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Next Week Likelihood:</span>
                          <div className="mt-1">
                            <Progress value={bottleneck.likelihood_next_week * 100} className="h-2" />
                            <span className="text-xs text-gray-500">
                              {formatProbability(bottleneck.likelihood_next_week)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Next Month Likelihood:</span>
                          <div className="mt-1">
                            <Progress value={bottleneck.likelihood_next_month * 100} className="h-2" />
                            <span className="text-xs text-gray-500">
                              {formatProbability(bottleneck.likelihood_next_month)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Resolution Strategies</h5>
                          <div className="space-y-1">
                            {bottleneck.resolution_strategies.map((strategy, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{strategy}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Mitigation Actions</h5>
                          <div className="space-y-1">
                            {bottleneck.mitigation_actions.map((action, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimal Timing Recommendations</CardTitle>
              <CardDescription>AI-powered timing optimization for different task types</CardDescription>
              <div className="flex space-x-2">
                <Select value={selectedTaskType} onValueChange={(value: TaskType) => setSelectedTaskType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={generateTimingRecommendations}>Generate Recommendations</Button>
              </div>
            </CardHeader>
            <CardContent>
              {timingRecommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No timing recommendations available. Generate recommendations for optimal scheduling.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timingRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">
                            {recommendation.task_type} Tasks
                          </h4>
                          <p className="text-sm text-gray-600 capitalize">
                            Complexity: {recommendation.complexity_level}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round((recommendation.predicted_performance_score || 0.75) * 100)}%
                          </div>
                          <div className="text-sm text-gray-500">Predicted Performance</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-gray-500">Optimal Hours:</span>
                          <div className="font-medium">
                            {formatHours(recommendation.optimal_hours as number[])}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Best Days:</span>
                          <div className="font-medium">
                            {(recommendation.optimal_days as string[]).join(', ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Duration:</span>
                          <div className="font-medium">
                            {recommendation.optimal_duration_minutes} min
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Break Frequency:</span>
                          <div className="font-medium">
                            {recommendation.optimal_break_frequency} min
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="font-medium text-orange-600 capitalize">
                            {recommendation.energy_requirement}
                          </div>
                          <div className="text-sm text-gray-500">Energy</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-purple-600 capitalize">
                            {recommendation.focus_requirement}
                          </div>
                          <div className="text-sm text-gray-500">Focus</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600 capitalize">
                            {recommendation.interruption_tolerance}
                          </div>
                          <div className="text-sm text-gray-500">Interruption Tolerance</div>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-500">Preferred Locations:</span>
                        <div className="mt-1">
                          {(recommendation.preferred_location as string[]).map((location, index) => (
                            <Badge key={index} variant="outline" className="mr-2">
                              {location}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Productivity Insights</CardTitle>
              <CardDescription>AI-generated weekly reports and recommendations</CardDescription>
              <Button onClick={generateWeeklyInsight} className="w-fit">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate This Week's Insight
              </Button>
            </CardHeader>
            <CardContent>
              {weeklyInsights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No weekly insights available. Generate insights to see detailed weekly analysis.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {weeklyInsights.slice(0, 4).map((insight) => (
                    <div key={insight.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Week of {new Date(insight.week_start_date).toLocaleDateString()}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(insight.week_start_date).toLocaleDateString()} - 
                            {new Date(insight.week_end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {getProductivityTrendIcon(insight.productivity_trend || 'stable')}
                            <Badge variant={
                              insight.productivity_trend === 'improving' ? 'default' :
                              insight.productivity_trend === 'declining' ? 'destructive' : 'secondary'
                            }>
                              {insight.productivity_trend || 'stable'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Score: {Math.round((insight.total_productivity_score || 0.5) * 100)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{insight.goals_completed}</div>
                          <div className="text-sm text-gray-500">Goals Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{insight.goals_on_track}</div>
                          <div className="text-sm text-gray-500">Goals On Track</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{insight.goals_at_risk}</div>
                          <div className="text-sm text-gray-500">Goals At Risk</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Key Insights</h5>
                          <div className="space-y-1">
                            {insight.key_insights.map((keyInsight, index) => (
                              <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{keyInsight}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {insight.success_patterns.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Success Patterns</h5>
                            <div className="space-y-1">
                              {insight.success_patterns.map((pattern, index) => (
                                <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">{pattern}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insight.improvement_areas.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Improvement Areas</h5>
                            <div className="space-y-1">
                              {insight.improvement_areas.map((area, index) => (
                                <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
                                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">{area}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {insight.recommended_adjustments.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Recommended Adjustments</h5>
                            <div className="space-y-1">
                              {insight.recommended_adjustments.map((adjustment, index) => (
                                <div key={index} className="flex items-start space-x-2 p-2 bg-purple-50 rounded">
                                  <ChevronRight className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">{adjustment}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}