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
import { Download, BarChart3, Shield, Target, User } from 'lucide-react'

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

  const fetchData = useCallback(async () => {
    if (!family) return

    setLoading(true)

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

    const { data: visitsData } = await query
    if (visitsData) setVisits(visitsData as Visit[])

    if (isParent) {
      const { data: rulesData } = await supabase
        .from('rules')
        .select('*')
        .eq('family_id', family.id)
        .order('created_at', { ascending: false })
      if (rulesData) setRules(rulesData as Rule[])
    }

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('family_id', family.id)
      .gte('period_end', startDate.toISOString())
      .order('period_end', { ascending: true })

    if (goalsData) {
      setGoals((goalsData as Goal[]).filter(g =>
        isWithinInterval(new Date(g.period_start), { start: startDate, end: endDate }) ||
        isWithinInterval(new Date(g.period_end), { start: startDate, end: endDate })
      ))
    }

    setLoading(false)
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

  if (!family) {
    router.push('/family/setup')
    return null
  }

  const tabs = [
    { id: 'history', label: 'History', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(isParent ? [{ id: 'rules', label: 'Rules', icon: Shield } as const] : []),
    { id: 'goals', label: 'Goals', icon: Target },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Family Digital Agreement</h1>
          <p className="text-gray-600 mt-1">
            Welcome, {user?.name}! Family: {family?.name}
          </p>
        </div>

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
                <GoalsTracker goals={goals} familyId={family.id} userId={user?.id} isParent={isParent} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
