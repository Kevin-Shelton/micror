import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateResearch, AIProvider } from '@/lib/ai/analyzer'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { opportunity_id, research_type, provider = 'claude' } = body as {
    opportunity_id?: string
    research_type?: 'competitor_analysis' | 'market_size' | 'technical_spike'
    provider?: AIProvider
  }

  if (!opportunity_id || !research_type) {
    return NextResponse.json(
      { error: 'Missing opportunity_id or research_type' },
      { status: 400 }
    )
  }

  const validTypes = ['competitor_analysis', 'market_size', 'technical_spike']
  if (!validTypes.includes(research_type)) {
    return NextResponse.json(
      { error: 'Invalid research_type. Must be one of: ' + validTypes.join(', ') },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Get opportunity
  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunity_id)
    .single()

  if (error || !opportunity) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  try {
    const research = await generateResearch(
      {
        title: opportunity.title,
        problem_statement: opportunity.problem_statement,
        proposed_solution: opportunity.proposed_solution || '',
      },
      research_type,
      provider
    )

    // Store research
    const { data: newResearch, error: insertError } = await supabase
      .from('research')
      .insert({
        opportunity_id,
        research_type,
        title: research.title,
        content: research.content,
        sources: research.sources,
        ai_generated: true,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log reaction
    await supabase.from('reactions').insert({
      opportunity_id,
      action_type: 'research_added',
      action_data: { research_type, research_id: newResearch.id, provider },
    })

    // Update opportunity status to researching if it was new
    if (opportunity.status === 'new') {
      await supabase
        .from('opportunities')
        .update({ status: 'researching' })
        .eq('id', opportunity_id)
    }

    return NextResponse.json(newResearch)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research generation failed' },
      { status: 500 }
    )
  }
}

// Get all research for an opportunity
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const opportunity_id = searchParams.get('opportunity_id')

  if (!opportunity_id) {
    return NextResponse.json({ error: 'Missing opportunity_id' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('research')
    .select('*')
    .eq('opportunity_id', opportunity_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
