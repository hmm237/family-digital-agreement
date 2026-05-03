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

      if (family) {
        console.log('[fetchFamily] Successfully fetched family:', family.name)
      }
      return family as FamilyWithMembersDB

    } catch (err) {
      console.error('[fetchFamily] Exception:', err)
      return null
    }
  }, [])


  useEffect(() => {
    let mounted = true

    const handleAuthStateChange = async (event: string, session: any) => {
      console.log('[AuthProvider] Event:', event)
      
      if (!session?.user) {
        if (mounted) {
          setAuthState({ user: null, family: null, isAuthenticated: false })
          setLoading(false)
        }
        return
      }

      try {
        const family = await fetchFamily(session.user.id)
        if (mounted) {
          // Find the current user in the family members to get the correct role and name from DB
          const dbUser = family?.members?.find(m => m.id === session.user.id)
          
          setAuthState({
            user: (dbUser || session.user) as unknown as User,
            family: family as FamilyWithMembers | null,
            isAuthenticated: true,
          })
        }

      } catch (err) {
        console.error('[AuthProvider] Fetch error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAuthStateChange('INITIAL', session)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleAuthStateChange(event, session)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
