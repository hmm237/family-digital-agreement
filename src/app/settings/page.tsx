'use client'

import { useAuth } from '@/components/AuthProvider'
import { Copy, Check, User, Users, Link as LinkIcon, ShieldAlert, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, family } = useAuth()
  const [copied, setCopied] = useState<string | null>(null)

  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'parent' | 'child'>('child')
  const [newMemberPin, setNewMemberPin] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [forceTracking, setForceTracking] = useState((family as any)?.force_tracking || false)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!family) return
    setIsAdding(true)
    try {
      const response = await fetch('/api/family/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: family.id,
          name: newMemberName,
          role: newMemberRole,
          pin: newMemberPin,
          parentId: user?.id
        })
      })
      if (response.ok) {
        alert('Member added successfully!')
        setNewMemberName('')
        setNewMemberPin('')
        window.location.reload()
      } else {
        const data = await response.json()
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Failed to add member')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleForceTracking = async () => {
    if (!family) return
    const newValue = !forceTracking
    setForceTracking(newValue)
    try {
      const { error } = await supabase
        .from('families')
        .update({ force_tracking: newValue })
        .eq('id', family.id)
      
      if (error) throw error
    } catch (err) {
      alert('Failed to update tracking settings')
      setForceTracking(!newValue)
    }
  }

  if (!user || !family) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </div>
      </div>
    )
  }

  const fields = [
    { label: 'Family Invite Code', value: (family as any).invite_code || '---', icon: <Users size={16} />, key: 'inviteCode' },
    { label: 'App URL', value: typeof window !== 'undefined' ? window.location.origin : '', icon: <LinkIcon size={16} />, key: 'appUrl' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Extension Setup</h1>
            <p className="text-sm text-gray-600 mt-1">
              Use these details to configure your Chrome extension.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">How to Connect</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Install the extension in your browser.</li>
                <li>Click the extension icon and select <strong>Join Family</strong>.</li>
                <li>Paste the <strong>App URL</strong> and <strong>Invite Code</strong> below.</li>
                <li>Select your name from the list to start tracking.</li>
              </ol>
            </div>

            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="flex items-start gap-3">
                  <div className="mt-2 text-gray-400">{field.icon}</div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={field.value}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono font-bold"
                      />
                      <button
                        onClick={() => copyToClipboard(field.value, field.key)}
                        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1 text-sm"
                      >
                        {copied === field.key ? (
                          <>
                            <Check size={14} className="text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Family Management (Parent Only) */}
        {user.role === 'parent' && (
          <>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Family Settings</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="text-red-500" size={20} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Auto-Track Always On</p>
                      <p className="text-xs text-gray-500">When enabled, the extension cannot be turned off by family members.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleForceTracking}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${forceTracking ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${forceTracking ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Manage Family Members</h2>
                <p className="text-sm text-gray-600">Add children or other family members without needing an email.</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Display Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sam"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as any)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                      >
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN (4 digits)</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Optional for kids, recommended for parents"
                      value={newMemberPin}
                      onChange={(e) => setNewMemberPin(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isAdding ? 'Adding...' : 'Add Family Member'}
                  </button>
                </form>

                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Current Members:</h3>
                  <div className="space-y-2">
                    {(family as any).members?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-gray-500 italic">{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
