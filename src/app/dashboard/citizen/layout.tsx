'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Home, FileText, List, Search, MessageSquare, User, LogOut, Menu, X, Bell,
  ChevronLeft, ChevronRight, HelpCircle, Shield
} from 'lucide-react'

export default function CitizenDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [citizenData, setCitizenData] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const role = sessionStorage.getItem('userRole')
    if (role !== 'citizen') {
      router.push('/login')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('citizens')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setCitizenData(profile)
    }

    const { data: escalated } = await supabase
      .from('grievances')
      .select('complaint_id, title, status, sla_deadline')
      .eq('citizen_id', user.id)
      .or('is_escalated.eq.true,sla_violated.eq.true')
      .order('created_at', { ascending: false })
      .limit(5)

    if (escalated) {
      setAlerts(escalated)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('userRole')
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard/citizen', label: 'Dashboard', icon: Home },
    { href: '/dashboard/citizen/submit', label: 'Submit Grievance', icon: FileText },
    { href: '/dashboard/citizen/complaints', label: 'My Complaints', icon: List },
    { href: '/dashboard/citizen/track', label: 'Track Complaint', icon: Search },
    { href: '/dashboard/citizen/feedback', label: 'Feedback', icon: MessageSquare },
    { href: '/dashboard/citizen/profile', label: 'Profile', icon: User },
  ]

  const isActive = (href: string) => pathname === href

  const getPageTitle = () => {
    const current = navItems.find(item => isActive(item.href))
    if (pathname.includes('/track/')) return 'Complaint Details'
    return current?.label || 'Dashboard'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg font-medium">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-50
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarCollapsed ? 'w-[80px]' : 'w-[280px]'}
          flex flex-col bg-white border-r border-gray-200 shadow-sm
        `}
      >
        {/* Logo/Brand with Close Button */}
        <div className={`px-5 pt-5 pb-4 border-b border-gray-100 ${sidebarCollapsed ? 'px-3' : ''}`}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-[15px] tracking-tight">Grievance Portal</h1>
                  <p className="text-emerald-600 text-[11px] font-medium">🔒 Secure Registry</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg mx-auto">
                <Shield className="w-5 h-5 text-white" />
              </div>
            )}
            <button
              onClick={() => {
                if (sidebarOpen) setSidebarOpen(false)
                else setSidebarCollapsed(!sidebarCollapsed)
              }}
              className={`${sidebarCollapsed ? 'hidden md:block mx-auto mt-2' : ''} p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[14px] font-medium group relative
                  ${sidebarCollapsed ? 'justify-center px-2' : ''}
                  ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {active && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                  </>
                )}
                {sidebarCollapsed && active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-l-full"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto border-t border-gray-100">
          {/* Notifications */}
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
            title={sidebarCollapsed ? 'Notifications' : undefined}
          >
            {!sidebarCollapsed && <span className="text-sm font-medium text-gray-700">Notifications</span>}
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-400" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {alerts.length}
                </span>
              )}
            </div>
          </button>

          {/* User Info */}
          <Link href="/dashboard/citizen/profile">
            <div className={`px-4 py-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors border-t border-gray-100 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {citizenData?.username?.charAt(0).toUpperCase() || 'C'}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-semibold truncate">{citizenData?.username || 'Citizen'}</p>
                  <p className="text-gray-500 text-[11px]">👤 Citizen User</p>
                </div>
              )}
            </div>
          </Link>

          {/* Sign Out */}
          <div className={`px-3 pb-4 pt-2 ${sidebarCollapsed ? 'px-2' : ''}`}>
            <button
              onClick={handleLogout}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
              className={`flex items-center gap-2 w-full px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl ${sidebarCollapsed ? 'justify-center px-2' : 'justify-center'}`}
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xl font-bold text-gray-900">{getPageTitle()}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Welcome back, {citizenData?.username || 'Citizen'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden lg:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-72 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search records..."
                  className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder:text-gray-400"
                />
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {alerts.length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">
                      {alerts.length}
                    </span>
                  )}
                </button>

                {showAlerts && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <Bell className="w-4 h-4 text-emerald-600" />
                          Alerts & Notifications
                        </h3>
                        <button onClick={() => setShowAlerts(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-8 h-8 text-gray-300" />
                          </div>
                          <p className="text-gray-500 font-medium text-sm">No alerts right now</p>
                          <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {alerts.map((alert, i) => (
                            <div key={i} className="p-4 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent transition-colors cursor-pointer group">
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">{alert.title}</p>
                                  <p className="text-xs text-red-600 mt-1 font-medium">
                                    {alert.status === 'Escalated' ? '⚠️ Escalated' : '⏰ SLA Alert'}
                                  </p>
                                  <p className="text-[11px] text-gray-400 mt-1">ID: {alert.complaint_id}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              <Link href="/dashboard/citizen/profile">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:shadow-lg transition-all">
                  <span className="text-white text-sm font-bold">
                    {citizenData?.username?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
