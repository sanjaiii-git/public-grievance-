-- =====================================================
-- CITIZEN GRIEVANCE SYSTEM - DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor AFTER running add_signup_policies.sql
-- =====================================================

-- =====================================================
-- TABLE: GRIEVANCES/COMPLAINTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id VARCHAR(50) UNIQUE NOT NULL,
    citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
    
    -- Complaint Details
    department VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    description_english TEXT,
    original_language VARCHAR(20) DEFAULT 'en',
    
    -- Evidence
    evidence_url TEXT,
    evidence_type VARCHAR(20),
    
    -- Geo-location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_address TEXT,
    
    -- Priority & Status
    priority_score INTEGER DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
    priority_label VARCHAR(20) DEFAULT 'Low',
    status VARCHAR(50) DEFAULT 'Registered',
    
    -- SLA Tracking
    sla_deadline TIMESTAMP WITH TIME ZONE,
    sla_hours INTEGER DEFAULT 72,
    sla_violated BOOLEAN DEFAULT false,
    
    -- Integrity Verification
    complaint_hash VARCHAR(256),
    blockchain_tx_hash VARCHAR(256),          -- integrity verification ID
    blockchain_timestamp TIMESTAMP WITH TIME ZONE,  -- integrity record timestamp
    
    -- Assignment
    assigned_admin_id UUID REFERENCES public.admins(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Escalation
    is_escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID REFERENCES public.superadmins(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT valid_department CHECK (department IN (
        'Electricity', 'Water', 'Road', 'Sanitation', 
        'Police', 'Health', 'Municipality', 'Others'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'Registered', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated'
    )),
    CONSTRAINT valid_priority CHECK (priority_label IN (
        'Low', 'Medium', 'High', 'Critical'
    ))
);

-- Create indexes
CREATE INDEX idx_grievances_citizen ON public.grievances(citizen_id);
CREATE INDEX idx_grievances_complaint_id ON public.grievances(complaint_id);
CREATE INDEX idx_grievances_status ON public.grievances(status);
CREATE INDEX idx_grievances_department ON public.grievances(department);
CREATE INDEX idx_grievances_priority ON public.grievances(priority_label);
CREATE INDEX idx_grievances_created_at ON public.grievances(created_at DESC);

-- =====================================================
-- TABLE: GRIEVANCE STATUS TIMELINE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grievance_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_by_role VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_timeline_grievance ON public.grievance_timeline(grievance_id);
CREATE INDEX idx_timeline_created_at ON public.grievance_timeline(created_at);

-- =====================================================
-- TABLE: FEEDBACK
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT one_feedback_per_grievance UNIQUE(grievance_id)
);

CREATE INDEX idx_feedback_grievance ON public.feedback(grievance_id);
CREATE INDEX idx_feedback_citizen ON public.feedback(citizen_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Grievances Table
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- Citizens can view only their own grievances
CREATE POLICY "Citizens can view own grievances"
    ON public.grievances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens 
            WHERE citizens.id = auth.uid() AND citizens.id = grievances.citizen_id
        )
    );

-- Citizens can insert their own grievances
CREATE POLICY "Citizens can create grievances"
    ON public.grievances FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.citizens 
            WHERE citizens.id = auth.uid() AND citizens.id = citizen_id
        )
    );

-- Citizens can update their own pending grievances
CREATE POLICY "Citizens can update own grievances"
    ON public.grievances FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens 
            WHERE citizens.id = auth.uid() AND citizens.id = grievances.citizen_id
        )
    );

-- Admins can view grievances in their department
CREATE POLICY "Admins can view department grievances"
    ON public.grievances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE admins.id = auth.uid()
        )
    );

-- Admins can update assigned grievances
CREATE POLICY "Admins can update assigned grievances"
    ON public.grievances FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE admins.id = auth.uid()
        )
    );

-- Super admins can view all grievances
CREATE POLICY "Super admins can view all grievances"
    ON public.grievances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.superadmins 
            WHERE superadmins.id = auth.uid()
        )
    );

-- Super admins can update all grievances
CREATE POLICY "Super admins can update all grievances"
    ON public.grievances FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.superadmins 
            WHERE superadmins.id = auth.uid()
        )
    );

-- Timeline Table
ALTER TABLE public.grievance_timeline ENABLE ROW LEVEL SECURITY;

-- Citizens can view timeline for their grievances
CREATE POLICY "Citizens can view own grievance timeline"
    ON public.grievance_timeline FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.grievances 
            JOIN public.citizens ON grievances.citizen_id = citizens.id
            WHERE citizens.id = auth.uid() 
            AND grievances.id = grievance_timeline.grievance_id
        )
    );

-- Anyone authenticated can insert timeline entries
CREATE POLICY "Authenticated users can create timeline entries"
    ON public.grievance_timeline FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Feedback Table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Citizens can view their own feedback
CREATE POLICY "Citizens can view own feedback"
    ON public.feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens 
            WHERE citizens.id = auth.uid() AND citizens.id = feedback.citizen_id
        )
    );

-- Citizens can submit feedback for their resolved grievances
CREATE POLICY "Citizens can submit feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.grievances 
            JOIN public.citizens ON grievances.citizen_id = citizens.id
            WHERE citizens.id = auth.uid() 
            AND grievances.id = feedback.grievance_id
            AND grievances.status IN ('Resolved', 'Closed')
        )
    );

-- Admins and super admins can view all feedback
CREATE POLICY "Admins can view feedback"
    ON public.feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE admins.id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.superadmins 
            WHERE superadmins.id = auth.uid()
        )
    );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON public.grievances TO authenticated;
GRANT SELECT, INSERT ON public.grievance_timeline TO authenticated;
GRANT SELECT, INSERT ON public.feedback TO authenticated;

GRANT ALL ON public.grievances TO service_role;
GRANT ALL ON public.grievance_timeline TO service_role;
GRANT ALL ON public.feedback TO service_role;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update timestamp for grievances
CREATE TRIGGER update_grievances_updated_at BEFORE UPDATE ON public.grievances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate complaint ID
CREATE OR REPLACE FUNCTION generate_complaint_id()
RETURNS TEXT AS $$
DECLARE
    dept_code TEXT;
    year_code TEXT;
    seq_num TEXT;
BEGIN
    -- Extract first 3 letters of department
    dept_code := UPPER(SUBSTRING(NEW.department FROM 1 FOR 3));
    
    -- Get current year
    year_code := TO_CHAR(NOW(), 'YY');
    
    -- Generate sequence number (6 digits)
    seq_num := LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000)::TEXT, 6, '0');
    
    RETURN dept_code || year_code || seq_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate complaint ID
CREATE OR REPLACE FUNCTION set_complaint_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.complaint_id IS NULL OR NEW.complaint_id = '' THEN
        NEW.complaint_id := generate_complaint_id();
    END IF;
    
    -- Set SLA deadline (department-based)
    IF NEW.sla_deadline IS NULL THEN
        NEW.sla_deadline := NOW() + (NEW.sla_hours || ' hours')::INTERVAL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_complaint_id BEFORE INSERT ON public.grievances
    FOR EACH ROW EXECUTE FUNCTION set_complaint_id();

-- Function to add timeline entry on status change
CREATE OR REPLACE FUNCTION add_timeline_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.grievance_timeline (
            grievance_id, 
            status, 
            message, 
            updated_by,
            updated_by_role
        ) VALUES (
            NEW.id, 
            NEW.status, 
            COALESCE(NEW.resolution_notes, 'Status updated'),
            auth.uid(),
            'system'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_add_timeline AFTER UPDATE ON public.grievances
    FOR EACH ROW EXECUTE FUNCTION add_timeline_on_status_change();

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Run this after running add_signup_policies.sql
-- 2. This creates grievances, timeline, and feedback tables
-- 3. Auto-generates complaint IDs in format: DEPTYYNNNNNN
-- 4. Auto-creates timeline entries on status changes
-- 5. RLS policies ensure citizens only see their own data
-- =====================================================
