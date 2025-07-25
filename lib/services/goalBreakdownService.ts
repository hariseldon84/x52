// Epic 9, Story 9.5: Intelligent Goal Breakdown and Planning Service

import { supabase } from '@/lib/supabase';
import type {
  GoalBreakdownTemplate,
  GoalBreakdown,
  BreakdownTask,
  Milestone,
  BreakdownInsight,
  UserSkillAssessment,
  GoalCompletionPattern,
  CreateGoalBreakdownRequest,
  UpdateGoalBreakdownRequest,
  CreateBreakdownTasksRequest,
  UpdateBreakdownTaskRequest,
  CreateMilestoneRequest,
  UpdateSkillAssessmentRequest,
  GoalAnalysisRequest,
  BreakdownStats,
  BreakdownInsights,
  SmartBreakdownSuggestion,
  BreakdownProgress,
  TaskCreationBatch,
  BreakdownAnalysis,
  SuggestedTask,
  TemplateType,
  BreakdownStatus,
  ComplexityLevel,
  TaskType
} from '@/lib/types/goalBreakdown';

export class GoalBreakdownService {
  /**
   * Get available breakdown templates
   */
  async getTemplates(type?: TemplateType): Promise<GoalBreakdownTemplate[]> {
    let query = supabase
      .from('goal_breakdown_templates')
      .select('*')
      .eq('is_active', true)
      .order('success_rate', { ascending: false });

    if (type) {
      query = query.eq('template_type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Analyze goal and generate breakdown suggestions
   */
  async analyzeGoal(request: GoalAnalysisRequest): Promise<BreakdownAnalysis> {
    const { data: analysisResult, error } = await supabase.rpc('analyze_goal_complexity', {
      p_goal_id: request.goal_id,
      p_goal_description: request.goal_description,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
    return analysisResult;
  }

  /**
   * Create goal breakdown from analysis
   */
  async createBreakdown(request: CreateGoalBreakdownRequest): Promise<GoalBreakdown> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First analyze the goal
    const analysis = await this.analyzeGoal({
      goal_id: request.goal_id,
      goal_description: request.goal_description
    });

    // Create the breakdown record
    const breakdownData = {
      user_id: user.id,
      goal_id: request.goal_id,
      goal_description: request.goal_description,
      goal_complexity_score: analysis.complexity_score,
      estimated_duration_days: analysis.estimated_duration_days,
      breakdown_analysis: analysis,
      suggested_phases: analysis.suggested_phases,
      suggested_tasks: analysis.suggested_tasks,
      target_start_date: request.target_start_date,
      target_end_date: request.target_end_date,
      template_id: request.template_id,
      milestones: [],
      resource_requirements: {
        required_skills: analysis.required_skills,
        estimated_time: analysis.estimated_duration_days
      }
    };

    const { data, error } = await supabase
      .from('goal_breakdowns')
      .insert([breakdownData])
      .select(`
        *,
        goal:goals(id, title, description, status),
        template:goal_breakdown_templates(*)
      `)
      .single();

    if (error) throw error;

    // Create breakdown tasks from suggestions
    await this.createBreakdownTasksFromSuggestions(data.id, analysis.suggested_tasks);

    // Generate initial milestones
    await this.generateMilestones(data.id, analysis.suggested_phases);

    return data;
  }

  /**
   * Get user's goal breakdowns
   */
  async getBreakdowns(status?: BreakdownStatus): Promise<GoalBreakdown[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('goal_breakdowns')
      .select(`
        *,
        goal:goals(id, title, description, status),
        template:goal_breakdown_templates(*)
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
   * Get specific breakdown with full details
   */
  async getBreakdown(breakdownId: string): Promise<GoalBreakdown> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_breakdowns')
      .select(`
        *,
        goal:goals(id, title, description, status),
        template:goal_breakdown_templates(*)
      `)
      .eq('id', breakdownId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update goal breakdown
   */
  async updateBreakdown(
    breakdownId: string, 
    request: UpdateGoalBreakdownRequest
  ): Promise<GoalBreakdown> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData = {
      ...request,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('goal_breakdowns')
      .update(updateData)
      .eq('id', breakdownId)
      .eq('user_id', user.id)
      .select(`
        *,
        goal:goals(id, title, description, status),
        template:goal_breakdown_templates(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get breakdown tasks
   */
  async getBreakdownTasks(breakdownId: string): Promise<BreakdownTask[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('breakdown_tasks')
      .select(`
        *,
        created_task:tasks(id, title, status, priority)
      `)
      .eq('breakdown_id', breakdownId)
      .eq('user_id', user.id)
      .order('phase_number', { ascending: true })
      .order('sequence_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create breakdown tasks from suggestions
   */
  private async createBreakdownTasksFromSuggestions(
    breakdownId: string, 
    suggestions: SuggestedTask[]
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const tasks = suggestions.map((suggestion, index) => ({
      breakdown_id: breakdownId,
      user_id: user.id,
      task_title: suggestion.title,
      task_description: suggestion.description,
      task_type: suggestion.type,
      complexity_level: suggestion.complexity,
      estimated_hours: suggestion.estimated_hours,
      confidence_score: suggestion.confidence_score || 0.7,
      phase_number: suggestion.phase,
      sequence_order: index,
      priority_level: suggestion.priority || 'medium',
      required_skills: suggestion.required_skills || [],
      required_resources: [],
      learning_components: []
    }));

    const { error } = await supabase
      .from('breakdown_tasks')
      .insert(tasks);

    if (error) throw error;
  }

  /**
   * Create tasks from breakdown suggestions
   */
  async createTasksFromBreakdown(request: CreateBreakdownTasksRequest): Promise<number> {
    const { data: createdCount, error } = await supabase.rpc('create_tasks_from_breakdown', {
      p_breakdown_id: request.breakdown_id,
      p_selected_tasks: request.selected_tasks
    });

    if (error) throw error;
    return createdCount;
  }

  /**
   * Update breakdown task
   */
  async updateBreakdownTask(
    taskId: string, 
    request: UpdateBreakdownTaskRequest
  ): Promise<BreakdownTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('breakdown_tasks')
      .update({
        ...request,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select(`
        *,
        created_task:tasks(id, title, status, priority)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Generate milestones from phases
   */
  private async generateMilestones(breakdownId: string, phases: any[]): Promise<void> {
    const milestones = phases.map((phase, index) => ({
      breakdown_id: breakdownId,
      milestone_name: `${phase.name} Complete`,
      milestone_description: `Completion of ${phase.name} phase`,
      milestone_type: 'phase_completion' as const,
      phase_number: index + 1,
      sequence_order: index,
      success_criteria: [`All ${phase.name.toLowerCase()} tasks completed`],
      deliverables: [`${phase.name} deliverables`]
    }));

    const { error } = await supabase
      .from('breakdown_milestones')
      .insert(milestones);

    if (error) throw error;
  }

  /**
   * Get breakdown milestones
   */
  async getMilestones(breakdownId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('breakdown_milestones')
      .select('*')
      .eq('breakdown_id', breakdownId)
      .order('phase_number', { ascending: true })
      .order('sequence_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create milestone
   */
  async createMilestone(request: CreateMilestoneRequest): Promise<Milestone> {
    const { data, error } = await supabase
      .from('breakdown_milestones')
      .insert([request])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update milestone
   */
  async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone> {
    const { data, error } = await supabase
      .from('breakdown_milestones')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get breakdown insights
   */
  async getInsights(breakdownId?: string): Promise<BreakdownInsight[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('breakdown_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('confidence_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (breakdownId) {
      query = query.eq('breakdown_id', breakdownId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get user skill assessments
   */
  async getSkillAssessments(): Promise<UserSkillAssessment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_skill_assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('improvement_priority', { ascending: false })
      .order('current_level', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update skill assessment
   */
  async updateSkillAssessment(request: UpdateSkillAssessmentRequest): Promise<UserSkillAssessment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_skill_assessments')
      .upsert({
        user_id: user.id,
        ...request,
        assessment_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get breakdown statistics
   */
  async getBreakdownStats(): Promise<BreakdownStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get breakdown counts
    const { data: breakdowns } = await supabase
      .from('goal_breakdowns')
      .select('status, actual_completion_time, template_id, challenges_faced')
      .eq('user_id', user.id);

    // Get skill assessments
    const { data: skills } = await supabase
      .from('user_skill_assessments')
      .select('skill_name, current_level, improvement_priority')
      .eq('user_id', user.id)
      .eq('improvement_priority', 'high');

    // Get template usage
    const { data: templates } = await supabase
      .from('goal_breakdown_templates')
      .select('template_name, usage_count')
      .order('usage_count', { ascending: false })
      .limit(1);

    const totalBreakdowns = breakdowns?.length || 0;
    const completedBreakdowns = breakdowns?.filter(b => b.status === 'completed').length || 0;
    const avgCompletionTime = breakdowns
      ?.filter(b => b.actual_completion_time)
      .reduce((acc, b) => acc + (b.actual_completion_time || 0), 0) / completedBreakdowns || 0;

    return {
      total_breakdowns: totalBreakdowns,
      completed_breakdowns: completedBreakdowns,
      average_completion_time: avgCompletionTime,
      success_rate: totalBreakdowns > 0 ? completedBreakdowns / totalBreakdowns : 0,
      most_used_template: templates?.[0]?.template_name || 'None',
      skill_improvement_areas: skills?.map(s => s.skill_name) || [],
      common_challenges: [],
      productivity_patterns: {}
    };
  }

  /**
   * Get comprehensive breakdown insights
   */
  async getComprehensiveInsights(): Promise<BreakdownInsights> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get skill gaps
    const { data: skills } = await supabase
      .from('user_skill_assessments')
      .select('*')
      .eq('user_id', user.id)
      .lt('current_level', 4);

    // Get completion patterns
    const { data: patterns } = await supabase
      .from('goal_completion_patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('success_correlation', { ascending: false });

    return {
      time_estimation_accuracy: {
        average_variance: 0.15,
        improvement_trend: 'improving',
        recommendations: [
          'Break down complex tasks into smaller components',
          'Track actual time spent vs. estimates',
          'Consider buffer time for unknown factors'
        ]
      },
      skill_gap_analysis: {
        identified_gaps: skills?.map(skill => ({
          skill: skill.skill_name,
          current_level: skill.current_level,
          required_level: 4,
          learning_resources: ['Online courses', 'Practice projects', 'Mentorship']
        })) || [],
        priority_skills: skills?.filter(s => s.improvement_priority === 'high')
          .map(s => s.skill_name) || []
      },
      success_factor_analysis: {
        key_success_factors: [
          'Clear milestone definition',
          'Regular progress reviews',
          'Adequate skill preparation'
        ],
        risk_mitigation_strategies: [
          'Plan for skill development time',
          'Set realistic timelines',
          'Identify dependencies early'
        ],
        optimal_planning_patterns: [
          'Start with research phase',
          'Plan iterative development',
          'Include testing and review'
        ]
      },
      personalized_recommendations: [
        {
          type: 'skill_gap',
          title: 'Develop Core Skills First',
          description: 'Focus on building foundational skills before complex projects',
          confidence: 0.8,
          impact: 'high'
        },
        {
          type: 'time_estimation',
          title: 'Add 25% Buffer Time',
          description: 'Your estimates tend to be optimistic. Add buffer time.',
          confidence: 0.7,
          impact: 'medium'
        }
      ]
    };
  }

  /**
   * Get smart breakdown suggestions
   */
  async getSmartSuggestions(breakdownId: string): Promise<SmartBreakdownSuggestion> {
    const breakdown = await this.getBreakdown(breakdownId);
    const skills = await this.getSkillAssessments();
    const stats = await this.getBreakdownStats();

    // Simple AI-like analysis based on user patterns
    const skillLevels = skills.reduce((acc, skill) => {
      acc[skill.skill_name] = skill.current_level;
      return acc;
    }, {} as Record<string, number>);

    const requiredSkills = breakdown.breakdown_analysis.required_skills || [];
    const skillGaps = requiredSkills.filter(skill => 
      !skillLevels[skill] || skillLevels[skill] < 3
    );

    let confidenceScore = 0.7;
    let successProbability = 0.8;
    const recommendations = [];

    if (skillGaps.length > 0) {
      confidenceScore -= skillGaps.length * 0.1;
      successProbability -= skillGaps.length * 0.15;
      recommendations.push({
        area: 'skill_development',
        current_value: skillGaps,
        suggested_value: 'Plan skill development phase',
        impact: 'Reduces risk of project delays'
      });
    }

    if (breakdown.estimated_duration_days && breakdown.estimated_duration_days > stats.average_completion_time * 1.5) {
      confidenceScore -= 0.1;
      recommendations.push({
        area: 'timeline',
        current_value: breakdown.estimated_duration_days,
        suggested_value: Math.round(breakdown.estimated_duration_days * 0.8),
        impact: 'More realistic timeline based on your history'
      });
    }

    return {
      confidence_score: confidenceScore,
      reasoning: `Based on your skill levels and past project completion patterns, this goal ${skillGaps.length > 0 ? 'requires skill development' : 'aligns well with your capabilities'}.`,
      alternative_approaches: [
        'Break into smaller, sequential goals',
        'Find a learning partner or mentor',
        'Start with a proof-of-concept phase'
      ],
      estimated_success_probability: successProbability,
      recommended_adjustments: recommendations
    };
  }

  /**
   * Get breakdown progress
   */
  async getBreakdownProgress(breakdownId: string): Promise<BreakdownProgress> {
    const [breakdown, tasks, milestones] = await Promise.all([
      this.getBreakdown(breakdownId),
      this.getBreakdownTasks(breakdownId),
      this.getMilestones(breakdownId)
    ]);

    const tasksByPhase = tasks.reduce((acc, task) => {
      if (!acc[task.phase_number]) {
        acc[task.phase_number] = [];
      }
      acc[task.phase_number].push(task);
      return acc;
    }, {} as Record<number, BreakdownTask[]>);

    const phaseProgress = Object.entries(tasksByPhase).map(([phase, phaseTasks]) => {
      const completed = phaseTasks.filter(t => t.is_created_as_task && 
        t.created_task?.status === 'completed').length;
      const total = phaseTasks.length;
      
      return {
        phase_name: `Phase ${phase}`,
        completion_percentage: total > 0 ? (completed / total) * 100 : 0,
        tasks_completed: completed,
        tasks_total: total,
        on_schedule: true // Simplified - would need actual scheduling logic
      };
    });

    const overallProgress = phaseProgress.reduce((acc, phase) => 
      acc + phase.completion_percentage, 0) / phaseProgress.length || 0;

    return {
      overall_progress: overallProgress,
      phase_progress: phaseProgress,
      milestone_status: milestones.map(milestone => ({
        milestone_name: milestone.milestone_name,
        is_achieved: milestone.is_achieved,
        target_date: milestone.target_date || '',
        actual_date: milestone.achieved_date,
        variance_days: milestone.achieved_date && milestone.target_date
          ? Math.round((new Date(milestone.achieved_date).getTime() - 
              new Date(milestone.target_date).getTime()) / (1000 * 60 * 60 * 24))
          : undefined
      })),
      current_bottlenecks: tasks
        .filter(t => !t.is_approved && t.confidence_score < 0.6)
        .map(t => `Low confidence in: ${t.task_title}`),
      upcoming_risks: [
        'Skill development requirements',
        'Time estimation accuracy',
        'Resource availability'
      ],
      recommended_actions: [
        'Review and approve high-confidence tasks',
        'Address skill gaps proactively',
        'Set up regular progress reviews'
      ]
    };
  }

  /**
   * Create batch of tasks from breakdown
   */
  async createTaskBatch(batch: TaskCreationBatch): Promise<number> {
    const tasks = await this.getBreakdownTasks(batch.breakdown_id);
    const selectedTasks = tasks.filter(task => 
      batch.selected_task_ids.includes(task.id)
    );

    const suggestedTasks = selectedTasks.map(task => ({
      title: task.task_title,
      description: task.task_description,
      type: task.task_type,
      complexity: task.complexity_level,
      estimated_hours: task.estimated_hours,
      phase: task.phase_number,
      priority: task.priority_level
    }));

    return this.createTasksFromBreakdown({
      breakdown_id: batch.breakdown_id,
      selected_tasks: suggestedTasks,
      create_actual_tasks: true
    });
  }

  /**
   * Delete breakdown
   */
  async deleteBreakdown(breakdownId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('goal_breakdowns')
      .delete()
      .eq('id', breakdownId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  }
}

export const goalBreakdownService = new GoalBreakdownService();