'use client'

import { useState } from 'react'
import { Rule } from '@/types'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, ToggleLeft, ToggleRight, Clock, Tag, Pencil } from 'lucide-react'

interface RulesManagerProps {
  rules: Rule[]
  familyId: string
  onRulesChange: (rules: Rule[]) => void
}

export default function RulesManager({ rules, familyId, onRulesChange }: RulesManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<'url_pattern' | 'category' | 'schedule'>('url_pattern')
  const [pattern, setPattern] = useState('')
  const [action, setAction] = useState<'block' | 'allow' | 'limit'>('block')
  const [limitDuration, setLimitDuration] = useState<number | undefined>()
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [scheduleDays, setScheduleDays] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const ruleData = {
      family_id: familyId,
      name,
      type,
      pattern,
      action,
      limit_duration_minutes: limitDuration,
      schedule_start: scheduleStart || null,
      schedule_end: scheduleEnd || null,
      schedule_days: scheduleDays.length > 0 ? scheduleDays : null,
      is_active: true,
    }

    let result
    if (editingRule) {
      result = await supabase.from('rules').update(ruleData as any).eq('id', editingRule.id)
    } else {
      result = await supabase.from('rules').insert(ruleData as any)
    }

    if (result.error) {
      alert('Error saving rule: ' + result.error.message)
    } else {
      setShowForm(false)
      setEditingRule(null)
      resetForm()
      // Refresh rules
      const { data } = await supabase.from('rules').select('*').eq('family_id', familyId).order('created_at', { ascending: false })
      if (data) onRulesChange(data as Rule[])
    }

    setLoading(false)
  }

  const toggleRule = async (rule: Rule) => {
    await supabase.from('rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    const { data } = await supabase.from('rules').select('*').eq('family_id', familyId).order('created_at', { ascending: false })
    if (data) onRulesChange(data as Rule[])
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await supabase.from('rules').delete().eq('id', id)
    const { data } = await supabase.from('rules').select('*').eq('family_id', familyId).order('created_at', { ascending: false })
    if (data) onRulesChange(data as Rule[])
  }

  const resetForm = () => {
    setName('')
    setType('url_pattern')
    setPattern('')
    setAction('block')
    setLimitDuration(undefined)
    setScheduleStart('')
    setScheduleEnd('')
    setScheduleDays([])
  }

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule)
    setName(rule.name)
    setType(rule.type)
    setPattern(rule.pattern)
    setAction(rule.action)
    setLimitDuration(rule.limit_duration_minutes || undefined)
    setScheduleStart(rule.schedule_start || '')
    setScheduleEnd(rule.schedule_end || '')
    setScheduleDays(rule.schedule_days || [])
    setShowForm(true)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Rules & Restrictions</h2>
        <button
          onClick={() => { setShowForm(true); setEditingRule(null); resetForm() }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6 border">
          <h3 className="text-lg font-medium mb-4">{editingRule ? 'Edit Rule' : 'Create New Rule'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Block social media after bedtime"
                required
                className="w-full border-gray-300 rounded-md"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full border-gray-300 rounded-md"
              >
                <option value="url_pattern">URL Pattern</option>
                <option value="category">Category</option>
                <option value="schedule">Schedule</option>
              </select>
            </div>

            {/* Pattern field */}
            {type === 'url_pattern' && (
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Pattern (use * as wildcard)
                </label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="*facebook.com*, *tiktok.com/*"
                  required
                  className="w-full border-gray-300 rounded-md"
                />
                <small className="text-gray-500">Examples: *tiktok.com*, *youtube.com/watch*</small>
              </div>
            )}

            {type === 'category' && (
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  required
                  className="w-full border-gray-300 rounded-md"
                >
                  <option value="">Select category</option>
                  <option value="social">Social Media</option>
                  <option value="gaming">Gaming</option>
                  <option value="video">Video/Youtube</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="shopping">Shopping</option>
                </select>
              </div>
            )}

            {type === 'schedule' && (
              <>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Days</label>
                  <div className="flex gap-1">
                    {['S','M','T','W','T','F','S'].map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setScheduleDays(prev =>
                            prev.includes(idx)
                              ? prev.filter(d => d !== idx)
                              : [...prev, idx]
                          )
                        }}
                        className={`w-8 h-8 rounded-full text-sm ${
                          scheduleDays.includes(idx)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <small className="text-gray-500">Leave all unchecked for every day</small>
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Range (24h format)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className="border-gray-300 rounded-md"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className="border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                className="w-full border-gray-300 rounded-md"
              >
                <option value="block">Block</option>
                <option value="allow">Allow Only</option>
                <option value="limit">Limit Duration</option>
              </select>
            </div>

            {action === 'limit' && (
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Limit (minutes)</label>
                <input
                  type="number"
                  value={limitDuration || ''}
                  onChange={(e) => setLimitDuration(Number(e.target.value))}
                  min="1"
                  required
                  className="w-full border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Rule'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingRule(null); resetForm() }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No rules created yet. Add a rule to start managing access.</p>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className={`p-4 rounded-lg border ${
                rule.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      rule.action === 'block' ? 'bg-red-100 text-red-800' :
                      rule.action === 'allow' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rule.action}
                    </span>
                    {!rule.is_active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <Tag size={14} />
                      <span>
                        {rule.type === 'url_pattern' && (
                          <>Pattern: <code className="bg-gray-100 px-1 rounded">{rule.pattern}</code></>
                        )}
                        {rule.type === 'category' && <>Category: <span className="capitalize">{rule.pattern}</span></>}
                        {rule.type === 'schedule' && (
                          <>Schedule:{' '}
                            {rule.schedule_start && `${rule.schedule_start}–${rule.schedule_end}`}
                            {!rule.schedule_start && 'All day'}
                            {rule.schedule_days && rule.schedule_days.length > 0 && (
                              <> ({rule.schedule_days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')})</>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    {rule.limit_duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>Limit: {rule.limit_duration_minutes} minutes</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleRule(rule)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.is_active ? <ToggleRight className="text-green-600" size={20} /> : <ToggleLeft className="text-gray-400" size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title="Edit rule"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    title="Delete rule"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
