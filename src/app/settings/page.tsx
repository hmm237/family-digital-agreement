'use client'

import { useAuth } from '@/components/AuthProvider'
import { Copy, Check, User, Users, Home, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const { user, family } = useAuth()
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
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
    { label: 'User ID', value: user.id, icon: <User size={16} />, key: 'userId' },
    { label: 'Family ID', value: family.id, icon: <Users size={16} />, key: 'familyId' },
    { label: 'App URL', value: typeof window !== 'undefined' ? window.location.origin : '', icon: <LinkIcon size={16} />, key: 'appUrl' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Extension Setup</h1>
            <p className="text-sm text-gray-600 mt-1">
              Use these IDs to configure your Chrome extension.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">How to Install the Extension</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Go to <code className="bg-blue-100 px-1 rounded">chrome://extensions/</code></li>
                <li>Enable <strong>Developer mode</strong> (top-right toggle)</li>
                <li>Click <strong>Load unpacked</strong></li>
                <li>Select the <code className="bg-blue-100 px-1 rounded">extension/</code> folder</li>
                <li>Click the extension icon and paste the values below</li>
              </ol>
            </div>

            {/* Fields */}
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
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

            {/* Extension download */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-2">Extension Files</h3>
              <p className="text-sm text-gray-600 mb-3">
                The extension files are located in the <code className="bg-gray-100 px-1 rounded">extension/</code> directory of this project.
                If you deployed to Vercel, download the extension files from your repository.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Home size={16} className="text-gray-400" />
                <span className="text-gray-600">Local path:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/extension/
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
