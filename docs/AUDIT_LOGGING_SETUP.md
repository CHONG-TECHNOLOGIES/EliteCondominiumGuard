# Audit Logging System Setup

## Overview

The audit logging system provides comprehensive tracking of all administrative actions in Elite CondoGuard. This document explains how to set up and use the audit logging infrastructure.

## Current Status

? **Frontend Complete**: AdminAuditLogs page is fully implemented and ready to display audit logs
?? **Database Required**: You need to create the audit logging table and RPCs in Supabase

## Setup Instructions

### Step 1: Run the SQL Migration

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run your audit logging migration SQL (creates `audit_logs`, `log_audit()`, `admin_get_audit_logs()`)
   - If you keep migration scripts in `database/`, apply the audit logging script(s) from there
4. Click **Run** to execute the migration

This will create:
- ? `audit_logs` table with proper indexes
- ? `log_audit()` helper function
- ? `admin_get_audit_logs()` RPC function
- ? Example trigger for automatic logging (optional)

### Step 2: Verify Installation

Run this query in Supabase SQL Editor to verify:

```sql
-- Check if table exists
SELECT * FROM audit_logs LIMIT 1;

-- Check if RPC function exists
SELECT admin_get_audit_logs();
```

### Step 3: Test with Sample Data (Optional)

Insert some test audit logs:

```sql
-- Get your first condominium and staff IDs
SELECT id FROM condominiums LIMIT 1; -- Example: 1
SELECT id FROM staff WHERE role = 'ADMIN' LIMIT 1; -- Example: 2

-- Insert test logs
INSERT INTO audit_logs (condominium_id, actor_id, action, target_table, target_id, details)
VALUES
  (1, 2, 'LOGIN', 'staff', 2, '{"device": "Tablet", "location": "Main Entrance"}'),
  (1, 2, 'CREATE', 'visits', 123, '{"visitor_name": "Jo?o Silva", "unit": "A-101"}'),
  (1, 2, 'UPDATE', 'visits', 123, '{"field": "status", "old": "PENDING", "new": "APPROVED"}'),
  (1, 2, 'DELETE', 'residents', 45, '{"name": "Maria Santos", "reason": "Moved out"}');
```

### Step 4: Access the Audit Log Viewer

1. Navigate to: `https://your-app-url/#/admin/audit-logs`
2. You should see the test logs displayed
3. Try filtering by:
   - Date range
   - Condominium
   - Action type (CREATE, UPDATE, DELETE, etc.)
   - Target table

## How to Integrate Audit Logging into Your RPCs

### Method 1: Manual Logging in RPC Functions

Add audit logging to your existing admin RPC functions:

```sql
CREATE OR REPLACE FUNCTION admin_create_resident(
  p_name TEXT,
  p_unit_id INT,
  p_condominium_id INT,
  p_actor_id INT -- Pass the admin's staff ID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id INT;
BEGIN
  -- Insert the resident
  INSERT INTO residents (name, unit_id, condominium_id)
  VALUES (p_name, p_unit_id, p_condominium_id)
  RETURNING id INTO v_new_id;

  -- Log the action
  PERFORM log_audit(
    p_condominium_id := p_condominium_id,
    p_actor_id := p_actor_id,
    p_action := 'CREATE',
    p_target_table := 'residents',
    p_target_id := v_new_id,
    p_details := jsonb_build_object(
      'name', p_name,
      'unit_id', p_unit_id
    )
  );

  RETURN v_new_id;
END;
$$;
```

### Method 2: Automatic Triggers (Advanced)

Create triggers for automatic logging:

```sql
-- Example: Auto-log visit updates
CREATE OR REPLACE FUNCTION audit_visit_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.status != NEW.status) THEN
    INSERT INTO audit_logs (
      condominium_id,
      action,
      target_table,
      target_id,
      details
    ) VALUES (
      NEW.condominium_id,
      'UPDATE',
      'visits',
      NEW.id,
      jsonb_build_object(
        'field', 'status',
        'old_value', OLD.status,
        'new_value', NEW.status,
        'visitor_name', NEW.visitor_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_visit_update
AFTER UPDATE ON visits
FOR EACH ROW
EXECUTE FUNCTION audit_visit_update();
```

## Frontend Integration

The frontend is already configured to fetch and display audit logs. The flow is:

```
AdminAuditLogs.tsx (UI)
  ?
api.adminGetAuditLogs(filters, limit, offset)
  ?
DataService.adminGetAuditLogs()
  ?
SupabaseService.adminGetAuditLogs()
  ?
Supabase RPC: admin_get_audit_logs()
  ?
Returns: { logs: AuditLog[], total: number }
```

## What Should Be Audited?

### Critical Actions (Must Log)
- ? Creating/updating/deleting condominiums
- ? Creating/updating/deleting staff accounts
- ? Creating/updating/deleting residents
- ? Approving/denying visits
- ? Resolving incidents
- ? Changing system configuration

### Optional Actions
- ? Login/logout events
- ? Password resets
- ? Failed authentication attempts
- ? Data exports (CSV downloads)
- ? Bulk operations

## Audit Log Retention

By default, audit logs are kept indefinitely. To implement retention policies:

```sql
-- Delete logs older than 1 year
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';

-- Or create a scheduled job
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'audit-log-cleanup',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year'$$
);
```

## Security Considerations

### Row Level Security (RLS)

If you want to restrict who can view audit logs:

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY audit_logs_admin_only ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.email()
    AND staff.role = 'ADMIN'
  )
);
```

### Preventing Tampering

- ? Audit logs should be **read-only** for most users
- ? Use `SECURITY DEFINER` on RPC functions
- ? Never expose direct DELETE access to audit_logs table
- ? Consider archiving logs to external storage periodically

## Troubleshooting

### "No audit logs found"
- Check if the SQL migration was run successfully
- Insert test data to verify the table exists
- Check browser console for API errors

### "Permission denied"
- Verify RLS policies if enabled
- Check that `GRANT EXECUTE` was run for the RPC functions
- Ensure the user has the ADMIN role

### "RPC function not found"
- Re-run the migration script
- Check for syntax errors in Supabase SQL Editor logs

## Next Steps

Once the database is set up, you can:

1. **Integrate logging into all admin RPCs** - Add `log_audit()` calls
2. **Create automatic triggers** - For critical table changes
3. **Add CSV export for audit logs** - Allow downloading audit reports
4. **Set up email alerts** - Notify admins of critical actions
5. **Create retention policies** - Archive old logs

## Support

For questions or issues with audit logging:
- Check the database migration output for errors
- Review Supabase logs for RPC execution failures
- Test the RPC function directly in SQL Editor before using in frontend

---

**Elite CondoGuard** - Comprehensive Audit Logging System
Version 1.0 | December 2025
