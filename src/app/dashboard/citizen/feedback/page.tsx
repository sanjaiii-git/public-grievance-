'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDateTime, timeAgo } from '@/lib/utils'
import {
  Star, MessageSquare, Send, CheckCircle, Loader2, AlertCircle
} from 'lucide-react'

type ResolvedComplaint = {
  id: string
  complaint_id: string
  title: string
  department: string
  status: string
  created_at: string
}

type ExistingFeedback = {
  id: string
  grievance_id: string
  rating: number
  feedback_text: string
  created_at: string
}

export default function FeedbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const preselectedId = searchParams.get('complaint')

  const [resolvedComplaints, setResolvedComplaints] = useState<ResolvedComplaint[]>([])
  const [feedbacks, setFeedbacks] = useState<ExistingFeedback[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState(preselectedId || '')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get resolved/closed complaints
      const { data: complaints } = await supabase
        .from('grievances')
        .select('id, complaint_id, title, department, status, created_at')
        .eq('citizen_id', user.id)
        .in('status', ['Resolved', 'Closed'])
        .order('created_at', { ascending: false })

      if (complaints) setResolvedComplaints(complaints)

      // Get existing feedbacks
      const { data: fb } = await supabase
        .from('feedback')
        .select('*')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })

      if (fb) setFeedbacks(fb)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter out complaints that already have feedback
  const feedbackGrievanceIds = new Set(feedbacks.map(f => f.grievance_id))
  const availableComplaints = resolvedComplaints.filter(c => !feedbackGrievanceIds.has(c.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint) { setError('Please select a complaint'); return }
    if (rating === 0) { setError('Please provide a rating'); return }

    setSubmitting(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Please login again'); setSubmitting(false); return }

      const { error: dbError } = await supabase.from('feedback').insert({
        grievance_id: selectedComplaint,
        citizen_id: user.id,
        rating,
        feedback_text: comment.trim() || null
      })

      if (dbError) {
        setError('Failed to submit feedback: ' + dbError.message)
      } else {
        setSuccess(true)
        setRating(0)
        setComment('')
        setSelectedComplaint('')
        fetchData() // Refresh
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-gray-500 mt-1">Rate your experience for resolved complaints</p>
      </div>

      {/* Submit Feedback Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Feedback</h2>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4" /> Feedback submitted successfully! Thank you.
          </div>
        )}

        {availableComplaints.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No resolved complaints available for feedback.
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Feedback can only be given for resolved or closed complaints.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Select Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Complaint <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedComplaint}
                onChange={(e) => { setSelectedComplaint(e.target.value); setError(''); setSuccess(false) }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Choose a complaint</option>
                {availableComplaints.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.complaint_id}] {c.title} - {c.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => { setRating(star); setError(''); setSuccess(false) }}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (hoverRating || rating) >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm text-gray-500">
                  {rating > 0 && (
                    ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][rating]
                  )}
                </span>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience... Was the issue resolved satisfactorily?"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Feedback
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Previous Feedbacks */}
      {feedbacks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Previous Feedbacks</h2>
          <div className="space-y-4">
            {feedbacks.map(fb => {
              const complaint = resolvedComplaints.find(c => c.id === fb.grievance_id)
              return (
                <div key={fb.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {complaint ? `[${complaint.complaint_id}] ${complaint.title}` : 'Complaint'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                        <span className="ml-2 text-xs text-gray-500">{timeAgo(fb.created_at)}</span>
                      </div>
                      {fb.feedback_text && (
                        <p className="text-sm text-gray-600 mt-2">{fb.feedback_text}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
