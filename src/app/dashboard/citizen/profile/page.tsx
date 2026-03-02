'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { maskAadhaar, formatDateTime } from '@/lib/utils'
import {
  User, Phone, Shield, Calendar, Mail, LogOut, Loader2
} from 'lucide-react'

type Profile = {
  username: string
  phone: string
  aadhaar_hash: string
  email: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get citizen profile
      const { data: citizen } = await supabase
        .from('citizens')
        .select('username, phone, aadhaar_hash, created_at')
        .eq('id', user.id)
        .single()

      if (citizen) {
        setProfile({
          ...citizen,
          email: user.email || ''
        })
      }

      // Get complaint stats
      const { data: complaints } = await supabase
        .from('grievances')
        .select('status')
        .eq('citizen_id', user.id)

      if (complaints) {
        setStats({
          total: complaints.length,
          resolved: complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length,
          pending: complaints.filter(c => ['Registered', 'In Progress', 'Under Review'].includes(c.status)).length
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">View your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-800"></div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-12 mb-4">
            <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Username */}
          <h2 className="text-xl font-bold text-gray-900">{profile?.username || 'Citizen'}</h2>
          <p className="text-sm text-gray-500">Citizen Account</p>

          {/* Info Grid */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Username</p>
                <p className="text-sm font-medium text-gray-900">{profile?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Phone Number</p>
                <p className="text-sm font-medium text-gray-900">{profile?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Shield className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Aadhaar (Hashed)</p>
                <p className="text-sm font-mono text-gray-600 truncate max-w-[300px]">
                  {profile?.aadhaar_hash ? `${profile.aadhaar_hash.substring(0, 16)}...` : 'N/A'}
                </p>
                <p className="text-xs text-green-600 mt-0.5">🔒 Securely stored as SHA-256 hash</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Account Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {profile?.created_at ? formatDateTime(profile.created_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complaint Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Complaint Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600 mt-1">Total Filed</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            <p className="text-xs text-yellow-600 mt-1">Pending</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
            <p className="text-xs text-green-600 mt-1">Resolved</p>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Security</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Aadhaar SHA-256 Encrypted</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Blockchain Complaint Records</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Row Level Security (RLS)</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-xl border border-red-200 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  )
}
