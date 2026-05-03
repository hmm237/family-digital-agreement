'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, FamilyWithMembers, AuthState } from '@/types'
import { supabase } from '@/lib/supabase'

interface UserWithFamilyId {
  id: string
  family_id: string | null
}

interface FamilyWithMembersDB {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
  members: Array<{
    id: string
    email: string
    name: string
    role: 'parent' | 'child'
    family_id: string | null
    created_at: string
    updated_at: string
  }>
}

const AuthContext = createContext<AuthState>({
  user: null,
  family: null,
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    family: null,
    isAuthenticated: false,
  })
  const [loading, setLoading] = useState(true)

  const fetchFamily = useCallback(async (userId: string): Promise<FamilyWithMembersDB | null> => {
    try {
      console.log('[fetchFamily] Fetching family for user:', userId)

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('[fetchFamily] Error fetching user family:', userError)
        return null
      }

      if (!userData || !userData.family_id) {
        console.log('[fetchFamily] User has no family_id')
        return null
      }

      console.log('[fetchFamily] Found family_id:', userData.family_id)

      const { data: family, error: familyError } = await supabase
        .from('families')
        .select(`
          *,
          members:users(id, email, name, role, family_id, created_at, updated_at)
        `)
        .eq('id', userData.family_id)
        .single()

      if (familyError) {
        console.error('[fetchFamily] Error fetching family:', familyError)
        return null
      }

      if (!family) {
        console.log('[fetchFamily] Family not found')
        return null
      }

      console.log('[fetchFamily] Family found:', family.name, 'with', family.members?.length || 0, 'members')
      return family as FamilyWithMembersDB
    } catch (err) {
      console.error('[fetchFamily] Unexpected error:', err)
      return null
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth...')
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.error('[AuthProvider] getUser error:', error)
        }

        if (user) {
          console.log('[AuthProvider] User found:', user.email)
          const family = await fetchFamily(user.id)
          setAuthState({
            user: user as unknown as User,
            family: family as FamilyWithMembers | null,
            isAuthenticated: true,
          })
        } else {
          console.log('[AuthProvider] No user, setting unauthenticated')
          setAuthState({
            user: null,
            family: null,
            isAuthenticated: false,
          })
        }
      } catch (err) {
        console.error('[AuthProvider] Init error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Auth state change:', event, session?.user?.email)
        if (session?.user) {
          const family = await fetchFamily(session.user.id)
          setAuthState({
            user: session.user as unknown as User,
            family: family as FamilyWithMembers | null,
            isAuthenticated: true,
          })
        } else {
          setAuthState({
            user: null,
            family: null,
            isAuthenticated: false,
          })
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchFamily])

  return (
    <AuthContext.Provider value={authState}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { supabase }
