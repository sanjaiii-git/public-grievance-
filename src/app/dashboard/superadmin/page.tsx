'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  calculateSLAStatus, getPriorityColor, getStatusColor,
  formatDateTime, timeAgo
} from '@/lib/utils'
import { DEPARTMENT_COLORS, getDepartmentEmoji, detectClientHotspots, DEFAULT_CENTER } from '@/lib/gis'
import {
  ShieldCheck, LogOut, FileText, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Eye, Search, Filter, Users, BarChart3, Layers,
  ArrowRight, X, Send, Home, MapPin, Map, Bell, Menu,
  Building2, Flame, Zap, Globe, Activity, PieChart,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import dynamic from 'next/dynamic'

const MapViewComponent = dynamic(() => import('@/components/MapView'), { ssr: false })

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
  location_address: string | null
  latitude: number | null
  longitude: number | null
  is_escalated: boolean
  sla_violated: boolean
  created_at: string
  citizen_id: string
  ward_id?: string | null
  zone_id?: string | null
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [superAdminData, setSuperAdminData] = useState<any>(null)
  const [grievances, setGrievances] = useState<Grievance[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'map' | 'complaints' | 'analytics'>('overview')
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('All')
  const [mapColorBy, setMapColorBy] = useState<'priority' | 'status' | 'department'>('department')
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateNote, setUpdateNote] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const role = sessionStorage.getItem('userRole')
    if (role !== 'superadmin') { router.push('/login'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('superadmins')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) setSuperAdminData(profile)
    await fetchAllGrievances()
    setLoading(false)
  }

  const fetchAllGrievances = async () => {
    const { data } = await supabase
      .from('grievances')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setGrievances(data)
  }

  const handleStatusUpdate = async () => {
    if (!selectedGrievance || !updateStatus) return
    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const updateData: any = { status: updateStatus, updated_at: new Date().toISOString() }
      if (updateStatus === 'Resolved') {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolution_notes = updateNote || 'Resolved by super admin'
      }
      if (updateStatus === 'Escalated') { updateData.is_escalated = true; updateData.escalated_at = new Date().toISOString() }
      await supabase.from('grievances').update(updateData).eq('id', selectedGrievance.id)
      await supabase.from('grievance_timeline').insert({
        grievance_id: selectedGrievance.id, status: updateStatus,
        message: updateNote || `Status updated to ${updateStatus} by super admin`,
        updated_by: user.id, updated_by_role: 'superadmin'
      })
      await fetchAllGrievances()
      setSelectedGrievance(null); setUpdateStatus(''); setUpdateNote('')
    } catch { alert('Error updating') }
    finally { setUpdating(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('userRole')
    router.push('/login')
  }

  // --- Computed Stats ---
  const departments = useMemo(() => [...new Set(grievances.map(g => g.department))], [grievances])
  
  const stats = useMemo(() => {
    const total = grievances.length
    const resolved = grievances.filter(g => ['Resolved', 'Closed'].includes(g.status)).length
    const pending = grievances.filter(g => !['Resolved', 'Closed'].includes(g.status)).length
    const escalated = grievances.filter(g => g.is_escalated).length
    const slaBreached = grievances.filter(g => {
      const sla = calculateSLAStatus(g.sla_deadline)
      return sla.status === 'breached' && !['Resolved', 'Closed'].includes(g.status)
    }).length
    const critical = grievances.filter(g => g.priority_label === 'Critical' && !['Resolved', 'Closed'].includes(g.status)).length
    const geoTagged = grievances.filter(g => g.latitude && g.longitude).length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
    return { total, resolved, pending, escalated, slaBreached, critical, geoTagged, resolutionRate }
  }, [grievances])

  const deptStats = useMemo(() => {
    return departments.map(dept => {
      const depts = grievances.filter(g => g.department === dept)
      const resolved = depts.filter(g => ['Resolved', 'Closed'].includes(g.status)).length
      const breached = depts.filter(g => {
        const sla = calculateSLAStatus(g.sla_deadline)
        return sla.status === 'breached' && !['Resolved', 'Closed'].includes(g.status)
      }).length
      return {
        department: dept,
        total: depts.length,
        resolved,
        pending: depts.length - resolved,
        breached,
        rate: depts.length > 0 ? Math.round((resolved / depts.length) * 100) : 0,
      }
    }).sort((a, b) => b.total - a.total)
  }, [grievances, departments])

  const hotspots = useMemo(() => {
    const geoGrievances = grievances.filter(g => g.latitude && g.longitude).map(g => ({
      latitude: g.latitude!, longitude: g.longitude!, department: g.department
    }))
    return detectClientHotspots(geoGrievances, 0.5, 3)
  }, [grievances])

  const priorityDist = useMemo(() => {
    const dist: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    grievances.forEach(g => { if (dist[g.priority_label] !== undefined) dist[g.priority_label]++ })
    return dist
  }, [grievances])

  const filtered = useMemo(() => {
    return grievances
      .filter(g => statusFilter === 'All' || g.status === statusFilter)
      .filter(g => deptFilter === 'All' || g.department === deptFilter)
      .filter(g => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return g.complaint_id.toLowerCase().includes(q) || g.title.toLowerCase().includes(q) || g.department.toLowerCase().includes(q)
      })
  }, [grievances, statusFilter, deptFilter, searchQuery])

  const mapComplaints = useMemo(() => filtered.filter(g => g.latitude && g.longitude), [filtered])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-300 font-medium">Loading Control Room...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { key: 'overview', label: 'Overview', icon: Home },
    { key: 'map', label: 'City Map', icon: Globe },
    { key: 'complaints', label: 'All Complaints', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-50 flex">
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ===== SIDEBAR ===== */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-[260px] z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `} style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-[15px] tracking-tight">Control Room</h1>
                <p className="text-indigo-300/80 text-[11px]">🏛️ Super Admin Portal</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeView === item.key
            return (
              <button key={item.key}
                onClick={() => { setActiveView(item.key as any); setSidebarOpen(false) }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[13px] font-medium group w-full text-left ${
                  active ? 'bg-white/20 text-white shadow-lg' : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'
                }`}>
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-indigo-300' : 'text-indigo-300/60'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>}
              </button>
            )
          })}

          <div className="pt-4 pb-2 px-2">
            <p className="text-[10px] text-indigo-300/50 uppercase font-bold tracking-wider">System Health</p>
          </div>
          <div className="px-3 space-y-2">
            {[
              { label: 'Total Complaints', value: stats.total, color: 'text-white' },
              { label: 'Resolution Rate', value: `${stats.resolutionRate}%`, color: 'text-emerald-300' },
              { label: 'SLA Breaches', value: stats.slaBreached, color: 'text-red-300' },
              { label: 'Active Hotspots', value: hotspots.length, color: 'text-amber-300' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-indigo-200/60">{s.label}</span>
                <span className={`font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="mt-auto border-t border-white/10">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-400/30 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{superAdminData?.superadmin_id}</p>
              <p className="text-indigo-300/60 text-[11px]">🛡️ {superAdminData?.state || 'Super Admin'}</p>
            </div>
          </div>
          <div className="px-3 pb-4">
            <button onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-medium justify-center">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-800">
                  {activeView === 'overview' ? 'System Overview' : activeView === 'map' ? 'City-Wide Map' : activeView === 'analytics' ? 'Analytics Hub' : 'All Complaints'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 w-56">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all complaints..." className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder:text-gray-400" />
              </div>
              <div className="flex items-center gap-1.5">
                {stats.slaBreached > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{stats.slaBreached} SLA
                  </span>
                )}
                {stats.critical > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3" />{stats.critical} Critical
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ========== OVERVIEW TAB ========== */}
            {activeView === 'overview' && (
              <>
                {/* Top Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Complaints', value: stats.total, icon: FileText, bg: 'bg-gradient-to-br from-blue-500 to-blue-600', sub: `${stats.geoTagged} geo-tagged` },
                    { label: 'Active / Pending', value: stats.pending, icon: Clock, bg: 'bg-gradient-to-br from-amber-500 to-orange-500', sub: `${stats.escalated} escalated` },
                    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, bg: 'bg-gradient-to-br from-emerald-500 to-green-600', sub: `${stats.resolutionRate}% rate` },
                    { label: 'SLA Violations', value: stats.slaBreached, icon: AlertTriangle, bg: 'bg-gradient-to-br from-red-500 to-rose-600', sub: `${stats.critical} critical` },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className={`${s.bg} rounded-2xl p-5 text-white relative overflow-hidden`}>
                        <Icon className="absolute right-3 bottom-3 w-14 h-14 text-white/10" />
                        <p className="text-3xl font-bold">{s.value}</p>
                        <p className="text-sm font-medium mt-1 text-white/90">{s.label}</p>
                        <p className="text-xs text-white/60 mt-0.5">{s.sub}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Department Breakdown */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" /> Department Performance</h3>
                      <span className="text-xs text-gray-400">{departments.length} departments</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {deptStats.map((d) => (
                        <div key={d.department} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                          <span className="text-lg">{getDepartmentEmoji(d.department)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{d.department}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${d.rate}%` }}></div>
                              </div>
                              <span className="text-[11px] text-gray-500 font-medium w-8">{d.rate}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-700">{d.total}</p>
                            <p className="text-[10px] text-gray-400">{d.pending} pending</p>
                          </div>
                          {d.breached > 0 && (
                            <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{d.breached} breach</span>
                          )}
                        </div>
                      ))}
                      {deptStats.length === 0 && (
                        <p className="text-center text-gray-400 py-8 text-sm">No department data</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Priority Distribution */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Priority Distribution</h3>
                      <div className="space-y-3">
                        {Object.entries(priorityDist).map(([label, count]) => {
                          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                          const colors: Record<string, string> = {
                            Critical: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-yellow-500', Low: 'bg-green-500'
                          }
                          return (
                            <div key={label} className="flex items-center gap-3">
                              <span className="text-xs font-medium text-gray-600 w-14">{label}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colors[label]}`} style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-8 text-right">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Hotspots */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-red-500" /> Active Hotspots</h3>
                      {hotspots.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">No hotspots detected</p>
                      ) : (
                        <div className="space-y-2">
                          {hotspots.slice(0, 5).map((h, i) => (
                            <div key={i} className="flex items-center gap-3 bg-red-50/50 rounded-lg p-3">
                              <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs">{i + 1}</div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-700">{h.center[0].toFixed(4)}, {h.center[1].toFixed(4)}</p>
                                <p className="text-[10px] text-gray-400">{h.count} complaints clustered</p>
                              </div>
                              <button onClick={() => setActiveView('map')}
                                className="text-xs text-indigo-600 font-medium hover:underline">View</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button onClick={() => setActiveView('map')}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all text-sm font-medium text-indigo-700">
                          <Globe className="w-4 h-4" /> Open City Map
                        </button>
                        <button onClick={() => { setActiveView('complaints'); setStatusFilter('Escalated') }}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-xl transition-all text-sm font-medium text-red-700">
                          <AlertTriangle className="w-4 h-4" /> View Escalated ({stats.escalated})
                        </button>
                        <button onClick={() => setActiveView('analytics')}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-sm font-medium text-emerald-700">
                          <BarChart3 className="w-4 h-4" /> Analytics Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Critical */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Recent Critical & Escalated</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {grievances
                      .filter(g => (g.priority_label === 'Critical' || g.is_escalated) && !['Resolved', 'Closed'].includes(g.status))
                      .slice(0, 5)
                      .map(g => (
                        <div key={g.id} className="px-6 py-3 flex items-center gap-4 hover:bg-red-50/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedGrievance(g)}>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(g.priority_label)}`}>{g.priority_label}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                            <p className="text-xs text-gray-400">{g.department} · {g.complaint_id}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(g.status)}`}>{g.status}</span>
                          <span className="text-xs text-gray-400">{timeAgo(g.created_at)}</span>
                        </div>
                      ))}
                    {grievances.filter(g => (g.priority_label === 'Critical' || g.is_escalated) && !['Resolved', 'Closed'].includes(g.status)).length === 0 && (
                      <p className="text-center text-gray-400 py-6 text-sm">No critical or escalated complaints</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ========== CITY MAP TAB ========== */}
            {activeView === 'map' && (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="All">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="All">All Status</option>
                      {['Registered','Assigned','In Progress','Resolved','Closed','Escalated'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select value={mapColorBy} onChange={(e) => setMapColorBy(e.target.value as any)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="department">Color by Department</option>
                      <option value="priority">Color by Priority</option>
                      <option value="status">Color by Status</option>
                    </select>
                    <span className="text-xs text-gray-400 ml-auto">{mapComplaints.length} markers</span>
                  </div>
                </div>

                {mapComplaints.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Globe className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-500">No geo-tagged complaints found</h3>
                    <p className="text-sm text-gray-400 mt-1">Complaints with coordinates will appear here</p>
                  </div>
                ) : (
                  <MapViewComponent
                    complaints={mapComplaints as any}
                    height="560px"
                    colorBy={mapColorBy}
                    onMarkerClick={(c) => {
                      const full = grievances.find(g => g.id === c.id)
                      if (full) setSelectedGrievance(full)
                    }}
                  />
                )}

                {/* Hotspot Indicators */}
                {hotspots.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3"><Flame className="w-4 h-4" /> Detected Hotspots ({hotspots.length})</h3>
                    <div className="grid md:grid-cols-3 gap-3">
                      {hotspots.map((h, i) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-red-100">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                            <span className="text-sm font-semibold text-gray-900">Cluster #{i + 1}</span>
                          </div>
                          <p className="text-xs text-gray-500">{h.count} complaints within 500m radius</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Center: {h.center[0].toFixed(4)}, {h.center[1].toFixed(4)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ========== COMPLAINTS TAB ========== */}
            {activeView === 'complaints' && (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ID, title, department..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                      <option value="All">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                      <option value="All">All Status</option>
                      {['Registered','Assigned','In Progress','Resolved','Closed','Escalated'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600">No complaints match filters</h3>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">{filtered.length} complaint{filtered.length !== 1 ? 's' : ''}</p>
                    {filtered.slice(0, 50).map((g) => {
                      const sla = calculateSLAStatus(g.sla_deadline)
                      return (
                        <div key={g.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all p-5 cursor-pointer"
                          onClick={() => setSelectedGrievance(g)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{g.complaint_id}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusColor(g.status)}`}>{g.status}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(g.priority_label)}`}>{g.priority_label}</span>
                                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                  {getDepartmentEmoji(g.department)} {g.department}
                                </span>
                                {g.is_escalated && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium border border-red-200">
                                    ⬆ Escalated
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-gray-900">{g.title}</h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{g.description_english || g.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                sla.status === 'on-track' ? 'bg-green-50 text-green-700' :
                                sla.status === 'warning' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                              }`}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {sla.status === 'breached' ? 'BREACHED' : sla.remaining}
                              </div>
                              <span className="text-xs text-gray-400">{timeAgo(g.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {filtered.length > 50 && <p className="text-xs text-gray-400 text-center">Showing 50 of {filtered.length} results</p>}
                  </div>
                )}
              </>
            )}

            {/* ========== ANALYTICS TAB ========== */}
            {activeView === 'analytics' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Avg Resolution', value: (() => {
                      const resolved = grievances.filter(g => g.status === 'Resolved' || g.status === 'Closed')
                      if (resolved.length === 0) return 'N/A'
                      // simplified: time from created to sla deadline as proxy
                      return `${Math.round(resolved.reduce((a, g) => a + g.sla_hours, 0) / resolved.length)}h avg SLA`
                    })(), trend: 'down', icon: Clock },
                    { label: 'Resolution Rate', value: `${stats.resolutionRate}%`, trend: stats.resolutionRate >= 50 ? 'up' : 'down', icon: TrendingUp },
                    { label: 'Escalation Rate', value: `${stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0}%`, trend: stats.escalated > 5 ? 'up' : 'down', icon: ArrowUp },
                    { label: 'Geo Coverage', value: `${stats.total > 0 ? Math.round((stats.geoTagged / stats.total) * 100) : 0}%`, trend: 'up', icon: MapPin },
                  ].map(k => {
                    const Icon = k.icon
                    return (
                      <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Icon className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{k.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Department Leaderboard */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> Department Leaderboard</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Department</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Total</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Resolved</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Pending</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">SLA Breach</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Resolution %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {deptStats.map((d, i) => (
                          <tr key={d.department} className="hover:bg-gray-50/50">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getDepartmentEmoji(d.department)}</span>
                                <span className="text-sm font-medium text-gray-900">{d.department}</span>
                              </div>
                            </td>
                            <td className="text-center px-4 py-3 text-sm font-bold text-gray-700">{d.total}</td>
                            <td className="text-center px-4 py-3 text-sm text-green-600 font-medium">{d.resolved}</td>
                            <td className="text-center px-4 py-3 text-sm text-amber-600 font-medium">{d.pending}</td>
                            <td className="text-center px-4 py-3">
                              {d.breached > 0 ? (
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">{d.breached}</span>
                              ) : (
                                <span className="text-xs text-gray-400">0</span>
                              )}
                            </td>
                            <td className="text-center px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${d.rate >= 70 ? 'bg-emerald-500' : d.rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${d.rate}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-gray-700">{d.rate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 text-sm mb-4">Status Distribution</h3>
                    <div className="space-y-3">
                      {['Registered', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated'].map(status => {
                        const count = grievances.filter(g => g.status === status).length
                        const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <span className={`text-xs font-medium w-20 px-2 py-0.5 rounded border ${getStatusColor(status)}`}>{status}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-10 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 text-sm mb-4">Priority Breakdown</h3>
                    <div className="space-y-3">
                      {Object.entries(priorityDist).map(([label, count]) => {
                        const active = grievances.filter(g => g.priority_label === label && !['Resolved', 'Closed'].includes(g.status)).length
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <span className={`text-xs font-medium w-16 px-2 py-0.5 rounded border ${getPriorityColor(label)}`}>{label}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="text-gray-500">Total: {count}</span>
                                <span className="text-amber-600 font-medium">Active: {active}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${stats.total > 0 ? ((count - active) / stats.total) * 100 : 0}%` }}></div>
                                <div className="h-full bg-amber-400 rounded-r-full" style={{ width: `${stats.total > 0 ? (active / stats.total) * 100 : 0}%` }}></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded">{selectedGrievance.complaint_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusColor(selectedGrievance.status)}`}>{selectedGrievance.status}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{getDepartmentEmoji(selectedGrievance.department)} {selectedGrievance.department}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-2">{selectedGrievance.title}</h2>
              </div>
              <button onClick={() => setSelectedGrievance(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(selectedGrievance.priority_label)}`}>
                    {selectedGrievance.priority_label} ({selectedGrievance.priority_score}/100)
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">SLA</p>
                  <p className="text-sm font-medium text-gray-900">{selectedGrievance.sla_hours}h — {formatDateTime(selectedGrievance.sla_deadline)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Filed</p>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedGrievance.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Language</p>
                  <p className="text-sm text-gray-900">{selectedGrievance.original_language?.toUpperCase() || 'EN'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{selectedGrievance.description}</p>
                {selectedGrievance.description_english && selectedGrievance.original_language !== 'en' && (
                  <div className="mt-3 bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-medium mb-1">English Translation</p>
                    <p className="text-sm text-gray-700">{selectedGrievance.description_english}</p>
                  </div>
                )}
              </div>

              {selectedGrievance.latitude && selectedGrievance.longitude && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h3>
                  {selectedGrievance.location_address && <p className="text-sm text-gray-600 mb-2">{selectedGrievance.location_address}</p>}
                  <MapViewComponent
                    complaints={[]}
                    singleMarker={{ lat: selectedGrievance.latitude, lng: selectedGrievance.longitude, label: selectedGrievance.title }}
                    height="200px"
                  />
                </div>
              )}

              {selectedGrievance.evidence_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Evidence</h3>
                  <a href={selectedGrievance.evidence_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:underline">View Evidence →</a>
                </div>
              )}

              {!['Resolved', 'Closed'].includes(selectedGrievance.status) && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Super Admin Action</h3>
                  <div className="space-y-3">
                    <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Select Action</option>
                      <option value="Assigned">Re-assign</option>
                      <option value="In Progress">Mark In Progress</option>
                      <option value="Resolved">Force Resolve</option>
                      <option value="Closed">Close</option>
                    </select>
                    <textarea value={updateNote} onChange={(e) => setUpdateNote(e.target.value)}
                      placeholder="Admin note..." rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                    <button onClick={handleStatusUpdate} disabled={!updateStatus || updating}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      <Send className="w-4 h-4" />
                      {updating ? 'Updating...' : 'Execute Action'}
                    </button>
                  </div>
                </div>
              )}

              {selectedGrievance.status === 'Resolved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium">✅ Resolved</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
