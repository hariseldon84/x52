// Epic 9, Story 9.6: Predictive Analytics and Insights Service

import { supabase } from '@/lib/supabase';
import {
  ProductivityMetrics,
  GoalCompletionPrediction,
  WorkloadPrediction,
  BottleneckPrediction,
  TimingRecommendation,
  WeeklyInsight,
  PredictionModel,
  ProductivityAnalysisRequest,
  GoalPredictionRequest,
  WorkloadForecastRequest,
  BottleneckAnalysisRequest,
  TimingOptimizationRequest,
  InsightGenerationRequest,
  PredictiveAnalyticsResponse,
  ProductivityInsights,
  ProductivityForecast,
  UserProductivityProfile,
  PeriodType,
  TaskType,
  BottleneckType,
  ProductivityTrend
} from '@/lib/types/predictiveAnalytics';

export class PredictiveAnalyticsService {
  
  // Productivity Metrics Management
  async recordProductivityMetrics(metrics: Partial<ProductivityMetrics>): Promise<ProductivityMetrics> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('productivity_metrics')
      .insert({
        user_id: user.user.id,
        ...metrics
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getProductivityMetrics(request: ProductivityAnalysisRequest): Promise<ProductivityMetrics[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    let query = supabase
      .from('productivity_metrics')
      .select('*')
      .eq('user_id', request.user_id || user.user.id)
      .order('metric_date', { ascending: false });

    if (request.date_range) {
      query = query
        .gte('metric_date', request.date_range.start_date)
        .lte('metric_date', request.date_range.end_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async calculateDailyProductivityMetrics(userId?: string, date?: string): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('calculate_productivity_metrics', {
      p_user_id: targetUserId,
      p_date: date || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data;
  }

  // Goal Completion Predictions
  async predictGoalCompletion(request: GoalPredictionRequest): Promise<GoalCompletionPrediction> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // First run the prediction function
    const { data: probability, error: predictionError } = await supabase.rpc('predict_goal_completion', {
      p_goal_id: request.goal_id,
      p_user_id: user.user.id
    });

    if (predictionError) throw predictionError;

    // Then fetch the detailed prediction record
    const { data, error } = await supabase
      .from('goal_completion_predictions')
      .select(`
        *,
        goal:goals(id, title, description, status, priority)
      `)
      .eq('goal_id', request.goal_id)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  }

  async getGoalPredictions(userId?: string): Promise<GoalCompletionPrediction[]> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_completion_predictions')
      .select(`
        *,
        goal:goals(id, title, description, status, priority)
      `)
      .eq('user_id', targetUserId)
      .order('completion_probability', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Workload Predictions
  async generateWorkloadForecast(request: WorkloadForecastRequest): Promise<WorkloadPrediction> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const startDate = new Date();
    const endDate = new Date();
    
    // Calculate prediction period based on request
    switch (request.period_type) {
      case 'week':
        endDate.setDate(startDate.getDate() + (7 * request.periods_ahead));
        break;
      case 'month':
        endDate.setMonth(startDate.getMonth() + request.periods_ahead);
        break;
      case 'quarter':
        endDate.setMonth(startDate.getMonth() + (3 * request.periods_ahead));
        break;
    }

    // Get historical productivity data
    const historicalMetrics = await this.getProductivityMetrics({
      user_id: user.user.id,
      date_range: {
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    });

    // Calculate predictions based on historical data
    const avgProductivity = historicalMetrics.reduce((sum, m) => sum + m.productivity_score, 0) / historicalMetrics.length || 0.5;
    const avgCapacity = historicalMetrics.reduce((sum, m) => sum + m.time_worked_minutes, 0) / historicalMetrics.length || 480; // 8 hours default
    
    const prediction: Partial<WorkloadPrediction> = {
      user_id: user.user.id,
      prediction_period_start: startDate.toISOString().split('T')[0],
      prediction_period_end: endDate.toISOString().split('T')[0],
      period_type: request.period_type,
      predicted_capacity_hours: Math.round(avgCapacity / 60),
      optimal_task_count: Math.round(avgProductivity * 10),
      recommended_complexity_mix: {
        simple: 0.4,
        medium: 0.4,
        complex: 0.2
      },
      current_workload_hours: 0, // This would be calculated from active tasks
      workload_utilization: 0.75,
      burnout_risk_score: avgProductivity < 0.4 ? 0.8 : avgProductivity < 0.6 ? 0.4 : 0.2,
      predicted_productivity_score: avgProductivity,
      predicted_completion_rate: avgProductivity * 0.9,
      optimal_break_schedule: {
        morning_break: '10:30',
        lunch_break: '12:30',
        afternoon_break: '15:30'
      },
      external_factors: request.external_factors || {},
      seasonal_adjustments: {},
      historical_pattern_match: 0.8,
      capacity_recommendations: [
        avgProductivity < 0.5 ? 'Consider reducing workload to prevent burnout' : 'Current capacity is well-balanced',
        'Schedule complex tasks during peak productivity hours',
        'Maintain regular break schedule for optimal performance'
      ],
      schedule_optimizations: [
        'Block time for deep work during morning hours',
        'Group similar tasks to reduce context switching',
        'Reserve afternoons for administrative tasks'
      ],
      risk_mitigation_strategies: [
        'Monitor productivity trends weekly',
        'Adjust workload if burnout risk exceeds 0.6',
        'Implement stress management techniques'
      ],
      confidence_level: 0.75
    };

    const { data, error } = await supabase
      .from('workload_predictions')
      .insert(prediction)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkloadPredictions(userId?: string, periodType?: PeriodType): Promise<WorkloadPrediction[]> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    let query = supabase
      .from('workload_predictions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('prediction_period_start', { ascending: false });

    if (periodType) {
      query = query.eq('period_type', periodType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Bottleneck Analysis
  async analyzeBottlenecks(request: BottleneckAnalysisRequest): Promise<BottleneckPrediction[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // This would typically involve ML analysis of user patterns
    // For now, we'll create sample bottleneck predictions based on productivity patterns
    const historicalMetrics = await this.getProductivityMetrics({
      user_id: user.user.id,
      date_range: {
        start_date: new Date(Date.now() - (request.analysis_period_days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    });

    const bottlenecks: Partial<BottleneckPrediction>[] = [];

    // Analyze patterns and identify potential bottlenecks
    const avgProductivity = historicalMetrics.reduce((sum, m) => sum + m.productivity_score, 0) / historicalMetrics.length || 0.5;
    const highInterruptionDays = historicalMetrics.filter(m => m.interruption_count > 5).length;

    if (avgProductivity < 0.4) {
      bottlenecks.push({
        user_id: user.user.id,
        bottleneck_type: 'time_management',
        bottleneck_category: 'personal',
        severity_score: 0.8,
        frequency_score: 0.7,
        productivity_impact: 0.6,
        likelihood_next_week: 0.75,
        likelihood_next_month: 0.85,
        estimated_time_cost_hours: 10,
        trigger_patterns: {
          low_productivity_days: historicalMetrics.filter(m => m.productivity_score < 0.3).length,
          pattern: 'Consistent low productivity scores'
        },
        affected_tasks: ['complex', 'analytical'],
        resolution_strategies: [
          'Implement time-blocking techniques',
          'Use the Pomodoro Technique for focus',
          'Prioritize high-impact tasks during peak hours'
        ],
        prevention_score: 0.8,
        early_warning_signals: ['Declining daily task completion', 'Increased time per task'],
        mitigation_actions: [
          'Schedule regular productivity reviews',
          'Adjust task complexity mix',
          'Implement focus enhancement techniques'
        ],
        prediction_confidence: 0.7
      });
    }

    if (highInterruptionDays > historicalMetrics.length * 0.3) {
      bottlenecks.push({
        user_id: user.user.id,
        bottleneck_type: 'context_switching',
        bottleneck_category: 'environmental',
        severity_score: 0.6,
        frequency_score: 0.8,
        productivity_impact: 0.5,
        likelihood_next_week: 0.6,
        likelihood_next_month: 0.7,
        estimated_time_cost_hours: 8,
        trigger_patterns: {
          high_interruption_frequency: highInterruptionDays,
          pattern: 'Frequent context switching detected'
        },
        affected_tasks: ['creative', 'analytical'],
        resolution_strategies: [
          'Establish dedicated focus hours',
          'Use noise-cancelling headphones',
          'Implement communication boundaries'
        ],
        prevention_score: 0.9,
        early_warning_signals: ['High interruption count', 'Reduced focus scores'],
        mitigation_actions: [
          'Block calendar during focus time',
          'Set up distraction-free workspace',
          'Communicate availability windows'
        ],
        prediction_confidence: 0.8
      });
    }

    // Insert bottleneck predictions
    if (bottlenecks.length > 0) {
      const { data, error } = await supabase
        .from('bottleneck_predictions')
        .insert(bottlenecks)
        .select();

      if (error) throw error;
      return data || [];
    }

    return [];
  }

  async getBottleneckPredictions(userId?: string): Promise<BottleneckPrediction[]> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bottleneck_predictions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('severity_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Timing Optimization
  async generateTimingRecommendations(request: TimingOptimizationRequest): Promise<TimingRecommendation[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const historicalMetrics = await this.getProductivityMetrics({
      user_id: user.user.id,
      date_range: {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    });

    const taskTypes: TaskType[] = request.task_types || ['creative', 'analytical', 'administrative', 'communication'];
    const recommendations: Partial<TimingRecommendation>[] = [];

    // Analyze peak hours from historical data
    const peakHours = this.calculatePeakHours(historicalMetrics);

    for (const taskType of taskTypes) {
      const recommendation: Partial<TimingRecommendation> = {
        user_id: user.user.id,
        task_type: taskType,
        complexity_level: 'medium',
        optimal_hours: this.getOptimalHoursForTaskType(taskType, peakHours),
        optimal_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        optimal_duration_minutes: this.getOptimalDurationForTaskType(taskType),
        predicted_performance_score: 0.75,
        expected_completion_time_minutes: this.getExpectedCompletionTime(taskType),
        error_rate_prediction: 0.1,
        energy_requirement: this.getEnergyRequirement(taskType),
        focus_requirement: this.getFocusRequirement(taskType),
        interruption_tolerance: this.getInterruptionTolerance(taskType),
        preferred_location: ['home', 'office'],
        optimal_break_frequency: taskType === 'creative' ? 90 : 60,
        collaboration_timing: this.getCollaborationTiming(taskType),
        sample_size: historicalMetrics.length,
        confidence_interval: 0.15,
        last_updated: new Date().toISOString().split('T')[0]
      };

      recommendations.push(recommendation);
    }

    if (recommendations.length > 0) {
      const { data, error } = await supabase
        .from('timing_recommendations')
        .insert(recommendations)
        .select();

      if (error) throw error;
      return data || [];
    }

    return [];
  }

  async getTimingRecommendations(userId?: string, taskType?: TaskType): Promise<TimingRecommendation[]> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    let query = supabase
      .from('timing_recommendations')
      .select('*')
      .eq('user_id', targetUserId)
      .order('predicted_performance_score', { ascending: false });

    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Weekly Insights
  async generateWeeklyInsights(request: InsightGenerationRequest): Promise<WeeklyInsight> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    let startDate: Date;
    if (request.period_type === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week
    } else {
      startDate = new Date(); // For now, default to current week
    }

    const { data, error } = await supabase.rpc('generate_weekly_insights', {
      p_user_id: user.user.id,
      p_week_start: startDate.toISOString().split('T')[0]
    });

    if (error) throw error;

    // Fetch the generated insight
    const { data: insight, error: fetchError } = await supabase
      .from('weekly_insights')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;
    return insight;
  }

  async getWeeklyInsights(userId?: string, limit: number = 10): Promise<WeeklyInsight[]> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weekly_insights')
      .select('*')
      .eq('user_id', targetUserId)
      .order('week_start_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Comprehensive Analytics
  async getComprehensiveAnalytics(userId?: string): Promise<PredictiveAnalyticsResponse> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const [goalPredictions, workloadForecasts, bottleneckAlerts, timingRecommendations] = await Promise.all([
      this.getGoalPredictions(targetUserId),
      this.getWorkloadPredictions(targetUserId),
      this.getBottleneckPredictions(targetUserId),
      this.getTimingRecommendations(targetUserId)
    ]);

    // Calculate overall productivity trend
    const recentMetrics = await this.getProductivityMetrics({
      user_id: targetUserId,
      date_range: {
        start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    });

    const avgProductivity = recentMetrics.reduce((sum, m) => sum + m.productivity_score, 0) / recentMetrics.length || 0.5;
    let productivityTrend: ProductivityTrend = 'stable';
    
    if (recentMetrics.length >= 7) {
      const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
      const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2));
      const firstAvg = firstHalf.reduce((sum, m) => sum + m.productivity_score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.productivity_score, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) productivityTrend = 'improving';
      else if (secondAvg < firstAvg * 0.9) productivityTrend = 'declining';
    }

    return {
      goal_predictions: goalPredictions,
      workload_forecasts: workloadForecasts,
      bottleneck_alerts: bottleneckAlerts,
      timing_recommendations: timingRecommendations,
      productivity_trends: productivityTrend,
      confidence_score: 0.75,
      generated_at: new Date().toISOString()
    };
  }

  async getProductivityInsights(userId?: string): Promise<ProductivityInsights> {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const [recentMetrics, goalPredictions, workloadForecasts, bottleneckPredictions, timingRecommendations] = await Promise.all([
      this.getProductivityMetrics({
        user_id: targetUserId,
        date_range: {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      }),
      this.getGoalPredictions(targetUserId),
      this.getWorkloadPredictions(targetUserId),
      this.getBottleneckPredictions(targetUserId),
      this.getTimingRecommendations(targetUserId)
    ]);

    const currentProductivity = recentMetrics[0]?.productivity_score || 0.5;
    const avgProductivity = recentMetrics.reduce((sum, m) => sum + m.productivity_score, 0) / recentMetrics.length || 0.5;
    
    // Calculate productivity trend
    let productivityTrend: ProductivityTrend = 'stable';
    if (recentMetrics.length >= 14) {
      const recent = recentMetrics.slice(0, 7);
      const previous = recentMetrics.slice(7, 14);
      const recentAvg = recent.reduce((sum, m) => sum + m.productivity_score, 0) / recent.length;
      const previousAvg = previous.reduce((sum, m) => sum + m.productivity_score, 0) / previous.length;
      
      if (recentAvg > previousAvg * 1.1) productivityTrend = 'improving';
      else if (recentAvg < previousAvg * 0.9) productivityTrend = 'declining';
    }

    // Calculate productivity consistency (lower variance = higher consistency)
    const variance = recentMetrics.reduce((sum, m) => sum + Math.pow(m.productivity_score - avgProductivity, 2), 0) / recentMetrics.length;
    const consistency = Math.max(0, 1 - Math.sqrt(variance));

    // Calculate goals likely to complete
    const goalsLikelyToComplete = goalPredictions.filter(p => p.completion_probability > 0.7).length;
    const goalsAtRisk = goalPredictions.filter(p => p.completion_probability < 0.4).length;
    const avgCompletionProbability = goalPredictions.reduce((sum, p) => sum + p.completion_probability, 0) / goalPredictions.length || 0.5;

    // Calculate capacity utilization
    const latestWorkload = workloadForecasts[0];
    const capacityUtilization = latestWorkload ? latestWorkload.workload_utilization : 0.75;
    const optimalCapacityHours = latestWorkload ? latestWorkload.predicted_capacity_hours : 40;
    
    // Determine burnout risk
    let burnoutRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const burnoutScore = latestWorkload?.burnout_risk_score || 0.2;
    if (burnoutScore > 0.8) burnoutRiskLevel = 'critical';
    else if (burnoutScore > 0.6) burnoutRiskLevel = 'high';
    else if (burnoutScore > 0.4) burnoutRiskLevel = 'medium';

    // Get active and predicted bottlenecks
    const activeBottlenecks = bottleneckPredictions.filter(b => b.likelihood_next_week > 0.6);
    const predictedBottlenecks = bottleneckPredictions.filter(b => b.likelihood_next_month > 0.5);

    // Calculate peak performance hours
    const peakHours = this.calculatePeakHours(recentMetrics);
    
    // Generate optimal task distribution
    const optimalTaskDistribution: Record<TaskType, number[]> = {
      creative: peakHours.slice(0, 2),
      analytical: peakHours,
      administrative: [13, 14, 15, 16],
      communication: [9, 10, 11, 14, 15]
    };

    return {
      current_productivity_score: currentProductivity,
      productivity_trend: productivityTrend,
      productivity_consistency: consistency,
      goals_likely_to_complete: goalsLikelyToComplete,
      goals_at_risk: goalsAtRisk,
      completion_probability_average: avgCompletionProbability,
      current_capacity_utilization: capacityUtilization,
      optimal_capacity_hours: optimalCapacityHours,
      burnout_risk_level: burnoutRiskLevel,
      active_bottlenecks: activeBottlenecks,
      predicted_bottlenecks: predictedBottlenecks,
      peak_performance_hours: peakHours,
      optimal_task_distribution: optimalTaskDistribution,
      immediate_actions: this.generateImmediateActions(currentProductivity, burnoutRiskLevel, activeBottlenecks),
      weekly_optimizations: this.generateWeeklyOptimizations(productivityTrend, consistency),
      long_term_improvements: this.generateLongTermImprovements(avgProductivity, predictedBottlenecks),
      prediction_confidence: 0.75,
      data_quality_score: Math.min(1.0, recentMetrics.length / 30),
      last_updated: new Date().toISOString()
    };
  }

  // Helper methods
  private calculatePeakHours(metrics: ProductivityMetrics[]): number[] {
    const hourlyProductivity: Record<number, number[]> = {};
    
    metrics.forEach(metric => {
      if (metric.peak_hours && Array.isArray(metric.peak_hours)) {
        metric.peak_hours.forEach((hour: number) => {
          if (!hourlyProductivity[hour]) hourlyProductivity[hour] = [];
          hourlyProductivity[hour].push(metric.productivity_score);
        });
      }
    });

    // Calculate average productivity for each hour
    const hourlyAverages = Object.entries(hourlyProductivity)
      .map(([hour, scores]) => ({
        hour: parseInt(hour),
        avgProductivity: scores.reduce((sum, score) => sum + score, 0) / scores.length
      }))
      .sort((a, b) => b.avgProductivity - a.avgProductivity)
      .slice(0, 4)
      .map(item => item.hour);

    return hourlyAverages.length > 0 ? hourlyAverages : [9, 10, 14, 15]; // Default peak hours
  }

  private getOptimalHoursForTaskType(taskType: TaskType, peakHours: number[]): number[] {
    switch (taskType) {
      case 'creative':
        return peakHours.slice(0, 2); // Best 2 hours for creative work
      case 'analytical':
        return peakHours; // All peak hours for analytical work
      case 'administrative':
        return [13, 14, 15, 16]; // Afternoon hours for admin tasks
      case 'communication':
        return [9, 10, 11, 14, 15]; // Morning and mid-afternoon
      default:
        return peakHours;
    }
  }

  private getOptimalDurationForTaskType(taskType: TaskType): number {
    switch (taskType) {
      case 'creative': return 120; // 2 hours for deep creative work
      case 'analytical': return 90; // 1.5 hours for analysis
      case 'administrative': return 30; // 30 minutes for admin tasks
      case 'communication': return 45; // 45 minutes for communication
      default: return 60;
    }
  }

  private getExpectedCompletionTime(taskType: TaskType): number {
    switch (taskType) {
      case 'creative': return 180; // 3 hours including breaks
      case 'analytical': return 120; // 2 hours including breaks
      case 'administrative': return 20; // 20 minutes actual work
      case 'communication': return 30; // 30 minutes actual work
      default: return 60;
    }
  }

  private getEnergyRequirement(taskType: TaskType): 'low' | 'medium' | 'high' {
    switch (taskType) {
      case 'creative': return 'high';
      case 'analytical': return 'high';
      case 'administrative': return 'low';
      case 'communication': return 'medium';
      default: return 'medium';
    }
  }

  private getFocusRequirement(taskType: TaskType): 'low' | 'medium' | 'high' {
    switch (taskType) {
      case 'creative': return 'high';
      case 'analytical': return 'high';
      case 'administrative': return 'low';
      case 'communication': return 'medium';
      default: return 'medium';
    }
  }

  private getInterruptionTolerance(taskType: TaskType): 'low' | 'medium' | 'high' {
    switch (taskType) {
      case 'creative': return 'low';
      case 'analytical': return 'low';
      case 'administrative': return 'high';
      case 'communication': return 'high';
      default: return 'medium';
    }
  }

  private getCollaborationTiming(taskType: TaskType): Record<string, any> {
    switch (taskType) {
      case 'creative':
        return { solo_preferred: true, collaboration_hours: [] };
      case 'analytical':
        return { solo_preferred: true, collaboration_hours: [14, 15] };
      case 'administrative':
        return { solo_preferred: false, collaboration_hours: [9, 10, 11, 14, 15, 16] };
      case 'communication':
        return { solo_preferred: false, collaboration_hours: [9, 10, 11, 13, 14, 15] };
      default:
        return { solo_preferred: false, collaboration_hours: [10, 11, 14, 15] };
    }
  }

  private generateImmediateActions(productivity: number, burnoutRisk: string, bottlenecks: BottleneckPrediction[]): string[] {
    const actions: string[] = [];

    if (productivity < 0.4) {
      actions.push('Take a short break to reset focus and energy');
      actions.push('Switch to simpler, momentum-building tasks');
    }

    if (burnoutRisk === 'high' || burnoutRisk === 'critical') {
      actions.push('Reduce workload for the rest of the day');
      actions.push('Schedule recovery time and self-care activities');
    }

    if (bottlenecks.some(b => b.bottleneck_type === 'context_switching')) {
      actions.push('Block the next 2 hours for focused work without interruptions');
    }

    if (bottlenecks.some(b => b.bottleneck_type === 'time_management')) {
      actions.push('Use time-blocking for the remainder of the day');
    }

    if (actions.length === 0) {
      actions.push('Continue with current productivity patterns');
      actions.push('Focus on high-priority tasks during peak hours');
    }

    return actions;
  }

  private generateWeeklyOptimizations(trend: ProductivityTrend, consistency: number): string[] {
    const optimizations: string[] = [];

    if (trend === 'declining') {
      optimizations.push('Analyze factors contributing to productivity decline');
      optimizations.push('Adjust workload distribution across the week');
      optimizations.push('Implement stress reduction techniques');
    }

    if (consistency < 0.6) {
      optimizations.push('Establish more consistent daily routines');
      optimizations.push('Identify and eliminate productivity disruptors');
      optimizations.push('Set more realistic daily task targets');
    }

    if (trend === 'improving') {
      optimizations.push('Identify and replicate successful patterns');
      optimizations.push('Gradually increase task complexity');
    }

    optimizations.push('Schedule weekly productivity review sessions');
    optimizations.push('Plan challenging tasks during peak performance days');

    return optimizations;
  }

  private generateLongTermImprovements(avgProductivity: number, bottlenecks: BottleneckPrediction[]): string[] {
    const improvements: string[] = [];

    if (avgProductivity < 0.6) {
      improvements.push('Develop systematic approach to task prioritization');
      improvements.push('Invest in productivity tools and training');
      improvements.push('Consider workload rebalancing or delegation');
    }

    if (bottlenecks.some(b => b.bottleneck_type === 'skill_gap')) {
      improvements.push('Identify and address skill development needs');
      improvements.push('Seek mentoring or training opportunities');
    }

    if (bottlenecks.some(b => b.bottleneck_category === 'environmental')) {
      improvements.push('Optimize workspace for better focus and efficiency');
      improvements.push('Establish better work-life boundaries');
    }

    improvements.push('Build sustainable productivity habits');
    improvements.push('Develop personalized productivity system');
    improvements.push('Create feedback loops for continuous improvement');

    return improvements;
  }

  // Prediction Model Management
  async getPredictionModels(): Promise<PredictionModel[]> {
    const { data, error } = await supabase
      .from('prediction_models')
      .select('*')
      .eq('is_active', true)
      .order('accuracy_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateModelPerformance(modelId: string, performance: Partial<PredictionModel>): Promise<PredictionModel> {
    const { data, error } = await supabase
      .from('prediction_models')
      .update({
        ...performance,
        updated_at: new Date().toISOString()
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();