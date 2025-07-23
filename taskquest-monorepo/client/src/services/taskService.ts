import { supabase } from '@/lib/supabase';
import { 
  Task, TaskFormData, TaskFilters, 
  Goal, GoalFormData, 
  Project, ProjectFormData,
  XPTransaction, ApiResponse, TaskStatus
} from '@/types/task-management';

// Helper function to handle API responses
const handleResponse = async <T>(
  promise: Promise<{ data: T | null; error: any }> | any
): Promise<ApiResponse<T>> => {
  try {
    const { data, error } = await promise;
    
    if (error) {
      throw error;
    }
    
    return { 
      data: data as T, 
      error: null, 
      status: 200 
    };
  } catch (error: any) {
    console.error('API Error:', error);
    return { 
      data: null as unknown as T, 
      error: error?.message || 'An error occurred', 
      status: error?.status || 500 
    };
  }
};

// Goals API
export const goalService = {
  // Create a new goal
  async create(goalData: GoalFormData): Promise<ApiResponse<Goal>> {
    const promise = supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();
    return handleResponse(promise);
  },

  // Get all goals
  async getAll(): Promise<ApiResponse<Goal[]>> {
    const promise = supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    return handleResponse(promise);
  },

  // Get a single goal by ID
  async getById(id: string): Promise<ApiResponse<Goal>> {
    const promise = supabase
      .from('goals')
      .select('*, projects(*, tasks(*))')
      .eq('id', id)
      .single();
    return handleResponse(promise);
  },

  // Update a goal
  async update(id: string, updates: Partial<GoalFormData>): Promise<ApiResponse<Goal>> {
    const promise = supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return handleResponse(promise);
  },

  // Delete a goal
  async delete(id: string): Promise<ApiResponse<void>> {
    const promise = supabase
      .from('goals')
      .delete()
      .eq('id', id);
    return handleResponse(promise);
  },

  // Mark a goal as complete
  async complete(id: string): Promise<ApiResponse<Goal>> {
    return this.update(id, { 
      status: 'completed',
      completed_at: new Date().toISOString() 
    });
  }
};

// Projects API
export const projectService = {
  // Create a new project
  async create(projectData: ProjectFormData): Promise<ApiResponse<Project>> {
    const promise = supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    return handleResponse(promise);
  },

  // Get all projects, optionally filtered by goal
  async getAll(goalId?: string): Promise<ApiResponse<Project[]>> {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (goalId) {
      query = query.eq('goal_id', goalId);
    }

    return handleResponse(query);
  },

  // Get a single project by ID
  async getById(id: string): Promise<ApiResponse<Project>> {
    const promise = supabase
      .from('projects')
      .select('*, goals(*), tasks(*)')
      .eq('id', id)
      .single();
    return handleResponse(promise);
  },

  // Update a project
  async update(id: string, updates: Partial<ProjectFormData>): Promise<ApiResponse<Project>> {
    const promise = supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return handleResponse(promise);
  },

  // Delete a project
  async delete(id: string): Promise<ApiResponse<void>> {
    const promise = supabase
      .from('projects')
      .delete()
      .eq('id', id);
    return handleResponse(promise);
  },

  // Mark a project as complete
  async complete(id: string): Promise<ApiResponse<Project>> {
    return this.update(id, { 
      status: 'completed',
      completed_at: new Date().toISOString() 
    });
  }
};

// Tasks API
export const taskService = {
  // Create a new task
  async create(taskData: TaskFormData): Promise<ApiResponse<Task>> {
    const promise = supabase
      .from('tasks')
      .insert({
        ...taskData,
        xp_earned: 0 // Initialize with 0 XP
      })
      .select()
      .single();
    return handleResponse(promise);
  },

  // Get tasks with optional filters
  async getAll(filters: Partial<TaskFilters> = {}): Promise<ApiResponse<Task[]>> {
    try {
      let query = supabase
        .from('tasks')
        .select('*, project:projects(*), goal:goals(*)')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters.complexity && filters.complexity !== 'all') {
        query = query.eq('complexity', filters.complexity);
      }

      if (filters.project_id && filters.project_id !== 'all') {
        query = query.eq('project_id', filters.project_id);
      }

      if (filters.goal_id && filters.goal_id !== 'all') {
        query = query.eq('projects.goal_id', filters.goal_id);
      }

      if (filters.due_date && filters.due_date !== 'all') {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        
        switch (filters.due_date) {
          case 'today':
            query = query
              .gte('due_date', today.toISOString().split('T')[0])
              .lt('due_date', tomorrow.toISOString().split('T')[0]);
            break;
          case 'this_week':
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', endOfWeek.toISOString());
            break;
          case 'overdue':
            query = query.lt('due_date', today.toISOString());
            break;
        }
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      return handleResponse(Promise.resolve({ data, error }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return handleResponse(Promise.resolve({ 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks' 
      }));
    }
  },

  // Get a single task by ID
  async getById(id: string): Promise<ApiResponse<Task>> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(*), goal:goals(*)')
        .eq('id', id)
        .single();
      
      return handleResponse(Promise.resolve({ data, error }));
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      return handleResponse(Promise.resolve({ 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch task' 
      }));
    }
  },

  // Update a task
  async update(id: string, updates: Partial<TaskFormData>): Promise<ApiResponse<Task>> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      return handleResponse(Promise.resolve({ data, error }));
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      return handleResponse(Promise.resolve({ 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to update task' 
      }));
    }
  },

  // Delete a task
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return { 
        data: undefined, 
        error: null, 
        status: 200 
      };
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      return { 
        data: undefined, 
        error: error instanceof Error ? error.message : 'Failed to delete task',
        status: 500
      };

  },

  // Mark a task as complete and award XP
  async complete(id: string): Promise<ApiResponse<{ task: Task; xpEarned: number }>> {
    try {
      // First get the task to calculate XP
      const { data: taskData, error: fetchError } = await this.getById(id);
      
      if (fetchError || !taskData) {
        return { 
          data: null, 
          error: fetchError || 'Task not found', 
          status: fetchError ? 500 : 404 
        };
      }

      // Calculate XP based on priority and complexity
      const xpValues = {
        priority: { low: 5, medium: 10, high: 20 },
        complexity: { simple: 5, medium: 10, complex: 20 }
      };

      const xpEarned = 
        (xpValues.priority[taskData.priority as keyof typeof xpValues.priority] || 0) + 
        (xpValues.complexity[taskData.complexity as keyof typeof xpValues.complexity] || 0);

      // Update the task status to completed and set completed_at
      const { data: updatedTask, error: updateError } = await this.update(id, { 
        status: 'completed',
        completed_at: new Date().toISOString(),
        xp_earned: xpEarned
      } as Partial<TaskFormData>);

      if (updateError || !updatedTask) {
        return { 
          data: null, 
          error: updateError || 'Failed to update task', 
          status: 500 
        };
      }

      // Record XP transaction
      await xpService.recordTransaction({
        amount: xpEarned,
        source_type: 'task_completion',
        source_id: id,
        metadata: {
          task_id: id,
          task_title: taskData.title,
          priority: taskData.priority,
          complexity: taskData.complexity
        }
      });

      // Update goal progress if task is associated with a project and goal
      if (updatedTask.project_id) {
        const { data: project } = await projectService.getById(updatedTask.project_id);
        if (project && project.goal_id) {
          await goalService.updateProgress(project.goal_id);
        }
      }

      return { 
        data: { 
          task: updatedTask, 
          xpEarned 
        }, 
        error: null, 
        status: 200 
      };
    } catch (error) {
      console.error(`Error completing task ${id}:`, error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to complete task',
        status: 500
      };
    }
  },

  // Toggle task status between todo and in_progress
  async toggleStatus(id: string): Promise<ApiResponse<Task>> {
    try {
      // Get the current task
      const { data: task, error: fetchError } = await this.getById(id);
      
      if (fetchError || !task) {
        return { 
          data: null, 
          error: fetchError || 'Task not found', 
          status: fetchError ? 500 : 404 
        };
      }

      // Toggle between todo and in_progress
      const newStatus = task.status === TaskStatus.Todo ? TaskStatus.InProgress : TaskStatus.Todo;
      
      // Update the task with the new status
      return this.update(id, { status: newStatus } as Partial<TaskFormData>);
    } catch (error) {
      console.error(`Error toggling task status for task ${id}:`, error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to toggle task status',
        status: 500
      };
    }
      const newStatus = task.status === 'todo' ? 'in_progress' : 'todo';
      
      // Update the task with the new status
      return this.update(id, { status: newStatus } as Partial<TaskFormData>);
    } catch (error) {
      console.error(`Error toggling task ${id} status:`, error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to toggle task status',
        status: 500
      };
    }
  }
};

// XP Service
export const xpService = {
  // Get all XP transactions for the current user
  async getTransactions(limit = 10): Promise<ApiResponse<XPTransaction[]>> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return handleResponse(Promise.resolve({ data, error }));
    } catch (error) {
      console.error('Error fetching XP transactions:', error);
      return handleResponse(Promise.resolve({ 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch XP transactions' 
      }));
    }
  },

  // Record a new XP transaction
  async recordTransaction(transaction: {
    amount: number;
    source_type: 'task_completion' | 'streak_bonus' | 'level_up' | 'other';
    source_id?: string | null;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<XPTransaction>> {
    const promise = supabase
      .from('xp_transactions')
      .insert(transaction)
      .select()
      .single();
    return handleResponse(promise);
  },

  // Get user's current level and XP
  async getLevelInfo(): Promise<ApiResponse<{
    total_xp: number;
    current_level: number;
    xp_to_next_level: number;
    xp_in_current_level: number;
  }>> {
    // Get total XP from transactions
    const { data: transactions, error } = await this.getTransactions(1000);
    if (error) return { data: null, error, status: 400 };

    const total_xp = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    
    // Simple level calculation (can be adjusted)
    // Level = floor(sqrt(total_xp / 100))
    const current_level = Math.max(1, Math.floor(Math.sqrt(total_xp / 100)));
    
    // Calculate XP for current level and next level
    const xp_for_current_level = Math.pow(current_level, 2) * 100;
    const xp_for_next_level = Math.pow(current_level + 1, 2) * 100;
    
    return {
      data: {
        total_xp,
        current_level,
        xp_to_next_level: xp_for_next_level - total_xp,
        xp_in_current_level: total_xp - xp_for_current_level
      },
      error: null,
      status: 200
    };
  }
};

// Dashboard Service
export const dashboardService = {
  // Get dashboard statistics
  async getStats(): Promise<ApiResponse<{
    total_goals: number;
    active_goals: number;
    total_projects: number;
    active_projects: number;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    total_xp: number;
    level: number;
    xp_to_next_level: number;
    current_streak: number;
    longest_streak: number;
  }>> {
    try {
      // Get goals count
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('status, created_at');
      
      if (goalsError) throw goalsError;

      // Get projects count
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('status, created_at');
      
      if (projectsError) throw projectsError;

      // Get tasks count
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status, created_at');
      
      if (tasksError) throw tasksError;

      // Get XP and level info
      const { data: xpInfo, error: xpError } = await xpService.getLevelInfo();
      if (xpError) throw xpError;

      // Calculate stats
      const total_goals = goals?.length || 0;
      const active_goals = goals?.filter(g => g.status === 'active').length || 0;
      
      const total_projects = projects?.length || 0;
      const active_projects = projects?.filter(p => p.status === 'active').length || 0;
      
      const total_tasks = tasks?.length || 0;
      const completed_tasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const pending_tasks = total_tasks - completed_tasks;

      // TODO: Implement streak tracking
      const current_streak = 0;
      const longest_streak = 0;

      return {
        data: {
          total_goals,
          active_goals,
          total_projects,
          active_projects,
          total_tasks,
          completed_tasks,
          pending_tasks,
          total_xp: xpInfo?.total_xp || 0,
          level: xpInfo?.current_level || 1,
          xp_to_next_level: xpInfo?.xp_to_next_level || 100,
          current_streak,
          longest_streak
        },
        error: null,
        status: 200
      };
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      return { 
        data: null as any, 
        error: error.message || 'Failed to load dashboard stats', 
        status: 500 
      };
    }
  }
};
