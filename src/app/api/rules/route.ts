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
    const { searchParams } = new URL(request.url)
    const family_id = searchParams.get('family_id')

    if (!family_id) {
      return NextResponse.json({ error: 'Missing family_id' }, { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: family, error: familyError } = await supabaseAdmin
      .from('families')
      .select('force_tracking')
      .eq('id', family_id)
      .single()

    const { data: rules, error } = await supabaseAdmin
      .from('rules')
      .select('*')
      .eq('family_id', family_id)
      .eq('is_active', true)

    if (error || familyError) {
      return NextResponse.json({ error: error?.message || familyError?.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ 
      success: true, 
      rules,
      settings: {
        force_tracking: family?.force_tracking || false
      }
    }, { headers: corsHeaders })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
