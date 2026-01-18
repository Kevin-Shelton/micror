// Critical niches to focus on
// Posts matching these keywords will be prioritized for analysis

export const CRITICAL_NICHES = [
  // Add your focus areas here
  {
    name: 'AI/Automation',
    keywords: ['ai', 'automation', 'automate', 'chatbot', 'gpt', 'llm', 'machine learning', 'workflow'],
    priority: 'high',
  },
  {
    name: 'Developer Tools',
    keywords: ['developer', 'api', 'sdk', 'devtools', 'cli', 'coding', 'github', 'deployment'],
    priority: 'high',
  },
  {
    name: 'Productivity',
    keywords: ['productivity', 'time tracking', 'task management', 'calendar', 'scheduling', 'notion', 'workflow'],
    priority: 'high',
  },
  {
    name: 'E-commerce',
    keywords: ['ecommerce', 'shopify', 'inventory', 'dropshipping', 'amazon', 'etsy', 'online store'],
    priority: 'medium',
  },
  {
    name: 'Marketing',
    keywords: ['marketing', 'seo', 'social media', 'email marketing', 'analytics', 'content', 'leads'],
    priority: 'medium',
  },
  {
    name: 'Finance/Accounting',
    keywords: ['invoice', 'accounting', 'bookkeeping', 'expense', 'budget', 'payment', 'billing'],
    priority: 'medium',
  },
  {
    name: 'HR/Recruiting',
    keywords: ['hiring', 'recruiting', 'hr', 'onboarding', 'payroll', 'employee', 'applicant'],
    priority: 'low',
  },
  {
    name: 'Healthcare',
    keywords: ['healthcare', 'medical', 'patient', 'clinic', 'telehealth', 'appointment'],
    priority: 'low',
  },
] as const

export type NichePriority = 'high' | 'medium' | 'low'

export interface Niche {
  name: string
  keywords: readonly string[]
  priority: NichePriority
}

export function matchesNiche(text: string): { matches: boolean; niches: string[]; highestPriority: NichePriority | null } {
  const lowerText = text.toLowerCase()
  const matchedNiches: string[] = []
  let highestPriority: NichePriority | null = null
  const priorityOrder: NichePriority[] = ['high', 'medium', 'low']

  for (const niche of CRITICAL_NICHES) {
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

export function getNicheBoost(priority: NichePriority | null): number {
  switch (priority) {
    case 'high': return 2.0
    case 'medium': return 1.5
    case 'low': return 1.2
    default: return 1.0
  }
}
