export type OpportunityStatus =
  | 'new'
  | 'reviewing'
  | 'researching'
  | 'validated'
  | 'building'
  | 'rejected'
  | 'archived'

export type SourcePlatform =
  | 'reddit'
  | 'hackernews'
  | 'indiehackers'
  | 'twitter'
  | 'producthunt'
  | 'quora'
  | 'other'

export type OpportunityScore = 'high' | 'medium' | 'low'

export interface Source {
  id: string
  platform: SourcePlatform
  identifier: string
  display_name: string
  scrape_frequency_hours: number
  is_active: boolean
  last_scraped_at: string | null
  created_at: string
  updated_at: string
}

export interface RawPost {
  id: string
  source_id: string
  external_id: string
  title: string | null
  body: string | null
  author: string | null
  url: string | null
  score: number
  comment_count: number
  posted_at: string | null
  scraped_at: string
  is_processed: boolean
  is_opportunity: boolean | null
  created_at: string
}

export interface Opportunity {
  id: string
  raw_post_id: string | null
  title: string
  problem_statement: string
  proposed_solution: string | null
  target_audience: string | null
  pain_intensity_score: number
  market_size_score: number
  technical_feasibility_score: number
  competition_score: number
  monetization_potential_score: number
  overall_score: number
  ai_analysis_summary: string | null
  similar_existing_products: string[]
  suggested_mvp_features: string[]
  estimated_build_time: string | null
  suggested_pricing_model: string | null
  keywords: string[]
  status: OpportunityStatus
  priority: OpportunityScore
  notes: string | null
  is_starred: boolean
  analyzed_at: string
  created_at: string
  updated_at: string
  // Joined data
  raw_posts?: {
    url: string | null
    title: string | null
    body: string | null
    score: number
    comment_count: number
    source_id: string
  }
  research?: Research[]
  reactions?: Reaction[]
}

export interface Research {
  id: string
  opportunity_id: string
  research_type: string
  title: string
  content: string
  sources: string[]
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface Reaction {
  id: string
  opportunity_id: string
  action_type: string
  action_data: Record<string, unknown>
  created_at: string
}

export interface ScrapeLog {
  id: string
  source_id: string
  started_at: string
  completed_at: string | null
  posts_found: number
  posts_new: number
  opportunities_found: number
  error_message: string | null
  created_at: string
}
