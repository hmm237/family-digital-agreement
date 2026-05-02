export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'parent' | 'child'
          family_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'parent' | 'child'
          family_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'parent' | 'child'
          family_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          user_id: string
          family_id: string
          url: string
          domain: string
          title: string
          duration_ms: number
          visited_at: string
          category: 'social' | 'gaming' | 'video' | 'education' | 'search' | 'news' | 'shopping' | 'entertainment' | 'productivity' | 'communication' | 'uncategorized'
          was_blocked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          family_id: string
          url: string
          domain: string
          title: string
          duration_ms: number
          visited_at: string
          category: 'social' | 'gaming' | 'video' | 'education' | 'search' | 'news' | 'shopping' | 'entertainment' | 'productivity' | 'communication' | 'uncategorized'
          was_blocked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          family_id?: string
          url?: string
          domain?: string
          title?: string
          duration_ms?: number
          visited_at?: string
          category?: 'social' | 'gaming' | 'video' | 'education' | 'search' | 'news' | 'shopping' | 'entertainment' | 'productivity' | 'communication' | 'uncategorized'
          was_blocked?: boolean
          created_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          family_id: string
          name: string
          type: 'url_pattern' | 'category' | 'schedule'
          pattern: string
          action: 'block' | 'allow' | 'limit'
          limit_duration_minutes: number | null
          schedule_start: string | null
          schedule_end: string | null
          schedule_days: number[] | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          type: 'url_pattern' | 'category' | 'schedule'
          pattern: string
          action: 'block' | 'allow' | 'limit'
          limit_duration_minutes?: number | null
          schedule_start?: string | null
          schedule_end?: string | null
          schedule_days?: number[] | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          type?: 'url_pattern' | 'category' | 'schedule'
          pattern?: string
          action?: 'block' | 'allow' | 'limit'
          limit_duration_minutes?: number | null
          schedule_start?: string | null
          schedule_end?: string | null
          schedule_days?: number[] | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          family_id: string
          user_id: string | null
          title: string
          description: string
          type: 'daily_screen_time' | 'category_limit' | 'site_limit' | 'bedtime'
          target_value: number
          current_value: number
          unit: string
          period: 'daily' | 'weekly'
          status: 'active' | 'completed' | 'missed'
          period_start: string
          period_end: string
          reward: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id?: string | null
          title: string
          description: string
          type: 'daily_screen_time' | 'category_limit' | 'site_limit' | 'bedtime'
          target_value: number
          current_value?: number
          unit: string
          period: 'daily' | 'weekly'
          status?: 'active' | 'completed' | 'missed'
          period_start: string
          period_end: string
          reward?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string | null
          title?: string
          description?: string
          type?: 'daily_screen_time' | 'category_limit' | 'site_limit' | 'bedtime'
          target_value?: number
          current_value?: number
          unit?: string
          period?: 'daily' | 'weekly'
          status?: 'active' | 'completed' | 'missed'
          period_start?: string
          period_end?: string
          reward?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      visit_category: 'social' | 'gaming' | 'video' | 'education' | 'search' | 'news' | 'shopping' | 'entertainment' | 'productivity' | 'communication' | 'uncategorized'
      user_role: 'parent' | 'child'
      rule_type: 'url_pattern' | 'category' | 'schedule'
      rule_action: 'block' | 'allow' | 'limit'
      goal_type: 'daily_screen_time' | 'category_limit' | 'site_limit' | 'bedtime'
      goal_period: 'daily' | 'weekly'
      goal_status: 'active' | 'completed' | 'missed'
    }
  }
}
