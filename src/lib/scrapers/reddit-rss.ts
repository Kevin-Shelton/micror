/**
 * Reddit RSS Scraper
 *
 * Uses Reddit's public RSS feeds instead of the API.
 * RSS feeds are publicly available and don't require API approval.
 *
 * Limitations:
 * - Only returns ~25 posts per feed
 * - No access to vote counts or comment counts in real-time
 * - Rate limiting still applies (be respectful)
 */

import { createServiceClient } from '../supabase/server'

interface RSSPost {
  external_id: string
  title: string
  body: string
  author: string
  url: string
  posted_at: Date
}

async function parseRedditRSS(subreddit: string): Promise<RSSPost[]> {
  const rssUrl = `https://www.reddit.com/r/${subreddit}/new.rss`

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'MicroSaaSRadar/1.0 (RSS Reader)',
      },
    })

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`)
    }

    const xml = await response.text()

    // Parse the Atom feed
    const posts: RSSPost[] = []

    // Extract entries using regex (lightweight, no XML parser needed)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
    let match

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1]

      // Extract fields
      const id = extractTag(entry, 'id') || ''
      const title = decodeHTMLEntities(extractTag(entry, 'title') || '')
      const content = decodeHTMLEntities(extractTag(entry, 'content') || '')
      const author = extractAuthor(entry)
      const link = extractLink(entry)
      const updated = extractTag(entry, 'updated') || ''

      // Extract Reddit post ID from the URL
      const postIdMatch = id.match(/t3_([a-z0-9]+)/i)
      const externalId = postIdMatch ? postIdMatch[1] : id

      // Extract text content from HTML
      const bodyText = extractTextFromHTML(content)

      posts.push({
        external_id: externalId,
        title,
        body: bodyText,
        author,
        url: link,
        posted_at: new Date(updated),
      })
    }

    return posts
  } catch (error) {
    console.error(`Error fetching RSS for r/${subreddit}:`, error)
    throw error
  }
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

function extractAuthor(entry: string): string {
  // Author is in <author><name>username</name></author>
  const authorMatch = entry.match(/<author>[\s\S]*?<name>\/u\/([^<]+)<\/name>[\s\S]*?<\/author>/i)
  return authorMatch ? authorMatch[1] : '[unknown]'
}

function extractLink(entry: string): string {
  // Get the link with rel="alternate"
  const linkMatch = entry.match(/<link[^>]*href="([^"]+)"[^>]*>/i)
  return linkMatch ? linkMatch[1] : ''
}

function extractTextFromHTML(html: string): string {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000) // Limit body length
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function containsOpportunitySignal(text: string): boolean {
  const signals = [
    /i wish there was/i,
    /is there a tool/i,
    /is there a way to/i,
    /looking for a solution/i,
    /anyone know of/i,
    /recommendations? for/i,
    /how do you handle/i,
    /frustrated with/i,
    /pain point/i,
    /manually doing/i,
    /waste.* time/i,
    /automate/i,
    /i('d| would) pay for/i,
    /need a tool/i,
    /built a tool/i,
    /looking for software/i,
    /what do you use for/i,
    /better way to/i,
    /struggling with/i,
    /any alternatives to/i,
  ]

  return signals.some(pattern => pattern.test(text))
}

export async function scrapeRedditRSS(sourceId: string, subreddit: string) {
  const supabase = createServiceClient()

  // Create scrape log
  const { data: log } = await supabase
    .from('scrape_logs')
    .insert({ source_id: sourceId })
    .select()
    .single()

  try {
    const posts = await parseRedditRSS(subreddit)

    let newPosts = 0

    for (const post of posts) {
      // Check for opportunity signals in title/body
      const hasSignal = containsOpportunitySignal(post.title + ' ' + post.body)

      const { error } = await supabase
        .from('raw_posts')
        .upsert({
          source_id: sourceId,
          external_id: post.external_id,
          title: post.title,
          body: post.body,
          author: post.author,
          url: post.url,
          score: 0, // RSS doesn't provide scores
          comment_count: 0, // RSS doesn't provide comment counts
          posted_at: post.posted_at.toISOString(),
          is_processed: false,
          // Only mark for processing if it has opportunity signals
          is_opportunity: hasSignal ? null : false,
        }, {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: true,
        })

      if (!error) newPosts++
    }

    // Update scrape log
    await supabase
      .from('scrape_logs')
      .update({
        completed_at: new Date().toISOString(),
        posts_found: posts.length,
        posts_new: newPosts,
      })
      .eq('id', log?.id)

    // Update source last_scraped_at
    await supabase
      .from('sources')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', sourceId)

    return { posts_found: posts.length, posts_new: newPosts }
  } catch (error) {
    // Log error
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
