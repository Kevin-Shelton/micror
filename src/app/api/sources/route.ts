import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('platform')
    .order('display_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { platform, identifier, display_name, scrape_frequency_hours = 6 } = body

  if (!platform || !identifier || !display_name) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('sources')
    .insert({
      platform,
      identifier,
      display_name,
      scrape_frequency_hours,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing source id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
