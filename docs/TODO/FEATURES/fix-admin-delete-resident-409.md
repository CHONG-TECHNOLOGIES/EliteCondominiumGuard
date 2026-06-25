# Fix: 409 Conflict on `admin_delete_resident`

**Priority:** Medium  
**Effort:** Low (DB-only, no TypeScript changes)  
**Status:** Pending

## Context

Deleting a resident from `AdminResidents` returns HTTP 409 Conflict, causing a generic "Erro ao remover residente" toast. The guard app silently fails with no actionable detail.

**Root cause**: `admin_delete_resident` in `schema_complete.sql` does a bare `DELETE FROM residents WHERE id = p_id`. Several tables have FK columns pointing at `residents` with implicit `RESTRICT` (PostgreSQL default — no `ON DELETE CASCADE` or `SET NULL`). When those child records exist, PostgreSQL rejects the DELETE and Supabase surfaces it as a 409.

**Blocking tables:**

| Table | Current FK behavior | Required fix |
|---|---|---|
| `notifications` | RESTRICT (blocks) | DELETE rows |
| `resident_qr_codes` | RESTRICT (blocks) | DELETE rows |
| `resident_devices` | RESTRICT (blocks) | DELETE rows |
| `incidents` | RESTRICT (blocks) | SET `resident_id = NULL` (preserve audit record) |
| `video_call_sessions` | RESTRICT (blocks) | SET `resident_id = NULL` (preserve call log) |

**Already-safe tables** (no action needed): `otp_codes` (CASCADE), `resident_frequent_visitors` (CASCADE), `event_rsvps` (CASCADE), `visitor_blacklist` (SET NULL).

## Fix

**Two files only — no TypeScript changes needed.**

### 1. Create `src/database/fix_admin_delete_resident.sql`

```sql
CREATE OR REPLACE FUNCTION public.admin_delete_resident(p_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  -- Nullify resident reference in audit-relevant tables (preserve records)
  UPDATE public.incidents SET resident_id = NULL WHERE resident_id = p_id;
  UPDATE public.video_call_sessions SET resident_id = NULL WHERE resident_id = p_id;

  -- Delete resident-owned records that have no value without the resident
  DELETE FROM public.notifications WHERE resident_id = p_id;
  DELETE FROM public.resident_qr_codes WHERE resident_id = p_id;
  DELETE FROM public.resident_devices WHERE resident_id = p_id;

  -- Now delete the resident (cascades handle otp_codes, frequent_visitors, event_rsvps)
  DELETE FROM public.residents WHERE id = p_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Cannot delete resident % — dependent records still exist', p_id
      USING ERRCODE = '23503';
END;
$function$;
```

Apply via: `/db-migrate src/database/fix_admin_delete_resident.sql`

### 2. Sync `src/database/schema_complete.sql`

Update the existing `admin_delete_resident` function block (lines ~2383–2399) to match the new function body above.

## Verification

1. Apply migration — confirm no error
2. In AdminResidents: delete a resident who has incidents/notifications
3. Confirm success toast appears and resident is removed from list
4. Query `incidents` — rows still exist with `resident_id = NULL`
5. Query `notifications` — resident's rows are gone
6. Query `residents` — row is deleted
