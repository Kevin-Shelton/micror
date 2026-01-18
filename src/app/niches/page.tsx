'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Niche {
  id: string
  name: string
  keywords: string[]
  priority: 'high' | 'medium' | 'low'
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

const priorityColors = {
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

export default function NichesPage() {
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    keywords: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    fetchNiches()
  }, [])

  async function fetchNiches() {
    try {
      const res = await fetch('/api/niches')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setNiches(data.niches || [])
      }
    } catch {
      setError('Failed to fetch niches')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch('/api/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setNiches([...niches, data.niche])
        setShowAddForm(false)
        resetForm()
      }
    } catch {
      alert('Failed to create niche')
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/niches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setNiches(niches.map(n => n.id === id ? data.niche : n))
        setEditingId(null)
        resetForm()
      }
    } catch {
      alert('Failed to update niche')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this niche?')) return

    try {
      const res = await fetch(`/api/niches/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setNiches(niches.filter(n => n.id !== id))
      }
    } catch {
      alert('Failed to delete niche')
    }
  }

  async function toggleActive(niche: Niche) {
    try {
      const res = await fetch(`/api/niches/${niche.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !niche.is_active }),
      })
      const data = await res.json()
      if (!data.error) {
        setNiches(niches.map(n => n.id === niche.id ? data.niche : n))
      }
    } catch {
      alert('Failed to toggle niche status')
    }
  }

  function startEdit(niche: Niche) {
    setEditingId(niche.id)
    setFormData({
      name: niche.name,
      keywords: niche.keywords.join(', '),
      priority: niche.priority,
      description: niche.description || '',
      is_active: niche.is_active,
    })
  }

  function resetForm() {
    setFormData({
      name: '',
      keywords: '',
      priority: 'medium',
      description: '',
      is_active: true,
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading niches...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Database Setup Required</h2>
            <p className="text-red-700 mb-4">
              The niches table doesn&apos;t exist yet. Please run the migration SQL in your Supabase SQL Editor.
            </p>
            <p className="text-sm text-red-600 mb-4">Error: {error}</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
              <p className="text-gray-400 mb-2">-- Run this SQL in Supabase:</p>
              <code>See file: supabase-niches-migration.sql</code>
            </div>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const nichesByPriority = {
    high: niches.filter(n => n.priority === 'high'),
    medium: niches.filter(n => n.priority === 'medium'),
    low: niches.filter(n => n.priority === 'low'),
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Niche Configuration</h1>
              <p className="text-sm text-gray-500">Manage your focus areas for opportunity detection</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddForm(true); resetForm(); }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Niche
              </button>
              <Link
                href="/"
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add/Edit Form Modal */}
        {(showAddForm || editingId) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Niche' : 'Add New Niche'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., AI/Automation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keywords (comma-separated)
                  </label>
                  <textarea
                    value={formData.keywords}
                    onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="ai, automation, chatbot, gpt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="high">High (2.0x boost)</option>
                    <option value="medium">Medium (1.5x boost)</option>
                    <option value="low">Low (1.2x boost)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of this niche"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Active (include in analysis)
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">How Niches Work</h2>
          <p className="text-gray-600">
            Posts matching your critical niches are prioritized during analysis.
            High-priority niches get analyzed first, ensuring you never miss opportunities
            in your focus areas. The boost multiplier increases the priority score of matching posts.
          </p>
        </div>

        {/* Niches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['high', 'medium', 'low'] as const).map((priority) => (
            <div key={priority} className={`rounded-lg border-2 ${priorityColors[priority]} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 capitalize">{priority} Priority</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${badgeColors[priority]}`}>
                  {boosts[priority]} boost
                </span>
              </div>
              <div className="space-y-4">
                {nichesByPriority[priority].map(niche => (
                  <div
                    key={niche.id}
                    className={`bg-white rounded-md p-3 shadow-sm ${!niche.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{niche.name}</h4>
                        {niche.description && (
                          <p className="text-xs text-gray-500 mt-1">{niche.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleActive(niche)}
                          className={`text-xs px-2 py-1 rounded ${
                            niche.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {niche.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {niche.keywords.slice(0, 6).map(keyword => (
                        <span
                          key={keyword}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {niche.keywords.length > 6 && (
                        <span className="text-xs text-gray-400">
                          +{niche.keywords.length - 6} more
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(niche)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(niche.id)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {nichesByPriority[priority].length === 0 && (
                  <p className="text-sm text-gray-500 italic">No niches configured</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
