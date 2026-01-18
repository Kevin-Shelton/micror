import { createServiceClient } from '@/lib/supabase/server'

export type NichePriority = 'high' | 'medium' | 'low'

export interface Niche {
  id: string
  name: string
  keywords: string[]
  priority: NichePriority
  description: string | null
  is_active: boolean
}

// Fallback niches if database is not available
export const FALLBACK_NICHES: Niche[] = [
  {
    id: 'fallback-1',
    name: 'AI/Automation',
    keywords: ['ai', 'automation', 'automate', 'chatbot', 'gpt', 'llm', 'machine learning', 'workflow'],
    priority: 'high',
    description: 'AI-powered tools and automation solutions',
    is_active: true,
  },
  {
    id: 'fallback-2',
    name: 'Developer Tools',
    keywords: ['developer', 'api', 'sdk', 'devtools', 'cli', 'coding', 'github', 'deployment'],
    priority: 'high',
    description: 'Tools for software developers',
    is_active: true,
  },
  {
    id: 'fallback-3',
    name: 'Productivity',
    keywords: ['productivity', 'time tracking', 'task management', 'calendar', 'scheduling', 'notion', 'workflow'],
    priority: 'high',
    description: 'Personal and team productivity tools',
    is_active: true,
  },
]

export async function getNichesFromDB(): Promise<Niche[]> {
  try {
    const supabase = createServiceClient()
    const { data: niches, error } = await supabase
      .from('niches')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching niches from DB:', error)
      return FALLBACK_NICHES
    }

    return niches || FALLBACK_NICHES
  } catch (error) {
    console.error('Failed to fetch niches:', error)
    return FALLBACK_NICHES
  }
}

export function matchesNicheSync(
  text: string,
  niches: Niche[]
): { matches: boolean; niches: string[]; highestPriority: NichePriority | null } {
  const lowerText = text.toLowerCase()
  const matchedNiches: string[] = []
  let highestPriority: NichePriority | null = null
  const priorityOrder: NichePriority[] = ['high', 'medium', 'low']

  for (const niche of niches) {
    if (!niche.is_active) continue
    const hasMatch = niche.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
    if (hasMatch) {
      matchedNiches.push(niche.name)
      if (!highestPriority || priorityOrder.indexOf(niche.priority) < priorityOrder.indexOf(highestPriority)) {
        highestPriority = niche.priority
      }
    }
  }

  return {
    matches: matchedNiches.length > 0,
    niches: matchedNiches,
    highestPriority,
  }
}

// Legacy sync function for backward compatibility - uses fallback niches
export function matchesNiche(text: string): { matches: boolean; niches: string[]; highestPriority: NichePriority | null } {
  return matchesNicheSync(text, FALLBACK_NICHES)
}

export function getNicheBoost(priority: NichePriority | null): number {
  switch (priority) {
    case 'high': return 2.0
    case 'medium': return 1.5
    case 'low': return 1.2
    default: return 1.0
  }
}
