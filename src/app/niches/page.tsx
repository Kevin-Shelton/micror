import { CRITICAL_NICHES } from '@/lib/niches'
import Link from 'next/link'

export default function NichesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Niche Configuration
              </h1>
              <p className="text-sm text-gray-500">
                Manage your focus areas for opportunity detection
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            How Niches Work
          </h2>
          <p className="text-gray-600 mb-4">
            Posts matching your critical niches are prioritized during analysis.
            High-priority niches get analyzed first, ensuring you never miss opportunities
            in your focus areas.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>To edit niches:</strong> Modify the file{' '}
              <code className="bg-blue-100 px-1 rounded">src/lib/niches.ts</code>{' '}
              in your codebase and redeploy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['high', 'medium', 'low'] as const).map((priority) => {
            const niches = CRITICAL_NICHES.filter((n) => n.priority === priority)
            const colors = {
              high: 'border-red-200 bg-red-50',
              medium: 'border-yellow-200 bg-yellow-50',
              low: 'border-green-200 bg-green-50',
            }
            const badgeColors = {
              high: 'bg-red-100 text-red-800',
              medium: 'bg-yellow-100 text-yellow-800',
              low: 'bg-green-100 text-green-800',
            }
            const boosts = {
              high: '2.0x',
              medium: '1.5x',
              low: '1.2x',
            }

            return (
              <div key={priority} className={`rounded-lg border-2 ${colors[priority]} p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {priority} Priority
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${badgeColors[priority]}`}>
                    {boosts[priority]} boost
                  </span>
                </div>
                <div className="space-y-4">
                  {niches.map((niche) => (
                    <div key={niche.name} className="bg-white rounded-md p-3 shadow-sm">
                      <h4 className="font-medium text-gray-900 mb-2">{niche.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {niche.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {niches.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No niches configured</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add a New Niche
          </h2>
          <p className="text-gray-600 mb-4">
            To add a new niche, edit <code className="bg-gray-100 px-1 rounded">src/lib/niches.ts</code> and add an entry like:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`{
  name: 'Your Niche Name',
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  priority: 'high', // or 'medium' or 'low'
},`}
          </pre>
        </div>
      </div>
    </main>
  )
}
