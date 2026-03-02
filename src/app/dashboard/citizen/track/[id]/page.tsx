'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  calculateSLAStatus, getPriorityColor, getStatusColor,
  formatDateTime, timeAgo
} from '@/lib/utils'
import {
  ArrowLeft, Clock, Shield, MapPin, FileText, Image, Video,
  CheckCircle2, Circle, AlertTriangle, ExternalLink, Copy,
  MessageSquare
} from 'lucide-react'
import dynamic from 'next/dynamic'

const MapViewComponent = dynamic(() => import('@/components/MapView'), { ssr: false })

type GrievanceDetail = {
  id: string
  complaint_id: string
  department: string
  title: string
  description: string
  description_english: string
  original_language: string
  status: string
  priority_label: string
  priority_score: number
  sla_hours: number
  sla_deadline: string
  evidence_url: string | null
  evidence_type: string | null
  latitude: number | null
  longitude: number | null
  location_address: string | null
  complaint_hash: string
  blockchain_tx_hash: string
  blockchain_timestamp: string
  is_escalated: boolean
  created_at: string
  updated_at: string
}

type TimelineEntry = {
  id: string
  status: string
  message: string
  updated_by_role: string
  created_at: string
}

export default function TrackComplaintPage() {
  const params = useParams()
  const router = useRouter()
  const [grievance, setGrievance] = useState<GrievanceDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (params.id) fetchGrievance(params.id as string)
  }, [params.id])

  const fetchGrievance = async (id: string) => {
    setLoading(true)
    try {
      const { data: g, error } = await supabase
        .from('grievances')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && g) {
        setGrievance(g)

        const { data: t } = await supabase
          .from('grievance_timeline')
          .select('*')
          .eq('grievance_id', id)
          .order('created_at', { ascending: true })

        if (t) setTimeline(t)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading complaint details...</div>
  }

  if (!grievance) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-gray-700">Complaint Not Found</h2>
        <p className="text-gray-400 mt-1">The complaint you're looking for doesn't exist.</p>
        <button
          onClick={() => router.push('/dashboard/citizen/complaints')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm"
        >
          Back to Complaints
        </button>
      </div>
    )
  }

  const sla = calculateSLAStatus(grievance.sla_deadline)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                {grievance.complaint_id}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(grievance.status)}`}>
                {grievance.status}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getPriorityColor(grievance.priority_label)}`}>
                {grievance.priority_label} ({grievance.priority_score}/100)
              </span>
              {grievance.is_escalated && (
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium border border-red-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Escalated
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{grievance.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              📁 {grievance.department} · Filed {timeAgo(grievance.created_at)}
            </p>
          </div>

          {/* SLA Status */}
          <div className={`rounded-xl p-4 text-center min-w-[140px] ${
            sla.status === 'on-track' ? 'bg-green-50 border border-green-200' :
            sla.status === 'warning' ? 'bg-orange-50 border border-orange-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <Clock className={`w-5 h-5 mx-auto mb-1 ${
              sla.status === 'on-track' ? 'text-green-600' :
              sla.status === 'warning' ? 'text-orange-600' :
              'text-red-600'
            }`} />
            <p className="text-xs text-gray-500">SLA Status</p>
            <p className={`text-sm font-bold ${
              sla.status === 'on-track' ? 'text-green-700' :
              sla.status === 'warning' ? 'text-orange-700' :
              'text-red-700'
            }`}>
              {sla.status === 'breached' ? 'BREACHED' : sla.remaining}
            </p>
            <p className="text-xs text-gray-400 mt-1">{grievance.sla_hours}h SLA</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Complaint Description</h2>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{grievance.description}</p>
            {grievance.description_english && grievance.original_language !== 'en' && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium mb-1">🌐 English Translation</p>
                <p className="text-sm text-gray-700">{grievance.description_english}</p>
              </div>
            )}
          </div>

          {/* Evidence */}
          {grievance.evidence_url && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {grievance.evidence_type === 'image' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                Evidence
              </h2>
              {grievance.evidence_type === 'image' ? (
                <img
                  src={grievance.evidence_url}
                  alt="Evidence"
                  className="max-h-80 rounded-lg border border-gray-200"
                />
              ) : (
                <video controls className="max-h-80 rounded-lg border border-gray-200">
                  <source src={grievance.evidence_url} />
                </video>
              )}
            </div>
          )}

          {/* Location with Map */}
          {(grievance.latitude || grievance.location_address) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Complaint Location
              </h2>
              {grievance.location_address && (
                <p className="text-sm text-gray-700 mb-3">{grievance.location_address}</p>
              )}
              {grievance.latitude && grievance.longitude && (
                <div className="space-y-3">
                  <MapViewComponent
                    complaints={[]}
                    singleMarker={{
                      lat: grievance.latitude,
                      lng: grievance.longitude,
                      label: grievance.title
                    }}
                    height="250px"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Coords: {grievance.latitude.toFixed(6)}, {grievance.longitude.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${grievance.latitude},${grievance.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400">No timeline entries yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {timeline.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                        index === timeline.length - 1
                          ? 'bg-blue-600'
                          : 'bg-green-500'
                      }`}>
                        {index === timeline.length - 1 ? (
                          <Circle className="w-3 h-3 text-white fill-white" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                          <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{entry.message}</p>
                        <p className="text-xs text-gray-400">By: {entry.updated_by_role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Actions</h3>
            <div className="space-y-2">
              {(grievance.status === 'Resolved' || grievance.status === 'Closed') && (
                <button
                  onClick={() => router.push(`/dashboard/citizen/feedback?complaint=${grievance.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Give Feedback
                </button>
              )}
              <button
                onClick={() => copyToClipboard(grievance.complaint_id, 'id')}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied === 'id' ? 'Copied!' : 'Copy Complaint ID'}
              </button>
            </div>
          </div>

          {/* Priority Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Priority Analysis</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Priority Score</span>
                  <span className="text-sm font-bold text-gray-900">{grievance.priority_score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      grievance.priority_score >= 80 ? 'bg-red-500' :
                      grievance.priority_score >= 60 ? 'bg-orange-500' :
                      grievance.priority_score >= 40 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${grievance.priority_score}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Label</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(grievance.priority_label)}`}>
                  {grievance.priority_label}
                </span>
              </div>
            </div>
          </div>

          {/* Blockchain Proof */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> Blockchain Record
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Complaint Hash</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-mono text-gray-600 truncate flex-1">{grievance.complaint_hash}</p>
                  <button onClick={() => copyToClipboard(grievance.complaint_hash, 'hash')} className="text-gray-400 hover:text-blue-600">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {copied === 'hash' && <p className="text-xs text-green-600">Copied!</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-mono text-blue-600 truncate flex-1">{grievance.blockchain_tx_hash}</p>
                  <button onClick={() => copyToClipboard(grievance.blockchain_tx_hash, 'tx')} className="text-gray-400 hover:text-blue-600">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {copied === 'tx' && <p className="text-xs text-green-600">Copied!</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Recorded At</p>
                <p className="text-xs text-gray-700">
                  {grievance.blockchain_timestamp ? formatDateTime(grievance.blockchain_timestamp) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Filing Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filing Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Filed On</span>
                <span className="text-gray-900">{formatDateTime(grievance.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-gray-900">{formatDateTime(grievance.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SLA Deadline</span>
                <span className={`font-medium ${sla.status === 'breached' ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDateTime(grievance.sla_deadline)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
