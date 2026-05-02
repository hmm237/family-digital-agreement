'use client'

import { useMemo } from 'react'
import { Visit } from '@/types'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsChartsProps {
  visits: Visit[]
  dateRange: '7d' | '30d' | '90d'
}

export default function AnalyticsCharts({ visits, dateRange }: AnalyticsChartsProps) {
  // Category distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    visits.forEach(v => {
      counts[v.category] = (counts[v.category] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [visits])

  // Daily duration
  const dailyData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const data: Record<string, number> = {}

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      data[key] = 0
    }

    visits.forEach(v => {
      const d = new Date(v.visited_at)
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      if (data.hasOwnProperty(key)) {
        data[key] += v.duration_ms / 1000 / 60 // Convert to minutes
      }
    })

    return Object.entries(data).map(([date, minutes]) => ({ date, minutes: Math.round(minutes) }))
  }, [visits, dateRange])

  // Top domains
  const topDomains = useMemo(() => {
    const counts: Record<string, number> = {}
    visits.forEach(v => {
      counts[v.domain] = (counts[v.domain] || 0) + 1
    })
    return Object.entries(counts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [visits])

  // Hour of day heatmap
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    return hours.map(hour => {
      const count = visits.filter(v => {
        const d = new Date(v.visited_at)
        return d.getHours() === hour
      }).length
      return { hour: `${hour}:00`, count }
    })
  }, [visits])

  const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  ]

  const totalVisits = visits.length
  const totalTime = visits.reduce((sum, v) => sum + v.duration_ms, 0) / 1000 / 60
  const avgDuration = totalVisits > 0 ? (totalTime / totalVisits) * 60 : 0

  return (
    <div className="p-6 space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-sm text-indigo-600 font-medium">Total Visits</div>
          <div className="text-3xl font-bold text-indigo-900">{totalVisits}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Total Screen Time</div>
          <div className="text-3xl font-bold text-green-900">{Math.round(totalTime)} min</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Avg Duration</div>
          <div className="text-3xl font-bold text-purple-900">{Math.round(avgDuration)} sec</div>
        </div>
      </div>

      {/* Category Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Visits by Category</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Usage */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Daily Usage (minutes)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Domains */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top Domains Visited</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDomains} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="domain" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hour of Day */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Activity by Hour of Day</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
