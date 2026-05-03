import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API] Missing Supabase environment variables')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400, headers: corsHeaders })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single()

    if (error || !user) {
      console.error('[API] Failed to fetch user info:', error)
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders })
    }

    return NextResponse.json(user, { headers: corsHeaders })

  } catch (error) {
    console.error('Error in user-info API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
