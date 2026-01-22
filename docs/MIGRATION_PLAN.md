# Migration Plan: Direct Database Access to RPC Functions

## Overview

Migrate all direct database access (`.from()`) in `Supabase.ts` to RPC functions (`.rpc()`) for better security, maintainability, and performance.

---

## ✅ RPC Signature Verification - COMPLETE

All 79 RPC functions have been verified. Below are the exact signatures:

---

### 1. Condominiums (6 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_condominiums()` | None | `SETOF condominiums` | ✅ |
| `get_condominium()` | `p_id int4` | `SETOF condominiums` | ✅ |
| `admin_create_condominium()` | `p_data jsonb` | `condominiums` | ✅ |
| `admin_update_condominium()` | `p_id int4, p_data jsonb` | `condominiums` | ✅ |
| `admin_delete_condominium()` | `p_id int4` | `boolean` | ✅ |
| `admin_get_condominiums_with_stats()` | None | `TABLE(id, name, address, latitude, longitude, total_visits_today, total_incidents_open, status)` | ✅ |

---

### 2. Streets (3 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_streets()` | `p_condominium_id int4` | `SETOF streets` | ✅ |
| `create_street()` | `p_data jsonb` | `streets` | ✅ |
| `delete_street()` | `p_id int4` | `boolean` | ✅ |

---

### 3. Staff (4 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_staff_by_condominium()` | `p_condominium_id int4` | `SETOF staff` | ✅ |
| `admin_create_staff()` | `p_data jsonb` | `staff` | ✅ |
| `admin_update_staff()` | `p_id int4, p_data jsonb` | `staff` | ✅ |
| `admin_delete_staff()` | `p_id int4` | `boolean` | ✅ |

---

### 4. Units (4 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_units()` | `p_condominium_id int4` | `SETOF units` | ✅ |
| `admin_create_unit()` | `p_data jsonb` | `units` | ✅ |
| `admin_update_unit()` | `p_id int4, p_data jsonb` | `units` | ✅ |
| `admin_delete_unit()` | `p_id int4` | `boolean` | ✅ |

---

### 5. Residents (5 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `admin_get_residents()` | `p_condominium_id int4` | `SETOF residents` | ✅ |
| `admin_create_resident()` | `p_data jsonb` | `residents` | ✅ |
| `admin_update_resident()` | `p_id int4, p_data jsonb` | `residents` | ✅ |
| `admin_delete_resident()` | `p_id int4` | `boolean` | ✅ |
| `get_resident()` | `p_id int4` | `SETOF residents` | ✅ |

---

### 6. Visits (5 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_todays_visits()` | `p_condominium_id int4` | `SETOF visits` | ✅ |
| `create_visit()` | `p_data jsonb` | `visits` | ✅ |
| `update_visit_status()` | `p_id int4, p_status text` | `visits` | ✅ |
| `checkout_visit()` | `p_id int4` | `visits` | ✅ |
| `admin_update_visit()` | `p_id int4, p_data jsonb` | `visits` | ✅ |

---

### 7. Incidents (6 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_incidents()` | `p_condominium_id int4` | `SETOF incidents` | ✅ |
| `create_incident()` | `p_data jsonb` | `incidents` | ✅ |
| `update_incident_status()` | `p_id int4, p_status text, p_notes text` | `incidents` | ✅ |
| `acknowledge_incident()` | `p_id int4, p_guard_id int4` | `incidents` | ✅ |
| `admin_update_incident()` | `p_id int4, p_data jsonb` | `incidents` | ✅ |
| `admin_delete_incident()` | `p_id int4` | `boolean` | ✅ |

---

### 8. Incident Lookups (2 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_incident_types()` | None | `SETOF incident_types` | ✅ |
| `get_incident_statuses()` | None | `SETOF incident_statuses` | ✅ |

---

### 9. Devices (9 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_device()` | `p_identifier text` | `SETOF devices` | ✅ |
| `register_device()` | `p_data jsonb` | `devices` | ✅ |
| `update_device_heartbeat()` | `p_identifier text` | `devices` | ✅ |
| `update_device_status()` | `p_id int4, p_status text` | `devices` | ✅ |
| `get_devices_by_condominium()` | `p_condominium_id int4` | `SETOF devices` | ✅ |
| `admin_get_all_devices()` | None | `SETOF devices` | ✅ |
| `admin_create_device()` | `p_data jsonb` | `devices` | ✅ |
| `admin_update_device()` | `p_id int4, p_data jsonb` | `devices` | ✅ |
| `admin_delete_device()` | `p_id int4` | `boolean` | ✅ |

---

### 10. Visit Types (5 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_visit_types()` | `p_condominium_id int4` | `SETOF visit_types` | ✅ |
| `admin_get_visit_types()` | None | `SETOF visit_types` | ✅ |
| `admin_create_visit_type()` | `p_data jsonb` | `visit_types` | ✅ |
| `admin_update_visit_type()` | `p_id int4, p_data jsonb` | `visit_types` | ✅ |
| `admin_delete_visit_type()` | `p_id int4` | `boolean` | ✅ |

---

### 11. Service Types (5 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_service_types()` | None | `SETOF service_types` | ✅ |
| `admin_get_service_types()` | None | `SETOF service_types` | ✅ |
| `admin_create_service_type()` | `p_data jsonb` | `service_types` | ✅ |
| `admin_update_service_type()` | `p_id int4, p_data jsonb` | `service_types` | ✅ |
| `admin_delete_service_type()` | `p_id int4` | `boolean` | ✅ |

---

### 12. Restaurants (5 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_restaurants()` | `p_condominium_id int4` | `SETOF restaurants` | ✅ |
| `admin_get_restaurants()` | None | `SETOF restaurants` | ✅ |
| `admin_create_restaurant()` | `p_data jsonb` | `restaurants` | ✅ |
| `admin_update_restaurant()` | `p_id int4, p_data jsonb` | `restaurants` | ✅ |
| `admin_delete_restaurant()` | `p_id int4` | `boolean` | ✅ |

---

### 13. Sports (5 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `get_sports()` | `p_condominium_id int4` | `SETOF sports` | ✅ |
| `admin_get_sports()` | None | `SETOF sports` | ✅ |
| `admin_create_sport()` | `p_data jsonb` | `sports` | ✅ |
| `admin_update_sport()` | `p_id int4, p_data jsonb` | `sports` | ✅ |
| `admin_delete_sport()` | `p_id int4` | `boolean` | ✅ |

---

### 14. Audit Logs (1 function)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `create_audit_log()` | `p_data jsonb` | `audit_logs` | ✅ |

*Note: `admin_get_audit_logs()` already exists in `add_audit_logging.sql`*

---

### 15. Notifications (2 functions)

| Function | Parameters | Return Type | Status |
|----------|------------|-------------|--------|
| `create_notification()` | `p_data jsonb` | `notifications` | ✅ |
| `get_notifications()` | `p_resident_id int4` | `SETOF notifications` | ✅ |

---

## Summary

| Category | Functions | Status |
|----------|-----------|--------|
| Condominiums | 6 | ✅ All verified |
| Streets | 3 | ✅ All verified |
| Staff | 4 | ✅ All verified |
| Units | 4 | ✅ All verified |
| Residents | 5 | ✅ All verified |
| Visits | 5 | ✅ All verified |
| Incidents | 6 | ✅ All verified |
| Incident Lookups | 2 | ✅ All verified |
| Devices | 9 | ✅ All verified |
| Visit Types | 5 | ✅ All verified |
| Service Types | 5 | ✅ All verified |
| Restaurants | 5 | ✅ All verified |
| Sports | 5 | ✅ All verified |
| Audit Logs | 1 | ✅ All verified |
| Notifications | 2 | ✅ All verified |
| **TOTAL** | **67** | ✅ **All Ready** |

---

## Key Patterns

All functions share these characteristics:
- **Security**: `SECURITY DEFINER` - Execute with function owner's privileges
- **Search Path**: `SET search_path = public` - Prevents SQL injection via search path
- **Language**: PL/pgSQL
- **Input**: Most CRUD operations use `jsonb` for flexible data handling
- **Output**: Single row or `SETOF` for array results

---

## 🚫 NOT YET CREATED - Edge Functions for Storage

| Function Needed | Purpose | Notes |
|----------------|---------|-------|
| `upload_visitor_photo` | Upload visitor photos to storage | Requires Supabase Edge Function |
| `get_visitor_photo_url` | Get signed URL for photos | Requires Supabase Edge Function |

---

## Migration Work Required

### Supabase.ts Analysis Results

- **Total `.from()` calls to migrate**: 68 occurrences
- **Functions already using `.rpc()`**: 7 functions (will keep as-is)
- **Tables accessed**: 16 distinct tables

---

## Detailed Migration Map

### Already Using RPC ✅ (No changes needed)

| Line | Function | RPC |
|------|----------|-----|
| 112 | `verifyStaffLogin` | `verify_staff_login` |
| 762 | `adminGetAllVisits` | `admin_get_all_visits` |
| 800 | `adminGetAllIncidents` | `admin_get_all_incidents` |
| 830 | `adminGetAllUnits` | `admin_get_all_units` |
| 856 | `adminGetAllStaff` | `admin_get_all_staff` |
| 890 | `adminGetDashboardStats` | `admin_get_dashboard_stats` |

---

### Phase 1: Condominiums (7 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 19 | `getCondominium()` → `.from('condominiums')` | `.rpc('get_condominium', { p_id })` |
| 38 | `listActiveCondominiums()` → `.from('condominiums')` | `.rpc('get_condominiums')` |
| 927 | `adminCreateCondominium()` → `.from('condominiums').insert()` | `.rpc('admin_create_condominium', { p_data })` |
| 956 | `adminUpdateCondominium()` → `.from('condominiums').update()` | `.rpc('admin_update_condominium', { p_id, p_data })` |
| 978 | `adminToggleCondominiumStatus()` → `.from('condominiums').update()` | `.rpc('admin_update_condominium', { p_id, p_data })` |
| 1817 | `adminGetCondominiumStats()` → `.from('condominiums')` | `.rpc('admin_get_condominiums_with_stats')` |
| 1999 | `adminGetAllCondominiums()` → `.from('condominiums')` | `.rpc('get_condominiums')` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 2: Streets (3 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 57 | `getStreets()` → `.from('streets')` | `.rpc('get_streets', { p_condominium_id })` |
| 75 | `addStreet()` → `.from('streets').insert()` | `.rpc('create_street', { p_data })` |
| 93 | `removeStreet()` → `.from('streets').delete()` | `.rpc('delete_street', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 3: Staff (4 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 212 | `getStaffForSync()` → `.from('staff')` | `.rpc('get_staff_by_condominium', { p_condominium_id })` |
| 1066 | `adminCreateStaff()` → `.from('staff').insert()` | `.rpc('admin_create_staff', { p_data })` |
| 1093 | `adminUpdateStaff()` → `.from('staff').update()` | `.rpc('admin_update_staff', { p_id, p_data })` |
| 1115 | `adminDeleteStaff()` → `.from('staff').delete()` | `.rpc('admin_delete_staff', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 4: Units (4 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 229 | `getUnitsWithResidents()` → `.from('units')` | `.rpc('get_units', { p_condominium_id })` |
| 1137 | `adminCreateUnit()` → `.from('units').insert()` | `.rpc('admin_create_unit', { p_data })` |
| 1164 | `adminUpdateUnit()` → `.from('units').update()` | `.rpc('admin_update_unit', { p_id, p_data })` |
| 1186 | `adminDeleteUnit()` → `.from('units').delete()` | `.rpc('admin_delete_unit', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 5: Residents (7 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 1208 | `adminGetAllResidents()` → `.from('residents')` | `.rpc('admin_get_residents', { p_condominium_id })` |
| 1234 | `adminCreateResident()` → `.from('residents').insert()` | `.rpc('admin_create_resident', { p_data })` |
| 1261 | `adminUpdateResident()` → `.from('residents').update()` | `.rpc('admin_update_resident', { p_id, p_data })` |
| 1283 | `adminDeleteResident()` → `.from('residents').delete()` | `.rpc('admin_delete_resident', { p_id })` |
| 2023 | `createVisitorEnteredNotification()` → `.from('residents')` | `.rpc('get_resident', { p_id })` |
| 2069 | `createVisitorLeftNotification()` → `.from('residents')` | `.rpc('get_resident', { p_id })` |
| 2114 | `createIncidentReadNotification()` → `.from('residents')` | `.rpc('get_resident', { p_id })` |

Status: Completed in `services/Supabase.ts` (all resident-related calls already use RPCs).

---

### Phase 6: Visits (6 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 250 | `getTodaysVisits()` → `.from('visits')` | `.rpc('get_todays_visits', { p_condominium_id })` |
| 296 | `createVisit()` → `.from('visits').insert()` | `.rpc('create_visit', { p_data })` |
| 314 | `updateVisit()` → `.from('visits').update()` | `.rpc('admin_update_visit', { p_id, p_data })` |
| 336 | `updateVisitStatus()` → `.from('visits').update()` | `.rpc('update_visit_status', { p_id, p_status })` / `.rpc('checkout_visit', { p_id })` |
| 1504 | `adminUpdateVisitStatus()` → `.from('visits').update()` | `.rpc('update_visit_status', { p_id, p_status })` |
| 1835 | `adminGetCondominiumStats()` → `.from('visits')` | Part of `admin_get_condominiums_with_stats` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 7: Incidents (8 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 397 | `getIncidents()` → `.from('incidents')` | `.rpc('get_incidents', { p_condominium_id })` |
| 443 | `acknowledgeIncident()` → `.from('incidents').update()` | `.rpc('acknowledge_incident', { p_id, p_guard_id })` |
| 472-509 | `reportIncidentAction()` → `.from('incidents')` | `.rpc('update_incident_status', { p_id, p_status, p_notes })` |
| 1550 | `adminAcknowledgeIncident()` → `.from('incidents').update()` | `.rpc('acknowledge_incident', { p_id, p_guard_id })` |
| 1582-1593 | `adminResolveIncident()` → `.from('incidents')` | `.rpc('update_incident_status', { p_id, p_status, p_notes })` |
| 1615 | `adminUpdateIncidentNotes()` → `.from('incidents').update()` | `.rpc('admin_update_incident', { p_id, p_data })` |
| 1843 | `adminGetCondominiumStats()` → `.from('incidents')` | Part of `admin_get_condominiums_with_stats` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 8: Incident Lookups (2 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 362 | `getIncidentTypes()` → `.from('incident_types')` | `.rpc('get_incident_types')` |
| 379 | `getIncidentStatuses()` → `.from('incident_statuses')` | `.rpc('get_incident_statuses')` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 9: Devices (10 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 527 | `registerDevice()` → `.from('devices').upsert()` | `.rpc('register_device', { p_data })` |
| 552 | `updateDeviceHeartbeat()` → `.from('devices').update()` | `.rpc('update_device_heartbeat', { p_identifier })` |
| 569 | `decommissionDevice()` → `.from('devices').update()` | `.rpc('update_device_status', { p_id, p_status: 'DECOMMISSIONED' })` |
| 591 | `deactivateCondoDevices()` → `.from('devices').update()` | *Custom - may need new RPC* |
| 688 | `getDeviceByIdentifier()` → `.from('devices')` | `.rpc('get_device', { p_identifier })` |
| 718 | `getActiveDevicesByCondominium()` → `.from('devices')` | `.rpc('get_devices_by_condominium', { p_condominium_id })` |
| 998 | `adminUpdateDevice()` → `.from('devices').update()` | `.rpc('admin_update_device', { p_id, p_data })` |
| 1020 | `adminDecommissionDevice()` → `.from('devices').update()` | `.rpc('admin_delete_device', { p_id })` |
| 1040 | `adminGetAllDevices()` → `.from('devices')` | `.rpc('admin_get_all_devices')` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs; `deactivate_condo_devices` added in `database/deactivate_condo_devices.sql`).

---

### Phase 10: Visit Types (5 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 137 | `getVisitTypes()` → `.from('visit_types')` | `.rpc('get_visit_types', { p_condominium_id })` |
| 1639 | `adminGetAllVisitTypes()` → `.from('visit_types')` | `.rpc('admin_get_visit_types')` |
| 1659 | `adminCreateVisitType()` → `.from('visit_types').insert()` | `.rpc('admin_create_visit_type', { p_data })` |
| 1686 | `adminUpdateVisitType()` → `.from('visit_types').update()` | `.rpc('admin_update_visit_type', { p_id, p_data })` |
| 1708 | `adminDeleteVisitType()` → `.from('visit_types').delete()` | `.rpc('admin_delete_visit_type', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 11: Service Types (5 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 155 | `getServiceTypes()` → `.from('service_types')` | `.rpc('get_service_types')` |
| 1730 | `adminGetAllServiceTypes()` → `.from('service_types')` | `.rpc('admin_get_service_types')` |
| 1750 | `adminCreateServiceType()` → `.from('service_types').insert()` | `.rpc('admin_create_service_type', { p_data })` |
| 1773 | `adminUpdateServiceType()` → `.from('service_types').update()` | `.rpc('admin_update_service_type', { p_id, p_data })` |
| 1795 | `adminDeleteServiceType()` → `.from('service_types').delete()` | `.rpc('admin_delete_service_type', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 12: Restaurants (5 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 171 | `getRestaurants()` → `.from('restaurants')` | `.rpc('get_restaurants', { p_condominium_id })` |
| 1305 | `adminGetAllRestaurants()` → `.from('restaurants')` | `.rpc('admin_get_restaurants')` |
| 1331 | `adminCreateRestaurant()` → `.from('restaurants').insert()` | `.rpc('admin_create_restaurant', { p_data })` |
| 1357 | `adminUpdateRestaurant()` → `.from('restaurants').update()` | `.rpc('admin_update_restaurant', { p_id, p_data })` |
| 1379 | `adminDeleteRestaurant()` → `.from('restaurants').delete()` | `.rpc('admin_delete_restaurant', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 13: Sports (5 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 191 | `getSports()` → `.from('sports')` | `.rpc('get_sports', { p_condominium_id })` |
| 1401 | `adminGetAllSports()` → `.from('sports')` | `.rpc('admin_get_sports')` |
| 1427 | `adminCreateSport()` → `.from('sports').insert()` | `.rpc('admin_create_sport', { p_data })` |
| 1453 | `adminUpdateSport()` → `.from('sports').update()` | `.rpc('admin_update_sport', { p_id, p_data })` |
| 1475 | `adminDeleteSport()` → `.from('sports').delete()` | `.rpc('admin_delete_sport', { p_id })` |

Status: Completed in `services/Supabase.ts` (all listed calls already use RPCs).

---

### Phase 14: Audit Logs (2 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 352 | `logAudit()` → `.from('audit_logs').insert()` | `.rpc('create_audit_log', { p_data })` |
| 1935 | `adminGetAuditLogs()` → `.from('audit_logs')` | Already has RPC fallback - enable `USE_RPC=true` |

Status: Completed in `services/Supabase.ts` (audit log reads/writes now use RPCs).

---

### Phase 15: Notifications (3 migrations)

| Line | Current Function | Replace With |
|------|------------------|--------------|
| 2034 | `createVisitorEnteredNotification()` → `.from('notifications').insert()` | `.rpc('create_notification', { p_data })` |
| 2080 | `createVisitorLeftNotification()` → `.from('notifications').insert()` | `.rpc('create_notification', { p_data })` |
| 2125 | `createIncidentReadNotification()` → `.from('notifications').insert()` | `.rpc('create_notification', { p_data })` |

Status: Completed in `services/Supabase.ts` (all notifications now use RPCs).

---

## Special Cases

### 1. `deactivateCondoDevices()` (Line 591)
**Issue**: No existing RPC to deactivate all devices for a condominium
**Solution**: Create new RPC `deactivate_condo_devices(p_condominium_id)` OR handle in application

### 2. `adminGetCondominiumStats()` (Lines 1817-1843)
**Issue**: Makes 3 queries (condominiums, visits count, incidents count)
**Solution**: Replace entire function with single `.rpc('admin_get_condominiums_with_stats')` call

### 3. Complex Joins
Some functions use nested selects (e.g., `getUnitsWithResidents`, `getTodaysVisits`)
**Solution**: RPC returns may need post-processing or RPC functions may need enhancement

---

## Files to Modify

1. **services/Supabase.ts** - 68 migrations across 42 functions
2. **database/deactivate_condo_devices.sql** - New RPC (optional)

---

## Example Migration Pattern

```typescript
// BEFORE
async getCondominium(id: number): Promise<Condominium | null> {
  const { data, error } = await supabase
    .from('condominiums')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// AFTER
async getCondominium(id: number): Promise<Condominium | null> {
  const { data, error } = await supabase
    .rpc('get_condominium', { p_id: id })
    .single();
  if (error) throw error;
  return data;
}
```

---

## Verification Plan

After each phase, verify:
1. Function returns expected data structure
2. Error handling works correctly
3. Offline sync still functions (DataService integration)
4. UI components render properly
5. Admin operations work as expected

---

## Summary

| Phase | Table | Migrations | Priority |
|-------|-------|------------|----------|
| 1 | Condominiums | 7 | Medium |
| 2 | Streets | 3 | Low |
| 3 | Staff | 4 | High |
| 4 | Units | 4 | Medium |
| 5 | Residents | 7 | High |
| 6 | Visits | 6 | High |
| 7 | Incidents | 8 | High |
| 8 | Incident Lookups | 2 | Low |
| 9 | Devices | 10 | High |
| 10 | Visit Types | 5 | Medium |
| 11 | Service Types | 5 | Medium |
| 12 | Restaurants | 5 | Low |
| 13 | Sports | 5 | Low |
| 14 | Audit Logs | 2 | High |
| 15 | Notifications | 3 | Medium |
| **TOTAL** | | **76** | |
