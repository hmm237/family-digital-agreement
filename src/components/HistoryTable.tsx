'use client'

import { useState, useMemo } from 'react'
import { Visit } from '@/types'
import { format, parseISO } from 'date-fns'
import { Search, ExternalLink } from 'lucide-react'

interface HistoryTableProps {
  visits: Visit[]
  onRefresh: () => void
  familyMembers: Array<{ id: string; name: string }>
}

export default function HistoryTable({ visits, familyMembers }: HistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const categories = Array.from(new Set(visits.map(v => v.category)))

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      const matchesSearch =
        v.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.title?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [visits, searchTerm, selectedCategory])

  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPages = Math.ceil(filteredVisits.length / pageSize)

  const getUserName = (userId: string) => {
    const member = familyMembers.find(m => m.id === userId)
    return member?.name || 'Unknown'
  }

  const formatDuration = (ms: number) => {
    const secs = Math.round(ms / 1000)
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    const remainder = secs % 60
    return `${mins}m ${remainder}s`
  }

  return (
    <div className="divide-y divide-gray-200">
      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search URLs, domains, titles..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1) }}
          className="border-gray-300 rounded-md text-sm px-3 py-2"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blocked
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedVisits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No visits found matching your filters.
                </td>
              </tr>
            ) : (
              paginatedVisits.map((visit) => (
                <tr key={visit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{format(parseISO(visit.visited_at), 'MMM d, yyyy')}</div>
                    <div>{format(parseISO(visit.visited_at), 'h:mm a')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getUserName(visit.user_id)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <a
                        href={visit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-900 hover:underline flex items-center gap-1 max-w-xs truncate"
                      >
                        <span className="truncate">{visit.title || visit.domain}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-xs" title={visit.url}>
                      {visit.url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CategoryBadge category={visit.category} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(visit.duration_ms)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {visit.was_blocked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Blocked
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredVisits.length)} of {filteredVisits.length} visits
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    social: 'bg-blue-100 text-blue-800',
    gaming: 'bg-purple-100 text-purple-800',
    video: 'bg-red-100 text-red-800',
    education: 'bg-green-100 text-green-800',
    search: 'bg-yellow-100 text-yellow-800',
    news: 'bg-orange-100 text-orange-800',
    shopping: 'bg-pink-100 text-pink-800',
    entertainment: 'bg-indigo-100 text-indigo-800',
    productivity: 'bg-gray-100 text-gray-800',
    communication: 'bg-teal-100 text-teal-800',
    uncategorized: 'bg-gray-100 text-gray-600',
  }

  const className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[category] || colors.uncategorized}`

  return (
    <span className={className}>
      {category}
    </span>
  )
}
