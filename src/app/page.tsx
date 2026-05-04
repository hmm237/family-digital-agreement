'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { BarChart3, Shield, Target, Users, CheckCircle } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, family } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      if (!family) {
        router.replace('/family/setup')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [isAuthenticated, family, router])

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="text-white" size={18} />
            </div>
            <span className="font-bold text-xl text-gray-900">Family Digital Agreement</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium"
            >
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            Transparent Digital Parenting
            <span className="block text-indigo-600">Built on Trust</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Monitor website activity, set healthy boundaries, and achieve screen time goals together.
            All data is visible to both parents and children — no secrets, just cooperation.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold hover:border-gray-400 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <FeatureCard
            icon={<BarChart3 className="text-indigo-600" size={28} />}
            title="Full History"
            description="Every visited URL with timestamps, duration, and category."
          />
          <FeatureCard
            icon={<Shield className="text-purple-600" size={28} />}
            title="Smart Rules"
            description="Block or limit sites by pattern, category, or schedule."
          />
          <FeatureCard
            icon={<Target className="text-pink-600" size={28} />}
            title="Goals & Rewards"
            description="Set targets, track progress, and celebrate achievements."
          />
          <FeatureCard
            icon={<Users className="text-teal-600" size={28} />}
            title="Family Accounts"
            description="Parents and kids share the same transparent view."
          />
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">How It Works</h2>
          <div className="space-y-6">
            <Step
              number={1}
              title="Create a Family Account"
              description="Sign up as a parent, create your family, then invite your children."
            />
            <Step
              number={2}
              title="Children Join"
              description="Kids sign up, select 'Child' role, and enter the family code."
            />
            <Step
              number={3}
              title="Install Extension"
              description="Both parents and children install the Chrome extension and link it to their account."
            />
            <Step
              number={4}
              title="Monitor & Agree"
              description="View browsing history together, set rules, and create goals. Everything is transparent."
            />
          </div>
        </div>

        {/* Testimonial-ish */}
        <div className="mt-20 bg-indigo-600 rounded-2xl p-8 text-center text-white">
          <blockquote className="text-xl max-w-2xl mx-auto mb-4">
            We finally stopped arguing about screen time. Our kids see exactly what we see, and we set goals together.
          </blockquote>
          <p className="font-medium">— The Johnson Family</p>
          <div className="mt-8 flex justify-center gap-4">
            <CheckCircle className="opacity-80" size={24} />
            <span>No credit card required</span>
          </div>
        </div>
      </main>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}
