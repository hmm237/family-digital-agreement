import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

type Category = 'social' | 'gaming' | 'video' | 'education' | 'search' | 'news' | 'shopping' | 'entertainment' | 'productivity' | 'communication' | 'uncategorized'

function categorizeUrl(url: string, domain: string): Category {
  const categories: [string[], Category][] = [
    [['facebook','twitter','instagram','tiktok','snapchat','reddit','discord','tumblr'], 'social'],
    [['steam','epicgames','roblox','minecraft','twitch'], 'gaming'],
    [['youtube.com','netflix','hulu','disneyplus','primevideo','vimeo'], 'video'],
    [['khanacademy','coursera','edx','.edu'], 'education'],
    [['google.com/search','bing.com/search','duckduckgo.com'], 'search'],
    [['cnn','bbc','nytimes','reuters'], 'news'],
    [['amazon','ebay','etsy','walmart','target'], 'shopping'],
    [['spotify','soundcloud','netflix','hulu'], 'entertainment'],
    [['docs.google','sheets.google','notion','trello','slack'], 'productivity'],
    [['gmail','outlook','whatsapp','telegram','zoom'], 'communication'],
  ]

  for (const [patterns, cat] of categories) {
    if (patterns.some(p => domain.includes(p) || url.includes(p))) return cat
  }
  return 'uncategorized'
}

// Handle CORS preflight — required for Chrome extension fetch requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { user_id, family_id, url, title, duration_ms, visited_at, was_blocked } = body

    if (!user_id || !family_id || !url || !duration_ms || !visited_at) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['user_id', 'family_id', 'url', 'duration_ms', 'visited_at'] },
        { status: 400, headers: corsHeaders }
      )
    }

    let domain = ''
    try {
      const urlObj = new URL(url)
      domain = urlObj.hostname.replace('www.', '')
    } catch {
      domain = 'unknown'
    }

    const category = categorizeUrl(url, domain)

    // Insert the visit — check for errors explicitly
    const { error: insertError } = await supabaseAdmin.from('visits').insert({
      user_id,
      family_id,
      url,
      domain,
      title: title || '',
      duration_ms: Number(duration_ms),
      visited_at,
      category,
      was_blocked: Boolean(was_blocked),
    })

    if (insertError) {
      console.error('[API] Failed to insert visit:', insertError)
      return NextResponse.json(
        { error: 'Failed to record visit', details: insertError.message },
        { status: 500, headers: corsHeaders }
      )
    }

    // Check for triggered rules
    const { data: rules } = await supabaseAdmin
      .from('rules')
      .select('id, type, pattern, action, schedule_days, schedule_start, schedule_end')
      .eq('family_id', family_id)
      .eq('is_active', true)

    const triggeredRules: Array<{ id: string; action: string }> = []

    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        let matches = false

        if (rule.type === 'url_pattern') {
          const pattern = rule.pattern.replace(/\*/g, '.*')
          const regex = new RegExp(`^${pattern}$`, 'i')
          matches = regex.test(url) || url.includes(rule.pattern.replace('*', ''))
        } else if (rule.type === 'category') {
          matches = rule.pattern === category
        } else if (rule.type === 'schedule') {
          const now = new Date(visited_at)
          const day = now.getDay()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

          matches = (rule.schedule_days?.includes(day) ?? true) &&
            (!rule.schedule_start || timeStr >= rule.schedule_start) &&
            (!rule.schedule_end || timeStr <= rule.schedule_end)
        }

        if (matches) {
          triggeredRules.push({ id: rule.id, action: rule.action })
        }
      }
    }

    return NextResponse.json({
      success: true,
      category,
      blocked: triggeredRules.some(r => r.action === 'block'),
      triggeredRules: triggeredRules.filter(r => r.action !== 'allow'),
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error processing visit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
