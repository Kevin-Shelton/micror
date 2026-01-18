import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data: niches, error } = await supabase
    .from('niches')
    .select('*')
    .order('priority', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ niches })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { name, keywords, priority, description, is_active } = body

  if (!name || !keywords || !priority) {
    return NextResponse.json(
      { error: 'Name, keywords, and priority are required' },
      { status: 400 }
    )
  }

  const { data: niche, error } = await supabase
    .from('niches')
    .insert({
      name,
      keywords: Array.isArray(keywords) ? keywords : keywords.split(',').map((k: string) => k.trim()),
      priority,
      description: description || null,
      is_active: is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ niche }, { status: 201 })
}
