// Epic 9, Story 9.3: Automated Follow-up Task Creation Service

import { supabase } from '@/lib/supabase';
import type {
  FollowupTemplate,
  AutomatedFollowup,
  TaskDependency,
  FollowupSuggestion,
  FollowupAutomationJob,
  CreateFollowupTemplateRequest,
  UpdateFollowupTemplateRequest,
  CreateTaskDependencyRequest,
  UpdateTaskDependencyRequest,
  AcceptFollowupSuggestionRequest,
  RejectFollowupSuggestionRequest,
  FollowupStats,
  FollowupInsights,
  DependencyChain,
  TemplateType,
  FollowupStatus,
  JobStatus,
  SuggestionStatus,
} from '@/lib/types/followup';

export class FollowupService {
  /**
   * Get follow-up templates for the user
   */
  async getFollowupTemplates(): Promise<FollowupTemplate[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('followup_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new follow-up template
   */
  async createFollowupTemplate(request: CreateFollowupTemplateRequest): Promise<FollowupTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const templateData = {
      user_id: user.id,
      template_name: request.template_name,
      template_type: request.template_type,
      description: request.description,
      trigger_conditions: request.trigger_conditions,
      followup_config: request.followup_config,
      delay_amount: request.delay_amount || 0,
      delay_unit: request.delay_unit || 'hours',
      inherit_properties: request.inherit_properties || [],
      default_priority: request.default_priority || 'medium',
      default_complexity: request.default_complexity || 'simple',
    };

    const { data, error } = await supabase
      .from('followup_templates')
      .insert([templateData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a follow-up template
   */
  async updateFollowupTemplate(
    templateId: string,
    request: UpdateFollowupTemplateRequest
  ): Promise<FollowupTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('followup_templates')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a follow-up template
   */
  async deleteFollowupTemplate(templateId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('followup_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Get automated follow-ups
   */
  async getAutomatedFollowups(status?: FollowupStatus): Promise<AutomatedFollowup[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('automated_followups')
      .select(`
        *,
        template:followup_templates!automated_followups_template_id_fkey(
          template_name,
          template_type
        ),
        trigger_task:tasks!automated_followups_trigger_task_id_fkey(
          id,
          title,
          status
        ),
        created_task:tasks!automated_followups_created_task_id_fkey(
          id,
          title,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Cancel an automated follow-up
   */
  async cancelAutomatedFollowup(followupId: string, reason?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('automated_followups')
      .update({
        user_cancelled: true,
        cancellation_reason: reason,
        status: 'cancelled',
      })
      .eq('id', followupId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Create a follow-up from template
   */
  async createFollowupFromTemplate(
    templateId: string,
    triggerTaskId: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: followupId, error } = await supabase.rpc('create_followup_from_template', {
      p_template_id: templateId,
      p_trigger_task_id: triggerTaskId,
      p_user_id: user.id,
    });

    if (error) throw error;
    return followupId;
  }

  /**
   * Process scheduled follow-ups
   */
  async processScheduledFollowups(limit?: number): Promise<number> {
    const { data: processedCount, error } = await supabase.rpc('process_scheduled_followups', {
      p_limit: limit || 50,
    });

    if (error) throw error;
    return processedCount || 0;
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(taskId?: string): Promise<TaskDependency[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('task_dependencies')
      .select(`
        *,
        dependent_task:tasks!task_dependencies_dependent_task_id_fkey(
          id,
          title,
          status,
          priority
        ),
        prerequisite_task:tasks!task_dependencies_prerequisite_task_id_fkey(
          id,
          title,
          status,
          priority
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (taskId) {
      query = query.or(`dependent_task_id.eq.${taskId},prerequisite_task_id.eq.${taskId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Create a task dependency
   */
  async createTaskDependency(request: CreateTaskDependencyRequest): Promise<TaskDependency> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const dependencyData = {
      user_id: user.id,
      dependent_task_id: request.dependent_task_id,
      prerequisite_task_id: request.prerequisite_task_id,
      dependency_type: request.dependency_type || 'blocks',
      strictness: request.strictness || 'hard',
      auto_unblock: request.auto_unblock !== false,
      notification_enabled: request.notification_enabled !== false,
    };

    const { data, error } = await supabase
      .from('task_dependencies')
      .insert([dependencyData])
      .select(`
        *,
        dependent_task:tasks!task_dependencies_dependent_task_id_fkey(
          id,
          title,
          status,
          priority
        ),
        prerequisite_task:tasks!task_dependencies_prerequisite_task_id_fkey(
          id,
          title,
          status,
          priority
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a task dependency
   */
  async updateTaskDependency(
    dependencyId: string,
    request: UpdateTaskDependencyRequest
  ): Promise<TaskDependency> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('task_dependencies')
      .update(request)
      .eq('id', dependencyId)
      .eq('user_id', user.id)
      .select(`
        *,
        dependent_task:tasks!task_dependencies_dependent_task_id_fkey(
          id,
          title,
          status,
          priority
        ),
        prerequisite_task:tasks!task_dependencies_prerequisite_task_id_fkey(
          id,
          title,
          status,
          priority
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a task dependency
   */
  async deleteTaskDependency(dependencyId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('id', dependencyId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Get dependency chains for tasks
   */
  async getDependencyChains(): Promise<DependencyChain[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get all dependencies and build chains
    const dependencies = await this.getTaskDependencies();
    
    // Group by chains (simplified logic - would be more complex in production)
    const chains: DependencyChain[] = [];
    const processedTasks = new Set<string>();

    for (const dep of dependencies) {
      if (processedTasks.has(dep.dependent_task_id)) continue;

      const chain: DependencyChain = {
        chain_id: `chain-${dep.id}`,
        tasks: [
          {
            task_id: dep.prerequisite_task_id,
            task_title: dep.prerequisite_task?.title || 'Unknown Task',
            status: dep.prerequisite_task?.status || 'unknown',
            position_in_chain: 0,
            dependencies: [],
          },
          {
            task_id: dep.dependent_task_id,
            task_title: dep.dependent_task?.title || 'Unknown Task',
            status: dep.dependent_task?.status || 'unknown',
            position_in_chain: 1,
            dependencies: [dep],
          },
        ],
        completion_progress: dep.resolved_at ? 1.0 : 0.5,
        blocking_issues: [],
      };

      // Add blocking issues if dependency is not resolved
      if (!dep.resolved_at && dep.prerequisite_task?.status !== 'completed') {
        chain.blocking_issues.push({
          task_id: dep.prerequisite_task_id,
          issue_description: `Task "${dep.prerequisite_task?.title}" must be completed first`,
          resolution_suggestions: [
            'Focus on completing the prerequisite task',
            'Consider breaking down the prerequisite into smaller tasks',
          ],
        });
      }

      chains.push(chain);
      processedTasks.add(dep.dependent_task_id);
      processedTasks.add(dep.prerequisite_task_id);
    }

    return chains;
  }

  /**
   * Get follow-up suggestions
   */
  async getFollowupSuggestions(status?: SuggestionStatus): Promise<FollowupSuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('followup_suggestions')
      .select(`
        *,
        source_task:tasks!followup_suggestions_source_task_id_fkey(
          id,
          title,
          status
        ),
        created_task:tasks!followup_suggestions_created_task_id_fkey(
          id,
          title,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('suggested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'dismissed');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Accept a follow-up suggestion
   */
  async acceptFollowupSuggestion(request: AcceptFollowupSuggestionRequest): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('followup_suggestions')
      .select('*')
      .eq('id', request.suggestion_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Create the task with modifications
    const taskData = {
      user_id: user.id,
      title: request.modifications?.title || suggestion.suggested_title,
      description: request.modifications?.description || suggestion.suggested_description,
      priority: request.modifications?.priority || suggestion.suggested_priority || 'medium',
      complexity: request.modifications?.complexity || suggestion.suggested_complexity || 'simple',
      category_id: request.modifications?.category_id || null,
      project_id: request.modifications?.project_id || null,
      due_date: request.modifications?.due_date ? new Date(request.modifications.due_date).toISOString() : null,
      status: 'todo',
      source: 'followup_suggestion',
      source_metadata: {
        suggestion_id: request.suggestion_id,
        source_task_id: suggestion.source_task_id,
        suggestion_type: suggestion.suggestion_type,
        modifications: request.modifications || {},
      },
    };

    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (createError) throw createError;

    // Update suggestion status
    const { error: updateError } = await supabase
      .from('followup_suggestions')
      .update({
        status: request.modifications ? 'accepted' : 'accepted',
        created_task_id: task.id,
        responded_at: new Date().toISOString(),
      })
      .eq('id', request.suggestion_id);

    if (updateError) throw updateError;

    return task.id;
  }

  /**
   * Reject a follow-up suggestion
   */
  async rejectFollowupSuggestion(request: RejectFollowupSuggestionRequest): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('followup_suggestions')
      .update({
        status: 'rejected',
        user_feedback: request.feedback,
        responded_at: new Date().toISOString(),
      })
      .eq('id', request.suggestion_id)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Dismiss a follow-up suggestion
   */
  async dismissFollowupSuggestion(suggestionId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('followup_suggestions')
      .update({
        status: 'dismissed',
        responded_at: new Date().toISOString(),
      })
      .eq('id', suggestionId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }

  /**
   * Generate follow-up suggestions for a task
   */
  async generateFollowupSuggestions(taskId: string, triggerEvent: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: suggestionsCount, error } = await supabase.rpc('generate_followup_suggestions', {
      p_user_id: user.id,
      p_trigger_task_id: taskId,
      p_trigger_event: triggerEvent,
    });

    if (error) throw error;
    return suggestionsCount || 0;
  }

  /**
   * Get automation jobs
   */
  async getAutomationJobs(status?: JobStatus): Promise<FollowupAutomationJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('followup_automation_jobs')
      .select('*')
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
   * Check dependencies for a completed task
   */
  async checkTaskDependencies(taskId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: resolvedCount, error } = await supabase.rpc('check_task_dependencies', {
      p_completed_task_id: taskId,
      p_user_id: user.id,
    });

    if (error) throw error;
    return resolvedCount || 0;
  }

  /**
   * Get follow-up statistics
   */
  async getFollowupStats(): Promise<FollowupStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get template statistics
    const { data: templates } = await supabase
      .from('followup_templates')
      .select('is_active, times_triggered, success_rate, template_name')
      .eq('user_id', user.id);

    // Get followup statistics
    const { data: followups } = await supabase
      .from('automated_followups')
      .select('status, scheduled_for, created_at')
      .eq('user_id', user.id);

    // Get suggestion statistics
    const { data: suggestions } = await supabase
      .from('followup_suggestions')
      .select('status')
      .eq('user_id', user.id);

    // Get today's dependency resolutions
    const { count: dependenciesResolvedToday } = await supabase
      .from('task_dependencies')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('resolved_at', new Date().toISOString().split('T')[0]);

    const totalTemplates = templates?.length || 0;
    const activeTemplates = templates?.filter(t => t.is_active).length || 0;
    const totalFollowups = followups?.length || 0;
    const pendingFollowups = followups?.filter(f => f.status === 'scheduled').length || 0;
    const successfulFollowups = followups?.filter(f => f.status === 'created').length || 0;
    const successRate = totalFollowups > 0 ? successfulFollowups / totalFollowups : 0;

    // Calculate average delay
    const avgDelay = followups?.length ? 
      followups.reduce((sum, f) => {
        const delay = new Date(f.scheduled_for).getTime() - new Date(f.created_at).getTime();
        return sum + (delay / (1000 * 60 * 60)); // Convert to hours
      }, 0) / followups.length : 0;

    // Most used template
    const mostUsedTemplate = templates
      ?.sort((a, b) => b.times_triggered - a.times_triggered)[0]?.template_name || 'None';

    // Suggestion statistics
    const totalSuggestions = suggestions?.length || 0;
    const acceptedSuggestions = suggestions?.filter(s => s.status === 'accepted').length || 0;
    const suggestionAcceptanceRate = totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0;

    return {
      total_templates: totalTemplates,
      active_templates: activeTemplates,
      total_followups_created: totalFollowups,
      pending_followups: pendingFollowups,
      success_rate: successRate,
      average_delay: avgDelay,
      most_used_template: mostUsedTemplate,
      dependencies_resolved_today: dependenciesResolvedToday || 0,
      suggestions_generated: totalSuggestions,
      suggestion_acceptance_rate: suggestionAcceptanceRate,
    };
  }

  /**
   * Get follow-up insights
   */
  async getFollowupInsights(): Promise<FollowupInsights> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [templates, followups, suggestions, dependencies] = await Promise.all([
      this.getFollowupTemplates(),
      this.getAutomatedFollowups(),
      this.getFollowupSuggestions(),
      this.getTaskDependencies(),
    ]);

    // Most effective templates
    const mostEffectiveTemplates = templates
      .filter(t => t.times_triggered > 0)
      .map(t => ({
        template_name: t.template_name,
        success_rate: t.success_rate || 0,
        usage_count: t.times_triggered,
      }))
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 5);

    // Optimal delay patterns
    const delayPatterns = followups.reduce((acc, f) => {
      const delay = Math.round(
        (new Date(f.scheduled_for).getTime() - new Date(f.created_at).getTime()) / (1000 * 60 * 60)
      );
      const delayRange = `${Math.floor(delay / 24) * 24}-${Math.floor(delay / 24) * 24 + 24}h`;
      acc[delayRange] = (acc[delayRange] || 0) + (f.status === 'created' ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    // Dependency resolution trends
    const dependencyTrends = dependencies.reduce((acc, d) => {
      const dayOfWeek = new Date(d.created_at).toLocaleDateString('en', { weekday: 'long' });
      acc[dayOfWeek] = (acc[dayOfWeek] || 0) + (d.resolved_at ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    // Suggestion performance
    const suggestionsByType = suggestions.reduce((acc, s) => {
      acc[s.suggestion_type] = (acc[s.suggestion_type] || 0) + (s.status === 'accepted' ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    const peakSuggestionHours = suggestions
      .filter(s => s.status === 'accepted')
      .reduce((acc, s) => {
        const hour = new Date(s.suggested_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    const bestPerformingTypes = Object.entries(suggestionsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    const topHours = Object.entries(peakSuggestionHours)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.padStart(2, '0')}:00`);

    // Generate improvement recommendations
    const improvements: string[] = [];
    
    const avgSuccessRate = mostEffectiveTemplates.reduce((sum, t) => sum + t.success_rate, 0) / mostEffectiveTemplates.length;
    if (avgSuccessRate < 0.7) {
      improvements.push('Consider refining your follow-up templates to improve success rates');
    }

    if (followups.filter(f => f.status === 'scheduled').length > 10) {
      improvements.push('You have many pending follow-ups - consider processing them or adjusting timing');
    }

    if (dependencies.filter(d => !d.resolved_at).length > 5) {
      improvements.push('Several task dependencies are unresolved - focus on completing prerequisite tasks');
    }

    return {
      most_effective_templates: mostEffectiveTemplates,
      optimal_delay_patterns: delayPatterns,
      dependency_resolution_trends: dependencyTrends,
      suggestion_performance: {
        best_performing_types: bestPerformingTypes,
        peak_suggestion_hours: topHours,
        user_acceptance_patterns: {},
      },
      improvement_recommendations: improvements,
    };
  }
}

export const followupService = new FollowupService();