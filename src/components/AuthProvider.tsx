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
    const { data: userData, error } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', userId)
      .single()

    if (error || !userData) return null
    const userRow = userData as UserWithFamilyId
    if (!userRow.family_id) return null

    const { data: family, error: familyError } = await supabase
      .from('families')
      .select(`
        *,
        members:users(id, email, name, role, family_id, created_at, updated_at)
      `)
      .eq('id', userRow.family_id)
      .single()

    if (familyError || !family) return null
    return family as FamilyWithMembersDB
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const family = await fetchFamily(user.id)
        setAuthState({
          user: user as unknown as User,
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

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      {!loading && children}
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
