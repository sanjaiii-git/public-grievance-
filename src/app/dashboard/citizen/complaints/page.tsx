'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  calculateSLAStatus, getPriorityColor, getStatusColor, timeAgo
} from '@/lib/utils'
import {
  Search, Filter, ArrowUpDown, FileText, Eye,
  Clock, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react'

type Grievance = {
  id: string
  complaint_id: string
  department: string
  title: string
  status: string
  priority_label: string
  priority_score: number
  sla_deadline: string
  created_at: string
  is_escalated: boolean
}

export default function MyComplaintsPage() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<Grievance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'latest' | 'priority' | 'sla'>('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    fetchComplaints()
  }, [])

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('grievances')
        .select('id, complaint_id, department, title, status, priority_label, priority_score, sla_deadline, created_at, is_escalated')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setComplaints(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort
  const filtered = complaints
    .filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return c.complaint_id.toLowerCase().includes(q) ||
               c.title.toLowerCase().includes(q) ||
               c.department.toLowerCase().includes(q)
      }
      return true
    })
    .filter(c => statusFilter === 'All' || c.status === statusFilter)
    .filter(c => departmentFilter === 'All' || c.department === departmentFilter)
    .sort((a, b) => {
      if (sortBy === 'latest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'priority') return b.priority_score - a.priority_score
      if (sortBy === 'sla') {
        const slaA = new Date(a.sla_deadline).getTime() - Date.now()
        const slaB = new Date(b.sla_deadline).getTime() - Date.now()
        return slaA - slaB // Closest SLA first
      }
      return 0
    })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const statuses = ['All', 'Registered', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated']
  const departments = ['All', ...Array.from(new Set(complaints.map(c => c.department)))]

  // Stats
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => ['Registered', 'Assigned', 'In Progress'].includes(c.status)).length,
    resolved: complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length,
    breached: complaints.filter(c => {
      const sla = calculateSLAStatus(c.sla_deadline)
      return sla.status === 'breached'
    }).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
        <p className="text-gray-500 mt-1">View and manage all your filed grievances</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Filed</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
          <p className="text-xs text-yellow-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
          <p className="text-xs text-green-600 mb-1">Resolved</p>
          <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
          <p className="text-xs text-red-600 mb-1">SLA Breached</p>
          <p className="text-2xl font-bold text-red-700">{stats.breached}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Search by ID, title, department..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="latest">Latest First</option>
            <option value="priority">Highest Priority</option>
            <option value="sla">Closest SLA</option>
          </select>
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading complaints...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600">No Complaints Found</h3>
          <p className="text-gray-400 text-sm mt-1">
            {complaints.length === 0 ? "You haven't filed any complaints yet." : "No complaints match your filters."}
          </p>
          {complaints.length === 0 && (
            <button
              onClick={() => router.push('/dashboard/citizen/submit')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Submit Your First Complaint
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((complaint) => {
            const sla = calculateSLAStatus(complaint.sla_deadline)
            return (
              <div
                key={complaint.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 cursor-pointer"
                onClick={() => router.push(`/dashboard/citizen/track/${complaint.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {complaint.complaint_id}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(complaint.priority_label)}`}>
                        {complaint.priority_label}
                      </span>
                      {complaint.is_escalated && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Escalated
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{complaint.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>📁 {complaint.department}</span>
                      <span>🕐 {timeAgo(complaint.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* SLA indicator */}
                    <div className={`text-xs px-2 py-1 rounded-lg font-medium ${
                      sla.status === 'on-track' ? 'bg-green-50 text-green-700' :
                      sla.status === 'warning' ? 'bg-orange-50 text-orange-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {sla.status === 'breached' ? 'SLA Breached' : sla.remaining}
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/citizen/track/${complaint.id}`) }}
                    >
                      <Eye className="w-3 h-3" /> View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
