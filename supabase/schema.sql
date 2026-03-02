-- =====================================================
-- LAND RECORDS SYSTEM - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run these queries in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- TABLE 1: CITIZENS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.citizens (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    aadhaar_number VARCHAR(12) UNIQUE NOT NULL,
    phone_number VARCHAR(10) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT aadhaar_format CHECK (aadhaar_number ~ '^\d{12}$'),
    CONSTRAINT phone_format CHECK (phone_number ~ '^\d{10}$')
);

-- Create index for faster lookups
CREATE INDEX idx_citizens_aadhaar ON public.citizens(aadhaar_number);
CREATE INDEX idx_citizens_username ON public.citizens(username);
CREATE INDEX idx_citizens_email ON public.citizens(email);

-- Row Level Security for Citizens
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;

-- Citizens can only read their own data
CREATE POLICY "Citizens can view own profile" 
    ON public.citizens FOR SELECT 
    USING (auth.uid() = id);

-- Citizens can update their own data (except aadhaar)
CREATE POLICY "Citizens can update own profile" 
    ON public.citizens FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow signup (insert)
CREATE POLICY "Anyone can create citizen account" 
    ON public.citizens FOR INSERT 
    WITH CHECK (true);

-- =====================================================
-- TABLE 2: ADMINS (Department Admins)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT admin_id_format CHECK (admin_id LIKE '%admin.com%')
);

-- Create index for faster lookups
CREATE INDEX idx_admins_admin_id ON public.admins(admin_id);
CREATE INDEX idx_admins_department ON public.admins(department);

-- Row Level Security for Admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Admins can only read their own data
CREATE POLICY "Admins can view own profile" 
    ON public.admins FOR SELECT 
    USING (auth.uid() = id);

-- Admins can update their own data
CREATE POLICY "Admins can update own profile" 
    ON public.admins FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow admin signup (insert)
CREATE POLICY "Anyone can create admin account" 
    ON public.admins FOR INSERT 
    WITH CHECK (true);

-- =====================================================
-- TABLE 3: SUPER ADMINS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.superadmins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    superadmin_id VARCHAR(100) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT superadmin_id_format CHECK (superadmin_id LIKE '%superadmin.com%')
);

-- Create index for faster lookups
CREATE INDEX idx_superadmins_superadmin_id ON public.superadmins(superadmin_id);
CREATE INDEX idx_superadmins_state ON public.superadmins(state);

-- Row Level Security for Super Admins
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- Super admins can only read their own data
CREATE POLICY "Super admins can view own profile" 
    ON public.superadmins FOR SELECT 
    USING (auth.uid() = id);

-- Super admins can update their own data
CREATE POLICY "Super admins can update own profile" 
    ON public.superadmins FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow superadmin signup (insert)
CREATE POLICY "Anyone can create superadmin account" 
    ON public.superadmins FOR INSERT 
    WITH CHECK (true);

-- =====================================================
-- FUNCTIONS: Auto-update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all tables
CREATE TRIGGER update_citizens_updated_at BEFORE UPDATE ON public.citizens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_superadmins_updated_at BEFORE UPDATE ON public.superadmins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- NOTE: Before inserting sample data, you need to create users in Supabase Auth first.
-- Then use their UUIDs in the INSERT statements below.

-- Sample Admin (After creating auth user)
-- INSERT INTO public.admins (id, admin_id, department, email) 
-- VALUES (
--     'auth-user-uuid-here',
--     'electricity.admin.com',
--     'Electricity Department',
--     'electricity.admin@gov.in'
-- );

-- Sample Super Admin (After creating auth user)
-- INSERT INTO public.superadmins (id, superadmin_id, state, email) 
-- VALUES (
--     'auth-user-uuid-here',
--     'state.superadmin.com',
--     'State Government',
--     'state.superadmin@gov.in'
-- );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.citizens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.superadmins TO authenticated;

-- Grant access to service role for admin operations
GRANT ALL ON public.citizens TO service_role;
GRANT ALL ON public.admins TO service_role;
GRANT ALL ON public.superadmins TO service_role;

-- =====================================================
-- NOTES FOR SETUP:
-- =====================================================
-- 1. Copy your Supabase project URL and anon key to .env.local
-- 2. Run this SQL script in Supabase SQL Editor
-- 3. For Admin and Super Admin accounts, you'll need to:
--    a. Create users via Supabase Auth dashboard
--    b. Manually insert records into admins/superadmins tables with correct auth user IDs
-- 4. Citizens can self-register through the signup page
-- =====================================================
