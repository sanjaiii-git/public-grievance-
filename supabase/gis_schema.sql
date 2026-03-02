-- =====================================================
-- GIS MODULE - DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor AFTER running grievance_schema.sql
-- Adds GIS capabilities: wards, zones, offices, hotspots
-- =====================================================

-- =====================================================
-- TABLE: WARDS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wards (
    ward_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_name VARCHAR(100) NOT NULL,
    ward_number INTEGER,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    boundary_polygon JSONB,        -- GeoJSON polygon for ward boundary
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    population INTEGER,
    area_sq_km DECIMAL(8, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT unique_ward_city UNIQUE(ward_name, city)
);

CREATE INDEX IF NOT EXISTS idx_wards_city ON public.wards(city);
CREATE INDEX IF NOT EXISTS idx_wards_name ON public.wards(ward_name);
CREATE INDEX IF NOT EXISTS idx_wards_center ON public.wards(center_latitude, center_longitude);

-- =====================================================
-- TABLE: ZONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.zones (
    zone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    boundary_polygon JSONB,        -- GeoJSON polygon for zone boundary
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    CONSTRAINT unique_zone_city UNIQUE(zone_name, city)
);

CREATE INDEX IF NOT EXISTS idx_zones_city ON public.zones(city);
CREATE INDEX IF NOT EXISTS idx_zones_name ON public.zones(zone_name);
CREATE INDEX IF NOT EXISTS idx_zones_center ON public.zones(center_latitude, center_longitude);

-- =====================================================
-- TABLE: DEPARTMENT OFFICES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.department_offices (
    office_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100) NOT NULL,
    office_name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    ward_id UUID REFERENCES public.wards(ward_id),
    zone_id UUID REFERENCES public.zones(zone_id),
    phone VARCHAR(20),
    email VARCHAR(255),
    head_officer_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_offices_department ON public.department_offices(department);
CREATE INDEX IF NOT EXISTS idx_offices_location ON public.department_offices(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_offices_city ON public.department_offices(city);
CREATE INDEX IF NOT EXISTS idx_offices_ward ON public.department_offices(ward_id);
CREATE INDEX IF NOT EXISTS idx_offices_zone ON public.department_offices(zone_id);

-- =====================================================
-- TABLE: HOTSPOTS (Auto-generated)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hotspots (
    hotspot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID REFERENCES public.wards(ward_id),
    zone_id UUID REFERENCES public.zones(zone_id),
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER DEFAULT 500,
    complaint_count INTEGER DEFAULT 0,
    department_breakdown JSONB DEFAULT '{}',  -- {"Electricity": 5, "Water": 3}
    top_complaint_types JSONB DEFAULT '[]',    -- ["power cut", "no water"]
    status VARCHAR(20) DEFAULT 'emerging'
        CHECK (status IN ('emerging', 'active', 'resolved')),
    severity_score INTEGER DEFAULT 0
        CHECK (severity_score >= 0 AND severity_score <= 100),
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_hotspots_location ON public.hotspots(center_latitude, center_longitude);
CREATE INDEX IF NOT EXISTS idx_hotspots_status ON public.hotspots(status);
CREATE INDEX IF NOT EXISTS idx_hotspots_severity ON public.hotspots(severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_hotspots_ward ON public.hotspots(ward_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_zone ON public.hotspots(zone_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_detected ON public.hotspots(first_detected_at DESC);

-- =====================================================
-- ADD GIS COLUMNS TO GRIEVANCES TABLE
-- =====================================================
-- These may already exist partially; use IF NOT EXISTS pattern
DO $$ 
BEGIN
    -- Add location_accuracy if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grievances' AND column_name = 'location_accuracy'
    ) THEN
        ALTER TABLE public.grievances ADD COLUMN location_accuracy DECIMAL(8, 2);
    END IF;

    -- Add ward_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grievances' AND column_name = 'ward_id'
    ) THEN
        ALTER TABLE public.grievances ADD COLUMN ward_id UUID REFERENCES public.wards(ward_id);
    END IF;

    -- Add zone_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grievances' AND column_name = 'zone_id'
    ) THEN
        ALTER TABLE public.grievances ADD COLUMN zone_id UUID REFERENCES public.zones(zone_id);
    END IF;

    -- Add district_city if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grievances' AND column_name = 'district_city'
    ) THEN
        ALTER TABLE public.grievances ADD COLUMN district_city VARCHAR(100);
    END IF;

    -- Add detected_address if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grievances' AND column_name = 'detected_address'
    ) THEN
        ALTER TABLE public.grievances ADD COLUMN detected_address TEXT;
    END IF;
END $$;

-- GIS-specific indexes on grievances
CREATE INDEX IF NOT EXISTS idx_grievances_location 
    ON public.grievances(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_grievances_ward 
    ON public.grievances(ward_id);
CREATE INDEX IF NOT EXISTS idx_grievances_zone 
    ON public.grievances(zone_id);
CREATE INDEX IF NOT EXISTS idx_grievances_city 
    ON public.grievances(district_city);

-- =====================================================
-- RLS POLICIES FOR GIS TABLES
-- =====================================================

-- Wards: readable by all authenticated, writable by superadmin
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view wards" ON public.wards;
CREATE POLICY "Authenticated users can view wards"
    ON public.wards FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can manage wards" ON public.wards;
CREATE POLICY "Super admins can manage wards"
    ON public.wards FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
    );

-- Zones: readable by all authenticated, writable by superadmin
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view zones" ON public.zones;
CREATE POLICY "Authenticated users can view zones"
    ON public.zones FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can manage zones" ON public.zones;
CREATE POLICY "Super admins can manage zones"
    ON public.zones FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
    );

-- Department Offices: readable by admins+superadmins
ALTER TABLE public.department_offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view department offices" ON public.department_offices;
CREATE POLICY "Admins can view department offices"
    ON public.department_offices FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
    );

DROP POLICY IF EXISTS "Super admins can manage offices" ON public.department_offices;
CREATE POLICY "Super admins can manage offices"
    ON public.department_offices FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
    );

-- Hotspots: readable by admins (own dept) + superadmins (all)
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view hotspots" ON public.hotspots;
CREATE POLICY "Admins can view hotspots"
    ON public.hotspots FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
    );

DROP POLICY IF EXISTS "Super admins can manage hotspots" ON public.hotspots;
CREATE POLICY "Super admins can manage hotspots"
    ON public.hotspots FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.superadmins WHERE superadmins.id = auth.uid())
    );

-- =====================================================
-- GRANTS
-- =====================================================
GRANT SELECT ON public.wards TO authenticated;
GRANT SELECT ON public.zones TO authenticated;
GRANT SELECT ON public.department_offices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.hotspots TO authenticated;

GRANT ALL ON public.wards TO service_role;
GRANT ALL ON public.zones TO service_role;
GRANT ALL ON public.department_offices TO service_role;
GRANT ALL ON public.hotspots TO service_role;

-- =====================================================
-- GIS ANALYTICS FUNCTIONS
-- =====================================================

-- 1. Ward-wise complaint analytics
CREATE OR REPLACE FUNCTION public.get_ward_analytics(target_city TEXT DEFAULT NULL)
RETURNS TABLE (
    ward_id UUID,
    ward_name TEXT,
    total_complaints BIGINT,
    pending_complaints BIGINT,
    resolved_complaints BIGINT,
    avg_resolution_hours NUMERIC,
    sla_violation_count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.ward_id,
        w.ward_name::TEXT,
        COUNT(g.id)::BIGINT as total_complaints,
        COUNT(CASE WHEN g.status NOT IN ('Resolved', 'Closed') THEN 1 END)::BIGINT as pending_complaints,
        COUNT(CASE WHEN g.status IN ('Resolved', 'Closed') THEN 1 END)::BIGINT as resolved_complaints,
        ROUND(AVG(
            CASE WHEN g.resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (g.resolved_at - g.created_at)) / 3600 
            END
        ), 1) as avg_resolution_hours,
        COUNT(CASE WHEN g.sla_violated = true THEN 1 END)::BIGINT as sla_violation_count
    FROM wards w
    LEFT JOIN grievances g ON g.ward_id = w.ward_id
    WHERE (target_city IS NULL OR w.city = target_city)
    GROUP BY w.ward_id, w.ward_name
    ORDER BY total_complaints DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_ward_analytics(TEXT) TO authenticated;

-- 2. Zone-wise complaint analytics
CREATE OR REPLACE FUNCTION public.get_zone_analytics(target_city TEXT DEFAULT NULL)
RETURNS TABLE (
    zone_id UUID,
    zone_name TEXT,
    total_complaints BIGINT,
    pending_complaints BIGINT,
    resolved_complaints BIGINT,
    dept_breakdown JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.zone_id,
        z.zone_name::TEXT,
        COUNT(g.id)::BIGINT as total_complaints,
        COUNT(CASE WHEN g.status NOT IN ('Resolved', 'Closed') THEN 1 END)::BIGINT as pending_complaints,
        COUNT(CASE WHEN g.status IN ('Resolved', 'Closed') THEN 1 END)::BIGINT as resolved_complaints,
        COALESCE(
            jsonb_object_agg(g.department, dept_count) FILTER (WHERE g.department IS NOT NULL),
            '{}'::JSONB
        ) as dept_breakdown
    FROM zones z
    LEFT JOIN grievances g ON g.zone_id = z.zone_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as dept_count 
        FROM grievances g2 
        WHERE g2.zone_id = z.zone_id AND g2.department = g.department
    ) dc ON true
    WHERE (target_city IS NULL OR z.city = target_city)
    GROUP BY z.zone_id, z.zone_name
    ORDER BY total_complaints DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_zone_analytics(TEXT) TO authenticated;

-- 3. Department-wise stats for a specific area
CREATE OR REPLACE FUNCTION public.get_department_geo_stats(
    dept TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    department TEXT,
    total_complaints BIGINT,
    avg_lat NUMERIC,
    avg_lng NUMERIC,
    sla_breach_rate NUMERIC,
    critical_count BIGINT,
    resolved_rate NUMERIC
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.department::TEXT,
        COUNT(*)::BIGINT as total_complaints,
        ROUND(AVG(g.latitude)::NUMERIC, 6) as avg_lat,
        ROUND(AVG(g.longitude)::NUMERIC, 6) as avg_lng,
        ROUND(
            (COUNT(CASE WHEN g.sla_violated THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1
        ) as sla_breach_rate,
        COUNT(CASE WHEN g.priority_label = 'Critical' THEN 1 END)::BIGINT as critical_count,
        ROUND(
            (COUNT(CASE WHEN g.status IN ('Resolved', 'Closed') THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1
        ) as resolved_rate
    FROM grievances g
    WHERE g.latitude IS NOT NULL
      AND g.longitude IS NOT NULL
      AND (dept IS NULL OR g.department = dept)
      AND g.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY g.department
    ORDER BY total_complaints DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_department_geo_stats(TEXT, INTEGER) TO authenticated;

-- 4. Find nearest department office
CREATE OR REPLACE FUNCTION public.find_nearest_office(
    complaint_lat DECIMAL,
    complaint_lng DECIMAL,
    dept TEXT
)
RETURNS TABLE (
    office_id UUID,
    office_name TEXT,
    department TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    address TEXT,
    distance_km NUMERIC
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.office_id,
        o.office_name::TEXT,
        o.department::TEXT,
        o.latitude,
        o.longitude,
        o.address::TEXT,
        ROUND(
            (6371 * ACOS(
                COS(RADIANS(complaint_lat)) * COS(RADIANS(o.latitude)) *
                COS(RADIANS(o.longitude) - RADIANS(complaint_lng)) +
                SIN(RADIANS(complaint_lat)) * SIN(RADIANS(o.latitude))
            ))::NUMERIC, 2
        ) as distance_km
    FROM department_offices o
    WHERE o.department = dept
      AND o.is_active = true
    ORDER BY distance_km ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.find_nearest_office(DECIMAL, DECIMAL, TEXT) TO authenticated;

-- 5. Hotspot detection function (run periodically)
CREATE OR REPLACE FUNCTION public.detect_hotspots(
    radius_m INTEGER DEFAULT 500,
    min_complaints INTEGER DEFAULT 5,
    days_window INTEGER DEFAULT 7
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    hotspot_count INTEGER := 0;
    complaint_row RECORD;
    nearby_count INTEGER;
    dept_json JSONB;
BEGIN
    -- Mark old active hotspots as resolved if no recent complaints
    UPDATE hotspots SET 
        status = 'resolved',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE status IN ('emerging', 'active')
    AND last_updated_at < NOW() - (days_window * 2 || ' days')::INTERVAL;

    -- Find complaint clusters
    FOR complaint_row IN 
        SELECT 
            g.latitude as lat,
            g.longitude as lng,
            g.ward_id,
            g.zone_id
        FROM grievances g
        WHERE g.latitude IS NOT NULL 
          AND g.longitude IS NOT NULL
          AND g.created_at >= NOW() - (days_window || ' days')::INTERVAL
        GROUP BY g.latitude, g.longitude, g.ward_id, g.zone_id
    LOOP
        -- Count nearby complaints within radius
        SELECT COUNT(*), 
               COALESCE(jsonb_object_agg(department, cnt), '{}'::JSONB)
        INTO nearby_count, dept_json
        FROM (
            SELECT g.department, COUNT(*) as cnt
            FROM grievances g
            WHERE g.latitude IS NOT NULL
              AND g.longitude IS NOT NULL
              AND g.created_at >= NOW() - (days_window || ' days')::INTERVAL
              AND (6371000 * ACOS(
                  COS(RADIANS(complaint_row.lat)) * COS(RADIANS(g.latitude)) *
                  COS(RADIANS(g.longitude) - RADIANS(complaint_row.lng)) +
                  SIN(RADIANS(complaint_row.lat)) * SIN(RADIANS(g.latitude))
              )) <= radius_m
            GROUP BY g.department
        ) sub;

        IF nearby_count >= min_complaints THEN
            -- Check if hotspot already exists nearby
            IF NOT EXISTS (
                SELECT 1 FROM hotspots h
                WHERE h.status != 'resolved'
                AND (6371000 * ACOS(
                    COS(RADIANS(complaint_row.lat)) * COS(RADIANS(h.center_latitude)) *
                    COS(RADIANS(h.center_longitude) - RADIANS(complaint_row.lng)) +
                    SIN(RADIANS(complaint_row.lat)) * SIN(RADIANS(h.center_latitude))
                )) <= radius_m
            ) THEN
                INSERT INTO hotspots (
                    center_latitude, center_longitude, radius_meters,
                    complaint_count, department_breakdown,
                    ward_id, zone_id,
                    status, severity_score,
                    first_detected_at, last_updated_at
                ) VALUES (
                    complaint_row.lat, complaint_row.lng, radius_m,
                    nearby_count, dept_json,
                    complaint_row.ward_id, complaint_row.zone_id,
                    CASE WHEN nearby_count >= min_complaints * 3 THEN 'active' ELSE 'emerging' END,
                    LEAST(100, nearby_count * 10),
                    NOW(), NOW()
                );
                hotspot_count := hotspot_count + 1;
            ELSE
                -- Update existing hotspot
                UPDATE hotspots SET
                    complaint_count = nearby_count,
                    department_breakdown = dept_json,
                    severity_score = LEAST(100, nearby_count * 10),
                    status = CASE 
                        WHEN nearby_count >= min_complaints * 3 THEN 'active'
                        WHEN nearby_count >= min_complaints THEN 'emerging'
                        ELSE status
                    END,
                    last_updated_at = NOW(),
                    updated_at = NOW()
                WHERE hotspot_id IN (
                    SELECT h.hotspot_id FROM hotspots h
                    WHERE h.status != 'resolved'
                    AND (6371000 * ACOS(
                        COS(RADIANS(complaint_row.lat)) * COS(RADIANS(h.center_latitude)) *
                        COS(RADIANS(h.center_longitude) - RADIANS(complaint_row.lng)) +
                        SIN(RADIANS(complaint_row.lat)) * SIN(RADIANS(h.center_latitude))
                    )) <= radius_m
                    LIMIT 1
                );
            END IF;
        END IF;
    END LOOP;

    RETURN hotspot_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.detect_hotspots(INTEGER, INTEGER, INTEGER) TO authenticated;

-- 6. Get complaints for map view (with filters)
CREATE OR REPLACE FUNCTION public.get_complaints_for_map(
    dept TEXT DEFAULT NULL,
    status_filter TEXT DEFAULT NULL,
    priority_filter TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    complaint_id TEXT,
    title TEXT,
    department TEXT,
    status TEXT,
    priority_label TEXT,
    priority_score INTEGER,
    latitude DECIMAL,
    longitude DECIMAL,
    location_address TEXT,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    sla_violated BOOLEAN,
    is_escalated BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id, g.complaint_id::TEXT, g.title::TEXT,
        g.department::TEXT, g.status::TEXT,
        g.priority_label::TEXT, g.priority_score,
        g.latitude, g.longitude,
        g.location_address::TEXT,
        g.sla_deadline, g.sla_violated, g.is_escalated,
        g.created_at
    FROM grievances g
    WHERE g.latitude IS NOT NULL
      AND g.longitude IS NOT NULL
      AND (dept IS NULL OR g.department = dept)
      AND (status_filter IS NULL OR g.status = status_filter)
      AND (priority_filter IS NULL OR g.priority_label = priority_filter)
      AND g.created_at >= NOW() - (days_back || ' days')::INTERVAL
    ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_complaints_for_map(TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- 7. City-wide stats for super admin
CREATE OR REPLACE FUNCTION public.get_city_overview_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_complaints BIGINT,
    pending_complaints BIGINT,
    resolved_complaints BIGINT,
    avg_resolution_hours NUMERIC,
    sla_violation_rate NUMERIC,
    active_hotspots BIGINT,
    top_department TEXT,
    complaints_today BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN g.status NOT IN ('Resolved', 'Closed') THEN 1 END)::BIGINT,
        COUNT(CASE WHEN g.status IN ('Resolved', 'Closed') THEN 1 END)::BIGINT,
        ROUND(AVG(
            CASE WHEN g.resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (g.resolved_at - g.created_at)) / 3600 
            END
        )::NUMERIC, 1),
        ROUND(
            (COUNT(CASE WHEN g.sla_violated THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1
        ),
        (SELECT COUNT(*)::BIGINT FROM hotspots WHERE status IN ('emerging', 'active')),
        (SELECT g2.department::TEXT FROM grievances g2 
         WHERE g2.created_at >= NOW() - (days_back || ' days')::INTERVAL
         GROUP BY g2.department ORDER BY COUNT(*) DESC LIMIT 1),
        COUNT(CASE WHEN g.created_at::DATE = CURRENT_DATE THEN 1 END)::BIGINT
    FROM grievances g
    WHERE g.created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_city_overview_stats(INTEGER) TO authenticated;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps
DROP TRIGGER IF EXISTS update_wards_updated_at ON public.wards;
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON public.wards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_zones_updated_at ON public.zones;
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_offices_updated_at ON public.department_offices;
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON public.department_offices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hotspots_updated_at ON public.hotspots;
CREATE TRIGGER update_hotspots_updated_at BEFORE UPDATE ON public.hotspots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA: WARDS (for testing)
-- =====================================================
-- INSERT INTO public.wards (ward_name, ward_number, city, state, center_latitude, center_longitude) VALUES
-- ('Anna Nagar', 1, 'Chennai', 'Tamil Nadu', 13.0850, 80.2101),
-- ('T Nagar', 2, 'Chennai', 'Tamil Nadu', 13.0418, 80.2341),
-- ('Adyar', 3, 'Chennai', 'Tamil Nadu', 13.0067, 80.2573),
-- ('Mylapore', 4, 'Chennai', 'Tamil Nadu', 13.0368, 80.2676),
-- ('Royapettah', 5, 'Chennai', 'Tamil Nadu', 13.0536, 80.2625);

-- SAMPLE DATA: ZONES
-- INSERT INTO public.zones (zone_name, city, state, center_latitude, center_longitude) VALUES
-- ('North Zone', 'Chennai', 'Tamil Nadu', 13.1200, 80.2800),
-- ('South Zone', 'Chennai', 'Tamil Nadu', 12.9800, 80.2400),
-- ('Central Zone', 'Chennai', 'Tamil Nadu', 13.0600, 80.2500),
-- ('East Zone', 'Chennai', 'Tamil Nadu', 13.0800, 80.3000),
-- ('West Zone', 'Chennai', 'Tamil Nadu', 13.0500, 80.2000);

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Run this AFTER grievance_schema.sql
-- 2. This adds ward/zone/office/hotspot tables
-- 3. GIS columns added to grievances table
-- 4. Haversine formula used for distance calculations
-- 5. detect_hotspots() should be run daily via cron
-- 6. Ward/zone boundary polygons stored as GeoJSON
-- =====================================================
