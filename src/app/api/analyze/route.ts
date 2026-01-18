import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { analyzePost, AIProvider } from '@/lib/ai/analyzer'

export const maxDuration = 120 // Allow up to 2 minutes for analysis

export async function POST(request: NextRequest) {
  // Verify cron secret or Vercel cron header
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const body = await request.json().catch(() => ({}))
  const { limit = 10, provider = 'claude' } = body as {
    limit?: number
    provider?: AIProvider
  }

  // Get unprocessed posts that might be opportunities
  const { data: posts, error } = await supabase
    .from('raw_posts')
    .select('*')
    .eq('is_processed', false)
    .is('is_opportunity', null)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = {
    processed: 0,
    opportunities_found: 0,
    errors: 0,
    details: [] as { post_id: string; status: string; opportunity_id?: string }[],
  }

  // Alternate between Claude and OpenAI for load balancing
  let useOpenAI = false

  for (const post of posts || []) {
    const currentProvider: AIProvider = useOpenAI ? 'openai' : provider
    useOpenAI = !useOpenAI // Alternate for next iteration

    try {
      const analysis = await analyzePost(post, currentProvider)

      if (analysis) {
        // Create opportunity record
        const { data: opportunity, error: insertError } = await supabase
          .from('opportunities')
          .insert({
            raw_post_id: post.id,
            title: analysis.title,
            problem_statement: analysis.problem_statement,
            proposed_solution: analysis.proposed_solution,
            target_audience: analysis.target_audience,
            pain_intensity_score: analysis.pain_intensity_score,
            market_size_score: analysis.market_size_score,
            technical_feasibility_score: analysis.technical_feasibility_score,
            competition_score: analysis.competition_score,
            monetization_potential_score: analysis.monetization_potential_score,
            ai_analysis_summary: analysis.ai_analysis_summary,
            similar_existing_products: analysis.similar_existing_products,
            suggested_mvp_features: analysis.suggested_mvp_features,
            estimated_build_time: analysis.estimated_build_time,
            suggested_pricing_model: analysis.suggested_pricing_model,
            keywords: analysis.keywords,
            priority: analysis.priority,
          })
          .select()
          .single()

        if (!insertError && opportunity) {
          results.opportunities_found++
          results.details.push({
            post_id: post.id,
            status: 'opportunity_created',
            opportunity_id: opportunity.id,
          })
        }

        // Mark post as opportunity
        await supabase
          .from('raw_posts')
          .update({ is_processed: true, is_opportunity: true })
          .eq('id', post.id)
      } else {
        // Mark post as not an opportunity
        await supabase
          .from('raw_posts')
          .update({ is_processed: true, is_opportunity: false })
          .eq('id', post.id)

        results.details.push({
          post_id: post.id,
          status: 'not_an_opportunity',
        })
      }

      results.processed++
    } catch (error) {
      console.error(`Error analyzing post ${post.id}:`, error)
      results.errors++
      results.details.push({
        post_id: post.id,
        status: 'error',
      })
    }

    // Rate limit: wait between API calls
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return NextResponse.json({ ...results, timestamp: new Date().toISOString() })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
