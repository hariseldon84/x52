// Enums
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Completed = 'completed',
  Archived = 'archived'
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export enum TaskComplexity {
  Simple = 'simple',
  Medium = 'medium',
  Complex = 'complex'
}

// Base types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Goal types
export interface Goal extends BaseEntity {
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: 'active' | 'completed' | 'paused';
  completed_at: string | null;
  // Computed fields
  progress_percentage?: number;
  total_xp?: number;
  task_count?: number;
  completed_task_count?: number;
}

// Project types
export interface Project extends BaseEntity {
  goal_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused';
  completed_at: string | null;
  // Computed fields
  progress_percentage?: number;
  task_count?: number;
  completed_task_count?: number;
}

// Task types
export interface Task extends BaseEntity {
  project_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  complexity: TaskComplexity;
  due_date: string | null;
  completed_at: string | null;
  xp_earned: number;
  // Computed fields
  xp_value?: number;
  is_completed?: boolean;
}

// XP Transaction types
export interface XPTransaction extends BaseEntity {
  user_id: string;
  amount: number;
  source_type: 'task_completion' | 'streak_bonus' | 'level_up' | 'other';
  source_id: string | null;
  metadata: Record<string, any> | null;
}

// Form types
export interface GoalFormData {
  title: string;
  description?: string;
  target_date?: string | null;
  status?: 'active' | 'completed' | 'paused';
}

export interface ProjectFormData {
  title: string;
  description?: string;
  goal_id?: string | null;
  status?: 'active' | 'completed' | 'paused';
}

export interface TaskFormData {
  title: string;
  description?: string;
  project_id?: string | null;
  priority: TaskPriority;
  complexity: TaskComplexity;
  due_date?: string | null;
  status?: TaskStatus;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

// Filter types
export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  complexity?: TaskComplexity | 'all';
  project_id?: string | 'all';
  goal_id?: string | 'all';
  due_date?: 'today' | 'this_week' | 'overdue' | 'all';
  search?: string;
}

// Dashboard stats
export interface DashboardStats {
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
}
