'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Opportunity, Research } from '@/lib/supabase/types'

interface Props {
  opportunityId: string
  onClose: () => void
}

export default function OpportunityDetail({ opportunityId, onClose }: Props) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [research, setResearch] = useState<Research[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'research' | 'activity'>(
    'overview'
  )

  const supabase = createClient()

  const loadOpportunity = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('*, research(*), reactions(*)')
      .eq('id', opportunityId)
      .single()

    if (data) {
      setOpportunity(data as Opportunity)
      setResearch((data.research as Research[]) || [])
    }
    setLoading(false)
  }, [opportunityId, supabase])

  useEffect(() => {
    loadOpportunity()
  }, [loadOpportunity])

  async function toggleStar() {
    if (!opportunity) return
    const newStarred = !opportunity.is_starred
    setOpportunity({ ...opportunity, is_starred: newStarred })

    await fetch(`/api/opportunities/${opportunityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_starred: newStarred }),
    })
  }

  async function updateStatus(status: string) {
    if (!opportunity) return
    setOpportunity({ ...opportunity, status: status as Opportunity['status'] })

    await fetch(`/api/opportunities/${opportunityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function generateResearch(type: string, provider: 'claude' | 'openai' = 'claude') {
    setGenerating(type)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          research_type: type,
          provider,
        }),
      })
      const newResearch = await res.json()
      if (newResearch.id) {
        setResearch([newResearch, ...research])
      }
    } catch (error) {
      console.error('Failed to generate research:', error)
    }
    setGenerating(null)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!opportunity) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {opportunity.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Score: {opportunity.overall_score?.toFixed(1)} | {opportunity.status} |{' '}
              {opportunity.priority} priority
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={toggleStar}
              className="text-2xl hover:scale-110 transition-transform"
              title={opportunity.is_starred ? 'Unstar' : 'Star'}
            >
              {opportunity.is_starred ? (
                <span className="text-yellow-500">&#9733;</span>
              ) : (
                <span className="text-gray-300">&#9734;</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <nav className="flex gap-6">
            {(['overview', 'research', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 border-b-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'research' && research.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {research.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Problem & Solution */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Problem</h3>
                <p className="text-gray-700">{opportunity.problem_statement}</p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Proposed Solution</h3>
                <p className="text-gray-700">
                  {opportunity.proposed_solution || 'No solution proposed yet'}
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Target Audience</h3>
                <p className="text-gray-700">
                  {opportunity.target_audience || 'Not specified'}
                </p>
              </section>

              {/* Scores */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">Analysis Scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Pain', score: opportunity.pain_intensity_score },
                    { label: 'Market', score: opportunity.market_size_score },
                    { label: 'Feasibility', score: opportunity.technical_feasibility_score },
                    { label: 'Competition', score: opportunity.competition_score },
                    { label: 'Monetization', score: opportunity.monetization_potential_score },
                  ].map(({ label, score }) => (
                    <div
                      key={label}
                      className="bg-gray-50 rounded-lg p-3 text-center"
                    >
                      <div className="text-2xl font-bold text-gray-900">
                        {score}/10
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* AI Summary */}
              {opportunity.ai_analysis_summary && (
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">AI Analysis</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">
                      {opportunity.ai_analysis_summary}
                    </p>
                  </div>
                </section>
              )}

              {/* MVP Features */}
              {opportunity.suggested_mvp_features &&
                opportunity.suggested_mvp_features.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Suggested MVP Features
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {opportunity.suggested_mvp_features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* Competitors */}
              {opportunity.similar_existing_products &&
                opportunity.similar_existing_products.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Similar Products
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.similar_existing_products.map((product, i) => (
                        <span
                          key={i}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

              {/* Pricing & Build Time */}
              <div className="grid grid-cols-2 gap-4">
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Suggested Pricing
                  </h3>
                  <p className="text-gray-700">
                    {opportunity.suggested_pricing_model || 'Not specified'}
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Estimated Build Time
                  </h3>
                  <p className="text-gray-700">
                    {opportunity.estimated_build_time || 'Not specified'}
                  </p>
                </section>
              </div>

              {/* Status & Actions */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                <select
                  value={opportunity.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[
                    'new',
                    'reviewing',
                    'researching',
                    'validated',
                    'building',
                    'rejected',
                    'archived',
                  ].map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </select>
              </section>

              {/* Source Link */}
              {opportunity.raw_posts?.url && (
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">Source</h3>
                  <a
                    href={opportunity.raw_posts.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View original post &rarr;
                  </a>
                </section>
              )}
            </div>
          )}

          {activeTab === 'research' && (
            <div className="space-y-6">
              {/* Generate Research Buttons */}
              <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => generateResearch('competitor_analysis', 'claude')}
                    disabled={generating !== null}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {generating === 'competitor_analysis'
                      ? 'Generating...'
                      : 'Competitor Analysis'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateResearch('market_size', 'openai')}
                    disabled={generating !== null}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {generating === 'market_size'
                      ? 'Generating...'
                      : 'Market Analysis'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateResearch('technical_spike', 'claude')}
                    disabled={generating !== null}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {generating === 'technical_spike'
                      ? 'Generating...'
                      : 'Tech Spec'}
                  </button>
                </div>
              </div>

              {/* Research List */}
              {research.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No research generated yet. Click a button above to generate research.
                </div>
              ) : (
                <div className="space-y-4">
                  {research.map((r) => (
                    <div key={r.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{r.title}</h4>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                          {r.research_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {r.content}
                      </div>
                      {r.sources && r.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            Sources:
                          </p>
                          <ul className="text-xs text-gray-500 list-disc list-inside">
                            {r.sources.map((source, i) => (
                              <li key={i}>{source}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Generated {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {opportunity.reactions && opportunity.reactions.length > 0 ? (
                opportunity.reactions
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .map((reaction) => (
                    <div
                      key={reaction.id}
                      className="flex gap-3 text-sm border-b pb-3"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {reaction.action_type === 'status_change' && (
                          <span>&#8635;</span>
                        )}
                        {reaction.action_type === 'starred' && (
                          <span className="text-yellow-500">&#9733;</span>
                        )}
                        {reaction.action_type === 'unstarred' && (
                          <span className="text-gray-400">&#9734;</span>
                        )}
                        {reaction.action_type === 'research_added' && (
                          <span>&#128269;</span>
                        )}
                        {reaction.action_type === 'note' && <span>&#128221;</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 capitalize">
                          {reaction.action_type.replace('_', ' ')}
                          {reaction.action_data &&
                            typeof reaction.action_data === 'object' && (
                              <span className="text-gray-500">
                                {' '}
                                - {JSON.stringify(reaction.action_data)}
                              </span>
                            )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(reaction.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No activity recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
