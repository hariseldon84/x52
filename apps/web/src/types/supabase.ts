export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_date: string | null
          due_date: string | null
          status: string
          completed: boolean
          progress: number
          xp_value: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          target_date?: string | null
          due_date?: string | null
          status?: string
          completed?: boolean
          progress?: number
          xp_value?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          target_date?: string | null
          due_date?: string | null
          status?: string
          completed?: boolean
          progress?: number
          xp_value?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          goal_id: string | null
          user_id: string
          title: string
          description: string | null
          status: string
          progress: number
          task_count: number
          completed_task_count: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          goal_id?: string | null
          user_id: string
          title: string
          description?: string | null
          status?: string
          progress?: number
          task_count?: number
          completed_task_count?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          goal_id?: string | null
          user_id?: string
          title?: string
          description?: string | null
          status?: string
          progress?: number
          task_count?: number
          completed_task_count?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string | null
          user_id: string
          contact_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'completed' | 'archived'
          priority: 'low' | 'medium' | 'high'
          complexity: 'simple' | 'medium' | 'complex'
          completed: boolean
          progress: number
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
          xp_earned: number
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id: string
          contact_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high'
          complexity?: 'simple' | 'medium' | 'complex'
          completed?: boolean
          progress?: number
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          xp_earned?: number
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string
          contact_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high'
          complexity?: 'simple' | 'medium' | 'complex'
          completed?: boolean
          progress?: number
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      user_streaks: {
        Row: {
          id: string
          user_id: string
          current_streak: number
          longest_streak: number
          last_activity_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      xp_events: {
        Row: {
          id: string
          user_id: string
          xp_amount: number
          event_type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          xp_amount: number
          event_type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          xp_amount?: number
          event_type?: string
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      xp_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          source_type: string
          source_id: string | null
          created_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          source_type: string
          source_id?: string | null
          created_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          source_type?: string
          source_id?: string | null
          created_at?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          role: string | null
          avatar_url: string | null
          notes: string | null
          priority: 'low' | 'normal' | 'high' | 'vip'
          tags: string[] | null
          created_at: string
          updated_at: string
          last_contact_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          role?: string | null
          avatar_url?: string | null
          notes?: string | null
          priority?: 'low' | 'normal' | 'high' | 'vip'
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          last_contact_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          role?: string | null
          avatar_url?: string | null
          notes?: string | null
          priority?: 'low' | 'normal' | 'high' | 'vip'
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          last_contact_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_interactions: {
        Row: {
          id: string
          contact_id: string
          user_id: string
          type: 'call' | 'meeting' | 'email' | 'social' | 'task' | 'note'
          title: string
          description: string | null
          duration_minutes: number | null
          interaction_date: string
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          contact_id: string
          user_id: string
          type: 'call' | 'meeting' | 'email' | 'social' | 'task' | 'note'
          title: string
          description?: string | null
          duration_minutes?: number | null
          interaction_date?: string
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          contact_id?: string
          user_id?: string
          type?: 'call' | 'meeting' | 'email' | 'social' | 'task' | 'note'
          title?: string
          description?: string | null
          duration_minutes?: number | null
          interaction_date?: string
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_interactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      follow_ups: {
        Row: {
          id: string
          contact_id: string
          user_id: string
          title: string
          description: string | null
          status: 'pending' | 'completed' | 'snoozed' | 'cancelled'
          scheduled_date: string
          completed_date: string | null
          snooze_until: string | null
          is_recurring: boolean
          recurrence_pattern: string | null
          recurrence_interval: number
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          contact_id: string
          user_id: string
          title: string
          description?: string | null
          status?: 'pending' | 'completed' | 'snoozed' | 'cancelled'
          scheduled_date: string
          completed_date?: string | null
          snooze_until?: string | null
          is_recurring?: boolean
          recurrence_pattern?: string | null
          recurrence_interval?: number
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          contact_id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'completed' | 'snoozed' | 'cancelled'
          scheduled_date?: string
          completed_date?: string | null
          snooze_until?: string | null
          is_recurring?: boolean
          recurrence_pattern?: string | null
          recurrence_interval?: number
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_total_xp: {
        Args: {
          user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      task_status: 'todo' | 'in_progress' | 'completed' | 'archived'
      task_priority: 'low' | 'medium' | 'high'
      task_complexity: 'simple' | 'medium' | 'complex'
      contact_priority: 'low' | 'normal' | 'high' | 'vip'
      interaction_type: 'call' | 'meeting' | 'email' | 'social' | 'task' | 'note'
      follow_up_status: 'pending' | 'completed' | 'snoozed' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
