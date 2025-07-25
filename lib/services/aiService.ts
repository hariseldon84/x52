// Epic 9, Story 9.1: AI Task Suggestion Service

import { supabase } from '@/lib/supabase';
import type { 
  AIModel,
  UserAIPreferences,
  AITaskSuggestion,
  AISuggestionFeedback,
  UserBehaviorPattern,
  AIModelMetrics,
  GenerateSuggestionsRequest,
  AcceptSuggestionRequest,
  RejectSuggestionRequest,
  UpdateAIPreferencesRequest,
  AIStats,
  SuggestionInsights,
  TaskAnalysisResult,
  BehaviorAnalysisResult,
  SuggestionType,
  ModelType
} from '@/lib/types/ai';

export class AIService {
  /**
   * Get user's AI preferences
   */
  async getUserPreferences(): Promise<UserAIPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_ai_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Create default preferences if they don't exist
      const defaultPreferences = {
        user_id: user.id,
        enable_ai_suggestions: true,
        suggestion_frequency: 'moderate',
        suggestion_types: ['similar_task', 'follow_up', 'pattern_based', 'time_based'],
        enable_priority_optimization: true,
        optimization_aggressiveness: 'balanced',
        enable_automated_followups: false,
        followup_delay_hours: 24,
        max_automated_tasks: 5,
        enable_smart_notifications: true,
        notification_timing_optimization: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        allow_behavior_tracking: true,
        data_retention_days: 365,
      };

      const { data: newPrefs, error: createError } = await supabase
        .from('user_ai_preferences')
        .insert([defaultPreferences])
        .select()
        .single();

      if (createError) throw createError;
      return newPrefs;
    }

    return data;
  }

  /**
   * Update user's AI preferences
   */
  async updateUserPreferences(request: UpdateAIPreferencesRequest): Promise<UserAIPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_ai_preferences')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Generate AI task suggestions
   */
  async generateSuggestions(request: GenerateSuggestionsRequest = {}): Promise<AITaskSuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user has AI suggestions enabled
    const preferences = await this.getUserPreferences();
    if (!preferences.enable_ai_suggestions) {
      return [];
    }

    // Call database function to generate suggestions
    const { data, error } = await supabase.rpc('generate_ai_task_suggestions', {
      p_user_id: user.id,
      p_suggestion_type: request.suggestion_type || 'pattern_based',
      p_limit: request.limit || 5,
    });

    if (error) throw error;

    // Convert function results to full suggestion objects
    const suggestionIds = data.map((item: any) => item.suggestion_id);
    
    if (suggestionIds.length === 0) {
      return [];
    }

    const { data: suggestions, error: fetchError } = await supabase
      .from('ai_task_suggestions')
      .select(`
        *,
        model:ai_models!ai_task_suggestions_model_id_fkey(
          model_name,
          model_type,
          model_version
        )
      `)
      .in('id', suggestionIds)
      .order('confidence_score', { ascending: false });

    if (fetchError) throw fetchError;
    return suggestions || [];
  }

  /**
   * Get user's pending suggestions
   */
  async getPendingSuggestions(): Promise<AITaskSuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ai_task_suggestions')
      .select(`
        *,
        model:ai_models!ai_task_suggestions_model_id_fkey(
          model_name,
          model_type,
          model_version
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('confidence_score', { ascending: false })
      .order('suggested_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get suggestion history
   */
  async getSuggestionHistory(limit: number = 50): Promise<AITaskSuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ai_task_suggestions')
      .select(`
        *,
        model:ai_models!ai_task_suggestions_model_id_fkey(
          model_name,
          model_type,
          model_version
        ),
        created_task:tasks!ai_task_suggestions_created_task_id_fkey(
          id,
          title,
          status
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'pending')
      .order('suggested_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Accept an AI suggestion and create task
   */
  async acceptSuggestion(request: AcceptSuggestionRequest): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: taskId, error } = await supabase.rpc('accept_ai_suggestion', {
      p_suggestion_id: request.suggestion_id,
      p_user_id: user.id,
      p_modifications: request.modifications || {},
    });

    if (error) throw error;
    return taskId;
  }

  /**
   * Reject an AI suggestion with feedback
   */
  async rejectSuggestion(request: RejectSuggestionRequest): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: success, error } = await supabase.rpc('reject_ai_suggestion', {
      p_suggestion_id: request.suggestion_id,
      p_user_id: user.id,
      p_feedback_reason: request.feedback_reason || 'not_relevant',
      p_feedback_text: request.feedback_text,
    });

    if (error) throw error;
    return success;
  }

  /**
   * Dismiss a suggestion (mark as not interested)
   */
  async dismissSuggestion(suggestionId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('ai_task_suggestions')
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
   * Provide feedback on a suggestion
   */
  async provideFeedback(
    suggestionId: string,
    feedbackType: 'helpful' | 'not_helpful' | 'irrelevant',
    additionalFeedback?: string
  ): Promise<AISuggestionFeedback> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update suggestion with user feedback
    await supabase
      .from('ai_task_suggestions')
      .update({ user_feedback: feedbackType })
      .eq('id', suggestionId)
      .eq('user_id', user.id);

    // Create detailed feedback record
    const feedbackData = {
      suggestion_id: suggestionId,
      user_id: user.id,
      feedback_type: 'rating',
      feedback_value: {
        rating: feedbackType,
        helpful: feedbackType === 'helpful',
      },
      feedback_text: additionalFeedback,
    };

    const { data, error } = await supabase
      .from('ai_suggestion_feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Analyze task content using AI
   */
  async analyzeTask(
    title: string,
    description?: string,
    context?: Record<string, any>
  ): Promise<TaskAnalysisResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's task patterns for better analysis
    const { data: userTasks } = await supabase
      .from('tasks')
      .select('title, description, priority, complexity, category_id')
      .eq('user_id', user.id)
      .limit(50);

    // Simple rule-based analysis (in production, this would use actual AI/ML)
    const analysisResult: TaskAnalysisResult = {
      confidence_scores: {},
      reasoning: 'Analysis based on task content and user patterns',
    };

    // Analyze priority based on keywords
    const urgentKeywords = ['urgent', 'asap', 'critical', 'emergency', 'immediate'];
    const highKeywords = ['important', 'priority', 'deadline', 'soon'];
    const lowKeywords = ['someday', 'maybe', 'nice to have', 'optional'];

    const content = `${title} ${description || ''}`.toLowerCase();
    
    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      analysisResult.suggested_priority = 'urgent';
      analysisResult.confidence_scores.priority = 0.9;
    } else if (highKeywords.some(keyword => content.includes(keyword))) {
      analysisResult.suggested_priority = 'high';
      analysisResult.confidence_scores.priority = 0.8;
    } else if (lowKeywords.some(keyword => content.includes(keyword))) {
      analysisResult.suggested_priority = 'low';
      analysisResult.confidence_scores.priority = 0.7;
    } else {
      analysisResult.suggested_priority = 'medium';
      analysisResult.confidence_scores.priority = 0.6;
    }

    // Analyze complexity based on content length and keywords
    const complexKeywords = ['research', 'analyze', 'design', 'develop', 'implement', 'complex'];
    const simpleKeywords = ['call', 'email', 'check', 'quick', 'simple', 'easy'];

    if (complexKeywords.some(keyword => content.includes(keyword)) || content.length > 200) {
      analysisResult.suggested_complexity = 'complex';
      analysisResult.confidence_scores.complexity = 0.8;
    } else if (simpleKeywords.some(keyword => content.includes(keyword)) || content.length < 50) {
      analysisResult.suggested_complexity = 'simple';
      analysisResult.confidence_scores.complexity = 0.8;
    } else {
      analysisResult.suggested_complexity = 'moderate';
      analysisResult.confidence_scores.complexity = 0.6;
    }

    // Suggest due date based on priority
    if (analysisResult.suggested_priority === 'urgent') {
      analysisResult.suggested_due_date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (analysisResult.suggested_priority === 'high') {
      analysisResult.suggested_due_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    return analysisResult;
  }

  /**
   * Get user behavior patterns
   */
  async getBehaviorPatterns(): Promise<UserBehaviorPattern[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_behavior_patterns')
      .select('*')
      .eq('user_id', user.id)
      .gt('confidence_level', 0.5)
      .order('confidence_level', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Analyze user behavior and extract patterns
   */
  async analyzeBehavior(): Promise<BehaviorAnalysisResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's recent task activity
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const result: BehaviorAnalysisResult = {
      detected_patterns: [],
      productivity_insights: {
        peak_hours: [],
        preferred_task_types: [],
        completion_patterns: {},
      },
      recommendations: [],
    };

    if (!tasks || tasks.length === 0) {
      return result;
    }

    // Analyze task creation times
    const hourlyActivity = tasks.reduce((acc, task) => {
      const hour = new Date(task.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Find peak hours (top 3 hours with most activity)
    const peakHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    result.productivity_insights.peak_hours = peakHours;

    // Analyze task priorities
    const priorityDistribution = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze completion patterns
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const completionRate = completedTasks.length / tasks.length;

    result.productivity_insights.completion_patterns = {
      total_tasks: tasks.length,
      completed_tasks: completedTasks.length,
      completion_rate: completionRate,
      priority_distribution: priorityDistribution,
    };

    // Generate recommendations
    if (completionRate < 0.7) {
      result.recommendations.push('Consider breaking down complex tasks into smaller, manageable subtasks');
    }

    if (peakHours.length > 0) {
      result.recommendations.push(`You're most productive at ${peakHours.join(', ')}. Consider scheduling important tasks during these hours.`);
    }

    const mostCommonPriority = Object.entries(priorityDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    if (mostCommonPriority) {
      result.recommendations.push(`You frequently create ${mostCommonPriority} priority tasks. Consider if this reflects your actual priorities.`);
    }

    return result;
  }

  /**
   * Get AI statistics
   */
  async getAIStats(): Promise<AIStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get suggestion statistics
    const { data: suggestions } = await supabase
      .from('ai_task_suggestions')
      .select('status, confidence_score, suggested_at')
      .eq('user_id', user.id);

    const { data: tasksFromAI, count: aiTaskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('source', 'ai_suggestion');

    const { data: patterns, count: patternCount } = await supabase
      .from('user_behavior_patterns')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);

    const totalSuggestions = suggestions?.length || 0;
    const acceptedSuggestions = suggestions?.filter(s => s.status === 'accepted').length || 0;
    const rejectedSuggestions = suggestions?.filter(s => s.status === 'rejected').length || 0;
    const acceptanceRate = totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0;
    const averageConfidence = totalSuggestions > 0 
      ? suggestions!.reduce((sum, s) => sum + s.confidence_score, 0) / totalSuggestions 
      : 0;

    const lastSuggestion = suggestions
      ?.sort((a, b) => new Date(b.suggested_at).getTime() - new Date(a.suggested_at).getTime())[0];

    return {
      total_suggestions_generated: totalSuggestions,
      suggestions_accepted: acceptedSuggestions,
      suggestions_rejected: rejectedSuggestions,
      acceptance_rate: acceptanceRate,
      average_confidence_score: averageConfidence,
      tasks_created_from_ai: aiTaskCount || 0,
      behavior_patterns_detected: patternCount || 0,
      model_accuracy: 0.85, // Would be calculated from model metrics in production
      last_suggestion_generated: lastSuggestion?.suggested_at,
    };
  }

  /**
   * Get suggestion insights
   */
  async getSuggestionInsights(): Promise<SuggestionInsights> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: suggestions } = await supabase
      .from('ai_task_suggestions')
      .select('suggestion_type, status, suggested_at, responded_at')
      .eq('user_id', user.id)
      .neq('status', 'pending');

    const { data: feedback } = await supabase
      .from('ai_suggestion_feedback')
      .select('feedback_type, feedback_value')
      .eq('user_id', user.id);

    if (!suggestions || suggestions.length === 0) {
      return {
        most_accepted_type: 'pattern_based',
        best_performing_time: '09:00',
        average_response_time: 0,
        feedback_distribution: {},
        improvement_suggestions: ['Start using AI suggestions to see insights'],
      };
    }

    // Analyze most accepted suggestion type
    const typeAcceptance = suggestions.reduce((acc, s) => {
      if (!acc[s.suggestion_type]) {
        acc[s.suggestion_type] = { total: 0, accepted: 0 };
      }
      acc[s.suggestion_type].total++;
      if (s.status === 'accepted') {
        acc[s.suggestion_type].accepted++;
      }
      return acc;
    }, {} as Record<string, { total: number; accepted: number }>);

    const bestType = Object.entries(typeAcceptance)
      .map(([type, stats]) => ({
        type: type as SuggestionType,
        rate: stats.accepted / stats.total,
      }))
      .sort((a, b) => b.rate - a.rate)[0];

    // Analyze best performing time
    const hourlyPerformance = suggestions
      .filter(s => s.status === 'accepted')
      .reduce((acc, s) => {
        const hour = new Date(s.suggested_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    const bestHour = Object.entries(hourlyPerformance)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '9';

    // Calculate average response time
    const responseTimes = suggestions
      .filter(s => s.responded_at)
      .map(s => {
        const suggested = new Date(s.suggested_at).getTime();
        const responded = new Date(s.responded_at!).getTime();
        return (responded - suggested) / 1000; // seconds
      });

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Analyze feedback distribution
    const feedbackDistribution = feedback?.reduce((acc, f) => {
      const type = f.feedback_value.rating || f.feedback_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Generate improvement suggestions
    const improvements: string[] = [];
    const acceptanceRate = suggestions.filter(s => s.status === 'accepted').length / suggestions.length;

    if (acceptanceRate < 0.3) {
      improvements.push('Consider adjusting your AI preferences to get more relevant suggestions');
    }
    if (averageResponseTime > 86400) { // > 1 day
      improvements.push('Try responding to suggestions more quickly for better personalization');
    }
    if (bestType && bestType.rate > 0.7) {
      improvements.push(`You prefer ${bestType.type} suggestions - we'll show more of these`);
    }

    return {
      most_accepted_type: bestType?.type || 'pattern_based',
      best_performing_time: `${bestHour.padStart(2, '0')}:00`,
      average_response_time: averageResponseTime,
      feedback_distribution: feedbackDistribution,
      improvement_suggestions: improvements,
    };
  }

  /**
   * Clean up expired suggestions
   */
  async cleanupExpiredSuggestions(): Promise<number> {
    const { data: cleanupCount, error } = await supabase.rpc('cleanup_expired_ai_suggestions');
    if (error) throw error;
    return cleanupCount || 0;
  }

  /**
   * Get available AI models
   */
  async getModels(modelType?: ModelType): Promise<AIModel[]> {
    let query = supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true)
      .order('model_name', { ascending: true });

    if (modelType) {
      query = query.eq('model_type', modelType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<AIModelMetrics[]> {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('ai_model_metrics')
      .select('*')
      .eq('model_id', modelId)
      .gte('period_start', startDate.toISOString())
      .order('period_start', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export const aiService = new AIService();