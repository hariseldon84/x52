// This will be synced with the web app's database types
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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          completed: boolean
          complexity: "simple" | "medium" | "complex"
          xp_earned: number | null
          priority: "low" | "medium" | "high"
          due_date: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          goal_id: string | null
          project_id: string | null
          contact_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          completed?: boolean
          complexity?: "simple" | "medium" | "complex"
          xp_earned?: number | null
          priority?: "low" | "medium" | "high"
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          goal_id?: string | null
          project_id?: string | null
          contact_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          complexity?: "simple" | "medium" | "complex"
          xp_earned?: number | null
          priority?: "low" | "medium" | "high"
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          goal_id?: string | null
          project_id?: string | null
          contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "goals"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          completed: boolean
          target_date: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          category: string | null
          priority: "low" | "medium" | "high"
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          completed?: boolean
          target_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          category?: string | null
          priority?: "low" | "medium" | "high"
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          target_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          category?: string | null
          priority?: "low" | "medium" | "high"
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
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          job_title: string | null
          category: string | null
          priority: "low" | "medium" | "high" | "vip"
          notes: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          job_title?: string | null
          category?: string | null
          priority?: "low" | "medium" | "high" | "vip"
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          job_title?: string | null
          category?: string | null
          priority?: "low" | "medium" | "high" | "vip"
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
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
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          unlocked_at: string
          progress: number
          completed: boolean
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          unlocked_at?: string
          progress?: number
          completed?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          unlocked_at?: string
          progress?: number
          completed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
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
      get_user_level: {
        Args: {
          user_id: string
        }
        Returns: number
      }
      calculate_productivity_score: {
        Args: {
          p_user_id: string
          p_date?: string
        }
        Returns: number
      }
      calculate_wellness_score: {
        Args: {
          p_user_id: string
          p_date?: string
        }
        Returns: number
      }
    }
    Enums: {
      task_complexity: "simple" | "medium" | "complex"
      priority_level: "low" | "medium" | "high" | "vip"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}