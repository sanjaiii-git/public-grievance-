'use client'

import { useState } from 'react'
import { Eye, EyeOff, User, Shield, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type LoginRole = 'citizen' | 'admin' | 'superadmin'

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<LoginRole>('citizen')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    identifier: '', // username/aadhaar for citizen, admin ID for admin/superadmin
    password: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const validateAdminId = (id: string): boolean => {
    return id.toLowerCase().includes('admin.com')
  }

  const validateSuperAdminId = (id: string): boolean => {
    return id.toLowerCase().includes('superadmin.com')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (selectedRole === 'citizen') {
        // Look up citizen email via SECURITY DEFINER function (bypasses RLS)
        const { data: email, error: lookupError } = await supabase
          .rpc('get_citizen_email_for_login', { identifier: formData.identifier })

        if (lookupError || !email) {
          setError('Invalid username/Aadhaar number')
          setLoading(false)
          return
        }

        // Sign in with Supabase Auth
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: formData.password
        })

        if (signInError) {
          setError('Invalid password')
          setLoading(false)
          return
        }

        // Store role in session
        sessionStorage.setItem('userRole', 'citizen')
        router.push('/dashboard/citizen')
        
      } else if (selectedRole === 'admin') {
        // Validate admin ID format
        if (!validateAdminId(formData.identifier)) {
          setError('Admin ID must contain "admin.com" (e.g., electricity.admin.com)')
          setLoading(false)
          return
        }

        // Look up admin email via SECURITY DEFINER function (bypasses RLS)
        const { data: adminEmail, error: adminLookupError } = await supabase
          .rpc('get_admin_email_for_login', { admin_identifier: formData.identifier })

        if (adminLookupError || !adminEmail) {
          setError('Invalid admin ID')
          setLoading(false)
          return
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: formData.password
        })

        if (signInError) {
          setError('Invalid password')
          setLoading(false)
          return
        }

        sessionStorage.setItem('userRole', 'admin')
        router.push('/dashboard/admin')
        
      } else if (selectedRole === 'superadmin') {
        // Validate superadmin ID format
        if (!validateSuperAdminId(formData.identifier)) {
          setError('Super Admin ID must contain "superadmin.com" (e.g., state.superadmin.com)')
          setLoading(false)
          return
        }

        // Look up superadmin email via SECURITY DEFINER function (bypasses RLS)
        const { data: saEmail, error: saLookupError } = await supabase
          .rpc('get_superadmin_email_for_login', { superadmin_identifier: formData.identifier })

        if (saLookupError || !saEmail) {
          setError('Invalid superadmin ID')
          setLoading(false)
          return
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: saEmail,
          password: formData.password
        })

        if (signInError) {
          setError('Invalid password')
          setLoading(false)
          return
        }

        sessionStorage.setItem('userRole', 'superadmin')
        router.push('/dashboard/superadmin')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const getPlaceholder = () => {
    if (selectedRole === 'citizen') return 'Enter username or Aadhaar number'
    if (selectedRole === 'admin') return 'Enter admin ID (e.g., electricity.admin.com)'
    return 'Enter superadmin ID (e.g., state.superadmin.com)'
  }

  const getLabel = () => {
    if (selectedRole === 'citizen') return 'Username / Aadhaar Number'
    if (selectedRole === 'admin') return 'Admin ID'
    return 'Super Admin ID'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-8">
          <button
            onClick={() => setSelectedRole('citizen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              selectedRole === 'citizen'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" />
            User
          </button>
          <button
            onClick={() => setSelectedRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              selectedRole === 'admin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin
          </button>
          <button
            onClick={() => setSelectedRole('superadmin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              selectedRole === 'superadmin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Super
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Identifier Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getLabel()}
            </label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleInputChange}
              placeholder={getPlaceholder()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link - For All Roles */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            {selectedRole === 'citizen' && (
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign up as Citizen
              </Link>
            )}
            {selectedRole === 'admin' && (
              <Link href="/signup/admin" className="text-green-600 hover:text-green-700 font-semibold">
                Sign up as Admin
              </Link>
            )}
            {selectedRole === 'superadmin' && (
              <Link href="/signup/superadmin" className="text-purple-600 hover:text-purple-700 font-semibold">
                Sign up as Super Admin
              </Link>
            )}
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
