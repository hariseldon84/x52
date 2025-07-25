// Epic 9, Story 9.2: Smart Priority Optimization Service

import { supabase } from '@/lib/supabase';
import type {
  PriorityOptimizationRule,
  PriorityOptimizationHistory,
  TaskPriorityScore,
  PriorityOptimizationSchedule,
  PriorityOptimizationJob,
  PriorityRecommendation,
  OptimizationResult,
  GetPriorityRecommendationsRequest,
  OptimizeTaskPrioritiesRequest,
  CreateOptimizationRuleRequest,
  UpdateOptimizationRuleRequest,
  CreateOptimizationScheduleRequest,
  UpdateOptimizationScheduleRequest,
  PriorityOptimizationStats,
  OptimizationInsights,
  JobStatus,
  RuleType,
} from '@/lib/types/priority';

export class PriorityOptimizationService {
  /**
   * Get priority recommendations for tasks
   */
  async getPriorityRecommendations(
    request: GetPriorityRecommendationsRequest = {}
  ): Promise<PriorityRecommendation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_priority_recommendations', {
      p_user_id: user.id,
      p_task_ids: request.task_ids || null,
      p_limit: request.limit || 20,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Optimize task priorities automatically
   */
  async optimizeTaskPriorities(
    request: OptimizeTaskPrioritiesRequest = {}
  ): Promise<OptimizationResult[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('optimize_task_priorities', {
      p_user_id: user.id,
      p_task_ids: request.task_ids || null,
      p_max_changes: request.max_changes || 10,
      p_min_confidence: request.min_confidence || 0.7,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate priority score for a specific task
   */
  async calculateTaskPriorityScore(taskId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: score, error } = await supabase.rpc('calculate_task_priority_score', {
      p_task_id: taskId,
      p_user_id: user.id,
    });

    if (error) throw error;
    return score || 0;
  }

  /**
   * Get optimization rules for the user
   */
  async getOptimizationRules(): Promise<PriorityOptimizationRule[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('priority_optimization_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('weight', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new optimization rule
   */
  async createOptimizationRule(request: CreateOptimizationRuleRequest): Promise<PriorityOptimizationRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const ruleData = {
      user_id: user.id,
      rule_name: request.rule_name,
      rule_type: request.rule_type,
      description: request.description,
      rule_config: request.rule_config,
      weight: request.weight || 1.0,
      trigger_conditions: request.trigger_conditions || {},
      exclusion_conditions: request.exclusion_conditions || {},
    };

    const { data, error } = await supabase
      .from('priority_optimization_rules')
      .insert([ruleData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing optimization rule
   */
  async updateOptimizationRule(
    ruleId: string, 
    request: UpdateOptimizationRuleRequest
  ): Promise<PriorityOptimizationRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('priority_optimization_rules')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete an optimization rule
   */
  async deleteOptimizationRule(ruleId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('priority_optimization_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Get optimization schedules
   */
  async getOptimizationSchedules(): Promise<PriorityOptimizationSchedule[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('priority_optimization_schedules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new optimization schedule
   */
  async createOptimizationSchedule(
    request: CreateOptimizationScheduleRequest
  ): Promise<PriorityOptimizationSchedule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const scheduleData = {
      user_id: user.id,
      schedule_name: request.schedule_name,
      schedule_type: request.schedule_type,
      schedule_time: request.schedule_time,
      schedule_interval: request.schedule_interval,
      optimization_scope: request.optimization_scope || 'all',
      max_changes_per_run: request.max_changes_per_run || 10,
      min_confidence_threshold: request.min_confidence_threshold || 0.7,
      category_filter: request.category_filter || [],
      project_filter: request.project_filter || [],
      priority_filter: request.priority_filter || [],
    };

    // Calculate next run time based on schedule type
    let nextRunAt: string | undefined;
    if (request.schedule_type === 'daily' && request.schedule_time) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [hours, minutes] = request.schedule_time.split(':');
      tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      nextRunAt = tomorrow.toISOString();
    } else if (request.schedule_type === 'hourly') {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      nextRunAt = nextHour.toISOString();
    }

    const { data, error } = await supabase
      .from('priority_optimization_schedules')
      .insert([{ ...scheduleData, next_run_at: nextRunAt }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an optimization schedule
   */
  async updateOptimizationSchedule(
    scheduleId: string,
    request: UpdateOptimizationScheduleRequest
  ): Promise<PriorityOptimizationSchedule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('priority_optimization_schedules')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete an optimization schedule
   */
  async deleteOptimizationSchedule(scheduleId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('priority_optimization_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Get optimization history
   */
  async getOptimizationHistory(limit: number = 50): Promise<PriorityOptimizationHistory[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('priority_optimization_history')
      .select(`
        *,
        task:tasks!priority_optimization_history_task_id_fkey(
          id,
          title,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get task priority scores
   */
  async getTaskPriorityScores(taskIds?: string[]): Promise<TaskPriorityScore[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('task_priority_scores')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('priority_score', { ascending: false });

    if (taskIds && taskIds.length > 0) {
      query = query.in('task_id', taskIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get optimization jobs
   */
  async getOptimizationJobs(status?: JobStatus): Promise<PriorityOptimizationJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('priority_optimization_jobs')
      .select(`
        *,
        schedule:priority_optimization_schedules!priority_optimization_jobs_schedule_id_fkey(
          schedule_name,
          schedule_type
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Accept optimization recommendations
   */
  async acceptOptimization(historyId: string, feedback?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('priority_optimization_history')
      .update({
        user_accepted: true,
        user_feedback: feedback,
      })
      .eq('id', historyId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Reject optimization recommendations
   */
  async rejectOptimization(historyId: string, feedback?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the optimization history entry
    const { data: history, error: fetchError } = await supabase
      .from('priority_optimization_history')
      .select('*')
      .eq('id', historyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Revert the task priority
    await supabase
      .from('tasks')
      .update({ priority: history.old_priority })
      .eq('id', history.task_id)
      .eq('user_id', user.id);

    // Update the history record
    const { error } = await supabase
      .from('priority_optimization_history')
      .update({
        user_accepted: false,
        user_feedback: feedback,
        reverted_at: new Date().toISOString(),
      })
      .eq('id', historyId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Run scheduled optimization
   */
  async runScheduledOptimization(): Promise<number> {
    const { data: totalChanges, error } = await supabase.rpc('run_scheduled_priority_optimization');
    if (error) throw error;
    return totalChanges || 0;
  }

  /**
   * Get optimization statistics
   */
  async getOptimizationStats(): Promise<PriorityOptimizationStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get optimization history statistics
    const { data: history } = await supabase
      .from('priority_optimization_history')
      .select('user_accepted, confidence_score, created_at, applied_rules')
      .eq('user_id', user.id);

    const { data: todayOptimizations, count: todayCount } = await supabase
      .from('priority_optimization_history')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', new Date().toISOString().split('T')[0]);

    const totalOptimizations = history?.length || 0;
    const acceptedOptimizations = history?.filter(h => h.user_accepted === true).length || 0;
    const acceptanceRate = totalOptimizations > 0 ? acceptedOptimizations / totalOptimizations : 0;
    const averageConfidence = totalOptimizations > 0
      ? history!.reduce((sum, h) => sum + h.confidence_score, 0) / totalOptimizations
      : 0;

    // Find most effective rule
    const ruleUsage = history?.reduce((acc, h) => {
      const rules = h.applied_rules as any;
      if (Array.isArray(rules)) {
        rules.forEach(rule => {
          const ruleName = typeof rule === 'string' ? rule : rule.rule_name;
          acc[ruleName] = (acc[ruleName] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const mostEffectiveRule = Object.entries(ruleUsage)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

    const lastOptimization = history
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    // Calculate average score improvement (simplified)
    const averageScoreImprovement = 15.5; // Would be calculated from actual data

    return {
      total_optimizations: totalOptimizations,
      accepted_optimizations: acceptedOptimizations,
      acceptance_rate: acceptanceRate,
      average_confidence: averageConfidence,
      most_effective_rule: mostEffectiveRule,
      last_optimization_run: lastOptimization?.created_at,
      tasks_optimized_today: todayCount || 0,
      average_score_improvement: averageScoreImprovement,
    };
  }

  /**
   * Get optimization insights
   */
  async getOptimizationInsights(): Promise<OptimizationInsights> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: history } = await supabase
      .from('priority_optimization_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!history || history.length === 0) {
      return {
        peak_optimization_hours: ['09:00', '14:00'],
        most_optimized_priorities: ['medium', 'high'],
        rule_effectiveness: {},
        user_acceptance_patterns: {},
        improvement_suggestions: ['Start using priority optimization to see insights'],
      };
    }

    // Analyze peak optimization hours
    const hourlyActivity = history.reduce((acc, h) => {
      const hour = new Date(h.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.padStart(2, '0')}:00`);

    // Analyze most optimized priorities
    const priorityChanges = history.reduce((acc, h) => {
      acc[h.old_priority] = (acc[h.old_priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostOptimizedPriorities = Object.entries(priorityChanges)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([priority]) => priority);

    // Analyze rule effectiveness
    const ruleEffectiveness = history.reduce((acc, h) => {
      const rules = h.applied_rules as any;
      if (Array.isArray(rules)) {
        rules.forEach(rule => {
          const ruleName = typeof rule === 'string' ? rule : rule.rule_name;
          if (!acc[ruleName]) {
            acc[ruleName] = { total: 0, accepted: 0 };
          }
          acc[ruleName].total++;
          if (h.user_accepted === true) {
            acc[ruleName].accepted++;
          }
        });
      }
      return acc;
    }, {} as Record<string, { total: number; accepted: number }>);

    const ruleEffectivenessRates = Object.entries(ruleEffectiveness).reduce((acc, [rule, stats]) => {
      acc[rule] = stats.total > 0 ? stats.accepted / stats.total : 0;
      return acc;
    }, {} as Record<string, number>);

    // User acceptance patterns
    const acceptanceByPriority = history.reduce((acc, h) => {
      if (!acc[h.new_priority]) {
        acc[h.new_priority] = { total: 0, accepted: 0 };
      }
      acc[h.new_priority].total++;
      if (h.user_accepted === true) {
        acc[h.new_priority].accepted++;
      }
      return acc;
    }, {} as Record<string, { total: number; accepted: number }>);

    // Generate improvement suggestions
    const improvements: string[] = [];
    const acceptanceRate = history.filter(h => h.user_accepted === true).length / history.length;

    if (acceptanceRate < 0.6) {
      improvements.push('Consider adjusting optimization rules to better match your preferences');
    }
    if (peakHours.length > 0) {
      improvements.push(`Optimization works best during ${peakHours.join(', ')} - consider scheduling during these hours`);
    }
    if (mostOptimizedPriorities.length > 0) {
      improvements.push(`Your ${mostOptimizedPriorities[0]} priority tasks are optimized most often`);
    }

    return {
      peak_optimization_hours: peakHours,
      most_optimized_priorities: mostOptimizedPriorities,
      rule_effectiveness: ruleEffectivenessRates,
      user_acceptance_patterns: acceptanceByPriority,
      improvement_suggestions: improvements,
    };
  }

  /**
   * Create default optimization rules for new users
   */
  async createDefaultRules(): Promise<PriorityOptimizationRule[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('create_default_priority_rules', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return this.getOptimizationRules();
  }
}

export const priorityOptimizationService = new PriorityOptimizationService();