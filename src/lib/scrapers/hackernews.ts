import { createServiceClient } from '../supabase/server'

interface HNItem {
  id: number
  title: string
  text?: string
  by: string
  time: number
  url?: string
  score: number
  descendants: number
}

async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
      { next: { revalidate: 0 } }
    )
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export type HNStoryType = 'ask' | 'show' | 'new' | 'top' | 'best' | 'job'

async function fetchHNStories(type: HNStoryType, limit: number = 30) {
  const endpoints: Record<HNStoryType, string> = {
    ask: 'https://hacker-news.firebaseio.com/v0/askstories.json',
    show: 'https://hacker-news.firebaseio.com/v0/showstories.json',
    new: 'https://hacker-news.firebaseio.com/v0/newstories.json',
    top: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    best: 'https://hacker-news.firebaseio.com/v0/beststories.json',
    job: 'https://hacker-news.firebaseio.com/v0/jobstories.json',
  }

  const response = await fetch(endpoints[type], { next: { revalidate: 0 } })
  const ids: number[] = await response.json()

  // Fetch items in parallel with concurrency limit
  const items: (HNItem | null)[] = []
  const batchSize = 10

  for (let i = 0; i < Math.min(ids.length, limit); i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((id) => fetchHNItem(id)))
    items.push(...batchResults)
  }

  return items.filter((item): item is HNItem => item !== null)
}

export async function scrapeAndStoreHN(sourceId: string, storyType: HNStoryType) {
  const supabase = createServiceClient()

  const { data: log } = await supabase
    .from('scrape_logs')
    .insert({ source_id: sourceId })
    .select()
    .single()

  try {
    const stories = await fetchHNStories(storyType)
    let newPosts = 0

    for (const story of stories) {
      // Ask HN and job posts are always potential opportunities
      const alwaysRelevant = storyType === 'ask' || storyType === 'job'
      const hasSignal =
        alwaysRelevant ||
        containsOpportunitySignal(story.title + ' ' + (story.text || ''))

      const { error } = await supabase.from('raw_posts').upsert(
        {
          source_id: sourceId,
          external_id: story.id.toString(),
          title: story.title,
          body: story.text || '',
          author: story.by,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          score: story.score,
          comment_count: story.descendants || 0,
          posted_at: new Date(story.time * 1000).toISOString(),
          is_processed: false,
          is_opportunity: hasSignal ? null : false,
        },
        {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: true,
        }
      )

      if (!error) newPosts++
    }

    await supabase
      .from('scrape_logs')
      .update({
        completed_at: new Date().toISOString(),
        posts_found: stories.length,
        posts_new: newPosts,
      })
      .eq('id', log?.id)

    await supabase
      .from('sources')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', sourceId)

    return { posts_found: stories.length, posts_new: newPosts }
  } catch (error) {
    await supabase
      .from('scrape_logs')
      .update({
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', log?.id)

    throw error
  }
}

function containsOpportunitySignal(text: string): boolean {
  const signals = [
    /ask hn/i,
    /looking for/i,
    /is there/i,
    /anyone (built|know|use)/i,
    /recommend/i,
    /alternative to/i,
    /frustrated/i,
    /i wish/i,
    /would pay/i,
    /need a/i,
    /show hn/i,
    /built this/i,
    /made this/i,
    /launching/i,
    /feedback/i,
    /problem/i,
    /solution/i,
  ]
  return signals.some((pattern) => pattern.test(text))
}
