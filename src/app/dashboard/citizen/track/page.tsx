'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ArrowRight, AlertCircle } from 'lucide-react'

export default function TrackPage() {
  const router = useRouter()
  const [searchId, setSearchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchId.trim()) { setError('Enter a Complaint ID'); return }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Search by complaint_id or UUID
      const { data } = await supabase
        .from('grievances')
        .select('id, complaint_id')
        .eq('citizen_id', user.id)
        .or(`complaint_id.ilike.%${searchId.trim()}%,id.eq.${searchId.trim().length === 36 ? searchId.trim() : '00000000-0000-0000-0000-000000000000'}`)
        .limit(1)
        .single()

      if (data) {
        router.push(`/dashboard/citizen/track/${data.id}`)
      } else {
        setError('No complaint found with that ID. Check and try again.')
      }
    } catch {
      setError('No complaint found with that ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Complaint</h1>
          <p className="text-gray-500 mt-2">Enter your Complaint ID to view real-time status</p>
        </div>

        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Complaint ID</label>
            <input
              type="text"
              value={searchId}
              onChange={(e) => { setSearchId(e.target.value.toUpperCase()); setError('') }}
              placeholder="e.g. ELE250812345"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center font-mono text-lg tracking-wider"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Searching...' : <>Track <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            You can also find your complaints in{' '}
            <button onClick={() => router.push('/dashboard/citizen/complaints')} className="text-blue-600 hover:underline font-medium">
              My Complaints
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
