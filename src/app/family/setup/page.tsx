'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Home, Users, Check, AlertCircle } from 'lucide-react'

export default function FamilySetupPage() {
  const router = useRouter()
  const { user, family, isAuthenticated } = useAuth()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [familyName, setFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (family) {
      router.push('/dashboard')
    } else if (!isAuthenticated) {
      router.push('/login')
    }
  }, [family, isAuthenticated, router])

  if (family || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    console.log('[FamilySetup] Creating family:', familyName, 'user:', user?.id)

    if (!familyName.trim()) {
      setError('Family name is required')
      setLoading(false)
      return
    }

    if (!user?.id) {
      setError('User not authenticated. Please log in again.')
      setLoading(false)
      return
    }

    // Create family
    const { data: newFamily, error: createError } = await supabase
      .from('families')
      .insert({ name: familyName, created_by: user.id })
      .select()
      .single()

    console.log('[FamilySetup] Insert result:', { newFamily, createError })

    if (createError) {
      console.error('[FamilySetup] Create error:', createError)
      setError('Failed to create family: ' + (createError.message || JSON.stringify(createError)))
      setLoading(false)
      return
    }

    // Update user's family_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ family_id: newFamily.id })
      .eq('id', user.id)

    console.log('[FamilySetup] Update user result:', { updateError })

    if (updateError) {
      console.error('[FamilySetup] Update error:', updateError)
      setError('Family created but failed to add user: ' + (updateError.message || JSON.stringify(updateError)))
      setLoading(false)
      return
    }

    console.log('[FamilySetup] Success, redirecting to dashboard')
    router.push('/dashboard')
  }


  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!joinCode.trim()) {
      setError('Join code is required')
      setLoading(false)
      return
    }

    // Look up family by name/code (using simple name match for now)
    const { data: families, error: lookupError } = await supabase
      .from('families')
      .select('*')
      .eq('name', joinCode.trim())

    if (lookupError || !families || families.length === 0) {
      setError('Family not found. Check the code and try again.')
      setLoading(false)
      return
    }

    const targetFamily = families[0]

    // Check if family already has a parent (optional, but we allow multiple parents)
    // Just add user to family

    const { error: updateError } = await supabase
      .from('users')
      .update({ family_id: targetFamily.id })
      .eq('id', user!.id)

    if (updateError) {
      setError('Failed to join family: ' + updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Family Digital Agreement</h1>
          <p className="mt-2 text-gray-600">
            Let&apos;s set up your family so everyone can stay on the same page.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Mode selector */}
        <div className="flex rounded-lg shadow-sm mb-6">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-l-lg border ${
              mode === 'create'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Home size={16} className="inline mr-2" />
            Create Family
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg border ${
              mode === 'join'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Join Family
          </button>
        </div>

        {/* Create form */}
        {mode === 'create' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Create Your Family</h2>
            <p className="text-sm text-gray-600 mb-4">
              As a parent, you&apos;ll create a family group and can invite children to join.
            </p>
            <form onSubmit={handleCreateFamily}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g., The Smiths"
                  required
                  className="w-full border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating...' : <>Create Family <Check size={16} /></>}
              </button>
            </form>
          </div>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Join a Family</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the family code provided by your parent or guardian.
            </p>
            <form onSubmit={handleJoinFamily}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g., SmithFamily"
                  required
                  className="w-full border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Joining...' : <>Join Family <Check size={16} /></>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
