-- =====================================================
-- DEPARTMENT FLOW FIX — Run in Supabase SQL Editor
-- =====================================================
-- This migration:
--   1. Lets citizens query available departments from admins table
--   2. Lets citizens see admin IDs for auto-assignment
--   3. Removes hardcoded department constraint from grievances
--      (departments now come from registered admins)
-- =====================================================

-- =====================================================
-- 1. Allow authenticated users to read admin department & id
--    (needed so citizens can see which departments exist
--     and grievances can be auto-assigned)
-- =====================================================

-- Policy: any logged-in user can see admin id + department
CREATE POLICY "Authenticated users can view admin departments"
    ON public.admins FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Drop old restrictive policy (admins could only see themselves)
DROP POLICY IF EXISTS "Admins can view own profile" ON public.admins;

-- Recreate: admins can still see their own full profile
-- (the new policy above already covers this since it allows all authenticated)

-- =====================================================
-- 2. Postgres function: get_available_departments()
--    Returns distinct departments that have at least 1 admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_available_departments()
RETURNS TABLE (department TEXT, admin_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.department::TEXT,
        COUNT(*)::BIGINT as admin_count
    FROM public.admins a
    GROUP BY a.department
    ORDER BY a.department;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_available_departments() TO authenticated;

-- =====================================================
-- 3. Postgres function: get_department_admin(dept)
--    Returns a random admin ID from the given department
--    Used for auto-assignment of grievances
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_department_admin(dept TEXT)
RETURNS UUID AS $$
DECLARE
    admin_uuid UUID;
BEGIN
    SELECT a.id INTO admin_uuid
    FROM public.admins a
    WHERE a.department = dept
    ORDER BY RANDOM()
    LIMIT 1;
    
    RETURN admin_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_department_admin(TEXT) TO authenticated;

-- =====================================================
-- 4. Drop the hardcoded department constraint on grievances
--    (departments now come dynamically from admins table)
-- =====================================================

ALTER TABLE public.grievances DROP CONSTRAINT IF EXISTS valid_department;

-- =====================================================
-- 5. Allow admins to view timeline entries for their dept
-- =====================================================

CREATE POLICY "Admins can view department grievance timeline"
    ON public.grievance_timeline FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.grievances g
            JOIN public.admins a ON a.department = g.department
            WHERE a.id = auth.uid()
            AND g.id = grievance_timeline.grievance_id
        )
    );

-- =====================================================
-- DONE! Departments are now fully dynamic.
-- Citizens only see departments that have registered admins.
-- Grievances auto-assign to a random admin in that dept.
-- =====================================================
