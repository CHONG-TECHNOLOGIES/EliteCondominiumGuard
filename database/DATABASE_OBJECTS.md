# DATABASE_OBJECTS.md

Live reference for all Supabase database objects in project **nfuglaftnaohzacilike**.  
Generated: 2026-05-26 | Source: Supabase MCP (live introspection)

---

## Summary

| Category | Count |
|----------|-------|
| Tables | 31 |
| Custom RPC Functions | ~120 |
| Views | 1 |
| Edge Functions | 3 |
| Triggers | 2 |
| RLS Policies | 17 |
| Indexes (custom, non-PK) | ~90 |
| Storage Buckets | 6 |
| Installed Extensions | 10 |
| Migrations | 14 |

> **SECURITY ALERT**: `visitor_blacklist` has RLS **disabled**. See [Security Notes](#security-notes).

---

## Tables

### condominiums
RLS: enabled | Rows: ~210

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| created_at | timestamptz | yes | now() | |
| name | text | no | | |
| address | text | yes | | |
| logo_url | text | yes | | |
| latitude | float8 | yes | | |
| longitude | float8 | yes | | |
| gps_radius_meters | int4 | yes | 100 | |
| status | text | yes | 'ACTIVE' | |
| phone_number | text | yes | | |
| contact_person | text | yes | | |
| contact_email | text | yes | | |
| manager_name | text | yes | | |
| visitor_photo_enabled | bool | no | true | |
| intercom_approval_enabled | bool | no | true | |
| guard_manual_approval_enabled | bool | no | true | |

Referenced by: units, staff, devices, residents, visits, restaurants, sports, streets, audit_logs, condominium_news, condominium_subscriptions, subscription_payments, subscription_alerts, condominium_events, resident_qr_codes, video_call_sessions, visitor_blacklist

---

### staff
RLS: enabled | Rows: ~1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| created_at | timestamptz | yes | now() | |
| first_name | text | no | | |
| last_name | text | no | | |
| pin_hash | text | no | | bcrypt hash, never plaintext |
| condominium_id | int4 | yes | | FK → condominiums.id |
| role | text | yes | 'GUARD' | GUARD \| ADMIN \| SUPER_ADMIN |
| photo_url | text | yes | | |

Referenced by: visits, visit_events, audit_logs, incidents, video_call_sessions, subscription_alerts, condominium_events

---

### units
RLS: enabled | Rows: ~3

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | | FK → condominiums.id |
| code_block | text | yes | | |
| number | text | yes | | |
| floor | text | yes | | |
| building_name | text | yes | | |
| created_at | timestamptz | yes | now() | |

Referenced by: residents, visits, resident_qr_codes, video_call_sessions, visitor_blacklist, notifications

---

### residents
RLS: enabled | Rows: ~3

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | | FK → condominiums.id |
| unit_id | int4 | yes | | FK → units.id |
| name | text | no | | |
| phone | text | yes | | |
| email | text | yes | | |
| created_at | timestamptz | yes | now() | |
| pin_hash | text | yes | | bcrypt hash |
| has_app_installed | bool | yes | false | Set on first mobile login |
| device_token | text | yes | | Firebase/APNS token (legacy) |
| app_first_login_at | timestamptz | yes | | |
| app_last_seen_at | timestamptz | yes | | |
| avatar_url | text | yes | | |
| push_token | text | yes | | Active FCM token |
| type | text | yes | | |
| notification_preferences | jsonb | yes | `{push_enabled:true,...}` | |
| preferred_language | text | yes | 'pt-PT' | pt-PT \| en \| fr |

Referenced by: incidents, resident_qr_codes, resident_devices, resident_frequent_visitors, video_call_sessions, event_rsvps, condominium_news, visitor_blacklist

---

### visits
RLS: enabled | Rows: ~28

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| created_at | timestamptz | yes | now() | |
| condominium_id | int4 | no | | FK → condominiums.id |
| visitor_name | text | no | | |
| visitor_doc | text | yes | | |
| visitor_phone | text | yes | | |
| visit_type_id | int4 | no | | FK → visit_types.id |
| service_type_id | int4 | yes | | FK → service_types.id |
| unit_id | int4 | yes | | FK → units.id |
| reason | text | yes | | |
| photo_url | text | yes | | |
| qr_token | text | yes | | |
| qr_expires_at | timestamptz | yes | | |
| check_in_at | timestamptz | yes | now() | |
| check_out_at | timestamptz | yes | | |
| status | text | no | | PENDENTE \| AUTORIZADO \| NEGADO \| NO INTERIOR \| SAIU \| SEM RESPOSTA |
| approval_mode | text | yes | | APP \| PHONE \| INTERCOM \| GUARD_MANUAL \| QR_SCAN |
| guard_id | int4 | yes | | FK → staff.id |
| sync_status | text | yes | 'SINCRONIZADO' | |
| restaurant_id | uuid | yes | | FK → restaurants.id |
| sport_id | uuid | yes | | FK → sports.id |
| approved_at | timestamptz | yes | | |
| denied_at | timestamptz | yes | | |
| device_id | uuid | yes | | FK → devices.id — preserved on reassignment |
| vehicle_license_plate | varchar | yes | | |
| photo_consent_given | bool | yes | | |

Referenced by: visit_events, video_call_sessions

---

### visit_events
RLS: enabled | Rows: ~733

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int8 | no | nextval | PK |
| created_at | timestamptz | no | now() | |
| visit_id | int4 | no | | FK → visits.id |
| status | text | no | | |
| event_at | timestamptz | no | | |
| actor_id | int4 | yes | | FK → staff.id |
| device_id | uuid | yes | | FK → devices.id |

---

### devices
RLS: enabled | Rows: ~3

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| created_at | timestamptz | yes | now() | |
| device_identifier | text | no | | UNIQUE — fingerprint |
| device_name | text | yes | | |
| condominium_id | int4 | yes | | FK → condominiums.id |
| configured_at | timestamptz | yes | | |
| last_seen_at | timestamptz | yes | | |
| status | text | yes | 'ACTIVE' | |
| metadata | jsonb | yes | | |

---

### incidents
RLS: enabled | Rows: ~4

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| reported_at | timestamptz | yes | now() | |
| resident_id | int4 | yes | | FK → residents.id |
| description | text | no | | |
| type | text | no | | FK → incident_types.code |
| status | text | yes | 'new' | FK → incident_statuses.code |
| photo_path | text | yes | | |
| acknowledged_at | timestamptz | yes | | |
| acknowledged_by | int4 | yes | | FK → staff.id |
| guard_notes | text | yes | | Guard action report |
| resolved_at | timestamptz | yes | | |

---

### incident_types
RLS: enabled | Rows: ~0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| code | text | no | | PK |
| label | text | no | | |
| sort_order | int4 | yes | 100 |

---

### incident_statuses
RLS: enabled | Rows: ~0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| code | text | no | | PK |
| label | text | no | | |
| sort_order | int4 | yes | 100 |

---

### notifications
RLS: enabled | Rows: ~44

Stores notifications sent to residents about visits, incidents, and other events.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| resident_id | int4 | no | | |
| condominium_id | int4 | no | | |
| unit_id | int4 | yes | | |
| title | varchar | no | | |
| body | text | no | | |
| type | varchar | no | | visitor_entered, visitor_left, incident_read, etc. |
| data | jsonb | yes | '{}' | visit_id, visitor_name, incident_id, etc. |
| read | bool | yes | false | |
| created_at | timestamptz | yes | now() | |
| updated_at | timestamptz | yes | now() | |

---

### resident_devices
RLS: enabled | Rows: ~17

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | uuid_generate_v4() | PK |
| resident_id | int4 | yes | | FK → residents.id |
| push_token | text | no | | UNIQUE per resident |
| device_name | text | yes | | |
| platform | text | yes | | ios \| android |
| last_active | timestamptz | yes | now() | |
| created_at | timestamptz | yes | now() | |

Unique constraint: (resident_id, push_token)

---

### resident_qr_codes
RLS: enabled | Rows: ~7

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| resident_id | int4 | no | | FK → residents.id |
| condominium_id | int4 | no | | FK → condominiums.id |
| unit_id | int4 | no | | FK → units.id |
| purpose | text | no | | guest \| delivery \| service \| other |
| visitor_name | text | yes | | |
| visitor_phone | text | no | | |
| notes | text | yes | | |
| qr_code | text | no | | UNIQUE token |
| is_recurring | bool | yes | false | |
| recurrence_pattern | text | yes | | |
| recurrence_days | jsonb | yes | | |
| start_date | timestamptz | yes | | |
| end_date | timestamptz | yes | | |
| expires_at | timestamptz | no | | |
| status | text | yes | 'active' | active \| expired \| revoked \| used |
| created_at | timestamptz | yes | CURRENT_TIMESTAMP | |
| updated_at | timestamptz | yes | CURRENT_TIMESTAMP | |
| consent | bool | no | false | |

---

### resident_frequent_visitors
RLS: enabled | Rows: ~2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| resident_id | int4 | no | | FK → residents.id |
| name | text | no | | |
| phone | text | no | | UNIQUE per resident |
| purpose | text | yes | 'guest' | guest \| delivery \| service \| other |
| notes | text | yes | | |
| avatar_url | text | yes | | |
| use_count | int4 | yes | 0 | |
| last_used_at | timestamptz | yes | | |
| created_at | timestamptz | yes | now() | |
| updated_at | timestamptz | yes | now() | |

Unique constraint: (resident_id, phone)

---

### video_call_sessions
RLS: enabled | Rows: ~36

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| visit_id | int4 | no | | FK → visits.id |
| guard_id | int4 | no | | FK → staff.id |
| resident_id | int4 | yes | | FK → residents.id |
| unit_id | int4 | yes | | FK → units.id |
| condominium_id | int4 | no | | FK → condominiums.id |
| device_id | text | yes | | Guard PWA device identifier |
| status | text | no | 'CALLING' | CALLING \| ACCEPTED \| REJECTED \| MISSED \| ENDED \| FAILED |
| initiated_at | timestamptz | no | now() | |
| answered_at | timestamptz | yes | | |
| ended_at | timestamptz | yes | | |
| duration_seconds | int4 | yes | | |
| rejection_reason | text | yes | | |
| created_at | timestamptz | no | now() | |
| offer_sdp | text | yes | | WebRTC SDP offer |

---

### visitor_blacklist
RLS: **DISABLED** ⚠️ | Rows: ~2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| condominium_id | int4 | no | | FK → condominiums.id |
| resident_id | int4 | yes | | FK → residents.id |
| unit_id | int4 | yes | | FK → units.id |
| scope | text | no | 'unit' | unit \| condominium |
| visitor_name | text | no | | |
| visitor_phone | text | yes | | |
| visitor_doc | text | yes | | |
| reason | text | yes | | |
| blocked_at | timestamptz | yes | now() | |
| blocked_by_name | text | yes | | |
| is_active | bool | yes | true | |
| unblocked_at | timestamptz | yes | | |
| created_at | timestamptz | yes | now() | |
| updated_at | timestamptz | yes | now() | |

---

### visit_types
RLS: enabled | Rows: ~0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | int4 | no | nextval | PK |
| name | text | no | |
| icon_key | text | yes | |
| requires_service_type | bool | yes | false |
| requires_restaurant | bool | yes | false |
| requires_sport | bool | yes | false |

---

### service_types
RLS: enabled | Rows: ~0

| Column | Type | Nullable |
|--------|------|----------|
| id | int4 | no | PK |
| name | text | no |

---

### restaurants
RLS: enabled | Rows: ~0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| created_at | timestamptz | no | now() | |
| condominium_id | int4 | no | | FK → condominiums.id |
| name | text | no | | UNIQUE per condominium |
| description | text | yes | | |
| status | text | yes | 'ACTIVE' | ACTIVE \| INACTIVE |

---

### sports
RLS: enabled | Rows: ~0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| created_at | timestamptz | no | now() | |
| condominium_id | int4 | no | | FK → condominiums.id |
| name | text | no | | UNIQUE per condominium |
| description | text | yes | | |
| status | text | yes | 'ACTIVE' | ACTIVE \| INACTIVE |

---

### streets
RLS: enabled | Rows: ~1

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | int8 | no | IDENTITY | PK |
| condominium_id | int8 | no | | FK → condominiums.id |
| name | text | no | |
| created_at | timestamptz | no | now() |

---

### news_categories
RLS: enabled | Rows: ~1

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | int4 | no | PK |
| name | varchar | no | UNIQUE |
| label | varchar | no | |
| created_at | timestamptz | yes | |

---

### condominium_news
RLS: enabled | Rows: ~2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | | FK → condominiums.id |
| title | text | no | | |
| description | text | no | | |
| content | text | yes | | |
| image_url | text | yes | | |
| category_id | int4 | yes | | FK → news_categories.id |
| created_at | timestamptz | yes | now() | |
| updated_at | timestamptz | yes | now() | |
| resident_id | int4 | yes | | FK → residents.id — author |

---

### condominium_events
RLS: enabled | Rows: ~13

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | | FK → condominiums.id |
| title | text | no | | |
| description | text | yes | | |
| location | text | yes | | |
| category | text | yes | 'general' | meeting \| maintenance \| social \| sports \| closure \| general |
| start_at | timestamptz | no | | |
| end_at | timestamptz | yes | | |
| is_all_day | bool | yes | false | |
| requires_rsvp | bool | yes | false | |
| max_attendees | int4 | yes | | |
| created_by | int4 | yes | | FK → staff.id |
| is_active | bool | yes | true | |
| created_at | timestamptz | yes | now() | |
| updated_at | timestamptz | yes | now() | |

Referenced by: event_rsvps

---

### event_rsvps
RLS: enabled | Rows: ~0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | no | gen_random_uuid() | PK |
| event_id | int4 | no | | FK → condominium_events.id |
| resident_id | int4 | no | | FK → residents.id |
| status | text | yes | 'going' | going \| maybe \| not_going |
| created_at | timestamptz | yes | now() | |

Unique constraint: (event_id, resident_id)

---

### audit_logs
RLS: enabled | Rows: ~516

Comprehensive audit trail of all administrative actions.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | int4 | no | PK |
| created_at | timestamptz | no | |
| condominium_id | int4 | yes | FK → condominiums.id |
| actor_id | int4 | yes | FK → staff.id |
| action | varchar | no | CREATE \| UPDATE \| DELETE \| LOGIN \| LOGOUT \| etc. |
| target_table | varchar | no | Affected table name |
| target_id | text | yes | PK of affected record |
| details | jsonb | yes | Old/new values |
| ip_address | inet | yes | |
| user_agent | text | yes | |

---

### device_registration_errors
RLS: enabled | Rows: ~0

| Column | Type | Nullable |
|--------|------|----------|
| id | int8 | no | PK |
| created_at | timestamptz | no |
| device_identifier | text | yes |
| error_message | text | no |
| payload | jsonb | yes |

---

### app_pricing_rules
RLS: enabled | Rows: ~4

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | int4 | no | nextval | PK |
| min_residents | int4 | no | |
| max_residents | int4 | yes | null = unlimited |
| price_per_resident | numeric | no | |
| currency | varchar | no | 'AOA' |
| created_at | timestamptz | no | now() |
| updated_at | timestamptz | no | now() |

---

### condominium_subscriptions
RLS: enabled | Rows: ~210

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | | UNIQUE FK → condominiums.id |
| status | varchar | no | 'ACTIVE' | ACTIVE \| OVERDUE \| INACTIVE \| TRIAL \| SUSPENDED |
| last_payment_date | date | yes | | |
| next_due_date | date | yes | | |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | |
| custom_price_per_resident | numeric | yes | | Overrides app_pricing_rules |
| discount_percentage | numeric | yes | 0 | |

---

### subscription_payments
RLS: enabled | Rows: ~2185

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | | FK → condominiums.id |
| amount | numeric | no | | |
| currency | varchar | no | 'AOA' | |
| payment_date | date | no | | |
| reference_period | varchar | yes | | e.g. "2026-01" |
| status | varchar | no | 'PAID' | PAID \| PENDING \| FAILED \| PARTIAL |
| notes | text | yes | | |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | |

---

### subscription_alerts
RLS: enabled | Rows: ~2

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | int4 | no | nextval | PK |
| condominium_id | int4 | no | FK → condominiums.id |
| alert_date | timestamptz | no | now() |
| reference_month | text | no | |
| sent_by | int4 | no | FK → staff.id |
| created_at | timestamptz | no | now() |

---

## Indexes

### audit_logs
- `idx_audit_logs_action` — btree(action)
- `idx_audit_logs_action_created_at_desc` — btree(action, created_at DESC)
- `idx_audit_logs_actor_id` — btree(actor_id)
- `idx_audit_logs_actor_created_at_desc` — btree(actor_id, created_at DESC)
- `idx_audit_logs_condominium_id` — btree(condominium_id)
- `idx_audit_logs_condo_created_at_desc` — btree(condominium_id, created_at DESC)
- `idx_audit_logs_created_at` / `_desc` — btree(created_at DESC)
- `idx_audit_logs_target_id` — btree(target_id)
- `idx_audit_logs_target_table` — btree(target_table)
- `idx_audit_logs_target_table_created_at_desc` — btree(target_table, created_at DESC)

### condominiums
- `idx_condo_status` — btree(status)

### condominium_events
- `idx_events_condo_date` — btree(condominium_id, start_at) WHERE is_active=true
- `idx_events_condo_category` — btree(condominium_id, category, start_at) WHERE is_active=true
- `idx_events_start_at` — btree(start_at DESC)

### condominium_news
- `idx_condominium_news_condominium_id` — btree(condominium_id)
- `idx_condominium_news_created_at` — btree(created_at DESC)

### condominium_subscriptions
- `idx_condominium_subscriptions_condo` — btree(condominium_id)

### incidents
- `idx_incidents_acknowledged_at` — btree(acknowledged_at) WHERE acknowledged_at IS NULL
- `idx_incidents_reported_at` — btree(reported_at DESC)
- `idx_incidents_resident_id` — btree(resident_id)
- `idx_incidents_resident_reported_at` — btree(resident_id, reported_at DESC)
- `idx_incidents_status` — btree(status)
- `idx_incidents_status_reported_at` — btree(status, reported_at DESC)
- `idx_incidents_type` — btree(type)

### notifications
- `idx_notifications_resident_id` / `_resident` — btree(resident_id)
- `idx_notifications_condominium_id` — btree(condominium_id)
- `idx_notifications_unit_id` — btree(unit_id)
- `idx_notifications_read` — btree(read)
- `idx_notifications_type` — btree(type)
- `idx_notifications_created_at` / `_created` — btree(created_at DESC)

### resident_devices
- `idx_resident_devices_resident` — btree(resident_id)
- `idx_resident_devices_token` — btree(push_token)

### resident_frequent_visitors
- `idx_frequent_visitors_resident_id` — btree(resident_id)

### resident_qr_codes
- `idx_resident_qr_codes_resident_created_at` — btree(resident_id, created_at DESC)
- `idx_resident_qr_codes_resident_status_expires` — btree(resident_id, status, expires_at)

### residents
- `idx_residents_condominium_id` / `_condo_id` — btree(condominium_id)
- `idx_residents_condo_name` — btree(condominium_id, name)
- `idx_residents_condo_name_id` — btree(condominium_id, name, id)
- `idx_residents_unit_id` — btree(unit_id)
- `idx_residents_phone` — btree(phone)
- `idx_residents_push_token` — btree(push_token) WHERE push_token IS NOT NULL
- `idx_residents_unit_push` — btree(unit_id, push_token) WHERE push_token IS NOT NULL
- `idx_residents_has_app` — btree(has_app_installed) WHERE has_app_installed=true
- `idx_residents_name_trgm` — GIN(name gin_trgm_ops) — fuzzy search
- `idx_residents_email_trgm` — GIN(email gin_trgm_ops) — fuzzy search
- `idx_residents_phone_trgm` — GIN(phone gin_trgm_ops) — fuzzy search

### restaurants
- `idx_restaurants_condominium` — btree(condominium_id)
- `idx_restaurants_status` — btree(status)

### sports
- `idx_sports_condominium` — btree(condominium_id)
- `idx_sports_status` — btree(status)

### staff
- `idx_staff_condo_id` — btree(condominium_id)
- `idx_staff_names_lower` — btree(lower(first_name), lower(last_name))

### subscription_payments
- `idx_subscription_payments_condo_period` — btree(condominium_id, reference_period)
- `idx_subscription_payments_status` — btree(status)

### units
- `idx_units_condominium_id` — btree(condominium_id)

### video_call_sessions
- `idx_video_call_sessions_visit_id` — btree(visit_id)
- `idx_video_call_sessions_resident_id` — btree(resident_id)
- `idx_video_call_sessions_status` — btree(status)
- `idx_video_call_sessions_initiated_at` — btree(initiated_at DESC)

### visit_events
- `visit_events_visit_id_idx` — btree(visit_id)
- `visit_events_event_at_idx` — btree(event_at)

### visitor_blacklist
- `idx_visitor_blacklist_phone` — btree(condominium_id, visitor_phone) WHERE is_active=true AND visitor_phone IS NOT NULL
- `idx_visitor_blacklist_doc` — btree(condominium_id, visitor_doc) WHERE is_active=true AND visitor_doc IS NOT NULL
- `idx_visitor_blacklist_resident` — btree(resident_id) WHERE is_active=true

### visits
- `idx_visits_unit_id` — btree(unit_id)
- `idx_visits_unit_created_at` — btree(unit_id, created_at DESC)
- `idx_visits_unit_created_status` — btree(unit_id, created_at DESC, status)
- `idx_visits_device_id` — btree(device_id)
- `idx_visits_device_condo` — btree(device_id, condominium_id)
- `idx_visits_restaurant` — btree(restaurant_id)
- `idx_visits_sport` — btree(sport_id)

---

## Views

### v_app_adoption_stats
Aggregates resident app adoption metrics per condominium.

**Columns**: condominium_id, condominium_name, total_units, total_residents, residents_with_app, units_with_app, resident_adoption_percent, unit_coverage_percent

**Query**: JOINs condominiums → units → residents, counts residents with `has_app_installed = true`, returns adoption percentages rounded to 1 decimal.

---

## RPC Functions

All custom functions are `SECURITY DEFINER` (run as DB owner, bypass RLS) unless noted.

### Authentication
| Function | Arguments | Returns |
|----------|-----------|---------|
| `verify_staff_login` | p_first_name text, p_last_name text, p_pin text | json |
| `verify_resident_login` | p_phone text, p_pin_cleartext text, p_device_token text? | record |
| `register_resident_pin` | p_phone text, p_pin_cleartext text, p_device_token text? | record |
| `reset_resident_pin` | p_resident_id int, p_current_pin text, p_new_pin text | void |
| `request_pin_reset_otp` | p_phone text, p_ip_address text?, p_user_agent text? | record — generates OTP, sends SMS |
| `reset_pin_with_otp` | p_phone text, p_otp_code text, p_new_pin text | record |
| `check_otp_validity` | p_phone text | record — checks without consuming attempt |

### Device Management
| Function | Arguments | Returns |
|----------|-----------|---------|
| `register_device` | p_data jsonb | devices — NOT security definer |
| `get_device` | p_identifier text | devices |
| `get_devices_by_condominium` | p_condominium_id int | devices |
| `update_device_heartbeat` | p_identifier text | devices |
| `update_device_status` | p_id int, p_status text | devices |
| `deactivate_condo_devices` | p_condominium_id int | bool |
| `admin_get_all_devices` | — | devices |
| `admin_create_device` | p_data jsonb | devices |
| `admin_update_device` | p_id uuid, p_data jsonb | devices |
| `admin_delete_device` | p_id int | bool |

### Visits
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_visit` | p_data jsonb | visits |
| `get_todays_visits` | p_condominium_id int | record |
| `get_visits_history` | p_unit_id int, p_start timestamptz, p_end timestamptz, p_limit int?, p_visitor_name text?, p_visitor_phone text? | visits |
| `get_pending_visits` | p_unit_id int, p_limit int? | visits |
| `get_unique_visitors` | p_unit_id int, p_limit int? | record |
| `approve_visit` | p_visit_id int, p_approval_mode text? | visits |
| `deny_visit` | p_visit_id int, p_approval_mode text? | visits |
| `checkout_visit` | p_id int | visits |
| `update_visit_status` | p_id int, p_status text | visits |
| `admin_get_all_visits` | p_start_date timestamptz?, p_end_date timestamptz?, p_condominium_id int? | record |
| `admin_get_all_visits_filtered` | p_start_date timestamp?, p_end_date timestamp?, p_condominium_id int?, p_visit_type text?, p_service_type text?, p_status text? | record |
| `admin_update_visit` | p_id int, p_data jsonb | visits |

### Visit Events
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_visit_event` | p_data jsonb | visit_events |
| `get_visit_events` | p_visit_id int | visit_events — NOT security definer |

### Incidents
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_incident` | p_resident_id int, p_description text, p_type text, p_photo_path text? | record |
| `get_incidents` | p_condominium_id int | record |
| `get_incident_by_id` | p_incident_id text | record |
| `get_incident_types` | — | record |
| `get_incident_statuses` | — | record |
| `get_incidents_by_resident` | p_resident_id int | record |
| `get_resident_incidents` | p_resident_id int | record |
| `get_incident_audit_logs` | p_condominium_id int?, p_incident_ids uuid[]? | record |
| `acknowledge_incident` | p_id uuid, p_guard_id int | incidents |
| `update_incident_status` | p_id uuid, p_status text, p_notes text? | incidents |
| `admin_get_all_incidents` | p_condominium_id int? | record |
| `admin_update_incident` | p_id uuid, p_data jsonb | incidents |
| `admin_delete_incident` | p_id int | bool |

### Residents
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_resident` | p_id int | residents |
| `get_resident_by_id` | p_resident_id int | record |
| `get_residents_by_unit_id` | p_unit_id int | residents |
| `get_resident_units` | p_resident_id int | record |
| `get_resident_stats` | p_resident_id int, p_unit_id int, p_period text? | record |
| `update_resident` | p_resident_id int, p_name text?, p_phone text?, p_email text?, p_avatar_url text?, p_push_token text?, p_preferred_language text?, p_notification_preferences jsonb? | record |
| `update_resident_app_activity` | p_resident_id int | void |
| `set_resident_push_token` | p_resident_id int, p_push_token text | void |
| `admin_get_residents` | p_condominium_id int?, p_limit int?, p_search text?, p_after_name text?, p_after_id int? | residents |
| `admin_create_resident` | p_data jsonb | residents |
| `admin_update_resident` | p_id int, p_data jsonb | residents |
| `admin_delete_resident` | p_id int | bool — has FK blockers, see [known issues](#known-issues) |

### Resident Devices
| Function | Arguments | Returns |
|----------|-----------|---------|
| `upsert_resident_device` | p_resident_id int, p_push_token text, p_device_name text, p_platform text | void |
| `delete_resident_device` | p_resident_id int, p_push_token text | void |

### Notifications
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_notification` | p_resident_id int, p_condominium_id int, p_unit_id int, p_title text, p_body text, p_type text, p_data jsonb? | int4 — also invokes send-video-call-push edge fn for video_call type |
| `get_notifications` | p_resident_id int, p_limit int? | notifications |
| `get_resident_notifications` | p_resident_id int, p_limit int?, p_offset int?, p_unread_only bool? | record — paginated |
| `get_unread_notification_count` | p_resident_id int | int4 |
| `mark_notification_read` | p_notification_id int, p_resident_id int | bool |
| `mark_all_notifications_read` | p_resident_id int | int4 |
| `get_notification_preferences` | p_resident_id int | jsonb |
| `update_notification_preferences` | p_resident_id int, p_preferences jsonb | jsonb |

### QR Codes
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_visitor_qr_code` | p_resident_id int, p_condominium_id int, p_unit_id int, p_purpose text, p_visitor_name text, p_visitor_phone text, p_notes text?, p_expires_at timestamptz?, p_consent bool? | record |
| `get_active_qr_codes` | p_resident_id int | record |
| `get_resident_qr_codes` | p_resident_id int, p_filter text? | resident_qr_codes |
| `get_qr_code_history` | p_resident_id int | record |
| `validate_qr_code` | p_qr_code text | record |
| `mark_qr_code_used` | p_qr_code text | void |
| `revoke_qr_code` | p_qr_code_id uuid | record |
| `revoke_resident_qr_code` | p_qr_id uuid | resident_qr_codes |
| `expire_qr_codes` | — | int4 — called by pg_cron |
| `update_resident_qr_code` | p_qr_id uuid, p_qr_code text, p_is_recurring bool?, ... | resident_qr_codes |

### Video Calls
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_video_call_session` | p_data jsonb | video_call_sessions |
| `get_active_video_call_for_resident` | p_resident_id int | video_call_sessions |
| `update_video_call_session_status` | p_session_id uuid, p_status text, p_rejection_reason text? | void |
| `update_video_call_session_offer` | p_session_id uuid, p_offer_sdp text | void |
| `get_video_call_session_offer` | p_session_id uuid | text |

### Condominiums
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_condominiums` | — | condominiums |
| `get_condominium` | p_id int | condominiums |
| `get_condominium_by_id` | p_condominium_id int | record |
| `get_available_condominiums_for_setup` | — | condominiums |
| `set_condo_setup_settings` | p_condo_id int, p_visitor_photo_enabled bool, p_intercom_approval_enabled bool, p_guard_manual_approval_enabled bool | void |
| `set_condo_visitor_photo_setting` | p_condo_id int, p_enabled bool | void |
| `admin_get_condominiums_with_stats` | — | record |
| `admin_create_condominium` | p_data jsonb | condominiums |
| `admin_update_condominium` | p_id int, p_data jsonb | condominiums |
| `admin_delete_condominium` | p_id int | bool |

### Units
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_units` | p_condominium_id int | record |
| `get_unit_by_id` | p_unit_id int | record |
| `check_unit_has_app` | p_unit_id int | json |
| `admin_get_all_units` | p_condominium_id int? | record |
| `admin_create_unit` | p_data jsonb | units |
| `admin_update_unit` | p_id int, p_data jsonb | units |
| `admin_delete_unit` | p_id int | bool |

### Staff
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_staff_by_condominium` | p_condominium_id int | staff |
| `get_staff_by_id` | p_staff_id int | record |
| `admin_get_all_staff` | p_condominium_id int? | record |
| `admin_create_staff_with_pin` | p_first_name text, p_last_name text, p_condominium_id int, p_role text, p_pin_cleartext text, p_photo_url text | staff |
| `admin_update_staff` | p_id int, p_data jsonb | staff |
| `admin_update_staff_pin` | p_staff_id int, p_pin_cleartext text | staff |
| `admin_delete_staff` | p_id int | bool |

### News
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_news` | p_condominium_id int, p_days int? | record |
| `get_condominium_news` | p_condominium_id int | record |
| `create_condominium_news` | p_condominium_id int, p_title text, p_description text, p_category_id int, p_resident_id int? | condominium_news |
| `update_condominium_news_image` | p_news_id int, p_image_url text | condominium_news |
| `get_news_categories` | — | news_categories |
| `admin_get_all_news` | p_condominium_id int?, p_limit int?, p_search text?, p_category_id int?, p_date_from date?, p_date_to date?, p_after_created_at timestamptz?, p_after_id int? | condominium_news |
| `admin_create_news` | p_data jsonb | condominium_news |
| `admin_update_news` | p_id int, p_data jsonb | condominium_news |
| `admin_delete_news` | p_id int | bool |
| `admin_create_news_category` | p_data jsonb | news_categories |
| `admin_update_news_category` | p_id int, p_data jsonb | news_categories |
| `admin_delete_news_category` | p_id int | bool |

### Events (Calendar)
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_condominium_events` | p_condominium_id int, p_start_date date, p_end_date date | record |
| `get_event_dates` | p_condominium_id int, p_month int, p_year int | record |
| `rsvp_to_event` | p_event_id int, p_resident_id int, p_status text? | bool |
| `get_resident_rsvp` | p_event_id int, p_resident_id int | text |
| `admin_get_all_condominium_events` | p_condominium_id int?, p_limit int?, p_search text?, p_category text?, p_date_from date?, p_date_to date?, p_include_inactive bool? | record |
| `admin_create_condominium_event` | p_data jsonb | condominium_events |
| `admin_update_condominium_event` | p_id int, p_data jsonb | condominium_events |
| `admin_delete_condominium_event` | p_id int | bool |

### Blacklist
| Function | Arguments | Returns |
|----------|-----------|---------|
| `add_to_blacklist` | p_condominium_id int, p_resident_id int, p_unit_id int, p_visitor_name text, p_visitor_phone text?, p_visitor_doc text?, p_reason text?, p_scope text? | uuid |
| `remove_from_blacklist` | p_id uuid, p_resident_id int | bool |
| `get_blacklist` | p_resident_id int | record |
| `is_visitor_blacklisted` | p_condominium_id int, p_unit_id int, p_visitor_phone text?, p_visitor_doc text? | record |

### Frequent Visitors
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_frequent_visitors` | p_resident_id int | record |
| `upsert_frequent_visitor` | p_resident_id int, p_name text, p_phone text, p_purpose text?, p_notes text? | uuid |
| `update_frequent_visitor` | p_id uuid, p_resident_id int, p_name text?, p_phone text?, p_purpose text?, p_notes text? | resident_frequent_visitors |
| `delete_frequent_visitor` | p_id uuid, p_resident_id int | bool |
| `increment_frequent_visitor_usage` | p_resident_id int, p_phone text | void |

### Restaurants & Sports
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_restaurants` | p_condominium_id int | restaurants |
| `get_sports` | p_condominium_id int | sports |
| `admin_get_restaurants` | — | restaurants |
| `admin_get_sports` | — | sports |
| `admin_create_restaurant` | p_data jsonb | restaurants |
| `admin_create_sport` | p_data jsonb | sports |
| `admin_update_restaurant` | p_id uuid, p_data jsonb | restaurants |
| `admin_update_sport` | p_id uuid, p_data jsonb | sports |
| `admin_delete_restaurant` | p_id int | bool |
| `admin_delete_sport` | p_id int | bool |

### Streets
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_streets` | p_condominium_id int | streets |
| `create_street` | p_data jsonb | streets |
| `delete_street` | p_id int | bool |

### Configuration (Visit & Service Types)
| Function | Arguments | Returns |
|----------|-----------|---------|
| `get_visit_types` | p_condominium_id int? | visit_types |
| `admin_get_visit_types` | — | visit_types |
| `admin_create_visit_type` | p_data jsonb | visit_types |
| `admin_update_visit_type` | p_id int, p_data jsonb | visit_types |
| `admin_delete_visit_type` | p_id int | bool |
| `get_service_types` | — | service_types |
| `admin_get_service_types` | — | service_types |
| `admin_create_service_type` | p_data jsonb | service_types |
| `admin_update_service_type` | p_id int, p_data jsonb | service_types |
| `admin_delete_service_type` | p_id int | bool |

### Subscriptions & Pricing
| Function | Arguments | Returns |
|----------|-----------|---------|
| `admin_get_condominium_subscriptions` | p_year int?, p_month int? | record |
| `admin_update_subscription_status` | p_id int, p_condominium_id int, p_status varchar | bool |
| `admin_update_subscription_details` | p_id int, p_condominium_id int, p_status varchar?, p_custom_price_per_resident numeric?, p_discount_percentage numeric? | bool |
| `admin_create_subscription_payment` | p_condominium_id int, p_amount numeric, p_currency varchar, p_payment_date date, p_reference_period varchar, p_status varchar, p_notes text | subscription_payments |
| `admin_get_subscription_payments` | p_condominium_id bigint, p_year int, p_month int | record |
| `admin_send_subscription_alert` | p_condominium_id int, p_staff_id int | jsonb |
| `admin_get_app_pricing_rules` | — | app_pricing_rules |
| `admin_create_app_pricing_rule` | p_min_residents int, p_max_residents int, p_price_per_resident numeric, p_currency varchar | app_pricing_rules |
| `admin_update_app_pricing_rule` | p_id int, p_min_residents int, p_max_residents int, p_price_per_resident numeric, p_currency varchar | app_pricing_rules |
| `admin_delete_app_pricing_rule` | p_id int | bool |

### Audit & Dashboard
| Function | Arguments | Returns |
|----------|-----------|---------|
| `create_audit_log` | p_data jsonb | audit_logs |
| `log_audit` | p_condominium_id int, p_actor_id int, p_action varchar, p_target_table varchar, p_target_id int, p_details jsonb? | int4 — helper for other RPCs |
| `admin_get_audit_logs` | p_start_date timestamptz, p_end_date timestamptz, p_condominium_id int, p_actor_id int, p_action text, p_target_table text, p_limit int, p_offset int | record |
| `admin_get_dashboard_stats` | — | record |
| `admin_get_condominiums_with_stats` | — | record |

---

## Edge Functions

| Slug | Name | Status | JWT Required | Notes |
|------|------|--------|-------------|-------|
| `send-sms` | send-sms | ACTIVE | yes | OTP / SMS delivery |
| `send-push-notification` | send-push-notification | ACTIVE | yes | FCM push for new visit (called by DB trigger) |
| `send-video-call-push` | send-video-call-push | ACTIVE | yes | FCM push for video call ring (called from `create_notification` RPC) |

---

## Triggers

| Trigger | Table | Event | Timing | Action |
|---------|-------|-------|--------|--------|
| `on_condominium_created_subscription` | condominiums | INSERT | AFTER | Calls `create_condominium_subscription()` — auto-creates subscription record for each new condominium |
| `send_push_on_new_visit` | visits | INSERT | AFTER | HTTP POST to `send-push-notification` edge function via `supabase_functions.http_request` |

---

## RLS Policies

Tables with no explicit policy listed have all-or-nothing access via SECURITY DEFINER RPCs.

### app_pricing_rules
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| Allow authenticated full access | authenticated | ALL | true |

### condominium_events
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| residents_read_events | public | SELECT | true |

### condominium_subscriptions
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| Allow authenticated full access | authenticated | ALL | true |

### device_registration_errors
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| allow device reg errors insert | anon | INSERT | true |

### devices
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| Allow anonymous device read | anon | SELECT | true |
| Allow anonymous device registration | anon | INSERT | true |
| allow device registration | anon | INSERT | true |
| Allow anonymous device update | anon | UPDATE | true |

### event_rsvps
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| residents_read_rsvps | public | SELECT | true |
| residents_write_rsvps | public | ALL | true |

### restaurants
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| restaurants_update_anon | anon | UPDATE | true |

### subscription_alerts
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| Allow authenticated full access | authenticated | ALL | true |

### subscription_payments
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| Allow authenticated full access | authenticated | ALL | true |

### video_call_sessions
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| guard_insert_video_call_sessions | public | INSERT | condominium_id IN (SELECT condominium_id FROM staff WHERE id = guard_id) |
| guard_select_video_call_sessions | public | SELECT | condominium_id scoped to guard's condominium |
| service_role_all_video_call_sessions | public | ALL | auth.role() = 'service_role' |

### visits
| Policy | Roles | Command | Condition |
|--------|-------|---------|-----------|
| anon_select_visits | anon | SELECT | true |

---

## Storage Buckets

| Bucket | Public | Max Size | Allowed MIME Types |
|--------|--------|----------|--------------------|
| `incidents` | yes | 10 MB | image/jpeg, image/jpg, image/png |
| `logo_condominio` | yes | 5 MB | image/jpg, image/jpeg, image/png |
| `news` | yes | 10 MB | image/jpeg, image/jpg, image/png |
| `resident-photos` | yes | 10 MB | image/jpeg, image/jpg, image/png |
| `staff-photos` | yes | 5 MB | image/jpeg, image/png, image/webp |
| `visitor-photos` | yes | 10 MB | image/jpeg, image/jpg, image/png |

---

## Installed Extensions

| Extension | Schema | Version | Purpose |
|-----------|--------|---------|---------|
| plpgsql | pg_catalog | 1.0 | PL/pgSQL procedural language |
| pg_trgm | public | 1.6 | Trigram fuzzy text search (used for resident name/phone/email GIN indexes) |
| uuid-ossp | extensions | 1.1 | UUID generation (`uuid_generate_v4()`) |
| pgcrypto | extensions | 1.3 | Cryptographic functions (bcrypt for PINs) |
| pg_net | extensions | 0.19.5 | Async HTTP — used by trigger to call edge functions |
| pg_cron | pg_catalog | 1.6.4 | Job scheduler — runs `expire_qr_codes()` on schedule |
| pg_stat_statements | extensions | 1.11 | Query performance tracking |
| supabase_vault | vault | 0.3.1 | Secrets management |
| index_advisor | extensions | 0.2.0 | Query index recommendations |
| hypopg | extensions | 1.4.1 | Hypothetical index analysis |

---

## Migrations

Applied in order (newest last):

| Version | Name |
|---------|------|
| 20260324200341 | add_anon_select_visits_policy |
| 20260324201219 | add_index_visits_unit_id |
| 20260411190446 | add_resident_id_to_condominium_news |
| 20260418202246 | create_frequent_visitors |
| 20260427075626 | add_get_residents_by_unit_rpc |
| 20260427084007 | add_create_notification_function |
| 20260427174345 | add_visit_events_to_rpcs |
| 20260428072857 | add_video_call_offer_sdp |
| 20260428182816 | add_sem_resposta_status |
| 20260429194819 | add_pg_net_video_call_push |
| 20260501144352 | create_condominium_events_tables |
| 20260501144412 | create_event_calendar_rpcs |
| 20260501144514 | enable_rls_event_tables |
| 20260502152830 | add_visitor_blacklist |

---

## Security Notes

### CRITICAL: RLS Disabled on visitor_blacklist
`visitor_blacklist` has Row Level Security **disabled**. Any client with the anon key can read or modify every row. To fix:

```sql
ALTER TABLE public.visitor_blacklist ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies before enabling, or all access will be blocked:
-- e.g. CREATE POLICY "guard_access" ON visitor_blacklist FOR ALL TO anon USING (true);
```

### Open Policies
Several tables use `USING (true)` blanket policies — all rows are accessible to the granted role:
- `devices` — anon can SELECT/INSERT/UPDATE any device (necessary for PWA setup flow)
- `visits` — anon can SELECT any visit (necessary for PWA daily list without auth)
- `restaurants` — anon can UPDATE any restaurant row (overly permissive — review)
- `event_rsvps` — public role can ALL (no auth required)
- `condominium_events` — public role can SELECT (no auth required)

### SECURITY DEFINER Functions
All custom RPCs bypass RLS and run as DB owner. This is intentional — the app uses anon key + RPCs rather than direct table access. Ensure every new RPC has appropriate caller validation before performing sensitive operations.

### Known Issues
- `admin_delete_resident` returns 409 when resident has FK references in: incidents, video_call_sessions, resident_qr_codes, resident_devices, resident_frequent_visitors — cascade delete or soft-delete strategy needed.
- `send_push_on_new_visit` trigger contains a hard-coded service role JWT in the trigger body — rotate this key if compromised.
