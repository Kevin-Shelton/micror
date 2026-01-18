import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { analyzePost, AIProvider } from '@/lib/ai/analyzer'
import { getNichesFromDB, matchesNicheSync, getNicheBoost } from '@/lib/niches'

export const maxDuration = 120 // Allow up to 2 minutes for analysis

export async function POST(request: NextRequest) {
  // Verify cron secret or Vercel cron header
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  // Allow secret via query param for browser testing
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')

  const hasValidSecret = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                         querySecret === process.env.CRON_SECRET

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const body = await request.json().catch(() => ({}))
  const { limit = 10, provider = 'claude' } = body as {
    limit?: number
    provider?: AIProvider
  }

  // Get unprocessed posts that might be opportunities
  const { data: allPosts, error } = await supabase
    .from('raw_posts')
    .select('*')
    .eq('is_processed', false)
    .is('is_opportunity', null)
    .order('score', { ascending: false })
    .limit(limit * 3) // Fetch more to allow for niche prioritization

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch niches from database
  const niches = await getNichesFromDB()

  // Sort posts by niche match priority, then by score
  const posts = (allPosts || [])
    .map(post => {
      const nicheMatch = matchesNicheSync((post.title || '') + ' ' + (post.body || ''), niches)
      return {
        ...post,
        nicheMatch,
        nicheBoost: getNicheBoost(nicheMatch.highestPriority),
      }
    })
    .sort((a, b) => {
      // First sort by niche boost (higher first)
      if (b.nicheBoost !== a.nicheBoost) return b.nicheBoost - a.nicheBoost
      // Then by score
      return (b.score || 0) - (a.score || 0)
    })
    .slice(0, limit)

  const results = {
    processed: 0,
    opportunities_found: 0,
    niche_matches: 0,
    errors: 0,
    details: [] as { post_id: string; status: string; opportunity_id?: string; niches?: string[] }[],
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
          if (post.nicheMatch.matches) results.niche_matches++
          results.details.push({
            post_id: post.id,
            status: 'opportunity_created',
            opportunity_id: opportunity.id,
            niches: post.nicheMatch.niches,
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
