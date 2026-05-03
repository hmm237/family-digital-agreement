'use client'

import { useState } from 'react'
import { Goal, Visit, User } from '@/types'
import { supabase } from '@/lib/supabase'
import { Plus, Target, Clock, CheckCircle, XCircle } from 'lucide-react'

interface GoalsTrackerProps {
  goals: Goal[]
  familyId: string
  userId?: string
  isParent: boolean
  visits: Visit[]
  familyMembers: User[]
}

export default function GoalsTracker({ goals, familyId, userId, isParent, visits, familyMembers }: GoalsTrackerProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetValue, setTargetValue] = useState(120) // Default to 120 mins
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const [assignedUserId, setAssignedUserId] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const now = new Date()
    const periodStart = startOfDay(now)
    const periodEnd = period === 'daily'
      ? endOfDay(now)
      : endOfDay(new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)) // 7 days from now

    const { error } = await supabase.from('goals').insert({
      family_id: familyId,
      user_id: assignedUserId === 'all' ? null : assignedUserId,
      title,
      description,
      type: 'daily_screen_time',
      target_value: targetValue,
      current_value: 0,
      unit: 'minutes',
      period,
      status: 'active',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    })

    if (error) {
      alert('Error creating allowance: ' + error.message)
    } else {
      setShowForm(false)
      window.location.reload() // Refresh to show new allowance
    }

    setLoading(false)
  }

  const completeGoal = async (goalId: string) => {
    await supabase.from('goals').update({ status: 'completed' }).eq('id', goalId)
    window.location.reload()
  }

  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-gray-400" size={20} />
      case 'missed':
        return <XCircle className="text-red-600" size={20} />
      default:
        return <Target className="text-indigo-600" size={20} />
    }
  }

  const calculateUsage = (goal: Goal) => {
    const start = new Date(goal.period_start).getTime()
    const end = new Date(goal.period_end).getTime()

    const relevantVisits = visits.filter(v => {
      const vTime = new Date(v.visited_at).getTime()
      if (vTime < start || vTime > end) return false
      if (goal.user_id && v.user_id !== goal.user_id) return false
      return true
    })

    const totalMs = relevantVisits.reduce((sum, v) => sum + v.duration_ms, 0)
    return Math.round(totalMs / 1000 / 60) // in minutes
  }

  const getProgressPercent = (goal: Goal, usage: number) => {
    return Math.min(100, Math.round((usage / goal.target_value) * 100))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Screen Time Allowance</h2>
          <p className="text-sm text-gray-600">Set daily or weekly screen time quotas</p>
        </div>
        {isParent && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold shadow-md"
          >
            <Plus size={16} />
            Set Daily/Weekly Limit
          </button>

        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6 border">
          <h3 className="text-lg font-bold mb-4">Set Screen Time Limit</h3>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Daily Limit"
                required
                className="w-full border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full border-gray-300 rounded-md"
              >
                <option value="all">All family members</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Limit (Minutes)</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                min="1"
                required
                className="w-full border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full border-gray-300 rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details"
                className="w-full border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Quota'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Grid */}
      {goals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500">No screen time quotas set yet. Create one to monitor limits!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const usage = calculateUsage(goal)
            const isExceeded = usage > goal.target_value
            const memberAssigned = goal.user_id ? familyMembers.find(m => m.id === goal.user_id)?.name : "All Members"

            return (
            <div key={goal.id} className={`border rounded-lg p-4 shadow-sm ${isExceeded ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(goal.status)}
                  <h4 className="font-medium">{goal.title}</h4>
                </div>
                {goal.status === 'active' && isParent && (
                  <button
                    onClick={() => completeGoal(goal.id)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Archive
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
              <p className="text-sm font-semibold text-indigo-800 mb-2">Assigned to: {memberAssigned}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Screen Time ({goal.period})</span>
                  <span className={`font-medium ${isExceeded ? 'text-red-600' : ''}`}>
                    {usage} / {goal.target_value} {goal.unit}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      isExceeded ? 'bg-red-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${getProgressPercent(goal, usage)}%` }}
                  ></div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  {goal.period === 'daily' ? 'Today' : 'This week'} • {isExceeded ? <span className="text-red-600 font-bold">Limit Exceeded</span> : <span className="text-green-600">On Track</span>}
                </p>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
