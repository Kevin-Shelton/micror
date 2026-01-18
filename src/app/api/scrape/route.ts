import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scrapeRedditRSS } from '@/lib/scrapers/reddit-rss'
import { scrapeAndStoreHN, type HNStoryType } from '@/lib/scrapers/hackernews'

export const maxDuration = 60 // Allow up to 60 seconds for scraping

export async function POST(request: NextRequest) {
  // Verify cron secret or Vercel cron header
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  // Allow secret via query param for browser testing
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')

  // Allow in development without auth
  const isDev = process.env.NODE_ENV === 'development'
  const hasValidSecret = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                         querySecret === process.env.CRON_SECRET

  if (!isDev && !isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get active sources due for scraping
  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []

  for (const source of sources || []) {
    // Check if due for scraping
    const lastScraped = source.last_scraped_at
      ? new Date(source.last_scraped_at)
      : new Date(0)
    const hoursAgo = (Date.now() - lastScraped.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < source.scrape_frequency_hours) {
      results.push({ source: source.display_name, skipped: true, reason: 'Not due yet' })
      continue
    }

    try {
      let result

      if (source.platform === 'reddit') {
        // Use RSS scraper instead of API (no approval required)
        result = await scrapeRedditRSS(source.id, source.identifier)
      } else if (source.platform === 'hackernews') {
        // HN has no API restrictions
        const hnType = source.identifier as HNStoryType
        result = await scrapeAndStoreHN(source.id, hnType)
      } else {
        results.push({
          source: source.display_name,
          skipped: true,
          reason: `Platform '${source.platform}' not yet implemented`,
        })
        continue
      }

      results.push({ source: source.display_name, ...result })
    } catch (error) {
      results.push({
        source: source.display_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Small delay between sources to be respectful
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return NextResponse.json({
    results,
    timestamp: new Date().toISOString(),
    note: 'Reddit uses RSS feeds (no API approval required). HN uses public Firebase API.',
  })
}

// Also support GET for manual testing in development
export async function GET(request: NextRequest) {
  return POST(request)
}
