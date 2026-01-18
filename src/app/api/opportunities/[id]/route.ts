import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('opportunities')
    .select(
      `
      *,
      raw_posts(url, title, body, score, comment_count, source_id),
      research(*),
      reactions(*)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()
  const updates = await request.json()

  // Get current opportunity for comparison
  const { data: current } = await supabase
    .from('opportunities')
    .select('status, is_starred')
    .eq('id', id)
    .single()

  // Record status changes as reactions
  if (updates.status && current && updates.status !== current.status) {
    await supabase.from('reactions').insert({
      opportunity_id: id,
      action_type: 'status_change',
      action_data: {
        old_status: current.status,
        new_status: updates.status,
      },
    })
  }

  // Record star changes
  if (
    updates.is_starred !== undefined &&
    current &&
    updates.is_starred !== current.is_starred
  ) {
    await supabase.from('reactions').insert({
      opportunity_id: id,
      action_type: updates.is_starred ? 'starred' : 'unstarred',
      action_data: {},
    })
  }

  // Record notes as reactions
  if (updates.notes !== undefined) {
    await supabase.from('reactions').insert({
      opportunity_id: id,
      action_type: 'note',
      action_data: { note: updates.notes },
    })
  }

  const { data, error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase.from('opportunities').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
