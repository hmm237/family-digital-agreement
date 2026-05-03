'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-gray-600">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Please click the link to verify your account.
          </p>
        </div>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  )
}
