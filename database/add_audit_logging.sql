-- ============================================
-- ELITE CONDOGUARD - AUDIT LOGGING SYSTEM
-- ============================================
-- This migration adds comprehensive audit logging to track all admin actions
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. CREATE AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  condominium_id INT REFERENCES condominiums(id) ON DELETE CASCADE,
  actor_id INT REFERENCES staff(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  target_table VARCHAR(100) NOT NULL, -- Table name that was affected
  target_id INT, -- ID of the affected record
  details JSONB, -- Additional metadata about the change
  ip_address INET, -- IP address of the actor (future enhancement)
  user_agent TEXT -- User agent of the actor (future enhancement)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_condominium_id ON audit_logs(condominium_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all administrative actions in the system';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)';
COMMENT ON COLUMN audit_logs.target_table IS 'Database table that was affected by this action';
COMMENT ON COLUMN audit_logs.target_id IS 'Primary key ID of the affected record';
COMMENT ON COLUMN audit_logs.details IS 'JSON object containing additional context (old values, new values, etc.)';

-- ============================================
-- 2. HELPER FUNCTION TO LOG ACTIONS
-- ============================================
CREATE OR REPLACE FUNCTION log_audit(
  p_condominium_id INT,
  p_actor_id INT,
  p_action VARCHAR(50),
  p_target_table VARCHAR(100),
  p_target_id INT,
  p_details JSONB DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id INT;
BEGIN
  INSERT INTO audit_logs (
    condominium_id,
    actor_id,
    action,
    target_table,
    target_id,
    details
  ) VALUES (
    p_condominium_id,
    p_actor_id,
    p_action,
    p_target_table,
    p_target_id,
    p_details
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

COMMENT ON FUNCTION log_audit IS 'Helper function to insert audit log entries. Call this from other RPC functions.';

-- ============================================
-- 3. ADMIN RPC: GET AUDIT LOGS
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_audit_logs(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_condominium_id INT DEFAULT NULL,
  p_actor_id INT DEFAULT NULL,
  p_action VARCHAR(50) DEFAULT NULL,
  p_target_table VARCHAR(100) DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id INT,
  created_at TIMESTAMPTZ,
  condominium_id INT,
  condominium_name TEXT,
  actor_id INT,
  actor_first_name TEXT,
  actor_last_name TEXT,
  actor_role TEXT,
  action VARCHAR(50),
  target_table VARCHAR(100),
  target_id INT,
  details JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total_count
  FROM audit_logs al
  WHERE
    (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_condominium_id IS NULL OR al.condominium_id = p_condominium_id)
    AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_target_table IS NULL OR al.target_table = p_target_table);

  -- Return paginated results with joins
  RETURN QUERY
  SELECT
    al.id,
    al.created_at,
    al.condominium_id,
    c.name AS condominium_name,
    al.actor_id,
    s.first_name AS actor_first_name,
    s.last_name AS actor_last_name,
    s.role AS actor_role,
    al.action,
    al.target_table,
    al.target_id,
    al.details,
    v_total_count AS total_count
  FROM audit_logs al
  LEFT JOIN condominiums c ON al.condominium_id = c.id
  LEFT JOIN staff s ON al.actor_id = s.id
  WHERE
    (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_condominium_id IS NULL OR al.condominium_id = p_condominium_id)
    AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_target_table IS NULL OR al.target_table = p_target_table)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_audit_logs TO authenticated;

COMMENT ON FUNCTION admin_get_audit_logs IS 'Admin RPC to retrieve audit logs with filtering and pagination';

-- ============================================
-- 4. EXAMPLE TRIGGERS (Optional)
-- ============================================
-- You can create triggers to automatically log certain actions
-- Example: Log whenever a visit is deleted

CREATE OR REPLACE FUNCTION audit_visit_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Attempt to log the deletion
  -- Note: actor_id would need to be passed via session variable or another mechanism
  INSERT INTO audit_logs (
    condominium_id,
    actor_id,
    action,
    target_table,
    target_id,
    details
  ) VALUES (
    OLD.condominium_id,
    NULL, -- Would need session context
    'DELETE',
    'visits',
    OLD.id,
    jsonb_build_object(
      'visitor_name', OLD.visitor_name,
      'check_in_at', OLD.check_in_at,
      'status', OLD.status
    )
  );

  RETURN OLD;
END;
$$;

-- Uncomment to enable automatic logging of visit deletions
-- CREATE TRIGGER trigger_audit_visit_delete
-- BEFORE DELETE ON visits
-- FOR EACH ROW
-- EXECUTE FUNCTION audit_visit_delete();

-- ============================================
-- 5. EXAMPLE AUDIT LOG ENTRIES (Test Data)
-- ============================================
-- Insert some test audit logs (optional)

-- Example: Login event
-- INSERT INTO audit_logs (condominium_id, actor_id, action, target_table, target_id, details)
-- VALUES (1, 1, 'LOGIN', 'staff', 1, '{"ip_address": "192.168.1.100", "device": "Tablet 1"}');

-- Example: Create condominium
-- INSERT INTO audit_logs (condominium_id, actor_id, action, target_table, target_id, details)
-- VALUES (1, 1, 'CREATE', 'condominiums', 1, '{"name": "Elite Tower", "address": "Rua Example 123"}');

-- Example: Update visit status
-- INSERT INTO audit_logs (condominium_id, actor_id, action, target_table, target_id, details)
-- VALUES (1, 2, 'UPDATE', 'visits', 5, '{"field": "status", "old_value": "PENDING", "new_value": "APPROVED"}');

-- Example: Delete resident
-- INSERT INTO audit_logs (condominium_id, actor_id, action, target_table, target_id, details)
-- VALUES (1, 1, 'DELETE', 'residents', 10, '{"name": "João Silva", "unit_id": 25}');

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) - Optional
-- ============================================
-- Enable RLS if you want to restrict audit log access
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow authenticated admin users to view audit logs
-- CREATE POLICY audit_logs_select_policy ON audit_logs
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM staff
--     WHERE staff.id = auth.uid()::INT
--     AND staff.role = 'ADMIN'
--   )
-- );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- The audit logging system is now ready to use!
--
-- To log an action from your RPC functions, call:
-- PERFORM log_audit(
--   p_condominium_id := 1,
--   p_actor_id := current_staff_id,
--   p_action := 'CREATE',
--   p_target_table := 'visits',
--   p_target_id := new_visit_id,
--   p_details := jsonb_build_object('visitor_name', 'João Silva')
-- );
