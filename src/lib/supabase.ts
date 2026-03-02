import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let _supabase: SupabaseClient | null = null

export const supabase = (() => {
  if (!_supabase && supabaseUrl && supabaseAnonKey) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  // Fallback: create with empty strings (will fail gracefully at runtime, not build time)
  if (!_supabase) {
    _supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
  }
  return _supabase
})()

export type UserRole = 'citizen' | 'admin' | 'superadmin'

export interface CitizenProfile {
  id: string
  aadhaar_number: string
  phone_number: string
  username: string
  created_at: string
}

export interface AdminProfile {
  id: string
  admin_id: string
  department: string
  created_at: string
}

export interface SuperAdminProfile {
  id: string
  superadmin_id: string
  state: string
  created_at: string
}
