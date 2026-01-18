-- Niches Migration
-- Run this SQL in your Supabase SQL Editor to add niches support

-- Create niche priority enum
CREATE TYPE niche_priority AS ENUM ('high', 'medium', 'low');

-- Niches table: configurable focus areas for opportunity detection
CREATE TABLE niches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  priority niche_priority NOT NULL DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active niches lookup
CREATE INDEX idx_niches_active ON niches(is_active) WHERE is_active = true;
CREATE INDEX idx_niches_priority ON niches(priority);

-- Apply updated_at trigger
CREATE TRIGGER update_niches_updated_at BEFORE UPDATE ON niches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE niches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON niches FOR ALL USING (true);

-- Insert default niches
INSERT INTO niches (name, keywords, priority, description) VALUES
  ('AI/Automation', ARRAY['ai', 'automation', 'automate', 'chatbot', 'gpt', 'llm', 'machine learning', 'workflow', 'artificial intelligence'], 'high', 'AI-powered tools and automation solutions'),
  ('Developer Tools', ARRAY['developer', 'api', 'sdk', 'devtools', 'cli', 'coding', 'github', 'deployment', 'programming'], 'high', 'Tools for software developers'),
  ('Productivity', ARRAY['productivity', 'time tracking', 'task management', 'calendar', 'scheduling', 'notion', 'workflow', 'organization'], 'high', 'Personal and team productivity tools'),
  ('E-commerce', ARRAY['ecommerce', 'shopify', 'inventory', 'dropshipping', 'amazon', 'etsy', 'online store', 'retail'], 'medium', 'Online selling and retail solutions'),
  ('Marketing', ARRAY['marketing', 'seo', 'social media', 'email marketing', 'analytics', 'content', 'leads', 'advertising'], 'medium', 'Marketing and growth tools'),
  ('Finance/Accounting', ARRAY['invoice', 'accounting', 'bookkeeping', 'expense', 'budget', 'payment', 'billing', 'financial'], 'medium', 'Financial management tools'),
  ('HR/Recruiting', ARRAY['hiring', 'recruiting', 'hr', 'onboarding', 'payroll', 'employee', 'applicant', 'talent'], 'low', 'Human resources and recruiting tools'),
  ('Healthcare', ARRAY['healthcare', 'medical', 'patient', 'clinic', 'telehealth', 'appointment', 'health'], 'low', 'Healthcare and medical solutions');
