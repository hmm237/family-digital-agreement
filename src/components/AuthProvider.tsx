'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

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
  const fetchingRef = useRef(false)



  const fetchFamily = useCallback(async (userId: string): Promise<FamilyWithMembersDB | null> => {
    try {
      console.log('[fetchFamily] Fetching family for user:', userId)

      // Optimize: Fetch family_id and the family details in one go if possible, 
      // but let's stick to a robust two-step for now but with better error handling
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', userId)
        .maybeSingle()

      if (userError) {
        console.error('[fetchFamily] User lookup error:', userError)
        return null
      }

      if (!userData?.family_id) {
        console.log('[fetchFamily] No family_id found for user')
        return null
      }

      const { data: family, error: familyError } = await supabase
        .from('families')
        .select(`
          *,
          members:users(*)
        `)
        .eq('id', userData.family_id)
        .maybeSingle()

      if (familyError) {
        console.error('[fetchFamily] Family lookup error:', familyError)
        return null
      }

      return family as FamilyWithMembersDB
    } catch (err) {
      console.error('[fetchFamily] Exception:', err)
      return null
    }
  }, [])


  useEffect(() => {
    const initAuth = async () => {
      // Safety timeout: 8 seconds max for initial load
      const timer = setTimeout(() => {
        setLoading(false)
        console.warn('[AuthProvider] Initialization timed out')
      }, 8000)

      try {
        console.log('[AuthProvider] Initializing auth...')
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.error('[AuthProvider] getUser error:', error)
        }

        if (user && !fetchingRef.current) {
          fetchingRef.current = true
          const family = await fetchFamily(user.id)
          setAuthState({
            user: user as unknown as User,
            family: family as FamilyWithMembers | null,
            isAuthenticated: true,
          })
          fetchingRef.current = false
        } else if (!user) {
          setAuthState({
            user: null,
            family: null,
            isAuthenticated: false,
          })
        }
      } catch (err) {
        console.error('[AuthProvider] Init error:', err)
        fetchingRef.current = false
      } finally {
        clearTimeout(timer)
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Auth state change:', event)
        if (fetchingRef.current) return

        try {
          if (session?.user) {
            fetchingRef.current = true
            const family = await fetchFamily(session.user.id)
            setAuthState({
              user: session.user as unknown as User,
              family: family as FamilyWithMembers | null,
              isAuthenticated: true,
            })
            fetchingRef.current = false
          } else {
            setAuthState({
              user: null,
              family: null,
              isAuthenticated: false,
            })
          }
        } finally {
          setLoading(false)
        }
      }
    )


    return () => subscription.unsubscribe()

  }, [fetchFamily])

  return (
    <AuthContext.Provider value={authState}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Family Hub...</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 text-sm text-indigo-600 hover:underline"
          >
            Taking too long? Click to refresh
          </button>
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
