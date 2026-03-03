'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo, getPriorityColor, getStatusColor, calculateSLAStatus } from '@/lib/utils'
import { getDepartmentEmoji } from '@/lib/gis'
import Link from 'next/link'
import {
  FileText, Clock, CheckCircle, AlertTriangle, TrendingUp,
  ArrowRight, BarChart3, Plus, HelpCircle, Star, User,
  Bell, Zap, MapPin, Calendar, Activity, Award,
  ChevronRight, Eye, Send, MessageSquare, Shield
} from 'lucide-react'

interface Stats {
  total: number
  pending: number
  inProgress: number
  resolved: number
  escalated: number
  satisfaction: number
  critical: number
  slaBreached: number
}

interface DeptStats {
  [dept: string]: number
}

export default function CitizenDashboard() {
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, resolved: 0, escalated: 0, satisfaction: 0, critical: 0, slaBreached: 0
  })
  const [recentComplaints, setRecentComplaints] = useState<any[]>([])
  const [deptStats, setDeptStats] = useState<DeptStats>({})
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserEmail(user.email || '')
    const { data: profile } = await supabase
      .from('citizens')
      .select('username')
      .eq('id', user.id)
      .single()
    if (profile) setUsername(profile.username)

    const { data: grievances } = await supabase
      .from('grievances')
      .select('*')
      .eq('citizen_id', user.id)
      .order('created_at', { ascending: false })

    if (grievances) {
      const resolved = grievances.filter(g => ['Resolved', 'Closed'].includes(g.status)).length
      const critical = grievances.filter(g => g.priority_label === 'Critical' && !['Resolved', 'Closed'].includes(g.status)).length
      const slaBreached = grievances.filter(g => {
        if (['Resolved', 'Closed'].includes(g.status)) return false
        const sla = calculateSLAStatus(g.sla_deadline)
        return sla.isViolated
      }).length

      setStats({
        total: grievances.length,
        pending: grievances.filter(g => g.status === 'Registered').length,
        inProgress: grievances.filter(g => ['Assigned', 'In Progress'].includes(g.status)).length,
        resolved,
        escalated: grievances.filter(g => g.is_escalated).length,
        satisfaction: grievances.length > 0 ? Math.round((resolved / grievances.length) * 100) : 0,
        critical,
        slaBreached,
      })
      setRecentComplaints(grievances.slice(0, 6))

      // Department breakdown
      const depts: DeptStats = {}
      grievances.forEach(g => {
        depts[g.department] = (depts[g.department] || 0) + 1
      })
      setDeptStats(depts)

      // Notifications (recent updates)
      const notifs = grievances
        .filter(g => g.status === 'In Progress' || g.status === 'Resolved' || g.is_escalated)
        .slice(0, 4)
        .map(g => ({
          id: g.id,
          title: g.status === 'Resolved' ? '✅ Complaint Resolved' : g.is_escalated ? '⚠️ Escalated' : '🔄 In Progress',
          message: `${g.complaint_id} - ${g.title}`,
          time: g.updated_at,
          type: g.status === 'Resolved' ? 'success' : g.is_escalated ? 'warning' : 'info',
        }))
      setNotifications(notifs)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  const topDept = Object.entries(deptStats).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Hero Banner with Stats */}
      <div className="relative overflow-hidden rounded-3xl"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #059669 100%)' }}>
        <div className="relative z-10 p-8 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4">
                <Activity className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-xs font-medium text-white">Live System · All Records Secure</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Welcome back, {username}!
              </h1>
              <p className="text-blue-100 text-sm lg:text-base">
                Track your grievances, view real-time status updates, and communicate with government departments
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link href="/dashboard/citizen/submit">
                  <button className="bg-white hover:bg-gray-50 text-gray-900 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                    <Plus className="w-4 h-4" /> New Complaint
                  </button>
                </Link>
                <Link href="/dashboard/citizen/complaints">
                  <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all border border-white/20">
                    <Eye className="w-4 h-4" /> View All
                  </button>
                </Link>
              </div>
            </div>

            {/* Mini Stats in Hero */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Active', value: stats.pending + stats.inProgress, icon: Clock, color: 'from-blue-500 to-cyan-500' },
                { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
                { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'from-red-500 to-orange-500' },
                { label: 'Rate', value: `${stats.satisfaction}%`, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.label} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all">
                    <div className={`bg-gradient-to-br ${card.color} p-2 rounded-lg w-fit mb-2`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-2xl lg:text-3xl font-bold text-white">{card.value}</p>
                    <p className="text-xs text-blue-200 mt-0.5">{card.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'emerald', emoji: '📊' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'amber', emoji: '⏳' },
          { label: 'In Progress', value: stats.inProgress, icon: Activity, color: 'blue', emoji: '🔄' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'green', emoji: '✅' },
          { label: 'Escalated', value: stats.escalated, icon: TrendingUp, color: 'red', emoji: '⚠️' },
          { label: 'SLA Alert', value: stats.slaBreached, icon: AlertTriangle, color: 'orange', emoji: '🚨' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`bg-white rounded-2xl border border-${card.color}-200/50 p-4 hover:shadow-lg hover:border-${card.color}-300 transition-all group relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-20 h-20 bg-${card.color}-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{card.emoji}</span>
                  <Icon className={`w-4 h-4 text-${card.color}-500`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity & Complaints */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Complaints */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Recent Complaints</h2>
              </div>
              <Link href="/dashboard/citizen/complaints" className="text-emerald-600 text-xs font-semibold hover:text-emerald-700 flex items-center gap-1 group">
                View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {recentComplaints.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-gray-600 font-semibold mb-1">No complaints yet</p>
                <p className="text-gray-400 text-sm mb-4">Start by submitting your first grievance</p>
                <Link href="/dashboard/citizen/submit">
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Submit Grievance
                  </button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentComplaints.map((complaint, idx) => {
                  const sla = complaint.sla_deadline ? calculateSLAStatus(complaint.sla_deadline) : null
                  return (
                    <Link key={complaint.id} href={`/dashboard/citizen/track/${complaint.id}`}>
                      <div className="p-4 hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-blue-50/30 transition-all group cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
                            complaint.status === 'Resolved' ? 'bg-green-100' :
                            complaint.status === 'In Progress' ? 'bg-blue-100' :
                            'bg-amber-100'
                          }`}>
                            {getDepartmentEmoji(complaint.department)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{complaint.complaint_id}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(complaint.priority_label)}`}>
                                {complaint.priority_label}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getStatusColor(complaint.status)}`}>
                                {complaint.status}
                              </span>
                              {complaint.is_escalated && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⬆ Escalated</span>}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{complaint.title}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="text-base">{getDepartmentEmoji(complaint.department)}</span>
                                {complaint.department}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {timeAgo(complaint.created_at)}
                              </span>
                              {sla && (
                                <>
                                  <span>·</span>
                                  <span className={`flex items-center gap-1 ${sla.isViolated ? 'text-red-600 font-medium' : ''}`}>
                                    <Clock className="w-3 h-3" />
                                    {sla.isViolated ? 'SLA Breached' : sla.remaining}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Department Breakdown */}
          {Object.keys(deptStats).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Department Breakdown</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(deptStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([dept, count], idx) => {
                    const percentage = Math.round((count / stats.total) * 100)
                    return (
                      <div key={dept}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getDepartmentEmoji(dept)}</span>
                            <span className="text-sm font-medium text-gray-700">{dept}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{count}</span>
                            <span className="text-xs text-gray-400">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              idx === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                              idx === 1 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              idx === 2 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                              idx === 3 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                              'bg-gradient-to-r from-gray-500 to-slate-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center relative">
                  <Bell className="w-4 h-4 text-white" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900">Recent Updates</h3>
              </div>
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No updates yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <Link key={notif.id} href={`/dashboard/citizen/track/${notif.id}`}>
                    <div className="p-4 hover:bg-gray-50 cursor-pointer transition-colors group">
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{notif.title}</p>
                      <p className="text-xs text-gray-600 truncate mb-1">{notif.message}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(notif.time)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/dashboard/citizen/submit">
                <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-between transition-all shadow-lg hover:shadow-xl group">
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Grievance
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/dashboard/citizen/complaints">
                <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-between transition-all group border border-gray-200">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> All Complaints
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/dashboard/citizen/feedback">
                <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-between transition-all group border border-gray-200">
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4" /> Give Feedback
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/dashboard/citizen/profile">
                <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-between transition-all group border border-gray-200">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" /> My Profile
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Integrity Secured</h4>
                <p className="text-xs text-gray-600 leading-relaxed">All complaints are SHA-256 hashed for tamper-proof audit trails and data integrity verification.</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-600">Your Total Complaints</span>
              <span className="text-lg font-bold text-gray-900">{stats.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}