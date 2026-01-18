import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { RawPost } from '../supabase/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export type AIProvider = 'claude' | 'openai'

export interface OpportunityAnalysis {
  is_opportunity: boolean
  title: string
  problem_statement: string
  proposed_solution: string
  target_audience: string
  pain_intensity_score: number
  market_size_score: number
  technical_feasibility_score: number
  competition_score: number
  monetization_potential_score: number
  ai_analysis_summary: string
  similar_existing_products: string[]
  suggested_mvp_features: string[]
  estimated_build_time: string
  suggested_pricing_model: string
  keywords: string[]
  priority: 'high' | 'medium' | 'low'
}

function getAnalysisPrompt(post: RawPost): string {
  return `You are an expert micro SaaS opportunity analyst. Analyze the following social media post to determine if it represents a viable micro SaaS business opportunity.

## Post Content
Title: ${post.title || 'No title'}
Body: ${post.body || 'No body'}
Platform Score: ${post.score} upvotes/likes
Comments: ${post.comment_count}
URL: ${post.url || 'N/A'}

## Analysis Instructions

First, determine if this post indicates a genuine business pain point that could be solved by a micro SaaS application. Look for:
- Explicit requests for tools or solutions
- Frustrations with existing workflows
- Repetitive manual tasks
- Gaps in existing software
- "I wish there was..." or "Is there a tool..." patterns
- Multiple people agreeing in comments (high engagement)

If this IS a potential opportunity, provide detailed analysis. If NOT, explain why briefly.

## Response Format (JSON only, no markdown)

{
  "is_opportunity": boolean,
  "title": "Concise opportunity title (if opportunity)",
  "problem_statement": "Clear 1-2 sentence problem description",
  "proposed_solution": "High-level solution concept",
  "target_audience": "Who would pay for this",
  "pain_intensity_score": 1-10 (how painful is this problem?),
  "market_size_score": 1-10 (how many people have this problem?),
  "technical_feasibility_score": 1-10 (how easy to build as micro SaaS?),
  "competition_score": 1-10 (10 = no competition, 1 = saturated market),
  "monetization_potential_score": 1-10 (would people pay? how much?),
  "ai_analysis_summary": "2-3 paragraph analysis of the opportunity",
  "similar_existing_products": ["Product 1", "Product 2"],
  "suggested_mvp_features": ["Feature 1", "Feature 2", "Feature 3"],
  "estimated_build_time": "1-2 weeks" | "1 month" | "2-3 months" | "3+ months",
  "suggested_pricing_model": "Freemium", "Usage-based", "$X/month", etc.,
  "keywords": ["keyword1", "keyword2"],
  "priority": "high" | "medium" | "low"
}

If not an opportunity, return:
{
  "is_opportunity": false,
  "reason": "Brief explanation why this isn't an opportunity"
}

Respond with ONLY valid JSON, no additional text.`
}

async function analyzeWithClaude(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

async function analyzeWithOpenAI(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  return completion.choices[0]?.message?.content || ''
}

export async function analyzePost(
  post: RawPost,
  provider: AIProvider = 'claude'
): Promise<OpportunityAnalysis | null> {
  const prompt = getAnalysisPrompt(post)

  try {
    let responseText: string

    if (provider === 'claude') {
      responseText = await analyzeWithClaude(prompt)
    } else {
      responseText = await analyzeWithOpenAI(prompt)
    }

    // Parse JSON response - handle potential markdown wrapping
    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7)
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3)
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3)
    }

    const analysis = JSON.parse(cleanJson.trim())

    if (!analysis.is_opportunity) {
      return null
    }

    return analysis as OpportunityAnalysis
  } catch (error) {
    console.error(`AI analysis error (${provider}):`, error)
    throw error
  }
}

function getResearchPrompt(
  opportunity: { title: string; problem_statement: string; proposed_solution: string },
  researchType: 'competitor_analysis' | 'market_size' | 'technical_spike'
): string {
  const prompts = {
    competitor_analysis: `Research existing competitors and alternatives for this micro SaaS opportunity:

Problem: ${opportunity.problem_statement}
Proposed Solution: ${opportunity.proposed_solution}

Provide a detailed competitor analysis including:
1. Direct competitors (tools that solve the exact problem)
2. Indirect competitors (workarounds people use)
3. Pricing comparison
4. Feature gaps and opportunities for differentiation
5. Why a new entrant could succeed`,

    market_size: `Estimate the market size for this micro SaaS opportunity:

Problem: ${opportunity.problem_statement}
Target Solution: ${opportunity.proposed_solution}

Provide:
1. TAM/SAM/SOM estimates with reasoning
2. Growth trends in this space
3. Related market data points
4. Revenue potential at different price points
5. Customer acquisition channels`,

    technical_spike: `Provide a technical architecture overview for building this micro SaaS:

Problem: ${opportunity.problem_statement}
Solution: ${opportunity.proposed_solution}

Include:
1. Recommended tech stack
2. Key technical challenges
3. Third-party APIs/services needed
4. MVP scope (what to build first)
5. Estimated development timeline
6. Hosting/infrastructure recommendations`,
  }

  return `${prompts[researchType]}

Format your response as JSON:
{
  "title": "Research title",
  "content": "Detailed markdown-formatted research content",
  "sources": ["Reference 1", "Reference 2"]
}

Respond with ONLY valid JSON.`
}

export async function generateResearch(
  opportunity: { title: string; problem_statement: string; proposed_solution: string },
  researchType: 'competitor_analysis' | 'market_size' | 'technical_spike',
  provider: AIProvider = 'claude'
): Promise<{ title: string; content: string; sources: string[] }> {
  const prompt = getResearchPrompt(opportunity, researchType)

  let responseText: string

  if (provider === 'claude') {
    responseText = await analyzeWithClaude(prompt)
  } else {
    responseText = await analyzeWithOpenAI(prompt)
  }

  // Parse JSON response - handle potential markdown wrapping
  let cleanJson = responseText.trim()
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.slice(7)
  }
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.slice(3)
  }
  if (cleanJson.endsWith('```')) {
    cleanJson = cleanJson.slice(0, -3)
  }

  return JSON.parse(cleanJson.trim())
}

// Batch analysis with load balancing between providers
export async function analyzePostsBatch(
  posts: RawPost[],
  options: {
    claudeWeight?: number // 0-1, percentage of requests to Claude
    maxConcurrent?: number
  } = {}
): Promise<Map<string, OpportunityAnalysis | null>> {
  const { claudeWeight = 0.5, maxConcurrent = 3 } = options
  const results = new Map<string, OpportunityAnalysis | null>()

  // Process in batches to respect rate limits
  for (let i = 0; i < posts.length; i += maxConcurrent) {
    const batch = posts.slice(i, i + maxConcurrent)
    const promises = batch.map(async (post, index) => {
      // Alternate between providers based on weight
      const useOpenAI = (i + index) % 10 >= claudeWeight * 10
      const provider: AIProvider = useOpenAI ? 'openai' : 'claude'

      try {
        const analysis = await analyzePost(post, provider)
        results.set(post.id, analysis)
      } catch (error) {
        console.error(`Failed to analyze post ${post.id}:`, error)
        // Try fallback provider
        try {
          const fallbackProvider: AIProvider = provider === 'claude' ? 'openai' : 'claude'
          const analysis = await analyzePost(post, fallbackProvider)
          results.set(post.id, analysis)
        } catch (fallbackError) {
          console.error(`Fallback also failed for post ${post.id}:`, fallbackError)
          results.set(post.id, null)
        }
      }
    })

    await Promise.all(promises)

    // Rate limit delay between batches
    if (i + maxConcurrent < posts.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}
