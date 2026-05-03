'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Visit, Rule, Goal } from '@/types'
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import HistoryTable from '@/components/HistoryTable'
import AnalyticsCharts from '@/components/AnalyticsCharts'
import RulesManager from '@/components/RulesManager'
import GoalsTracker from '@/components/GoalsTracker'
import ExportMenu from '@/components/ExportMenu'
import Link from 'next/link'
import { User, Download, BarChart3, Shield, Target, LogOut, AlertTriangle } from 'lucide-react'

type Tab = 'history' | 'analytics' | 'rules' | 'goals'

export default function DashboardPage() {
  const router = useRouter()
  const { user, family, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('history')
  const [visits, setVisits] = useState<Visit[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d')
  const [selectedUser, setSelectedUser] = useState<string>('all')

  const isParent = user?.role === 'parent'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Use window.location.href for a full page refresh to clear all states
    window.location.href = '/login'
  }

  const fetchData = useCallback(async () => {
    if (!family) return

    setLoading(true)

    try {
      const now = new Date()
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const startDate = startOfDay(subDays(now, daysAgo))
      const endDate = endOfDay(now)

      let query = supabase
        .from('visits')
        .select('*')
        .eq('family_id', family.id)
        .gte('visited_at', startDate.toISOString())
        .lte('visited_at', endDate.toISOString())
        .order('visited_at', { ascending: false })

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser)
      }

      const { data: visitsData, error: visitsError } = await query
      if (visitsError) console.error('Error fetching visits:', visitsError)
      if (visitsData) setVisits(visitsData as Visit[])

      if (isParent) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('rules')
          .select('*')
          .eq('family_id', family.id)
          .order('created_at', { ascending: false })
        if (rulesError) console.error('Error fetching rules:', rulesError)
        if (rulesData) setRules(rulesData as Rule[])
      }

      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('family_id', family.id)
        .gte('period_end', startDate.toISOString())
        .order('period_end', { ascending: true })
      
      if (goalsError) console.error('Error fetching goals:', goalsError)

      if (goalsData) {
        setGoals((goalsData as Goal[]).filter(g =>
          isWithinInterval(new Date(g.period_start), { start: startDate, end: endDate }) ||
          isWithinInterval(new Date(g.period_end), { start: startDate, end: endDate })
        ))
      }
    } catch (err) {
      console.error('Unexpected error in fetchData:', err)
    } finally {
      setLoading(false)
    }
  }, [family, dateRange, selectedUser, isParent])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  // Real-time subscription for new visits
  useEffect(() => {
    if (!family) return

    const channel = supabase
      .channel('visits-updates')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visits',
          filter: `family_id=eq.${family.id}`,
        },
        (payload) => {
          setVisits((prev) => [payload.new as Visit, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [family])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Please log in</h1>
          <p className="text-gray-600">You need to be logged in to view the dashboard.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (isAuthenticated && !family) {
      router.replace('/family/setup')
    }
  }, [isAuthenticated, family, router])

  if (!family) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'history', label: 'History', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(isParent ? [{ id: 'rules', label: 'Rules', icon: Shield } as const] : []),
    { id: 'goals', label: 'Screen Time', icon: Target },
  ]

  // Calculate exceeded quotas for global alert
  const getExceededQuotas = () => {
    const exceeded: { memberName: string, title: string, usage: number, target: number }[] = []
    
    goals.filter(g => g.type === 'daily_screen_time' && g.status === 'active').forEach(goal => {
      const start = new Date(goal.period_start).getTime()
      const end = new Date(goal.period_end).getTime()

      const relevantVisits = visits.filter(v => {
        const vTime = new Date(v.visited_at).getTime()
        if (vTime < start || vTime > end) return false
        if (goal.user_id && v.user_id !== goal.user_id) return false
        return true
      })

      const totalMs = relevantVisits.reduce((sum, v) => sum + v.duration_ms, 0)
      const usageMinutes = Math.round(totalMs / 1000 / 60)
      
      if (usageMinutes > goal.target_value) {
        const memberAssigned = goal.user_id ? family?.members?.find(m => m.id === goal.user_id)?.name : "All Members"
        exceeded.push({
          memberName: memberAssigned || "Unknown",
          title: goal.title,
          usage: usageMinutes,
          target: goal.target_value
        })
      }
    })
    
    return exceeded
  }
  
  const exceededQuotas = getExceededQuotas()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Digital Agreement</h1>
            <div className="text-gray-600 mt-1 flex flex-col">
              <span>Welcome, <span className="font-bold text-gray-900">{family?.members?.find(m => m.id === user?.id)?.name || (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.email}</span>!</span>
              <span className="mt-1">Family: <span className="font-bold text-gray-900">{family?.name}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <User size={16} />
              Extension Setup
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {exceededQuotas.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Screen Time Allowance Exceeded!</h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {exceededQuotas.map((eq, idx) => (
                      <li key={idx}>
                        <strong>{eq.memberName}</strong> has exceeded the quota "{eq.title}" ({eq.usage} / {eq.target} minutes).
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date range:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="border-gray-300 rounded-md shadow-sm text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">User:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm text-sm"
              >
                <option value="all">All family members</option>
                {family?.members?.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto">
              <ExportMenu visits={visits} />
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'history' && (
                <HistoryTable visits={visits} onRefresh={fetchData} familyMembers={family?.members || []} />
              )}
              {activeTab === 'analytics' && (
                <div className="p-6">
                  <AnalyticsCharts visits={visits} dateRange={dateRange} />
                </div>
              )}
              {activeTab === 'rules' && isParent && (
                <RulesManager rules={rules} familyId={family.id} onRulesChange={setRules} />
              )}
              {activeTab === 'goals' && (
                <GoalsTracker 
                  goals={goals} 
                  familyId={family.id} 
                  userId={user?.id} 
                  isParent={isParent}
                  visits={visits}
                  familyMembers={family.members || []}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
