-- =====================================================
-- FIX: LOGIN RLS ISSUE
-- =====================================================
-- Problem: RLS policies block SELECT on citizens/admins/superadmins
-- when user is not yet authenticated (during login).
-- Solution: SECURITY DEFINER functions that bypass RLS to look up
-- emails for login, only exposing the email field.
-- =====================================================

-- 1. Citizen login lookup
CREATE OR REPLACE FUNCTION get_citizen_email_for_login(identifier TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  citizen_email TEXT;
BEGIN
  SELECT email INTO citizen_email FROM citizens
  WHERE username = identifier OR aadhaar_number = identifier
  LIMIT 1;
  RETURN citizen_email;
END;
$$ LANGUAGE plpgsql;

-- 2. Admin login lookup
CREATE OR REPLACE FUNCTION get_admin_email_for_login(admin_identifier TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT;
BEGIN
  SELECT email INTO admin_email FROM admins
  WHERE admin_id = admin_identifier
  LIMIT 1;
  RETURN admin_email;
END;
$$ LANGUAGE plpgsql;

-- 3. SuperAdmin login lookup
CREATE OR REPLACE FUNCTION get_superadmin_email_for_login(superadmin_identifier TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sa_email TEXT;
BEGIN
  SELECT email INTO sa_email FROM superadmins
  WHERE superadmin_id = superadmin_identifier
  LIMIT 1;
  RETURN sa_email;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anon role (pre-login users)
GRANT EXECUTE ON FUNCTION get_citizen_email_for_login(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_citizen_email_for_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_email_for_login(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_admin_email_for_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_superadmin_email_for_login(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_superadmin_email_for_login(TEXT) TO authenticated;

-- =====================================================
-- 4. Department lookup for citizen submit page
-- =====================================================

-- Returns distinct departments that have at least 1 registered admin
CREATE OR REPLACE FUNCTION public.get_available_departments()
RETURNS TABLE (department TEXT, admin_count BIGINT)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.department::TEXT,
        COUNT(*)::BIGINT as admin_count
    FROM admins a
    GROUP BY a.department
    ORDER BY a.department;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_available_departments() TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_departments() TO authenticated;

-- Returns a random admin UUID from the given department (for auto-assignment)
CREATE OR REPLACE FUNCTION public.get_department_admin(dept TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_uuid UUID;
BEGIN
    SELECT a.id INTO admin_uuid
    FROM admins a
    WHERE a.department = dept
    ORDER BY RANDOM()
    LIMIT 1;
    RETURN admin_uuid;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_department_admin(TEXT) TO authenticated;

-- Drop hardcoded department constraint (departments now come from admins)
ALTER TABLE public.grievances DROP CONSTRAINT IF EXISTS valid_department;

-- =====================================================
-- NOTES:
-- =====================================================
-- Run this in Supabase SQL Editor
-- These functions use SECURITY DEFINER to bypass RLS
-- They only return the email, nothing else — safe for login
-- get_available_departments returns departments with admin count
-- get_department_admin returns a random admin for auto-assignment
-- =====================================================
