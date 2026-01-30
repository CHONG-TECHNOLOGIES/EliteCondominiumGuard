# Audit Logging System Setup

## Overview

The audit logging system provides comprehensive tracking of all administrative actions in Elite CondoGuard. This document explains how to set up and use the audit logging infrastructure.

## How to Integrate Audit Logging into Your RPCs

### Method 1: Manual Logging in RPC Functions

## Frontend Integration

The frontend is already configured to fetch and display audit logs. The flow is:

```
AdminAuditLogs.tsx (UI)
  ↓
api.adminGetAuditLogs(filters, limit, offset)
  ↓
DataService.adminGetAuditLogs()
  ↓
SupabaseService.adminGetAuditLogs()
  ↓
Supabase RPC: admin_get_audit_logs()
  ↓
Returns: { logs: AuditLog[], total: number }
```

## What Should Be Audited?

### Critical Actions (Must Log)
- ✅ Creating/updating/deleting condominiums
- ✅ Creating/updating/deleting staff accounts
- ✅ Creating/updating/deleting residents
- ✅ Create,Approving/denying visitsand all status
- ✅ Resolving incidents
- ✅ Changing system configuration

### Optional Actions
- ⚪ Login/logout events
- ⚪ Password resets
- ⚪ Failed authentication attempts
- ⚪ Data exports (CSV downloads)
- ⚪ Bulk operations

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

- ✅ Audit logs should be **read-only** for most users
- ✅ Use `SECURITY DEFINER` on RPC functions
- ✅ Never expose direct DELETE access to audit_logs table
- ✅ Consider archiving logs to external storage periodically

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
