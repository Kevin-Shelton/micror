import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  // Run queries that will succeed
  const [
    { count: totalOpportunities },
    { count: newOpportunities },
    { count: starredOpportunities },
    { count: totalPosts },
    { count: unprocessedPosts },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from('opportunities').select('*', { count: 'exact', head: true }),
    supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('is_starred', true),
    supabase.from('raw_posts').select('*', { count: 'exact', head: true }),
    supabase
      .from('raw_posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', false)
      .is('is_opportunity', null),
    supabase
      .from('scrape_logs')
      .select('*, sources(display_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Calculate average score
  const { data: avgScore } = await supabase
    .from('opportunities')
    .select('overall_score')
    .not('overall_score', 'is', null)

  const averageScore =
    avgScore && avgScore.length > 0
      ? avgScore.reduce((sum, o) => sum + (o.overall_score || 0), 0) / avgScore.length
      : 0

  // Get status breakdown manually
  const { data: statusData } = await supabase
    .from('opportunities')
    .select('status')

  const statusBreakdown = statusData?.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Get priority breakdown manually
  const { data: priorityData } = await supabase
    .from('opportunities')
    .select('priority')

  const priorityBreakdown = priorityData?.reduce(
    (acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return NextResponse.json({
    opportunities: {
      total: totalOpportunities || 0,
      new: newOpportunities || 0,
      starred: starredOpportunities || 0,
      averageScore: averageScore.toFixed(2),
    },
    posts: {
      total: totalPosts || 0,
      unprocessed: unprocessedPosts || 0,
    },
    recentScrapeLogs: recentLogs || [],
    breakdowns: {
      status: statusBreakdown || {},
      priority: priorityBreakdown || {},
    },
  })
}
