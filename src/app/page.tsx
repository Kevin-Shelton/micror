import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import OpportunitiesTable from '@/components/OpportunitiesTable'
import StatsCards from '@/components/StatsCards'
import FilterBar from '@/components/FilterBar'

export const dynamic = 'force-dynamic'

interface SearchParams {
  status?: string
  priority?: string
  starred?: string
  search?: string
}

async function getOpportunities(searchParams: SearchParams) {
  const supabase = createServiceClient()

  let query = supabase
    .from('opportunities')
    .select('*, raw_posts(url, source_id)')
    .order('overall_score', { ascending: false })
    .limit(50)

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.priority) {
    query = query.eq('priority', searchParams.priority)
  }
  if (searchParams.starred === 'true') {
    query = query.eq('is_starred', true)
  }
  if (searchParams.search) {
    query = query.or(
      `title.ilike.%${searchParams.search}%,problem_statement.ilike.%${searchParams.search}%`
    )
  }

  const { data } = await query
  return data || []
}

async function getStats() {
  const supabase = createServiceClient()

  const [
    { count: totalOpportunities },
    { count: newOpportunities },
    { count: starredOpportunities },
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
  ])

  return {
    total: totalOpportunities || 0,
    new_count: newOpportunities || 0,
    starred: starredOpportunities || 0,
  }
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [opportunities, stats] = await Promise.all([
    getOpportunities(params),
    getStats(),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                MicroSaaS Radar
              </h1>
              <p className="text-sm text-gray-500">
                Discover business opportunities from online communities
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/api/scrape"
                target="_blank"
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Run Scraper
              </a>
              <a
                href="/api/analyze"
                target="_blank"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Analyze Posts
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards
          total={stats.total}
          new_count={stats.new_count}
          starred={stats.starred}
        />

        <Suspense fallback={<div>Loading filters...</div>}>
          <FilterBar />
        </Suspense>

        <OpportunitiesTable opportunities={opportunities} />

        {/* Quick Links */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">API Endpoints</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>
                  <code className="bg-gray-100 px-1 rounded">
                    POST /api/scrape
                  </code>{' '}
                  - Run scrapers
                </li>
                <li>
                  <code className="bg-gray-100 px-1 rounded">
                    POST /api/analyze
                  </code>{' '}
                  - Analyze posts
                </li>
                <li>
                  <code className="bg-gray-100 px-1 rounded">
                    GET /api/opportunities
                  </code>{' '}
                  - List all
                </li>
                <li>
                  <code className="bg-gray-100 px-1 rounded">
                    GET /api/stats
                  </code>{' '}
                  - Dashboard stats
                </li>
              </ul>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Monitored Sources</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>Reddit: r/SaaS, r/startups, r/entrepreneur</li>
                <li>Reddit: r/smallbusiness, r/microsaas</li>
                <li>Hacker News: Ask HN, Show HN</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">AI Providers</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>Claude (Anthropic) - Primary analysis</li>
                <li>OpenAI GPT-4o - Fallback & load balancing</li>
                <li>Automatic failover between providers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
