'use client'

import { useState } from 'react'
import { Opportunity } from '@/lib/supabase/types'
import OpportunityDetail from './OpportunityDetail'

interface Props {
  opportunities: Opportunity[]
  onRefresh?: () => void
}

export default function OpportunitiesTable({ opportunities, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'bg-green-100 text-green-800'
    if (score >= 5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-purple-100 text-purple-800',
      researching: 'bg-indigo-100 text-indigo-800',
      validated: 'bg-green-100 text-green-800',
      building: 'bg-orange-100 text-orange-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || colors.new
  }

  if (opportunities.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
        No opportunities found. Run the scraper and analyzer to find opportunities.
      </div>
    )
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Opportunity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Build Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {opportunities.map((opp) => (
              <tr
                key={opp.id}
                onClick={() => setSelectedId(opp.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-start">
                    {opp.is_starred && (
                      <span className="text-yellow-500 mr-2 flex-shrink-0">
                        &#9733;
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                        {opp.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {opp.problem_statement}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(opp.overall_score)}`}
                  >
                    {opp.overall_score?.toFixed(1) || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityBadge(opp.priority)}`}
                  >
                    {opp.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(opp.status)}`}
                  >
                    {opp.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {opp.estimated_build_time || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(opp.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <OpportunityDetail
          opportunityId={selectedId}
          onClose={() => {
            setSelectedId(null)
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}
