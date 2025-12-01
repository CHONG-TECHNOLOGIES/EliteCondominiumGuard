-- ============================================
-- ELITE CONDOGUARD - ADMIN RPC FUNCTIONS
-- ============================================
-- These functions allow admins to query data across all condominiums
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. admin_get_all_visits
-- Get all visits with optional filters
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_all_visits(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_condominium_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  created_at TIMESTAMPTZ,
  condominium_id INT,
  visitor_name TEXT,
  visitor_doc TEXT,
  visitor_phone TEXT,
  visit_type_id INT,
  visit_type TEXT,
  service_type_id INT,
  service_type TEXT,
  restaurant_id INT,
  restaurant_name TEXT,
  sport_id INT,
  sport_name TEXT,
  unit_id INT,
  unit_block TEXT,
  unit_number TEXT,
  reason TEXT,
  photo_url TEXT,
  qr_token TEXT,
  qr_expires_at TIMESTAMPTZ,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  status TEXT,
  approval_mode TEXT,
  guard_id INT,
  sync_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.created_at,
    v.condominium_id,
    v.visitor_name,
    v.visitor_doc,
    v.visitor_phone,
    v.visit_type_id,
    vt.name AS visit_type,
    v.service_type_id,
    st.name AS service_type,
    v.restaurant_id,
    r.name AS restaurant_name,
    v.sport_id,
    s.name AS sport_name,
    v.unit_id,
    u.code_block AS unit_block,
    u.number AS unit_number,
    v.reason,
    v.photo_url,
    v.qr_token,
    v.qr_expires_at,
    v.check_in_at,
    v.check_out_at,
    v.status,
    v.approval_mode,
    v.guard_id,
    'SINCRONIZADO'::TEXT AS sync_status
  FROM visits v
  LEFT JOIN visit_types vt ON v.visit_type_id = vt.id
  LEFT JOIN service_types st ON v.service_type_id = st.id
  LEFT JOIN restaurants r ON v.restaurant_id = r.id
  LEFT JOIN sports s ON v.sport_id = s.id
  LEFT JOIN units u ON v.unit_id = u.id
  WHERE
    (p_condominium_id IS NULL OR v.condominium_id = p_condominium_id)
    AND (p_start_date IS NULL OR v.check_in_at >= p_start_date)
    AND (p_end_date IS NULL OR v.check_in_at <= p_end_date)
  ORDER BY v.check_in_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_visits TO authenticated;

-- ============================================
-- 2. admin_get_all_incidents
-- Get all incidents with optional condominium filter
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_all_incidents(
  p_condominium_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  reported_at TIMESTAMPTZ,
  resident_id INT,
  resident_name TEXT,
  resident_condominium_id INT,
  resident_unit_id INT,
  unit_code_block TEXT,
  unit_number TEXT,
  unit_floor TEXT,
  unit_building_name TEXT,
  description TEXT,
  type TEXT,
  type_label TEXT,
  status TEXT,
  status_label TEXT,
  photo_path TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by INT,
  guard_notes TEXT,
  resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.reported_at,
    i.resident_id,
    res.name AS resident_name,
    res.condominium_id AS resident_condominium_id,
    res.unit_id AS resident_unit_id,
    u.code_block AS unit_code_block,
    u.number AS unit_number,
    u.floor AS unit_floor,
    u.building_name AS unit_building_name,
    i.description,
    i.type,
    it.label AS type_label,
    i.status,
    ist.label AS status_label,
    i.photo_path,
    i.acknowledged_at,
    i.acknowledged_by,
    i.guard_notes,
    i.resolved_at
  FROM incidents i
  INNER JOIN residents res ON i.resident_id = res.id
  LEFT JOIN units u ON res.unit_id = u.id
  LEFT JOIN incident_types it ON i.type = it.code
  LEFT JOIN incident_statuses ist ON i.status = ist.code
  WHERE
    (p_condominium_id IS NULL OR res.condominium_id = p_condominium_id)
  ORDER BY i.reported_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_incidents TO authenticated;

-- ============================================
-- 3. admin_get_all_units
-- Get all units with residents
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_all_units(
  p_condominium_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  condominium_id INT,
  code_block TEXT,
  number TEXT,
  floor TEXT,
  building_name TEXT,
  created_at TIMESTAMPTZ,
  residents JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.condominium_id,
    u.code_block,
    u.number,
    u.floor,
    u.building_name,
    u.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'phone', r.phone,
            'email', r.email,
            'type', r.type,
            'condominium_id', r.condominium_id,
            'unit_id', r.unit_id,
            'created_at', r.created_at,
            'pin_hash', r.pin_hash,
            'has_app_installed', r.has_app_installed,
            'device_token', r.device_token,
            'app_first_login_at', r.app_first_login_at,
            'app_last_seen_at', r.app_last_seen_at
          )
        )
        FROM residents r
        WHERE r.unit_id = u.id
      ),
      '[]'::JSONB
    ) AS residents
  FROM units u
  WHERE
    (p_condominium_id IS NULL OR u.condominium_id = p_condominium_id)
  ORDER BY u.code_block, u.number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_units TO authenticated;

-- ============================================
-- 4. admin_get_all_staff
-- Get all staff across condominiums
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_all_staff(
  p_condominium_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  first_name TEXT,
  last_name TEXT,
  condominium_id INT,
  role TEXT,
  pin_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.condominium_id,
    s.role,
    s.pin_hash
  FROM staff s
  WHERE
    (p_condominium_id IS NULL OR s.condominium_id = p_condominium_id)
  ORDER BY s.first_name, s.last_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_staff TO authenticated;

-- ============================================
-- 5. admin_get_dashboard_stats
-- Get aggregated statistics for admin dashboard
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS TABLE (
  total_condominiums INT,
  active_condominiums INT,
  total_devices INT,
  active_devices INT,
  total_staff INT,
  total_units INT,
  total_residents INT,
  today_visits INT,
  pending_visits INT,
  inside_visits INT,
  active_incidents INT,
  total_incidents INT,
  resolved_incidents INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_start TIMESTAMPTZ;
BEGIN
  today_start := DATE_TRUNC('day', NOW());

  RETURN QUERY
  SELECT
    -- Condominiums
    (SELECT COUNT(*)::INT FROM condominiums) AS total_condominiums,
    (SELECT COUNT(*)::INT FROM condominiums WHERE status = 'ACTIVE') AS active_condominiums,

    -- Devices
    (SELECT COUNT(*)::INT FROM devices) AS total_devices,
    (SELECT COUNT(*)::INT FROM devices WHERE status = 'ACTIVE') AS active_devices,

    -- Staff
    (SELECT COUNT(*)::INT FROM staff) AS total_staff,

    -- Units
    (SELECT COUNT(*)::INT FROM units) AS total_units,

    -- Residents
    (SELECT COUNT(*)::INT FROM residents) AS total_residents,

    -- Today's visits
    (SELECT COUNT(*)::INT FROM visits WHERE check_in_at >= today_start) AS today_visits,
    (SELECT COUNT(*)::INT FROM visits WHERE check_in_at >= today_start AND status = 'PENDENTE') AS pending_visits,
    (SELECT COUNT(*)::INT FROM visits WHERE check_in_at >= today_start AND status = 'NO INTERIOR') AS inside_visits,

    -- Incidents
    (SELECT COUNT(*)::INT FROM incidents WHERE status IN ('new', 'acknowledged', 'inprogress')) AS active_incidents,
    (SELECT COUNT(*)::INT FROM incidents) AS total_incidents,
    (SELECT COUNT(*)::INT FROM incidents WHERE status = 'resolved') AS resolved_incidents;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats TO authenticated;

-- ============================================
-- NOTES FOR SECURITY
-- ============================================
-- IMPORTANT: These functions use SECURITY DEFINER which runs with the privileges
-- of the function owner. Make sure to:
--
-- 1. Add Row Level Security (RLS) policies to verify the caller is an admin
-- 2. Or modify functions to check user role before returning data
--
-- Example RLS check (add to each function if needed):
-- IF NOT EXISTS (
--   SELECT 1 FROM staff
--   WHERE id = auth.uid()::INT
--   AND role = 'ADMIN'
-- ) THEN
--   RAISE EXCEPTION 'Access denied: Admin role required';
-- END IF;
-- ============================================
