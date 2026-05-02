export interface User {
  id: string
  email: string
  name: string
  role: 'parent' | 'child'
  family_id: string | null
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  user_id: string
  family_id: string
  url: string
  domain: string
  title: string
  duration_ms: number
  visited_at: string
  category: VisitCategory
  was_blocked: boolean
  created_at: string
}

export type VisitCategory =
  | 'social'
  | 'gaming'
  | 'video'
  | 'education'
  | 'search'
  | 'news'
  | 'shopping'
  | 'entertainment'
  | 'productivity'
  | 'communication'
  | 'uncategorized'

export interface Rule {
  id: string
  family_id: string
  name: string
  type: 'url_pattern' | 'category' | 'schedule'
  pattern: string
  action: 'block' | 'allow' | 'limit'
  limit_duration_minutes?: number
  schedule_start?: string // HH:MM format
  schedule_end?: string
  schedule_days?: number[] // 0-6, Sunday=0
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  family_id: string
  user_id: string | null // null = family-wide goal
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

export interface FamilyWithMembers extends Family {
  members: User[]
}

export type AuthState = {
  user: User | null
  family: FamilyWithMembers | null
  isAuthenticated: boolean
}
