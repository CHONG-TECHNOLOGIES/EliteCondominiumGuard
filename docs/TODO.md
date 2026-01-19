# TODO - Elite AccessControl

## 1. CHANGE DATABASE ACCESS

**Objective**: Migrate all direct database access (`.from()`) to RPC functions or Supabase Edge Functions for better security, maintainability, and performance.

### Current State

| Access Type | Count | Status |
|-------------|-------|--------|
| `.from()` direct access | ~78 calls | ❌ To migrate |
| `.rpc()` functions | 7 calls | ✅ Already using RPC |

### Existing RPC Functions (Keep)

- [x] `verify_staff_login` - PIN authentication
- [x] `admin_get_all_visits` - Admin visits list
- [x] `admin_get_all_incidents` - Admin incidents list
- [x] `admin_get_all_units` - Admin units list
- [x] `admin_get_all_staff` - Admin staff list
- [x] `admin_get_dashboard_stats` - Dashboard statistics
- [x] `admin_get_audit_logs` - Audit log retrieval

---

### Direct Access to Migrate

#### Condominiums Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:19` | SELECT all | `get_condominiums()` |
| `Supabase.ts:38` | SELECT by id | `get_condominium(p_id)` |
| `Supabase.ts:928` | INSERT | `admin_create_condominium(p_data)` |
| `Supabase.ts:957` | UPDATE | `admin_update_condominium(p_id, p_data)` |
| `Supabase.ts:979` | DELETE | `admin_delete_condominium(p_id)` |
| `Supabase.ts:1818` | SELECT with stats | `admin_get_condominiums_with_stats()` |
| `Supabase.ts:2000` | SELECT by id | (duplicate - consolidate) |

#### Streets Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:58` | SELECT by condo | `get_streets(p_condominium_id)` |
| `Supabase.ts:76` | INSERT | `create_street(p_data)` |
| `Supabase.ts:94` | DELETE | `delete_street(p_id)` |

#### Staff Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:213` | SELECT by condo | `get_staff_by_condominium(p_condominium_id)` |
| `Supabase.ts:1067` | INSERT | `admin_create_staff(p_data)` |
| `Supabase.ts:1094` | UPDATE | `admin_update_staff(p_id, p_data)` |
| `Supabase.ts:1116` | DELETE | `admin_delete_staff(p_id)` |

#### Units Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:230` | SELECT by condo | `get_units(p_condominium_id)` |
| `Supabase.ts:1138` | INSERT | `admin_create_unit(p_data)` |
| `Supabase.ts:1165` | UPDATE | `admin_update_unit(p_id, p_data)` |
| `Supabase.ts:1187` | DELETE | `admin_delete_unit(p_id)` |

#### Residents Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:1209` | SELECT by condo | `admin_get_residents(p_condominium_id)` |
| `Supabase.ts:1235` | INSERT | `admin_create_resident(p_data)` |
| `Supabase.ts:1262` | UPDATE | `admin_update_resident(p_id, p_data)` |
| `Supabase.ts:1284` | DELETE | `admin_delete_resident(p_id)` |
| `Supabase.ts:2024` | SELECT by id | `get_resident(p_id)` |
| `Supabase.ts:2070` | SELECT by id | (duplicate - consolidate) |
| `Supabase.ts:2115` | SELECT by id | (duplicate - consolidate) |

#### Visits Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:250` | SELECT today | `get_todays_visits(p_condominium_id)` |
| `Supabase.ts:297` | INSERT | `create_visit(p_data)` |
| `Supabase.ts:315` | UPDATE status | `update_visit_status(p_id, p_status)` |
| `Supabase.ts:337` | UPDATE checkout | `checkout_visit(p_id)` |
| `Supabase.ts:1505` | UPDATE (admin) | `admin_update_visit(p_id, p_data)` |
| `Supabase.ts:1836` | COUNT by condo | (part of stats - consolidate) |

#### Incidents Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:397` | SELECT by condo | `get_incidents(p_condominium_id)` |
| `Supabase.ts:444` | INSERT | `create_incident(p_data)` |
| `Supabase.ts:473` | UPDATE status | `update_incident_status(p_id, p_status, p_notes)` |
| `Supabase.ts:509` | UPDATE acknowledge | `acknowledge_incident(p_id, p_guard_id)` |
| `Supabase.ts:1551` | UPDATE (admin) | `admin_update_incident(p_id, p_data)` |
| `Supabase.ts:1583` | UPDATE status (admin) | (consolidate with above) |
| `Supabase.ts:1594` | UPDATE notes (admin) | (consolidate with above) |
| `Supabase.ts:1616` | DELETE | `admin_delete_incident(p_id)` |
| `Supabase.ts:1844` | COUNT by condo | (part of stats - consolidate) |
| `Incidents.tsx:2` | Direct access | Move to DataService |

#### Incident Types & Statuses Tables
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:363` | SELECT all types | `get_incident_types()` |
| `Supabase.ts:380` | SELECT all statuses | `get_incident_statuses()` |

#### Devices Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:527` | SELECT by identifier | `get_device(p_identifier)` |
| `Supabase.ts:553` | UPSERT | `register_device(p_data)` |
| `Supabase.ts:570` | UPDATE heartbeat | `update_device_heartbeat(p_identifier)` |
| `Supabase.ts:592` | UPDATE status | `update_device_status(p_id, p_status)` |
| `Supabase.ts:688` | SELECT by condo | `get_devices_by_condominium(p_condominium_id)` |
| `Supabase.ts:719` | SELECT all | `admin_get_all_devices()` |
| `Supabase.ts:999` | INSERT (admin) | `admin_create_device(p_data)` |
| `Supabase.ts:1021` | UPDATE (admin) | `admin_update_device(p_id, p_data)` |
| `Supabase.ts:1041` | DELETE (admin) | `admin_delete_device(p_id)` |

#### Visit Types Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:138` | SELECT by condo | `get_visit_types(p_condominium_id)` |
| `Supabase.ts:1640` | SELECT all (admin) | `admin_get_visit_types()` |
| `Supabase.ts:1660` | INSERT | `admin_create_visit_type(p_data)` |
| `Supabase.ts:1687` | UPDATE | `admin_update_visit_type(p_id, p_data)` |
| `Supabase.ts:1709` | DELETE | `admin_delete_visit_type(p_id)` |

#### Service Types Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:156` | SELECT all | `get_service_types()` |
| `Supabase.ts:1731` | SELECT all (admin) | `admin_get_service_types()` |
| `Supabase.ts:1751` | INSERT | `admin_create_service_type(p_data)` |
| `Supabase.ts:1774` | UPDATE | `admin_update_service_type(p_id, p_data)` |
| `Supabase.ts:1796` | DELETE | `admin_delete_service_type(p_id)` |

#### Restaurants Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:172` | SELECT by condo | `get_restaurants(p_condominium_id)` |
| `Supabase.ts:1306` | SELECT all (admin) | `admin_get_restaurants()` |
| `Supabase.ts:1332` | INSERT | `admin_create_restaurant(p_data)` |
| `Supabase.ts:1358` | UPDATE | `admin_update_restaurant(p_id, p_data)` |
| `Supabase.ts:1380` | DELETE | `admin_delete_restaurant(p_id)` |

#### Sports Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:192` | SELECT by condo | `get_sports(p_condominium_id)` |
| `Supabase.ts:1402` | SELECT all (admin) | `admin_get_sports()` |
| `Supabase.ts:1428` | INSERT | `admin_create_sport(p_data)` |
| `Supabase.ts:1454` | UPDATE | `admin_update_sport(p_id, p_data)` |
| `Supabase.ts:1476` | DELETE | `admin_delete_sport(p_id)` |

#### Audit Logs Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:352` | INSERT | `create_audit_log(p_data)` |
| `Supabase.ts:1936` | SELECT (admin) | Already using `admin_get_audit_logs` RPC |
| `AdminAuditLogs.tsx:1` | Direct access | Move to DataService |

#### Notifications Table
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:2035` | INSERT | `create_notification(p_data)` |
| `Supabase.ts:2081` | INSERT | (duplicate - consolidate) |
| `Supabase.ts:2125` | SELECT | `get_notifications(p_resident_id)` |

#### Storage (visitor-photos bucket)
| Location | Operation | New RPC/Edge Function |
|----------|-----------|----------------------|
| `Supabase.ts:647` | UPLOAD | Edge Function: `upload_visitor_photo` |
| `Supabase.ts:667` | GET URL | Edge Function: `get_visitor_photo_url` |

---

### Migration Priority

#### Phase 1 - Critical Security (High Priority)
1. [ ] `verify_staff_login` - Already RPC ✅
2. [ ] Staff CRUD operations - Sensitive PIN data
3. [ ] Residents CRUD operations - Personal data
4. [ ] Audit logs - Security trail

#### Phase 2 - Core Operations (Medium Priority)
5. [ ] Visits CRUD operations
6. [ ] Incidents CRUD operations
7. [ ] Devices management
8. [ ] Units management

#### Phase 3 - Configuration (Lower Priority)
9. [ ] Condominiums management
10. [ ] Visit types / Service types
11. [ ] Restaurants / Sports
12. [ ] Streets management
13. [ ] Notifications

#### Phase 4 - Storage (Edge Functions)
14. [ ] Photo upload/retrieval - Use Edge Functions for signed URLs

---

### Implementation Notes

#### RPC Function Template
```sql
CREATE OR REPLACE FUNCTION public.example_function(
  p_param1 INT4,
  p_param2 TEXT
)
RETURNS SETOF example_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate permissions here

  RETURN QUERY
  SELECT * FROM example_table
  WHERE column1 = p_param1;
END;
$$;
```

#### Edge Function Template (for file operations)
```typescript
// supabase/functions/upload-visitor-photo/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle file upload with validation
})
```

#### Benefits of Migration
- **Security**: RPC functions use `SECURITY DEFINER` with controlled access
- **Performance**: Server-side logic reduces round trips
- **Maintainability**: Centralized business logic in database
- **Audit**: Easier to log and track all operations
- **Validation**: Input validation at database level

---

### Files to Update After Migration

1. `services/Supabase.ts` - Replace `.from()` calls with `.rpc()` calls
2. `pages/Incidents.tsx` - Remove direct Supabase access
3. `pages/admin/AdminAuditLogs.tsx` - Remove direct Supabase access
4. `database/` - Add new migration files for RPC functions

---

### New SQL Migration Files to Create

```
database/
├── rpc_condominiums.sql
├── rpc_streets.sql
├── rpc_staff.sql
├── rpc_units.sql
├── rpc_residents.sql
├── rpc_visits.sql
├── rpc_incidents.sql
├── rpc_devices.sql
├── rpc_visit_types.sql
├── rpc_service_types.sql
├── rpc_restaurants.sql
├── rpc_sports.sql
├── rpc_audit_logs.sql
├── rpc_notifications.sql
└── edge_functions/
    ├── upload-visitor-photo/
    └── get-visitor-photo-url/
```
