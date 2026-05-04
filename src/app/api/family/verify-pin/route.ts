import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()
    const { userId, pin } = body

    if (!userId || !pin) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: corsHeaders })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('pin')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders })
    }

    if (user.pin === pin) {
      return NextResponse.json({ success: true }, { headers: corsHeaders })
    } else {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401, headers: corsHeaders })
    }

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
