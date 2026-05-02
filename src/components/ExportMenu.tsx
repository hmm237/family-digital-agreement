'use client'

import { Visit } from '@/types'
import jsPDF from 'jspdf'
import { Download, FileText, Table } from 'lucide-react'

interface ExportMenuProps {
  visits: Visit[]
}

export default function ExportMenu({ visits }: ExportMenuProps) {
  const exportCSV = () => {
    const headers = ['Date', 'Time', 'URL', 'Domain', 'Title', 'Duration (sec)', 'Category', 'Blocked']
    const rows = visits.map(v => [
      formatDate(v.visited_at),
      formatTime(v.visited_at),
      v.url,
      v.domain,
      v.title || '',
      (v.duration_ms / 1000).toFixed(1),
      v.category,
      v.was_blocked ? 'Yes' : 'No',
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    downloadFile(csv, 'browsing-history.csv', 'text/csv')
  }

  const exportPDF = async () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(18)
    doc.text('Browsing History Report', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
    doc.text(`Total visits: ${visits.length}`, 14, 38)

    doc.setFontSize(10)
    let y = 50

    visits.slice(0, 50).forEach((visit, idx) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      const line = `${formatDate(visit.visited_at)} ${formatTime(visit.visited_at)} - ${visit.domain} (${visit.category}) - ${(visit.duration_ms / 1000).toFixed(1)}s`
      doc.text(line, 14, y)
      y += 7
    })

    if (visits.length > 50) {
      doc.text(`... and ${visits.length - 50} more entries`, 14, y + 7)
    }

    doc.save('browsing-history.pdf')
  }

  return (
    <div className="relative group">
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
        <Download size={16} />
        Export
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
        <button
          onClick={exportCSV}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Table size={16} />
          Export as CSV
        </button>
        <button
          onClick={exportPDF}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t"
        >
          <FileText size={16} />
          Export as PDF
        </button>
      </div>
    </div>
  )
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString()
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
