-- MicroSaaS Radar Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM types for status tracking
CREATE TYPE opportunity_status AS ENUM (
  'new',
  'reviewing',
  'researching',
  'validated',
  'building',
  'rejected',
  'archived'
);

CREATE TYPE source_platform AS ENUM (
  'reddit',
  'hackernews',
  'indiehackers',
  'twitter',
  'producthunt',
  'quora',
  'other'
);

CREATE TYPE opportunity_score AS ENUM (
  'high',
  'medium',
  'low'
);

-- Sources table: track monitored communities
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform source_platform NOT NULL,
  identifier TEXT NOT NULL, -- subreddit name, HN tag, etc.
  display_name TEXT NOT NULL,
  scrape_frequency_hours INTEGER DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, identifier)
);

-- Raw posts table: store scraped content before analysis
CREATE TABLE raw_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- Reddit post ID, HN item ID, etc.
  title TEXT,
  body TEXT,
  author TEXT,
  url TEXT,
  score INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT false,
  is_opportunity BOOLEAN DEFAULT NULL, -- null = not yet analyzed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, external_id)
);

-- Opportunities table: AI-identified business opportunities
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_post_id UUID REFERENCES raw_posts(id) ON DELETE SET NULL,

  -- Core opportunity data
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  proposed_solution TEXT,
  target_audience TEXT,

  -- AI Analysis scores (1-10)
  pain_intensity_score INTEGER CHECK (pain_intensity_score BETWEEN 1 AND 10),
  market_size_score INTEGER CHECK (market_size_score BETWEEN 1 AND 10),
  technical_feasibility_score INTEGER CHECK (technical_feasibility_score BETWEEN 1 AND 10),
  competition_score INTEGER CHECK (competition_score BETWEEN 1 AND 10), -- higher = less competition
  monetization_potential_score INTEGER CHECK (monetization_potential_score BETWEEN 1 AND 10),

  -- Composite score (calculated)
  overall_score DECIMAL(4,2) GENERATED ALWAYS AS (
    (pain_intensity_score + market_size_score + technical_feasibility_score +
     competition_score + monetization_potential_score) / 5.0
  ) STORED,

  -- AI-generated insights
  ai_analysis_summary TEXT,
  similar_existing_products TEXT[], -- Array of known competitors
  suggested_mvp_features TEXT[],
  estimated_build_time TEXT, -- "1-2 weeks", "1 month", etc.
  suggested_pricing_model TEXT,
  keywords TEXT[], -- For search/filtering

  -- Status tracking
  status opportunity_status DEFAULT 'new',
  priority opportunity_score DEFAULT 'medium',

  -- User interaction
  notes TEXT,
  is_starred BOOLEAN DEFAULT false,

  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research table: additional research on opportunities
CREATE TABLE research (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,

  research_type TEXT NOT NULL, -- 'competitor_analysis', 'market_size', 'technical_spike', 'user_interviews'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sources TEXT[], -- URLs or references

  ai_generated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions/Actions table: track follow-ups
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL, -- 'note', 'status_change', 'research_added', 'exported', 'shared'
  action_data JSONB, -- Flexible data storage for action details

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape logs for monitoring
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  posts_found INTEGER DEFAULT 0,
  posts_new INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_raw_posts_unprocessed ON raw_posts(is_processed) WHERE is_processed = false;
CREATE INDEX idx_raw_posts_source ON raw_posts(source_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_score ON opportunities(overall_score DESC);
CREATE INDEX idx_opportunities_starred ON opportunities(is_starred) WHERE is_starred = true;
CREATE INDEX idx_research_opportunity ON research(opportunity_id);
CREATE INDEX idx_reactions_opportunity ON reactions(opportunity_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_updated_at BEFORE UPDATE ON research
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default sources to monitor
-- Reddit sources use RSS feeds (no API approval required)
-- Hacker News uses public Firebase API (no restrictions)
INSERT INTO sources (platform, identifier, display_name, scrape_frequency_hours) VALUES
  -- Reddit via RSS (limited to ~25 posts per feed, no vote/comment counts)
  ('reddit', 'smallbusiness', 'r/smallbusiness (RSS)', 6),
  ('reddit', 'entrepreneur', 'r/entrepreneur (RSS)', 6),
  ('reddit', 'SaaS', 'r/SaaS (RSS)', 6),
  ('reddit', 'startups', 'r/startups (RSS)', 6),
  ('reddit', 'microsaas', 'r/microsaas (RSS)', 6),
  ('reddit', 'Automate', 'r/Automate (RSS)', 12),
  ('reddit', 'nocode', 'r/nocode (RSS)', 12),
  ('reddit', 'webdev', 'r/webdev (RSS)', 12),
  ('reddit', 'advancedentrepreneur', 'r/advancedentrepreneur (RSS)', 12),
  ('reddit', 'indiebiz', 'r/indiebiz (RSS)', 12),
  -- Hacker News (full API access)
  ('hackernews', 'ask', 'Hacker News - Ask HN', 4),
  ('hackernews', 'show', 'Hacker News - Show HN', 4),
  ('hackernews', 'new', 'Hacker News - New', 6),
  ('hackernews', 'top', 'Hacker News - Top', 8),
  ('hackernews', 'job', 'Hacker News - Jobs', 12);

-- Row Level Security (optional but recommended)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE research ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all" ON sources FOR ALL USING (true);
CREATE POLICY "Allow all" ON raw_posts FOR ALL USING (true);
CREATE POLICY "Allow all" ON opportunities FOR ALL USING (true);
CREATE POLICY "Allow all" ON research FOR ALL USING (true);
CREATE POLICY "Allow all" ON reactions FOR ALL USING (true);
CREATE POLICY "Allow all" ON scrape_logs FOR ALL USING (true);
