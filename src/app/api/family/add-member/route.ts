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
    const { familyId, name, role, pin, parentId } = body

    if (!familyId || !name || !role || !parentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
    }

    // Verify parent has access to this family
    const { data: parent, error: parentError } = await supabaseAdmin
      .from('users')
      .select('role, family_id')
      .eq('id', parentId)
      .single()

    if (parentError || !parent || parent.role !== 'parent' || parent.family_id !== familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders })
    }

    // Create a new user record (without auth.users entry)
    // We generate a UUID for them
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        name,
        role,
        pin,
        family_id: familyId,
        email: null // No email for child accounts
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true, user: newUser }, { headers: corsHeaders })

  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
