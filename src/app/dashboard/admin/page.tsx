'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  calculateSLAStatus, getPriorityColor, getStatusColor,
  formatDateTime, timeAgo, hashComplaint, getLanguageName
} from '@/lib/utils'
import { formatDistance, getDepartmentEmoji } from '@/lib/gis'
import {
  Shield, LogOut, FileText, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Eye, Search, Users, BarChart3,
  X, MessageSquare, Send, Home, MapPin, Map,
  Bell, Menu, Building2, Image, User,
  Inbox, Timer, Activity, ChevronRight, ChevronDown,
  Languages, Lock, Paperclip, RefreshCw, Filter
} from 'lucide-react'
import dynamic from 'next/dynamic'

const MapViewComponent = dynamic(() => import('@/components/MapView'), { ssr: false })

// ===== TYPES =====
type Grievance = {
  id: string
  complaint_id: string
  department: string
  title: string
  description: string
  description_english: string | null
  original_language: string
  status: string
  priority_label: string
  priority_score: number
  sla_deadline: string
  sla_hours: number
  evidence_url: string | null
  evidence_type: string | null
  location_address: string | null
  latitude: number | null
  longitude: number | null
  detected_address: string | null
  ward_id: string | null
  zone_id: string | null
  is_escalated: boolean
  sla_violated: boolean
  complaint_hash: string | null
  blockchain_tx_hash: string | null
  blockchain_timestamp: string | null
  assigned_admin_id: string | null
  assigned_at: string | null
  resolved_at: string | null
  resolution_notes: string | null
  escalated_at: string | null
  created_at: string
  updated_at: string
  citizen_id: string
}

type AdminProfile = {
  id: string
  admin_id: string
  department: string
  email: string
}

type NearestOffice = {
  office_id: string
  office_name: string
  latitude: number
  longitude: number
  address: string
  distance_km: number
}

type TimelineEntry = {
  id: string
  status: string
  message: string
  updated_by_role: string
  created_at: string
}

type CitizenInfo = {
  username: string
  phone_number: string
}

type FeedbackEntry = {
  rating: number
  feedback_text: string
  created_at: string
}

type ActiveView = 'overview' | 'inbox' | 'sla' | 'map' | 'notifications' | 'analytics' | 'profile'

// ===== PRIORITY ORDERING =====
const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

function sortByPriority(a: Grievance, b: Grievance): number {
  const pa = PRIORITY_ORDER[a.priority_label] ?? 4
  const pb = PRIORITY_ORDER[b.priority_label] ?? 4
  if (pa !== pb) return pa - pb
  if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score
  const slaA = new Date(a.sla_deadline).getTime()
  const slaB = new Date(b.sla_deadline).getTime()
  if (slaA !== slaB) return slaA - slaB
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminData, setAdminData] = useState<AdminProfile | null>(null)
  const [grievances, setGrievances] = useState<Grievance[]>([])
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [slaFilter, setSlaFilter] = useState('All')
  const [evidenceFilter, setEvidenceFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateNote, setUpdateNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [mapColorBy, setMapColorBy] = useState<'priority' | 'status'>('priority')
  const [nearestOffice, setNearestOffice] = useState<NearestOffice | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [citizenInfo, setCitizenInfo] = useState<CitizenInfo | null>(null)
  const [feedback, setFeedback] = useState<FeedbackEntry | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true) // default: translated English
  const [verifyingHash, setVerifyingHash] = useState(false)
  const [hashResult, setHashResult] = useState<'match' | 'mismatch' | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'evidence' | 'location' | 'timeline' | 'blockchain'>('info')
  const [radiusFilter, setRadiusFilter] = useState<number>(0)
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const role = sessionStorage.getItem('userRole')
    if (role !== 'admin') { router.push('/login'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase
      .from('admins')
      .select('id, admin_id, department, email')
      .eq('id', user.id)
      .single()
    if (profile) {
      setAdminData(profile)
      await fetchGrievances(profile.department)
    }
    setLoading(false)
  }

  const fetchGrievances = async (department: string) => {
    const { data } = await supabase
      .from('grievances')
      .select('*')
      .eq('department', department)
      .order('created_at', { ascending: false })
    if (data) setGrievances(data)
  }

  const refreshData = async () => {
    if (adminData) await fetchGrievances(adminData.department)
  }

  // ===== LOAD DETAIL DATA =====
  const openComplaintDetail = async (g: Grievance) => {
    setSelectedGrievance(g)
    setDetailTab('info')
    setHashResult(null)
    setNearestOffice(null)
    setCitizenInfo(null)
    setFeedback(null)
    setTimeline([])
    setReplyMessage('')
    setUpdateStatus('')
    setUpdateNote('')

    // Load timeline
    const { data: tl } = await supabase
      .from('grievance_timeline')
      .select('id, status, message, updated_by_role, created_at')
      .eq('grievance_id', g.id)
      .order('created_at', { ascending: true })
    if (tl) setTimeline(tl)

    // Load citizen info (minimal)
    const { data: cit } = await supabase
      .from('citizens')
      .select('username, phone_number')
      .eq('id', g.citizen_id)
      .single()
    if (cit) setCitizenInfo(cit)

    // Load feedback
    const { data: fb } = await supabase
      .from('feedback')
      .select('rating, feedback_text, created_at')
      .eq('grievance_id', g.id)
      .single()
    if (fb) setFeedback(fb)

    // Load nearest office
    if (g.latitude && g.longitude) {
      try {
        const { data: offices } = await supabase.rpc('find_nearest_office', {
          complaint_lat: g.latitude,
          complaint_lng: g.longitude,
          dept: g.department
        })
        if (offices && offices.length > 0) setNearestOffice(offices[0])
      } catch {}
    }
  }

  // ===== ADMIN ACTIONS =====
  const handleStatusUpdate = async () => {
    if (!selectedGrievance || !updateStatus) return
    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updateData: any = { status: updateStatus, updated_at: new Date().toISOString() }
      if (updateStatus === 'Assigned') {
        updateData.assigned_admin_id = user.id
        updateData.assigned_at = new Date().toISOString()
      }
      if (updateStatus === 'Resolved') {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolution_notes = updateNote || 'Resolved by department admin'
      }
      if (updateStatus === 'Escalated') {
        updateData.is_escalated = true
        updateData.escalated_at = new Date().toISOString()
      }

      const { error } = await supabase.from('grievances').update(updateData).eq('id', selectedGrievance.id)
      if (error) { alert('Failed: ' + error.message); setUpdating(false); return }

      // Log to timeline
      await supabase.from('grievance_timeline').insert({
        grievance_id: selectedGrievance.id,
        status: updateStatus,
        message: updateNote || `Status changed to ${updateStatus}`,
        updated_by: user.id,
        updated_by_role: 'admin'
      })

      await refreshData()
      setSelectedGrievance(null)
      setUpdateStatus('')
      setUpdateNote('')
    } catch { alert('Error occurred') }
    finally { setUpdating(false) }
  }

  // Reply to citizen
  const handleSendReply = async () => {
    if (!selectedGrievance || !replyMessage.trim()) return
    setSendingReply(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('grievance_timeline').insert({
        grievance_id: selectedGrievance.id,
        status: selectedGrievance.status,
        message: `[Admin Reply] ${replyMessage}`,
        updated_by: user.id,
        updated_by_role: 'admin'
      })
      // Refresh timeline
      const { data: tl } = await supabase
        .from('grievance_timeline')
        .select('id, status, message, updated_by_role, created_at')
        .eq('grievance_id', selectedGrievance.id)
        .order('created_at', { ascending: true })
      if (tl) setTimeline(tl)
      setReplyMessage('')
    } catch { alert('Failed to send') }
    finally { setSendingReply(false) }
  }

  // Blockchain hash verify
  const verifyBlockchainHash = async () => {
    if (!selectedGrievance) return
    setVerifyingHash(true)
    try {
      const currentHash = await hashComplaint({
        complaint_id: selectedGrievance.complaint_id,
        title: selectedGrievance.title,
        description: selectedGrievance.description,
        department: selectedGrievance.department,
        citizen_id: selectedGrievance.citizen_id,
        created_at: selectedGrievance.created_at
      })
      setHashResult(currentHash === selectedGrievance.complaint_hash ? 'match' : 'mismatch')
    } catch { setHashResult('mismatch') }
    finally { setVerifyingHash(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('userRole')
    router.push('/login')
  }

  // ===== FILTERING & ORDERING =====
  const filtered = useMemo(() => {
    return grievances
      .filter(g => statusFilter === 'All' || g.status === statusFilter)
      .filter(g => priorityFilter === 'All' || g.priority_label === priorityFilter)
      .filter(g => {
        if (slaFilter === 'All') return true
        const sla = calculateSLAStatus(g.sla_deadline)
        if (slaFilter === 'breached') return sla.status === 'breached' && !['Resolved', 'Closed'].includes(g.status)
        if (slaFilter === 'warning') return sla.status === 'warning' && !['Resolved', 'Closed'].includes(g.status)
        return true
      })
      .filter(g => !evidenceFilter || !!g.evidence_url)
      .filter(g => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return g.complaint_id.toLowerCase().includes(q) ||
               g.title.toLowerCase().includes(q) ||
               (g.location_address || '').toLowerCase().includes(q) ||
               (g.detected_address || '').toLowerCase().includes(q)
      })
      .sort(sortByPriority)
  }, [grievances, statusFilter, priorityFilter, slaFilter, evidenceFilter, searchQuery])

  const mapComplaints = useMemo(() => {
    let mc = filtered.filter(g => g.latitude && g.longitude)
    if (radiusFilter > 0 && radiusCenter) {
      const { haversineDistance } = require('@/lib/gis')
      mc = mc.filter(g => {
        const d = haversineDistance(radiusCenter.lat, radiusCenter.lng, g.latitude!, g.longitude!)
        return d <= radiusFilter
      })
    }
    return mc
  }, [filtered, radiusFilter, radiusCenter])

  // ===== COMPUTED STATS =====
  const stats = useMemo(() => {
    const total = grievances.length
    const registered = grievances.filter(g => g.status === 'Registered').length
    const assigned = grievances.filter(g => g.status === 'Assigned').length
    const inProgress = grievances.filter(g => g.status === 'In Progress').length
    const resolved = grievances.filter(g => ['Resolved', 'Closed'].includes(g.status)).length
    const escalated = grievances.filter(g => g.is_escalated).length
    const critical = grievances.filter(g => g.priority_label === 'Critical' && !['Resolved', 'Closed'].includes(g.status)).length
    const slaBreached = grievances.filter(g => {
      const sla = calculateSLAStatus(g.sla_deadline)
      return sla.status === 'breached' && !['Resolved', 'Closed'].includes(g.status)
    }).length
    const slaWarning = grievances.filter(g => {
      const sla = calculateSLAStatus(g.sla_deadline)
      return sla.status === 'warning' && !['Resolved', 'Closed'].includes(g.status)
    }).length
    const today = grievances.filter(g => {
      const d = new Date(g.created_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    const withEvidence = grievances.filter(g => !!g.evidence_url).length
    // Analytics
    const thisWeek = grievances.filter(g => {
      const d = new Date(g.created_at)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      return d >= weekAgo
    }).length
    const thisMonth = grievances.filter(g => {
      const d = new Date(g.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const avgResolution = (() => {
      const resolvedG = grievances.filter(g => g.resolved_at)
      if (resolvedG.length === 0) return 'N/A'
      const totalH = resolvedG.reduce((s, g) => {
        return s + (new Date(g.resolved_at!).getTime() - new Date(g.created_at).getTime()) / 3600000
      }, 0)
      return `${Math.round(totalH / resolvedG.length)}h`
    })()
    const slaCompliance = total > 0 ? Math.round(((total - slaBreached) / total) * 100) : 100
    return { total, registered, assigned, inProgress, resolved, escalated, critical, slaBreached, slaWarning, today, withEvidence, thisWeek, thisMonth, avgResolution, slaCompliance }
  }, [grievances])

  const urgentList = useMemo(() => {
    return grievances
      .filter(g => {
        if (['Resolved', 'Closed'].includes(g.status)) return false
        const sla = calculateSLAStatus(g.sla_deadline)
        return g.priority_label === 'Critical' || sla.status === 'breached' || sla.status === 'warning'
      })
      .sort(sortByPriority)
  }, [grievances])

  const slaEndingSoon = useMemo(() => {
    return grievances
      .filter(g => {
        if (['Resolved', 'Closed'].includes(g.status)) return false
        const sla = calculateSLAStatus(g.sla_deadline)
        return sla.status === 'warning'
      })
      .sort((a, b) => new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime())
  }, [grievances])

  const notifications = useMemo(() => {
    const notifs: Array<{ type: string; title: string; message: string; time: string; complaint?: Grievance }> = []
    // New complaints today
    grievances.filter(g => {
      const d = new Date(g.created_at)
      const now = new Date()
      return d.toDateString() === now.toDateString() && g.status === 'Registered'
    }).forEach(g => notifs.push({ type: 'new', title: 'New Complaint', message: g.title, time: g.created_at, complaint: g }))
    // Critical
    grievances.filter(g => g.priority_label === 'Critical' && !['Resolved', 'Closed'].includes(g.status))
      .forEach(g => notifs.push({ type: 'critical', title: 'Critical Complaint', message: `${g.complaint_id}: ${g.title}`, time: g.created_at, complaint: g }))
    // SLA breached
    grievances.filter(g => {
      const sla = calculateSLAStatus(g.sla_deadline)
      return sla.status === 'breached' && !['Resolved', 'Closed'].includes(g.status)
    }).forEach(g => notifs.push({ type: 'sla', title: 'SLA Violated', message: `${g.complaint_id} exceeded deadline`, time: g.sla_deadline, complaint: g }))
    // SLA warning
    slaEndingSoon.forEach(g => notifs.push({ type: 'sla_warn', title: 'SLA Ending Soon', message: `${g.complaint_id} deadline approaching`, time: g.sla_deadline, complaint: g }))

    return notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [grievances, slaEndingSoon])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  const navItems: Array<{ key: ActiveView; label: string; icon: any; badge?: number }> = [
    { key: 'overview', label: 'Dashboard', icon: Home },
    { key: 'inbox', label: 'Complaint Inbox', icon: Inbox, badge: stats.registered },
    { key: 'sla', label: 'SLA Monitor', icon: Timer, badge: stats.slaBreached },
    { key: 'map', label: 'Map View', icon: Map },
    { key: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.length },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'profile', label: 'Profile', icon: User },
  ]

  const headerTitles: Record<ActiveView, string> = {
    overview: 'Dashboard Overview',
    inbox: 'Complaint Inbox',
    sla: 'SLA Monitoring & Escalation',
    map: 'Department Map View',
    notifications: 'Notifications',
    analytics: 'Department Analytics',
    profile: 'Admin Profile',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ========== SIDEBAR ========== */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-[260px] z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}
        style={{ background: 'linear-gradient(180deg, #14532d 0%, #166534 40%, #15803d 100%)' }}>
        {/* Brand */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-[15px] tracking-tight">Admin Portal</h1>
                <p className="text-emerald-300/80 text-[11px]">{getDepartmentEmoji(adminData?.department || '')} {adminData?.department} Dept</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeView === item.key
            return (
              <button key={item.key}
                onClick={() => { setActiveView(item.key); setSidebarOpen(false) }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[13px] font-medium group w-full text-left ${active ? 'bg-white/20 text-white shadow-lg' : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'}`}>
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-emerald-300' : 'text-emerald-300/60'}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{item.badge > 99 ? '99+' : item.badge}</span>
                ) : active ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-300"></div> : null}
              </button>
            )
          })}

          <div className="pt-4 pb-2 px-2"><p className="text-[10px] text-emerald-300/50 uppercase font-bold tracking-wider">Quick Stats</p></div>
          <div className="px-3 space-y-2">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Pending', value: stats.registered + stats.assigned, color: 'text-yellow-300' },
              { label: 'Critical', value: stats.critical, color: 'text-red-300' },
              { label: 'SLA Breached', value: stats.slaBreached, color: 'text-red-300' },
              { label: 'Resolved', value: stats.resolved, color: 'text-emerald-300' },
              { label: 'Today', value: stats.today, color: 'text-cyan-300' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-emerald-200/60">{s.label}</span>
                <span className={`font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* User + Logout */}
        <div className="mt-auto border-t border-white/10">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-400/30 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{adminData?.admin_id?.charAt(0)?.toUpperCase() || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{adminData?.admin_id}</p>
              <p className="text-emerald-300/60 text-[11px]">🛡️ Department Admin</p>
            </div>
          </div>
          <div className="px-3 pb-4">
            <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-medium justify-center">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ========== MAIN ========== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"><Menu className="w-5 h-5 text-gray-700" /></button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-800">{headerTitles[activeView]}</h2>
              </div>
              <span className="text-sm text-gray-400 hidden md:block">{adminData?.department} Department</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={refreshData} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 w-56">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, title, location..." className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder:text-gray-400" />
              </div>
              <button onClick={() => setActiveView('notifications')} className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{notifications.length > 99 ? '99+' : notifications.length}</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ======================== OVERVIEW ======================== */}
            {activeView === 'overview' && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'Total', value: stats.total, bg: 'bg-gray-50 border-gray-200', color: 'text-gray-700' },
                    { label: 'Pending', value: stats.registered, bg: 'bg-yellow-50 border-yellow-200', color: 'text-yellow-700' },
                    { label: 'In Progress', value: stats.inProgress, bg: 'bg-blue-50 border-blue-200', color: 'text-blue-700' },
                    { label: 'Resolved', value: stats.resolved, bg: 'bg-green-50 border-green-200', color: 'text-green-700' },
                    { label: 'Escalated', value: stats.escalated, bg: 'bg-orange-50 border-orange-200', color: 'text-orange-700' },
                    { label: 'SLA Breach', value: stats.slaBreached, bg: 'bg-red-50 border-red-200', color: 'text-red-700' },
                    { label: 'Critical', value: stats.critical, bg: 'bg-red-50 border-red-200', color: 'text-red-700' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-2xl p-4 border ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Extra quick stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <p className="text-sm font-medium text-white/80">New Complaints Today</p>
                    <p className="text-3xl font-bold mt-1">{stats.today}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
                    <p className="text-sm font-medium text-white/80">SLA Ending Soon</p>
                    <p className="text-3xl font-bold mt-1">{stats.slaWarning}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <p className="text-sm font-medium text-white/80">SLA Compliance</p>
                    <p className="text-3xl font-bold mt-1">{stats.slaCompliance}%</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Urgent Attention */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-red-500" /> Urgent Attention Needed</h3>
                      <span className="text-xs text-gray-400">{urgentList.length} items</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {urgentList.length === 0 ? (
                        <p className="p-6 text-gray-400 text-sm text-center">No urgent complaints</p>
                      ) : urgentList.slice(0, 8).map(g => {
                        const sla = calculateSLAStatus(g.sla_deadline)
                        return (
                          <div key={g.id} className="px-5 py-3 hover:bg-red-50/30 cursor-pointer flex items-center gap-3" onClick={() => openComplaintDetail(g)}>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getPriorityColor(g.priority_label)}`}>{g.priority_label}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                              <p className="text-xs text-gray-400">{g.complaint_id} · {timeAgo(g.created_at)}</p>
                            </div>
                            <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${sla.status === 'breached' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {sla.status === 'breached' ? 'BREACHED' : sla.remaining}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* SLA Ending Soon */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><Timer className="w-4 h-4 text-amber-500" /> SLA Ending Soon</h3>
                      <span className="text-xs text-gray-400">{slaEndingSoon.length} items</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {slaEndingSoon.length === 0 ? (
                        <p className="p-6 text-gray-400 text-sm text-center">No upcoming SLA deadlines</p>
                      ) : slaEndingSoon.slice(0, 8).map(g => {
                        const sla = calculateSLAStatus(g.sla_deadline)
                        return (
                          <div key={g.id} className="px-5 py-3 hover:bg-amber-50/30 cursor-pointer flex items-center gap-3" onClick={() => openComplaintDetail(g)}>
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                              <p className="text-xs text-gray-400">{g.complaint_id}</p>
                            </div>
                            <span className="text-xs font-bold text-amber-600">{sla.remaining}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======================== COMPLAINT INBOX ======================== */}
            {activeView === 'inbox' && (
              <>
                {/* Advanced Filters */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ID, title, location, citizen..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="All">All Status</option>
                      {['Registered','Assigned','In Progress','Resolved','Closed','Escalated'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="All">All Priority</option>
                      {['Critical','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="All">All SLA</option>
                      <option value="warning">Ending Soon</option>
                      <option value="breached">Violated</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={evidenceFilter} onChange={(e) => setEvidenceFilter(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <Paperclip className="w-3.5 h-3.5" /> Evidence only
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Sorted by: Priority (Critical→Low) → Score → SLA nearest → Newest · {filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Complaint List */}
                {filtered.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600">{grievances.length === 0 ? `No grievances for ${adminData?.department} department` : 'No complaints match filters'}</h3>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((g) => {
                      const sla = calculateSLAStatus(g.sla_deadline)
                      return (
                        <div key={g.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-md hover:border-emerald-200 transition-all p-4 cursor-pointer" onClick={() => openComplaintDetail(g)}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{g.complaint_id}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${getStatusColor(g.status)}`}>{g.status}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${getPriorityColor(g.priority_label)}`}>{g.priority_label} ({g.priority_score})</span>
                                {g.is_escalated && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium border border-red-200">⬆ Escalated</span>}
                                {g.evidence_url && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium"><Paperclip className="w-2.5 h-2.5 inline" /> Evidence</span>}
                              </div>
                              <h3 className="text-sm font-semibold text-gray-900">{g.title}</h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{g.description_english || g.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                                <span>{timeAgo(g.created_at)}</span>
                                {g.location_address && <span className="truncate max-w-[180px]">📍 {g.location_address}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className={`text-[10px] px-2 py-1 rounded-lg font-medium whitespace-nowrap ${sla.status === 'on-track' ? 'bg-green-50 text-green-700' : sla.status === 'warning' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                                <Clock className="w-3 h-3 inline mr-0.5" />
                                {sla.status === 'breached' ? 'SLA BREACHED' : sla.remaining}
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5"><Eye className="w-3 h-3" /> View</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ======================== SLA MONITORING ======================== */}
            {activeView === 'sla' && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <p className="text-3xl font-bold text-red-700">{stats.slaBreached}</p>
                    <p className="text-sm text-red-600 mt-1">SLA Violated</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <p className="text-3xl font-bold text-amber-700">{stats.slaWarning}</p>
                    <p className="text-sm text-amber-600 mt-1">Ending Soon</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                    <p className="text-3xl font-bold text-green-700">{stats.slaCompliance}%</p>
                    <p className="text-sm text-green-600 mt-1">SLA Compliance Rate</p>
                  </div>
                </div>

                {/* SLA Breached List */}
                <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-red-100 bg-red-50/50">
                    <h3 className="font-bold text-red-800 flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> SLA Violated Complaints</h3>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {grievances.filter(g => {
                      const sla = calculateSLAStatus(g.sla_deadline)
                      return sla.status === 'breached' && !['Resolved', 'Closed'].includes(g.status)
                    }).sort(sortByPriority).map(g => {
                      const sla = calculateSLAStatus(g.sla_deadline)
                      return (
                        <div key={g.id} className="px-5 py-3 hover:bg-red-50/30 cursor-pointer flex items-center gap-3" onClick={() => openComplaintDetail(g)}>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getPriorityColor(g.priority_label)}`}>{g.priority_label}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{g.complaint_id} — {g.title}</p>
                            <p className="text-xs text-gray-400">Deadline: {formatDateTime(g.sla_deadline)} · {g.is_escalated ? '⬆ Auto-escalated' : 'Not escalated'}</p>
                          </div>
                          <span className="text-xs font-bold text-red-600">{sla.remaining}</span>
                        </div>
                      )
                    })}
                    {stats.slaBreached === 0 && <p className="p-6 text-gray-400 text-sm text-center">No SLA violations</p>}
                  </div>
                </div>

                {/* SLA Warning List */}
                <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/50">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2 text-sm"><Timer className="w-4 h-4" /> Nearing SLA Deadline</h3>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {slaEndingSoon.map(g => {
                      const sla = calculateSLAStatus(g.sla_deadline)
                      return (
                        <div key={g.id} className="px-5 py-3 hover:bg-amber-50/30 cursor-pointer flex items-center gap-3" onClick={() => openComplaintDetail(g)}>
                          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{g.complaint_id} — {g.title}</p>
                          </div>
                          <span className="text-xs font-bold text-amber-600">{sla.remaining}</span>
                        </div>
                      )
                    })}
                    {slaEndingSoon.length === 0 && <p className="p-6 text-gray-400 text-sm text-center">No upcoming deadlines</p>}
                  </div>
                </div>

                {/* Escalated List */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><TrendingUp className="w-4 h-4 text-orange-500" /> Escalated Complaints</h3>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {grievances.filter(g => g.is_escalated).sort((a, b) => new Date(b.escalated_at || b.created_at).getTime() - new Date(a.escalated_at || a.created_at).getTime()).map(g => (
                      <div key={g.id} className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3" onClick={() => openComplaintDetail(g)}>
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{g.complaint_id} — {g.title}</p>
                          <p className="text-xs text-gray-400">Escalated {g.escalated_at ? timeAgo(g.escalated_at) : 'N/A'} · {g.sla_violated ? 'SLA violated' : 'Manual escalation'}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(g.status)}`}>{g.status}</span>
                      </div>
                    ))}
                    {stats.escalated === 0 && <p className="p-6 text-gray-400 text-sm text-center">No escalated complaints</p>}
                  </div>
                </div>
              </>
            )}

            {/* ======================== MAP VIEW ======================== */}
            {activeView === 'map' && (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                      <option value="All">All Status</option>
                      {['Registered','Assigned','In Progress','Resolved','Closed','Escalated'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                      <option value="All">All Priority</option>
                      {['Critical','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={mapColorBy} onChange={(e) => setMapColorBy(e.target.value as any)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                      <option value="priority">Color by Priority</option>
                      <option value="status">Color by Status</option>
                    </select>
                    <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                      <option value="All">All SLA</option>
                      <option value="warning">Ending Soon</option>
                      <option value="breached">Violated</option>
                    </select>
                    <span className="text-xs text-gray-400 ml-auto">{mapComplaints.length} markers</span>
                  </div>
                </div>

                {mapComplaints.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600">No geo-tagged complaints</h3>
                    <p className="text-sm text-gray-400 mt-1">Complaints with location will appear on the map</p>
                  </div>
                ) : (
                  <MapViewComponent
                    complaints={mapComplaints as any}
                    height="520px"
                    colorBy={mapColorBy}
                    onMarkerClick={(c) => {
                      const full = grievances.find(g => g.id === c.id)
                      if (full) openComplaintDetail(full)
                    }}
                  />
                )}
                <p className="text-xs text-gray-400 text-center">
                  {mapComplaints.length} of {filtered.length} shown ({filtered.length - mapComplaints.length} without location)
                </p>
              </>
            )}

            {/* ======================== NOTIFICATIONS ======================== */}
            {activeView === 'notifications' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">All Notifications ({notifications.length})</h3>
                </div>
                <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-8 text-gray-400 text-sm text-center">No notifications</p>
                  ) : notifications.map((n, i) => (
                    <div key={i} className="px-5 py-3.5 hover:bg-gray-50 cursor-pointer flex items-start gap-3" onClick={() => n.complaint && openComplaintDetail(n.complaint)}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        n.type === 'critical' ? 'bg-red-100' : n.type === 'sla' ? 'bg-red-100' : n.type === 'sla_warn' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        {n.type === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
                         n.type === 'sla' ? <Clock className="w-4 h-4 text-red-600" /> :
                         n.type === 'sla_warn' ? <Timer className="w-4 h-4 text-amber-600" /> :
                         <Inbox className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.time)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======================== ANALYTICS ======================== */}
            {activeView === 'analytics' && (
              <>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { label: 'This Week', value: stats.thisWeek, icon: Activity, bg: 'bg-blue-50 border-blue-200', color: 'text-blue-700' },
                    { label: 'This Month', value: stats.thisMonth, icon: BarChart3, bg: 'bg-purple-50 border-purple-200', color: 'text-purple-700' },
                    { label: 'Avg Resolution', value: stats.avgResolution, icon: Clock, bg: 'bg-emerald-50 border-emerald-200', color: 'text-emerald-700' },
                    { label: 'SLA Compliance', value: `${stats.slaCompliance}%`, icon: CheckCircle, bg: 'bg-green-50 border-green-200', color: 'text-green-700' },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className={`rounded-2xl p-5 border ${s.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{s.label}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Status Distribution</h3>
                  <div className="space-y-3">
                    {['Registered', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated'].map(status => {
                      const count = grievances.filter(g => g.status === status).length
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <span className={`text-[10px] font-medium w-20 px-2 py-0.5 rounded border ${getStatusColor(status)}`}>{status}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-10 text-right">{count}</span>
                          <span className="text-[10px] text-gray-400 w-8">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Priority Distribution */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Priority Breakdown</h3>
                  <div className="space-y-3">
                    {['Critical', 'High', 'Medium', 'Low'].map(p => {
                      const count = grievances.filter(g => g.priority_label === p).length
                      const active = grievances.filter(g => g.priority_label === p && !['Resolved', 'Closed'].includes(g.status)).length
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className={`text-[10px] font-medium w-16 px-2 py-0.5 rounded border ${getPriorityColor(p)}`}>{p}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p === 'Critical' ? 'bg-red-500' : p === 'High' ? 'bg-orange-500' : p === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-700 w-16 text-right">{count} ({active} active)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top complaint keywords (basic) */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Common Keywords in Complaints</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const words: Record<string, number> = {}
                      const stops = new Set(['the','a','an','is','are','was','in','on','at','to','for','of','and','or','not','no','my','our','i','we','it','this','that','with','has','have','been','from','but','by'])
                      grievances.forEach(g => {
                        const text = (g.description_english || g.description).toLowerCase()
                        text.split(/\W+/).filter(w => w.length > 3 && !stops.has(w)).forEach(w => { words[w] = (words[w] || 0) + 1 })
                      })
                      return Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w, c]) => (
                        <span key={w} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium border border-emerald-200">{w} ({c})</span>
                      ))
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* ======================== PROFILE ======================== */}
            {activeView === 'profile' && (
              <div className="max-w-lg mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Shield className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Admin Profile</h2>
                      <p className="text-sm text-gray-500">Department Administrator</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div><p className="text-xs text-gray-500">Admin ID</p><p className="text-sm font-semibold text-gray-900">{adminData?.admin_id}</p></div>
                    <div><p className="text-xs text-gray-500">Department</p><p className="text-sm font-semibold text-gray-900">{getDepartmentEmoji(adminData?.department || '')} {adminData?.department}</p></div>
                    <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-semibold text-gray-900">{adminData?.email}</p></div>
                    <div><p className="text-xs text-gray-500">Role</p><p className="text-sm font-semibold text-gray-900">Department Admin</p></div>
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500">Security Note</p>
                      <p className="text-xs text-gray-400 mt-1">You can only access complaints assigned to your department. All actions are logged for audit compliance.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* =============== COMPLAINT DETAIL MODAL =============== */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedGrievance(null); setNearestOffice(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded">{selectedGrievance.complaint_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusColor(selectedGrievance.status)}`}>{selectedGrievance.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(selectedGrievance.priority_label)}`}>{selectedGrievance.priority_label} ({selectedGrievance.priority_score}/100)</span>
                  {selectedGrievance.is_escalated && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium border border-red-200">⬆ Escalated</span>}
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedGrievance.title}</h2>
              </div>
              <button onClick={() => { setSelectedGrievance(null); setNearestOffice(null) }} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 flex gap-0 overflow-x-auto flex-shrink-0">
              {[
                { key: 'info', label: 'Details', icon: FileText },
                { key: 'evidence', label: 'Evidence', icon: Image },
                { key: 'location', label: 'Location', icon: MapPin },
                { key: 'timeline', label: 'Timeline & Replies', icon: MessageSquare },
                { key: 'blockchain', label: 'Blockchain', icon: Lock },
              ].map(t => {
                const Icon = t.icon
                return (
                  <button key={t.key} onClick={() => setDetailTab(t.key as any)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                      detailTab === t.key ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* === INFO TAB === */}
              {detailTab === 'info' && (
                <>
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><p className="text-xs text-gray-500">Department</p><p className="text-sm font-medium text-gray-900">{getDepartmentEmoji(selectedGrievance.department)} {selectedGrievance.department}</p></div>
                    <div><p className="text-xs text-gray-500">Filed On</p><p className="text-sm text-gray-900">{formatDateTime(selectedGrievance.created_at)}</p></div>
                    <div><p className="text-xs text-gray-500">Language</p><p className="text-sm text-gray-900">{getLanguageName(selectedGrievance.original_language || 'en')}</p></div>
                    <div>
                      <p className="text-xs text-gray-500">SLA Deadline</p>
                      <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedGrievance.sla_deadline)}</p>
                      {(() => { const sla = calculateSLAStatus(selectedGrievance.sla_deadline); return (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-0.5 inline-block ${sla.status === 'breached' ? 'bg-red-100 text-red-700' : sla.status === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {sla.status === 'breached' ? `BREACHED (${sla.remaining})` : sla.remaining}
                        </span>
                      )})()}
                    </div>
                    <div><p className="text-xs text-gray-500">SLA Hours</p><p className="text-sm text-gray-900">{selectedGrievance.sla_hours}h</p></div>
                    <div>
                      <p className="text-xs text-gray-500">AI Priority</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(selectedGrievance.priority_label)}`}>
                        {selectedGrievance.priority_label} — Score: {selectedGrievance.priority_score}/100
                      </span>
                    </div>
                  </div>

                  {/* Citizen Info */}
                  {citizenInfo && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Citizen Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-gray-500">Username</p><p className="font-medium text-gray-900">{citizenInfo.username}</p></div>
                        <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium text-gray-900">{citizenInfo.phone_number.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2')}</p></div>
                      </div>
                    </div>
                  )}

                  {/* Complaint Description with Translation Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Complaint Description</h4>
                      {selectedGrievance.description_english && selectedGrievance.original_language !== 'en' && (
                        <button onClick={() => setShowTranslation(!showTranslation)}
                          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50">
                          <Languages className="w-3.5 h-3.5" />
                          {showTranslation ? 'Show Original' : 'Show English'}
                        </button>
                      )}
                    </div>
                    {showTranslation && selectedGrievance.description_english ? (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-[10px] text-blue-600 font-bold mb-1 uppercase">English Translation</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedGrievance.description_english}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4">
                        {selectedGrievance.original_language !== 'en' && (
                          <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">Original ({getLanguageName(selectedGrievance.original_language || 'en')})</p>
                        )}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedGrievance.description}</p>
                      </div>
                    )}
                    {selectedGrievance.original_language && selectedGrievance.original_language !== 'en' && (
                      <p className="text-[10px] text-gray-400 mt-1.5">Detected language: {getLanguageName(selectedGrievance.original_language)}</p>
                    )}
                  </div>

                  {/* Feedback from citizen */}
                  {feedback && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-emerald-700 mb-2">Citizen Feedback</h4>
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= feedback.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>)}
                        <span className="text-sm font-bold text-gray-700 ml-2">{feedback.rating}/5</span>
                      </div>
                      {feedback.feedback_text && <p className="text-sm text-gray-700 mt-1">{feedback.feedback_text}</p>}
                    </div>
                  )}

                  {/* Admin Actions */}
                  {!['Resolved', 'Closed'].includes(selectedGrievance.status) && (
                    <div className="border-t border-gray-200 pt-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h4>
                      <div className="space-y-3">
                        <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                          <option value="">Select Action</option>
                          {selectedGrievance.status === 'Registered' && <option value="Assigned">Assign to Me</option>}
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Mark Resolved</option>
                          <option value="Escalated">Escalate to SuperAdmin</option>
                        </select>
                        <textarea value={updateNote} onChange={(e) => setUpdateNote(e.target.value)}
                          placeholder="Remarks (required for resolution)..." rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                        <button onClick={handleStatusUpdate} disabled={!updateStatus || updating}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                          <Send className="w-4 h-4" />{updating ? 'Updating...' : 'Update Status'}
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedGrievance.status === 'Resolved' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-700 font-medium">✅ Resolved</p>
                      {selectedGrievance.resolution_notes && <p className="text-xs text-green-600 mt-1">{selectedGrievance.resolution_notes}</p>}
                    </div>
                  )}
                </>
              )}

              {/* === EVIDENCE TAB === */}
              {detailTab === 'evidence' && (
                <>
                  {selectedGrievance.evidence_url ? (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Image className="w-4 h-4" /> Uploaded Evidence</h4>
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          {selectedGrievance.evidence_type?.startsWith('image') || selectedGrievance.evidence_url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                            <img src={selectedGrievance.evidence_url} alt="evidence" className="max-h-80 rounded-lg mx-auto" />
                          ) : selectedGrievance.evidence_type?.startsWith('video') || selectedGrievance.evidence_url?.match(/\.(mp4|webm)/i) ? (
                            <video src={selectedGrievance.evidence_url} controls className="max-h-80 rounded-lg mx-auto" />
                          ) : (
                            <a href={selectedGrievance.evidence_url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-emerald-600 hover:underline flex items-center gap-2"><Paperclip className="w-4 h-4" /> View / Download Evidence</a>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div><p className="text-xs text-gray-500">Type</p><p className="font-medium text-gray-700">{selectedGrievance.evidence_type || 'File'}</p></div>
                          <div><p className="text-xs text-gray-500">Uploaded</p><p className="font-medium text-gray-700">{formatDateTime(selectedGrievance.created_at)}</p></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No evidence uploaded for this complaint</p>
                    </div>
                  )}
                </>
              )}

              {/* === LOCATION TAB === */}
              {detailTab === 'location' && (
                <>
                  {selectedGrievance.latitude && selectedGrievance.longitude ? (
                    <div className="space-y-4">
                      <MapViewComponent
                        complaints={[]}
                        singleMarker={{ lat: selectedGrievance.latitude, lng: selectedGrievance.longitude, label: selectedGrievance.title }}
                        height="280px"
                      />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-gray-500">Latitude</p><p className="font-mono text-gray-900">{selectedGrievance.latitude}</p></div>
                        <div><p className="text-xs text-gray-500">Longitude</p><p className="font-mono text-gray-900">{selectedGrievance.longitude}</p></div>
                        {selectedGrievance.location_address && <div className="col-span-2"><p className="text-xs text-gray-500">Address</p><p className="text-gray-900">{selectedGrievance.location_address}</p></div>}
                        {selectedGrievance.detected_address && <div className="col-span-2"><p className="text-xs text-gray-500">Reverse Geocoded</p><p className="text-gray-700">{selectedGrievance.detected_address}</p></div>}
                        {selectedGrievance.ward_id && <div><p className="text-xs text-gray-500">Ward ID</p><p className="font-mono text-xs text-gray-700">{selectedGrievance.ward_id}</p></div>}
                        {selectedGrievance.zone_id && <div><p className="text-xs text-gray-500">Zone ID</p><p className="font-mono text-xs text-gray-700">{selectedGrievance.zone_id}</p></div>}
                      </div>
                      {/* Nearest Office */}
                      {nearestOffice && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Nearest Department Office</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-xs text-amber-600">Office</p><p className="font-medium text-gray-900">{nearestOffice.office_name}</p></div>
                            <div><p className="text-xs text-amber-600">Distance</p><p className="font-medium text-gray-900">{formatDistance(nearestOffice.distance_km)}</p></div>
                            {nearestOffice.address && <div className="col-span-2"><p className="text-xs text-amber-600">Address</p><p className="text-gray-700">{nearestOffice.address}</p></div>}
                          </div>
                        </div>
                      )}
                      <a href={`https://www.google.com/maps?q=${selectedGrievance.latitude},${selectedGrievance.longitude}`}
                        target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline">
                        <MapPin className="w-4 h-4" /> Open in Google Maps
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No location data for this complaint</p>
                    </div>
                  )}
                </>
              )}

              {/* === TIMELINE & REPLIES TAB === */}
              {detailTab === 'timeline' && (
                <>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {timeline.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">No timeline entries</p>
                    ) : timeline.map((t) => (
                      <div key={t.id} className={`flex gap-3 ${t.message.startsWith('[Admin Reply]') ? '' : ''}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                          {t.updated_by_role === 'admin' ? <Shield className="w-3.5 h-3.5 text-emerald-600" /> :
                           t.updated_by_role === 'superadmin' ? <Lock className="w-3.5 h-3.5 text-purple-600" /> :
                           <Activity className="w-3.5 h-3.5 text-gray-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${getStatusColor(t.status)}`}>{t.status}</span>
                            <span className="text-[10px] text-gray-400">{t.updated_by_role} · {formatDateTime(t.created_at)}</span>
                          </div>
                          <p className={`text-sm mt-1 ${t.message.startsWith('[Admin Reply]') ? 'text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2' : 'text-gray-700'}`}>
                            {t.message.replace('[Admin Reply] ', '')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply to Citizen */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Reply to Citizen</h4>
                    <div className="flex gap-2">
                      <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type acknowledgement, update, or resolution message..." rows={2}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                      <button onClick={handleSendReply} disabled={!replyMessage.trim() || sendingReply}
                        className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium">
                        <Send className="w-4 h-4" />{sendingReply ? '...' : 'Send'}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">This reply will be visible to the citizen on their complaint tracking page.</p>
                  </div>
                </>
              )}

              {/* === BLOCKCHAIN TAB === */}
              {detailTab === 'blockchain' && (
                <>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Lock className="w-4 h-4" /> Blockchain Verification (Read-Only)</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Complaint Hash</p>
                          <p className="font-mono text-xs text-gray-700 break-all bg-white rounded p-2 border">{selectedGrievance.complaint_hash || 'Not yet recorded'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Blockchain TX Hash</p>
                          <p className="font-mono text-xs text-gray-700 break-all bg-white rounded p-2 border">{selectedGrievance.blockchain_tx_hash || 'Not yet recorded'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Blockchain Timestamp</p>
                          <p className="text-gray-700">{selectedGrievance.blockchain_timestamp ? formatDateTime(selectedGrievance.blockchain_timestamp) : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {selectedGrievance.complaint_hash && (
                      <div>
                        <button onClick={verifyBlockchainHash} disabled={verifyingHash}
                          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                          <Lock className="w-4 h-4" />{verifyingHash ? 'Verifying...' : 'Verify Integrity'}
                        </button>
                        {hashResult && (
                          <div className={`mt-3 px-4 py-3 rounded-lg ${hashResult === 'match' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <p className={`text-sm font-medium ${hashResult === 'match' ? 'text-green-700' : 'text-red-700'}`}>
                              {hashResult === 'match' ? '✅ Integrity verified — hash matches blockchain record' : '❌ Hash mismatch — data may have been tampered'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400">Admin cannot modify blockchain entries. This is a read-only verification view.</p>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
