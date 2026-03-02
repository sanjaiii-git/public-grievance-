-- =====================================================
-- ADD SIGNUP PERMISSIONS FOR ADMINS & SUPERADMINS
-- =====================================================
-- Copy and paste this entire file into Supabase SQL Editor
-- This adds the missing INSERT policies and permissions
-- =====================================================

-- Add INSERT policy for Admins table
CREATE POLICY "Anyone can create admin account" 
    ON public.admins FOR INSERT 
    WITH CHECK (true);

-- Add INSERT policy for Super Admins table
CREATE POLICY "Anyone can create superadmin account" 
    ON public.superadmins FOR INSERT 
    WITH CHECK (true);

-- Grant INSERT permission for authenticated users on admins table
GRANT INSERT ON public.admins TO authenticated;

-- Grant INSERT permission for authenticated users on superadmins table
GRANT INSERT ON public.superadmins TO authenticated;

-- =====================================================
-- VERIFICATION QUERY (Optional - run after above)
-- =====================================================
-- Run this to verify policies were created:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('citizens', 'admins', 'superadmins');
-- =====================================================
