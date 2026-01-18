import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const starred = searchParams.get('starred')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const sortBy = searchParams.get('sortBy') || 'overall_score'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  let query = supabase
    .from('opportunities')
    .select('*, raw_posts(url, source_id)', { count: 'exact' })
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (starred === 'true') query = query.eq('is_starred', true)
  if (search) {
    query = query.or(`title.ilike.%${search}%,problem_statement.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count,
    pagination: {
      offset,
      limit,
      total: count,
      hasMore: count ? offset + limit < count : false,
    },
  })
}

// Create a new opportunity manually
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  const {
    title,
    problem_statement,
    proposed_solution,
    target_audience,
    notes,
  } = body

  if (!title || !problem_statement) {
    return NextResponse.json(
      { error: 'Missing required fields: title and problem_statement' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title,
      problem_statement,
      proposed_solution,
      target_audience,
      notes,
      // Set default scores for manual entries
      pain_intensity_score: 5,
      market_size_score: 5,
      technical_feasibility_score: 5,
      competition_score: 5,
      monetization_potential_score: 5,
      status: 'new',
      priority: 'medium',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
