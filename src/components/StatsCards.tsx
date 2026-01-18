'use client'

interface StatsCardsProps {
  total: number
  new_count: number
  starred: number
  avgScore?: string
}

export default function StatsCards({
  total,
  new_count,
  starred,
  avgScore,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500">Total Opportunities</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">{total}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500">New (Unreviewed)</h3>
        <p className="text-3xl font-bold text-blue-600 mt-2">{new_count}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500">Starred</h3>
        <p className="text-3xl font-bold text-yellow-600 mt-2">{starred}</p>
      </div>
      {avgScore && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg Score</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{avgScore}</p>
        </div>
      )}
    </div>
  )
}
