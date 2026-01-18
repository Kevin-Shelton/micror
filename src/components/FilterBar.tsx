'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export default function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 flex-wrap items-center">
      <select
        value={searchParams.get('status') || ''}
        onChange={(e) => updateFilter('status', e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        <option value="new">New</option>
        <option value="reviewing">Reviewing</option>
        <option value="researching">Researching</option>
        <option value="validated">Validated</option>
        <option value="building">Building</option>
        <option value="rejected">Rejected</option>
        <option value="archived">Archived</option>
      </select>

      <select
        value={searchParams.get('priority') || ''}
        onChange={(e) => updateFilter('priority', e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get('starred') === 'true'}
          onChange={(e) => updateFilter('starred', e.target.checked ? 'true' : '')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Starred only
      </label>

      <input
        type="search"
        placeholder="Search opportunities..."
        value={searchParams.get('search') || ''}
        onChange={(e) => updateFilter('search', e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={() => router.push('/')}
        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
      >
        Clear filters
      </button>
    </div>
  )
}
