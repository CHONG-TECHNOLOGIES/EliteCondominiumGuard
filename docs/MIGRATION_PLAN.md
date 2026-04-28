# Migration Plan: Direct Database Access to RPC Functions

## Status: ⚠️ 99% Complete — 3 Violations Remaining (April 2026)

All 68 direct `.from()` database calls in `Supabase.ts` have been migrated to `.rpc()`.
Full audit (April 2026) found 3 remaining violations: 1 in `Supabase.ts` + 2 in Edge Functions.

---

## ⚠️ Remaining Violations

### Complete Violation Map

| # | File | Line | Function/Context | Table | Screen Caller |
|---|------|------|-----------------|-------|---------------|
| 1 | `src/services/Supabase.ts` | 2640 | `adminGetDeviceRegistrationErrors()` | `device_registration_errors` | `pages/admin/AdminDeviceRegistrationErrors.tsx` |
| 2 | `supabase/functions/send-video-call-push/index.ts` | 75 | Edge Function handler | `resident_devices` | N/A (server-side) |
| 3 | `APPRESIDENT/.../send-push-notification/index.ts` | 153 | Edge Function handler | `residents` + `resident_devices` (nested) | N/A (server-side) |

---

### Fix 1 — `adminGetDeviceRegistrationErrors` (Supabase.ts:2640)

**Screen affected:** `pages/admin/AdminDeviceRegistrationErrors.tsx`

**Step 1:** Create migration `src/database/admin_get_device_registration_errors.sql`

```sql
CREATE OR REPLACE FUNCTION admin_get_device_registration_errors(
  p_start_date        timestamptz DEFAULT NULL,
  p_end_date          timestamptz DEFAULT NULL,
  p_device_identifier text        DEFAULT NULL,
  p_limit             int4        DEFAULT 100,
  p_offset            int4        DEFAULT 0
)
RETURNS TABLE(errors json, total bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total  bigint;
  v_errors json;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM device_registration_errors e
  WHERE (p_start_date          IS NULL OR e.created_at        >= p_start_date)
    AND (p_end_date            IS NULL OR e.created_at        <= p_end_date)
    AND (p_device_identifier   IS NULL OR e.device_identifier  = p_device_identifier);

  SELECT json_agg(e ORDER BY e.created_at DESC) INTO v_errors
  FROM (
    SELECT *
    FROM device_registration_errors e
    WHERE (p_start_date        IS NULL OR e.created_at        >= p_start_date)
      AND (p_end_date          IS NULL OR e.created_at        <= p_end_date)
      AND (p_device_identifier IS NULL OR e.device_identifier  = p_device_identifier)
    ORDER BY e.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) e;

  RETURN QUERY SELECT COALESCE(v_errors, '[]'::json), COALESCE(v_total, 0);
END;
$$;
```

Apply via: `/db-migrate src/database/admin_get_device_registration_errors.sql`

**Step 2:** Update `src/services/Supabase.ts` (~line 2639) — replace direct query with:

```typescript
const { data, error } = await supabase.rpc('admin_get_device_registration_errors', {
  p_start_date: filters?.startDate ?? null,
  p_end_date: filters?.endDate ?? null,
  p_device_identifier: filters?.deviceIdentifier ?? null,
  p_limit: limit,
  p_offset: offset,
});
if (error) throw error;
return {
  errors: (data?.[0]?.errors as DeviceRegistrationError[]) ?? [],
  total: Number(data?.[0]?.total ?? 0),
};
```

---

### Fix 2 — Edge Function `send-video-call-push` (line 75)

File: `supabase/functions/send-video-call-push/index.ts`

**Step 1:** Create migration `src/database/get_resident_push_tokens.sql`

```sql
CREATE OR REPLACE FUNCTION get_resident_push_tokens(p_resident_id int4)
RETURNS TABLE(push_token text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT push_token
  FROM resident_devices
  WHERE resident_id = p_resident_id
    AND push_token IS NOT NULL
  ORDER BY last_active DESC;
$$;
```

**Step 2:** Replace lines 74–79 in the edge function with:

```typescript
const { data: devices, error: devicesError } = await supabase
  .rpc("get_resident_push_tokens", { p_resident_id: resident_id });
```

---

### Fix 3 — APPRESIDENT Edge Function `send-push-notification` (line 153)

File: `APPRESIDENT/EliteResidentAccess/supabase/functions/send-push-notification/index.ts`

**Step 1:** Create SQL RPC (apply via MCP — project `nfuglaftnaohzacilike`):

```sql
CREATE OR REPLACE FUNCTION get_residents_with_push_tokens(p_unit_id int4)
RETURNS TABLE(id int4, name text, push_token text, device_push_token text, device_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.push_token,
    rd.push_token  AS device_push_token,
    rd.device_name
  FROM residents r
  LEFT JOIN resident_devices rd ON rd.resident_id = r.id
  WHERE r.unit_id = p_unit_id;
$$;
```

**Step 2:** Replace lines 152–163 with:

```typescript
const { data: residents, error } = await supabase
  .rpc("get_residents_with_push_tokens", { p_unit_id: visit.unit_id });
```

Update downstream code to use `resident.device_push_token` and `resident.device_name` instead of nested `resident_devices` array.

---

## Verification Checklist

- [ ] `admin_get_device_registration_errors` RPC exists in Supabase
- [ ] `get_resident_push_tokens` RPC exists in Supabase
- [ ] `get_residents_with_push_tokens` RPC exists in Supabase
- [ ] `/admin/device-registration-errors` page loads with date/device filters working
- [ ] Video call push notifications arrive on resident device after guard initiates call
- [ ] `grep -rn "\.from('device_registration_errors\|\.from(\"resident_devices\|\.from(\"residents\"" src/` returns zero results

---

## ✅ Intentional `.from()` Calls (Supabase Storage API)

These are **correct** — Supabase Storage SDK requires `.from(bucket)`:

| Lines | Bucket | Purpose |
|-------|--------|---------|
| 522, 531, 549 | `news` | News image upload/delete |
| 592 | `resident-photos` | Resident photo URL generation |
| 1061, 1081 | `visitor-photos` | Visitor photo upload/URL |
| 1123, 1133 | `(bucketName)` | Generic storage helper |
| 1185, 1205, 1235, 1256 | `staff-photos` | Staff photo upload/delete |

---

## Completed Migrations Summary

| Phase | Table | Migrations | Status |
|-------|-------|------------|--------|
| 1 | Condominiums | 7 | ✅ Done |
| 2 | Streets | 3 | ✅ Done |
| 3 | Staff | 4 | ✅ Done |
| 4 | Units | 4 | ✅ Done |
| 5 | Residents | 7 | ✅ Done |
| 6 | Visits | 6 | ✅ Done |
| 7 | Incidents | 8 | ✅ Done |
| 8 | Incident Lookups | 2 | ✅ Done |
| 9 | Devices | 10 | ✅ Done |
| 10 | Visit Types | 5 | ✅ Done |
| 11 | Service Types | 5 | ✅ Done |
| 12 | Restaurants | 5 | ✅ Done |
| 13 | Sports | 5 | ✅ Done |
| 14 | Audit Logs | 2 | ✅ Done |
| 15 | Notifications | 3 | ✅ Done |
| 16 | News | 9 | ✅ Done |
| **TOTAL** | | **85** | ✅ |
