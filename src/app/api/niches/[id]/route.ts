import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: niche, error } = await supabase
    .from('niches')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ niche })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const { name, keywords, priority, description, is_active } = body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (keywords !== undefined) {
    updateData.keywords = Array.isArray(keywords)
      ? keywords
      : keywords.split(',').map((k: string) => k.trim())
  }
  if (priority !== undefined) updateData.priority = priority
  if (description !== undefined) updateData.description = description
  if (is_active !== undefined) updateData.is_active = is_active

  const { data: niche, error } = await supabase
    .from('niches')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ niche })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('niches')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
