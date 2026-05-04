import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inviteCode = searchParams.get('code')?.toUpperCase()

    if (!inviteCode) {
      return NextResponse.json({ error: 'Missing invite code' }, { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Find family by invite code
    const { data: family, error: familyError } = await supabaseAdmin
      .from('families')
      .select('id, name, force_tracking')
      .eq('invite_code', inviteCode)
      .single()

    if (familyError || !family) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404, headers: corsHeaders })
    }

    // Get all users in that family
    const { data: members, error: membersError } = await supabaseAdmin
      .from('users')
      .select('id, name, role, pin')
      .eq('family_id', family.id)

    if (membersError) {
      return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({
      success: true,
      family,
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        hasPin: !!m.pin
      }))
    }, { headers: corsHeaders })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
