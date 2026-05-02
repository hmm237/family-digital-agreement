'use client'

import { useState } from 'react'
import { Goal } from '@/types'
import { supabase } from '@/lib/supabase'
import { Plus, Target, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react'

interface GoalsTrackerProps {
  goals: Goal[]
  familyId: string
  userId?: string
  isParent: boolean
}

export default function GoalsTracker({ goals, familyId, userId, isParent }: GoalsTrackerProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<Goal['type']>('daily_screen_time')
  const [targetValue, setTargetValue] = useState(60)
  const [unit, setUnit] = useState('minutes')
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const [reward, setReward] = useState('')
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
      user_id: userId || null,
      title,
      description,
      type,
      target_value: targetValue,
      current_value: 0,
      unit,
      period,
      status: 'active',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      reward: reward || null,
    })

    if (error) {
      alert('Error creating goal: ' + error.message)
    } else {
      setShowForm(false)
      window.location.reload() // Refresh to show new goal
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
        return <CheckCircle className="text-green-600" size={20} />
      case 'missed':
        return <XCircle className="text-red-600" size={20} />
      default:
        return <Target className="text-indigo-600" size={20} />
    }
  }

  const getProgressPercent = (goal: Goal) => {
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  }

  const formatTypeLabel = (type: Goal['type']) => {
    const labels: Record<string, string> = {
      daily_screen_time: 'Daily Screen Time',
      category_limit: 'Category Limit',
      site_limit: 'Site Limit',
      bedtime: 'Bedtime',
    }
    return labels[type] || type
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Goals & Rewards</h2>
          <p className="text-sm text-gray-600">Set targets and track progress</p>
        </div>
        {isParent && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus size={16} />
            Create Goal
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6 border">
          <h3 className="text-lg font-medium mb-4">Create New Goal</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Limit social media to 1 hour"
                required
                className="w-full border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full border-gray-300 rounded-md"
              >
                <option value="daily_screen_time">Daily Screen Time</option>
                <option value="category_limit">Category Limit</option>
                <option value="site_limit">Site Limit</option>
                <option value="bedtime">Bedtime</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="minutes, visits, etc."
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reward (optional)</label>
              <input
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g., Extra 30 min screen time"
                className="w-full border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details about the goal"
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
              {loading ? 'Creating...' : 'Create Goal'}
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

      {/* Goals grid */}
      {goals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target className="mx-auto text-gray-400 mb-2" size={48} />
          <p className="text-gray-500">No goals set yet. Create one to start tracking progress!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <div key={goal.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(goal.status)}
                  <h4 className="font-medium">{goal.title}</h4>
                </div>
                {goal.status === 'active' && isParent && (
                  <button
                    onClick={() => completeGoal(goal.id)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Mark Complete
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">{goal.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{formatTypeLabel(goal.type)}</span>
                  <span className="font-medium">
                    {Math.round(goal.current_value)} / {goal.target_value} {goal.unit}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      getProgressPercent(goal) >= 100 ? 'bg-green-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${getProgressPercent(goal)}%` }}
                  ></div>
                </div>

                <p className="text-xs text-gray-500">
                  {goal.period === 'daily' ? 'Today' : 'This week'} • {goal.status}
                </p>

                {goal.reward && (
                  <div className="flex items-center gap-1 text-sm text-amber-600 mt-2">
                    <Trophy size={16} />
                    <span>{goal.reward}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
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
