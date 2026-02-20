# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Elite AccessControl** is an Progressive Web App (PWA) for condominium and building security gate management. Guards can register visits, deliveries, and incidents even without internet connectivity, with automatic synchronization when connection is restored.

**Stack**: React 19 + TypeScript, Vite 6, Dexie.js (IndexedDB), Supabase (PostgreSQL backend), Tailwind CSS, Leaflet (maps)

## Development Commands

```bash
# Development server with HTTPS (required for camera access)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Important**: The dev server runs on `https://0.0.0.0:3000` with self-signed SSL certificate to enable camera access on tablets.

## Environment Variables

Required in `.env.local`:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SENTRY_ORG=chongtechnologies
VITE_SENTRY_PROJECT=eliteaccesscontrol
VITE_SENTRY_DSN=
NODE_ENV=development
VITE_APP_VERSION=1.0.0
```

---

## Deployment

### Option 1: Vercel (Recommended)

**Initial Setup**:
```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

**Automatic CI/CD with Vercel**:

Vercel provides **automatic CI/CD out of the box** when you connect your Git repository:

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub/GitLab/Bitbucket repository
   - Vercel automatically detects Vite configuration

2. **Configure Environment Variables**:
   - In Vercel Dashboard → Project → Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Set for: Production, Preview, Development

3. **Automatic Deployments**:
   - **Production**: Every push to `main` branch → automatic production deployment
   - **Preview**: Every push to feature branches → automatic preview deployment with unique URL
   - **Pull Requests**: Automatic preview deployment + comment on PR with URL

4. **Build Configuration** (auto-detected):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   - Framework: Vite

5. **Domain Setup**:
   - Production URL: `your-project.vercel.app`
   - Custom domain: Configure in Settings → Domains
   - HTTPS is automatic

**How Vercel CI/CD Works**:
```
Git Push → Vercel Webhook → Build Triggered → Run Tests (if any) → Build → Deploy → Live
```

**Rollback**:
- Vercel keeps deployment history
- One-click rollback to previous deployment
- Instant rollback (no rebuild needed)

---

### Option 2: Netlify

**Initial Setup**:
```bash
# Install Netlify CLI (optional)
npm i -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

**Automatic CI/CD with Netlify**:

1. **Connect Repository**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to Git provider
   - Select repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Auto-detected for Vite

3. **Environment Variables**:
   - Site settings → Environment variables
   - Add all `VITE_*` variables
   - Deploy contexts: Production, Deploy Previews, Branch deploys

4. **Automatic Deployments**:
   - **Production**: Push to `main` → production deploy
   - **Deploy Previews**: Pull requests → preview URL
   - **Branch Deploys**: Configure specific branches for staging

5. **Domain & HTTPS**:
   - Free subdomain: `your-project.netlify.app`
   - Custom domain support
   - Auto HTTPS/SSL

**Netlify CI/CD Flow**:
```
Git Push → Webhook → Build Container → npm install → npm run build → Deploy → CDN Distribution
```

**Additional Netlify Features**:
- Build plugins for optimization
- Split testing (A/B testing)
- Form handling
- Serverless functions (if needed later)

---

### Deployment Requirements

⚠️ **Critical**:
- **HTTPS is mandatory** (camera API + PWA + Service Workers)
- Environment variables must be prefixed with `VITE_`
- Both Vercel and Netlify provide HTTPS automatically

**Pre-Deployment Checklist**:
- [ ] All environment variables configured
- [ ] Supabase project is in production mode
- [ ] Test production build locally: `npm run build && npm run preview`
- [ ] Verify camera works on HTTPS
- [ ] Test PWA installation
- [ ] Verify offline functionality

---

### CI/CD Comparison: Vercel vs Netlify

| Feature | Vercel | Netlify |
|---------|--------|---------|
| **Auto CI/CD** | ✅ Yes | ✅ Yes |
| **Preview Deploys** | ✅ Every PR | ✅ Every PR |
| **Build Time** | Fast (~2 min) | Fast (~2 min) |
| **Rollback** | ✅ Instant | ✅ Instant |
| **Custom Domain** | ✅ Free | ✅ Free |
| **HTTPS/SSL** | ✅ Auto | ✅ Auto |
| **Build Minutes** | 6000/month (Hobby) | 300/month (Free) |
| **Bandwidth** | 100GB/month | 100GB/month |
| **Vite Optimized** | ✅ Yes | ✅ Yes |
| **Edge Functions** | ✅ Yes | ✅ Yes |
| **Best For** | Vite/React apps | All static sites |

**Recommendation**: Use **Vercel** for this project (better Vite integration, faster builds, more generous free tier).

---

### Manual CI/CD with GitHub Actions (Optional)

If you need custom CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests (when added)
        run: npm test --if-present

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Note**: Manual CI/CD is **not needed** if using Vercel/Netlify's built-in CI/CD (which is simpler and recommended).

---

## Critical Architecture Patterns

### 1. Offline-First Data Flow

**ALL data operations go through `DataService`** (services/dataService.ts - 1,949 lines), which implements a Cache-Then-Network strategy and sentry for log:

```
Component → DataService → IndexedDB (primary) + Supabase (sync)
                       ↓
                Backend Health Check (score 0-3)
```

**Never bypass DataService** to access Supabase directly from components. DataService manages:
- Offline/online detection via health score system
- Automatic retry with exponential backoff
- Local-first writes with background sync
- Device fingerprinting and heartbeat
- Multi-layer storage sync (central DB → IndexedDB → localStorage)
- Persistent storage requests for PWA
- **Device tracking for visits** (see below)
- Always use Sentry for logging

### 1.1 Device Tracking for Visits

Every visit records `device_id` (UUID) to track which tablet registered it:

```typescript
// DataService tracks current device
private currentDeviceId: string | null = null;

// Automatically included when creating visits
device_id: this.currentDeviceId || undefined
```

**Benefits**:
- Audit trail: Know which device registered each visit
- Historical queries: Works even after device reassignment between condominiums
- Analytics: Device usage patterns and performance

**Example Query** (after device reassigned from Condo 1 to Condo 2):
```sql
-- All visits from Device X while at Condo 1
SELECT * FROM visits WHERE device_id = 'uuid' AND condominium_id = 1;
```

### 2. Data Synchronization Strategies

**Configuration Data (Cache-Then-Network)**:
- Return local data immediately if available
- Fire background refresh to update from backend
- Example: `getVisitTypes()`, `getServiceTypes()`

**User Data (Write-Through with Retry)**:
- Save to IndexedDB first (always succeeds)
- Attempt backend sync with `sync_status: PENDING_SYNC`
- Mark as `SYNCED` on success
- Example: `createVisit()`, `updateVisitStatus()`

**Background Sync**:
- `syncPendingItems()` automatically retries failed syncs
- Called on health check recovery and user-triggered sync

**Sync Event System**:
The `DataService` emits custom window events to notify the UI about sync progress:

```typescript
// Event types (dataService.ts)
type SyncEventType = 'sync:start' | 'sync:progress' | 'sync:complete' | 'sync:error';

// Event detail structure
interface SyncEventDetail {
  total?: number;    // Total items to sync
  synced?: number;   // Items synced so far
  message?: string;  // Status message
  error?: string;    // Error message (for sync:error)
}
```

**Sync Flow**:
```
1. syncPendingItems() called (manual or auto-recovery)
2. Emit 'sync:start' with total count
3. For each pending item:
   - Sync to Supabase
   - Emit 'sync:progress' with current count
4. Emit 'sync:complete' or 'sync:error'
```

**SyncOverlay Component** (components/SyncOverlay.tsx):
- Full-screen overlay shown during sync operations
- Displays progress bar with item count
- Shows success/error states
- Prevents user interaction during sync

**App.tsx Event Listeners**:
```typescript
// App.tsx listens to sync events and controls SyncOverlay visibility
window.addEventListener('sync:start', handleSyncStart);
window.addEventListener('sync:progress', handleSyncProgress);
window.addEventListener('sync:complete', handleSyncComplete);
window.addEventListener('sync:error', handleSyncError);
```

**Automatic Sync Triggers**:
1. Health check recovery (backend was down, now up) - every 60 seconds
2. Manual sync button on Dashboard
3. After creating/updating records when online

### 3. Device Configuration Flow

Each tablet must be configured before use:

```
1. Setup.tsx → configureDevice(condoId)
   - Generates unique device fingerprint (deviceUtils.ts)
   - Registers device in Supabase
   - Saves config to IndexedDB + localStorage

2. ConfigGuard checks if device configured
   - Redirects to /setup if not configured
   - Loads condominium details for display

3. Login requires staff.condominium_id === device.condominium_id
   - Guards can only login to their assigned condominium's devices
```

**Storage Layer Priorities**:
- **Online**: Central DB (source of truth) → IndexedDB → localStorage
- **Offline**: IndexedDB (primary cache) → localStorage (backup/fast access)
- Persistent Storage API (`navigator.storage.persist()`) requested on init to prevent browser auto-deletion on kiosk tablets

**localStorage Keys**:
- `condo_guard_device_id` — device_identifier UUID
- `device_condo_backup` — JSON stringified Condominium object
- `auth_user` — auth state persistence across PWA updates

**IndexedDB Settings Keys**:
- `device_condo_details` — Condominium object
- `device_id` — device_identifier string

**Configuration Check Priority (isDeviceConfigured)**:
1. **Online**: Query Central DB by `device_identifier` → if not found, fallback query by `condominium_id` from IndexedDB → sync all layers
2. **Offline**: Check IndexedDB `device_condo_details` → restore localStorage if missing
3. **Last resort**: Parse `device_condo_backup` from localStorage → restore to IndexedDB
4. **All empty + online**: Navigate to `/setup`
5. **All empty + offline**: Offline emergency configuration

**Scenario Matrix** (localStorage × IndexedDB × Online):

| localStorage | IndexedDB | Online | Action |
|---|---|---|---|
| Valid | Valid | Online | Sync from Central DB → update all layers |
| Valid | Valid | Offline | Use IndexedDB, restore localStorage if needed |
| Valid | Empty | Online | Query Central DB → populate IndexedDB |
| Valid | Empty | Offline | Restore IndexedDB from localStorage |
| Empty | Valid | Online | Sync from Central DB → restore localStorage |
| Empty | Valid | Offline | Restore localStorage from IndexedDB |
| Empty | Empty | Online | Navigate to /setup |
| Empty | Empty | Offline | **Offline emergency configuration** |

**Sync Validation Rules**:
- Central DB always wins when online (overwrites local data)
- IndexedDB has priority over localStorage when offline
- All writes must sync bidirectionally (IndexedDB ↔ localStorage)
- Never clear localStorage without also clearing IndexedDB

**Offline Emergency Configuration**:
- Admin can configure device manually without internet using `configureDeviceOffline()`
- Requires admin PIN verification (123456)
- Guard provides `device_identifier` to admin (copy button on screen)
- Admin checks Central DB: if device exists, provides condo ID/name; if new, creates record first
- Guard enters condo ID + name in manual config form
- Saves to IndexedDB (settings, devices, condominiums tables) + localStorage
- Will sync with Central DB when internet is restored

**Troubleshooting Device Config**:
- **Setup screen reappears**: localStorage cleared → app recovers from IndexedDB or Central DB
- **"Condominium already assigned"**: Another active device exists → admin deactivates old device
- **Offline config doesn't sync**: Device record missing in Central DB → admin creates it manually
- **device_identifier changed after reinstall**: Browser data cleared, new UUID generated → admin updates Central DB or reconfigures
- **IndexedDB cleared unexpectedly**: Persistent storage not granted → check `navigator.storage.persisted()`, recover from localStorage backup

### 4. Authentication & Security

**PIN Authentication**:
- PINs stored as bcrypt hashes (never plaintext)
- Online: `verify_staff_login()` RPC validates PIN on backend
- Offline: Local bcrypt comparison against cached `staff.pin_hash`
- First login must be online to cache credentials

**AuthContext** (App.tsx):
- Global auth state: `{ user: Staff | null, login, logout }`
- ProtectedRoute guards authenticated pages
- ConfigGuard ensures device setup
- AdminRoute guards admin-only pages

**Role Hierarchy**:
- `GUARD` - Standard guard access by Condominiun
- `ADMIN` - Administrative access to management pages by Condominiun
- `SUPER_ADMIN` - Full system access

### 5. Database Schema (IndexedDB via Dexie)

**Tables** (services/db.ts - Version 12):
```typescript
visits          // User visits with sync_status and device_id
visitEvents     // Visit status change events (audit trail)
units           // Condominium units (cached)
visitTypes      // Visit type configs (cached)
serviceTypes    // Service type configs (cached)
settings        // Device settings (key-value)
staff           // Staff list (cached, includes pin_hash)
condominiums    // Condominiums list (cached)
restaurants     // Restaurant list (cached)
sports          // Sports facilities (cached)
incidents       // Incident reports with sync_status
incidentTypes   // Incident type lookup table
incidentStatuses // Incident status lookup table
devices         // Device registry (cached)
residents       // Resident list (cached for offline search)
news            // Condominium news (cached, last 7 days)
```

**Critical Indexes**:
- `visits`: `id, condominium_id, status, sync_status, check_in_at, device_id`
- `visitEvents`: `++id, visit_id, status, sync_status, event_at` (auto-increment for local)
- `staff`: `id, condominium_id, [first_name+last_name]` (compound index for login)
- `units`: `id, condominium_id, code_block, number`

### 6. PostgreSQL Database Schema (Supabase)

**Source**: Supabase REST API (OpenAPI spec) — queried live from the project.

#### Core Tables

| Table | Columns | Description |
|-------|---------|-------------|
| `condominiums` | id, created_at, name, address, logo_url, latitude, longitude, gps_radius_meters, status, phone_number | Condominium/building registry |
| `units` | id, condominium_id, code_block, number, floor, building_name, created_at | Apartment/unit registry |
| `residents` | id, condominium_id, unit_id, name, phone, email, created_at, pin_hash, has_app_installed, device_token, app_first_login_at, app_last_seen_at, avatar_url, push_token, type | Resident directory |
| `staff` | id, created_at, first_name, last_name, pin_hash, condominium_id, role, photo_url | Guard/admin staff |
| `devices` | id (UUID), created_at, device_identifier, device_name, condominium_id, configured_at, last_seen_at, status, metadata | Registered tablet devices |
| `visits` | id, created_at, condominium_id, visitor_name, visitor_doc, visitor_phone, visit_type_id, service_type_id, unit_id, reason, photo_url, qr_token, qr_expires_at, check_in_at, check_out_at, status, approval_mode, guard_id, sync_status, restaurant_id, sport_id, approved_at, denied_at, device_id, vehicle_license_plate | Visit/delivery records |
| `visit_events` | id, created_at, visit_id, status, event_at, actor_id, device_id | Visit status change audit trail |
| `incidents` | id, reported_at, resident_id, description, type, status, photo_path, acknowledged_at, acknowledged_by, guard_notes, resolved_at | Security incident reports |
| `audit_logs` | id, created_at, condominium_id, actor_id, action, target_table, target_id, details, ip_address, user_agent | Audit trail for all actions |

#### Reference/Config Tables

| Table | Columns | Description |
|-------|---------|-------------|
| `visit_types` | id, name, icon_key, requires_service_type, requires_restaurant, requires_sport | Visit type configuration |
| `service_types` | id, name | Service type lookup |
| `incident_types` | code, label, sort_order | Incident type lookup |
| `incident_statuses` | code, label, sort_order | Incident status lookup |
| `restaurants` | id, created_at, condominium_id, name, description, status | Restaurant directory |
| `sports` | id, created_at, condominium_id, name, description, status | Sports facility directory |
| `streets` | id, condominium_id, name, created_at | Street/location management |
| `news_categories` | id, name, label, created_at | News category lookup |

#### Resident App Tables

| Table | Columns | Description |
|-------|---------|-------------|
| `resident_devices` | id, resident_id, push_token, device_name, platform, last_active, created_at | Resident mobile devices for push notifications |
| `resident_qr_codes` | id, resident_id, condominium_id, unit_id, purpose, visitor_name, visitor_phone, notes, qr_code, is_recurring, recurrence_pattern, recurrence_days, start_date, end_date, expires_at, status, created_at, updated_at | Visitor QR code invitations |
| `notifications` | id, resident_id, condominium_id, unit_id, title, body, type, data, read, created_at, updated_at | Push notifications for residents |
| `condominium_news` | id, condominium_id, title, description, content, image_url, category_id, created_at, updated_at | News articles per condominium |

#### Error Tracking

| Table | Columns | Description |
|-------|---------|-------------|
| `device_registration_errors` | id, created_at, device_identifier, error_message, payload | Device registration error log |

#### Views

| View | Columns | Description |
|------|---------|-------------|
| `v_app_adoption_stats` | condominium_id, condominium_name, total_units, total_residents, residents_with_app, units_with_app, resident_adoption_percent, unit_coverage_percent | Resident app adoption metrics per condominium |

### 7. Type System (types.ts)

**All types use numeric IDs** (Supabase SERIAL/INT4), not UUIDs:
- `Condominium.id: number`
- `Staff.id: number`
- `Visit.id: number`
- Exception: `Device.id: string` (UUID for device fingerprinting)

**Key Enums**:
```typescript
UserRole: ADMIN | GUARD
VisitStatus: PENDING | APPROVED | DENIED | INSIDE | LEFT
SyncStatus: SYNCED | PENDING_SYNC
ApprovalMode: APP | PHONE | INTERCOM | GUARD_MANUAL | QR_SCAN
```

**Additional Types**:
- `Street` - Street/location management
- `IncidentType` / `IncidentStatus` - Lookup tables
- `AuditLog` - Audit trail entries
- `CondominiumStats` - Statistics data
- `ApprovalModeConfig` - Approval mode metadata

### 7.1 Audit Logging (App + Supabase)

### 7.1 Audit Logging (App + Supabase)

**Client logging**:
- Visit creation logs on `NewEntry` (CREATE visits).
- Visit status changes log on guard updates and admin updates.
- Incident acknowledge/resolve/notes log for guard + admin flows.
- Admin CRUD for condominiums, devices, staff, units, residents, restaurants, sports, visit types, service types logs CREATE/UPDATE/DELETE.
- Login/Logout and login failures log with device identifier.
- CSV/PDF exports log (visits/incidents/audit logs).

**Backend**:
- RPCs `create_audit_log` and `admin_get_audit_logs` are expected to be deployed.
- Optional SQL scripts:
  - `database/audit_log_policies.sql` (retention + RLS)
  - `database/audit_log_hardening.sql` (revoke UPDATE/DELETE/TRUNCATE on `audit_logs`)

### 8. Backend Integration (Supabase)

**RPC Migration Status**: ✅ 99% Complete (February 2026)
- 87 RPC functions implemented and in use
- 1 remaining `.from()` call (`device_registration_errors` table)
- 10 storage bucket `.from()` calls (correct - Supabase Storage API)

**RPC Functions** (services/Supabase.ts - 2,500+ lines) — 87+ functions total, grouped by domain:

**Authentication (3)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `verify_staff_login` | p_first_name, p_last_name, p_pin (TEXT) | Guard/admin PIN login |
| `verify_resident_login` | p_phone, p_pin_cleartext, p_device_token (TEXT) | Resident app login |
| `register_resident_pin` | p_phone, p_pin_cleartext, p_device_token (TEXT) | Register resident PIN |

**Device Management (7)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `register_device` | p_data (JSONB) | Register new tablet device |
| `get_device` | p_identifier (TEXT) | Get device by fingerprint |
| `update_device_heartbeat` | p_identifier (TEXT) | Update last_seen_at |
| `update_device_status` | p_id (INT), p_status (TEXT) | Change device status |
| `deactivate_condo_devices` | p_condominium_id (INT) | Deactivate all devices for a condo |
| `get_devices_by_condominium` | p_condominium_id (INT) | List devices per condo |
| `admin_get_all_devices` | (none) | List all devices |

**Visits (8)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `create_visit` | p_data (JSONB) | Create new visit record |
| `update_visit_status` | p_id (INT), p_status (TEXT) | Update visit status |
| `checkout_visit` | p_id (INT) | Check out visitor |
| `create_visit_event` | p_data (JSONB) | Log visit status change |
| `get_visit_events` | p_visit_id (INT) | Get visit event history |
| `admin_get_all_visits` | p_condominium_id (INT), p_start_date, p_end_date (DATE) | List visits (date range) |
| `admin_get_all_visits_filtered` | p_condominium_id, p_start_date, p_end_date, p_status, p_visit_type, p_service_type | Filtered visit query |
| `admin_update_visit` | p_id (INT), p_data (JSONB) | Update visit record |

**Condominiums (7)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_condominiums` | (none) | List all condominiums |
| `get_condominium` | p_id (INT) | Get single condominium |
| `get_available_condominiums_for_setup` | (none) | Active condos for device setup |
| `admin_create_condominium` | p_data (JSONB) | Create condominium |
| `admin_update_condominium` | p_id (INT), p_data (JSONB) | Update condominium |
| `admin_delete_condominium` | p_id (INT) | Delete condominium |
| `admin_get_condominiums_with_stats` | (none) | Condos with visit/incident stats |

**Staff (6)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_staff_by_condominium` | p_condominium_id (INT) | Staff list per condo |
| `admin_get_all_staff` | p_condominium_id (INT) | All staff for admin |
| `admin_create_staff_with_pin` | p_first_name, p_last_name (TEXT), p_condominium_id (INT), p_role, p_pin_cleartext, p_photo_url (TEXT) | Create staff with PIN |
| `admin_update_staff` | p_id (INT), p_data (JSONB) | Update staff |
| `admin_delete_staff` | p_id (INT) | Delete staff |
| `admin_update_staff_pin` | p_staff_id (INT), p_pin_cleartext (TEXT) | Reset staff PIN |

**Units (4)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_units` | p_condominium_id (INT) | Units per condo |
| `admin_get_all_units` | p_condominium_id (INT) | All units for admin |
| `admin_create_unit` | p_data (JSONB) | Create unit |
| `admin_delete_unit` | p_id (INT) | Delete unit |

**Residents (5)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_resident` | p_id (INT) | Get single resident |
| `admin_get_residents` | p_condominium_id, p_search, p_limit, p_after_id, p_after_name | Paginated resident search |
| `admin_create_resident` | p_data (JSONB) | Create resident |
| `admin_update_resident` | p_id (INT), p_data (JSONB) | Update resident |
| `admin_get_resident_qr_codes` | p_resident_id (INT) | Get all QR codes for a resident (uses `get_active_qr_codes` RPC) |

**Incidents (7)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `create_incident` | p_resident_id (INT), p_description, p_type, p_photo_path (TEXT) | Create incident |
| `get_incidents` | p_condominium_id (INT) | Incidents per condo |
| `get_resident_incidents` | p_resident_id (INT) | Incidents per resident |
| `acknowledge_incident` | p_id (INT), p_guard_id (INT) | Guard acknowledges incident |
| `admin_get_all_incidents` | p_condominium_id (INT) | All incidents for admin |
| `admin_update_incident` | p_id (INT), p_data (JSONB) | Update incident |
| `admin_delete_incident` | p_id (INT) | Delete incident |

**Configuration (11)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_visit_types` | p_condominium_id (INT) | Visit types per condo |
| `get_service_types` | (none) | All service types |
| `get_incident_types` | (none) | Incident type lookup |
| `get_incident_statuses` | (none) | Incident status lookup |
| `admin_get_visit_types` | (none) | All visit types for admin |
| `admin_get_service_types` | (none) | All service types for admin |
| `admin_create_visit_type` | p_data (JSONB) | Create visit type |
| `admin_delete_visit_type` | p_id (INT) | Delete visit type |
| `admin_create_service_type` | p_data (JSONB) | Create service type |
| `admin_update_service_type` | p_id (INT), p_data (JSONB) | Update service type |
| `admin_delete_service_type` | p_id (INT) | Delete service type |

**Restaurants & Sports (10)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_restaurants` | p_condominium_id (INT) | Restaurants per condo |
| `get_sports` | p_condominium_id (INT) | Sports per condo |
| `admin_get_restaurants` | (none) | All restaurants |
| `admin_get_sports` | (none) | All sports |
| `admin_create_restaurant` | p_data (JSONB) | Create restaurant |
| `admin_update_restaurant` | p_id (INT), p_data (JSONB) | Update restaurant |
| `admin_delete_restaurant` | p_id (INT) | Delete restaurant |
| `admin_create_sport` | p_data (JSONB) | Create sport |
| `admin_update_sport` | p_id (INT), p_data (JSONB) | Update sport |
| `admin_delete_sport` | p_id (INT) | Delete sport |

**News (9)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `get_news` | p_condominium_id (INT), p_days (INT DEFAULT 7) | Get news from last N days for a condo |
| `admin_get_all_news` | p_condominium_id, p_limit, p_search, p_category_id, p_date_from, p_date_to, p_after_created_at, p_after_id | Paginated/filtered news for admin |
| `admin_create_news` | p_data (JSONB) | Create news article |
| `admin_update_news` | p_id (INT), p_data (JSONB) | Update news article |
| `admin_delete_news` | p_id (INT) | Delete news article |
| `get_news_categories` | (none) | Get all news categories |
| `admin_create_news_category` | p_data (JSONB) | Create news category |
| `admin_update_news_category` | p_id (INT), p_data (JSONB) | Update news category |
| `admin_delete_news_category` | p_id (INT) | Delete news category |

**QR Codes (5)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `create_visitor_qr_code` | p_resident_id, p_condominium_id, p_unit_id (INT), p_purpose, p_visitor_name, p_visitor_phone (TEXT), p_expires_at (TIMESTAMP), p_notes (TEXT) | Create visitor QR invitation |
| `validate_qr_code` | p_qr_code (TEXT) | Validate QR at gate. Returns: is_valid, resident_id, unit_id, visitor_name, purpose, message |
| `revoke_qr_code` | p_qr_code_id (UUID) | Revoke QR code |
| `get_active_qr_codes` | p_resident_id (INT) | Active QR codes per resident |
| `expire_qr_codes` | (none) | Expire outdated QR codes |

**Notifications (6)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `create_notification` | p_resident_id, p_condominium_id, p_unit_id (INT), p_title, p_body, p_type (TEXT), p_data (JSONB) | Create push notification |
| `get_notifications` | p_resident_id (INT) | All notifications |
| `get_resident_notifications` | p_resident_id, p_offset, p_limit (INT), p_unread_only (BOOL) | Paginated notifications |
| `get_unread_notification_count` | p_resident_id (INT) | Unread count |
| `mark_notification_read` | p_notification_id, p_resident_id (INT) | Mark one as read |
| `mark_all_notifications_read` | p_resident_id (INT) | Mark all as read |

**OTP / PIN Reset (3)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `request_pin_reset_otp` | p_phone (TEXT) | Send OTP via SMS |
| `check_otp_validity` | p_phone (TEXT) | Check if OTP is still valid |
| `reset_pin_with_otp` | p_phone, p_otp_code, p_new_pin (TEXT) | Reset PIN using OTP |

**Streets (3)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `create_street` | p_data (JSONB) | Create street |
| `get_streets` | p_condominium_id (INT) | Streets per condo |
| `delete_street` | p_id (INT) | Delete street |

**Audit (3)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `create_audit_log` | p_data (JSONB) | Create audit log entry |
| `log_audit` | p_condominium_id, p_actor_id (INT), p_action, p_target_table (TEXT), p_target_id (INT), p_details (JSONB) | Log audit with params |
| `admin_get_audit_logs` | p_condominium_id, p_actor_id (INT), p_action, p_target_table (TEXT), p_start_date, p_end_date (TIMESTAMP), p_offset, p_limit (INT) | Filtered audit query |

**Dashboard & App Tracking (3)**:
| Function | Parameters | Description |
|----------|-----------|-------------|
| `admin_get_dashboard_stats` | (none) | Admin dashboard statistics |
| `update_resident_app_activity` | p_resident_id (INT) | Update resident last seen |
| `check_unit_has_app` | p_unit_id (INT) | Check if unit has app installed |


**MCP Documentation**: See `docs/MCP.md` for MCP server configuration.

**Database Migrations**: Located in `database/*.sql` (apply manually to Supabase)

**Storage Buckets** (Supabase Storage):
```
visitor-photos     // Visitor photos taken during check-in
staff-photos       // Staff profile photos
logo_condominio    // Condominium logos
news-images        // News article images (5MB limit, public read)
```

All buckets are public for read access. Setup via `setup_storage_buckets.sql`.

### 9. PWA Configuration (vite.config.ts)

**Service Worker** (VitePWA):
- Prompt-based registration (user controls updates)
- `skipWaiting: false` - prevents sudden reload
- Runtime caching for Supabase API (NetworkFirst, 5min TTL)
- Image caching (CacheFirst, 7 days)

**Caching Strategies**:
- **App Shell**: Cached on install (HTML, CSS, JS)
- **CDN Resources**: CacheFirst (Tailwind, fonts, AI Studio CDN)
- **Supabase API**: NetworkFirst with 10s timeout (5min cache)
- **Images**: CacheFirst (7 days cache)

**HTTPS Required**: `@vitejs/plugin-basic-ssl` enables camera access on tablets

**PWA Update Flow**:
- Update check interval: 60s (dev), recommended 5min for production
- `PWAUpdateNotification.tsx` shows update prompt with `[PWA Update]` log prefix
- Auth state persists across updates via `localStorage` (`auth_user` key)
- Known config conflict: `skipWaiting: true` + `registerType: 'prompt'` — consider setting `skipWaiting: false` for controlled updates

**Tablet-Specific Optimizations**:
- Viewport fit for notched devices
- Prevents accidental zoom/pull-to-refresh
- Kiosk mode styles (no text selection on UI)
- Standalone display mode

**Debugging PWA Updates**:
1. DevTools → Application → Service Workers (check status: Activated/Waiting/Installing)
2. Console logs with `[PWA Update]` prefix for all update events
3. Force update: DevTools → Application → Service Workers → "Update" or "Unregister" + refresh
4. Network tab: filter by "sw.js", verify 200 response (not 304)

**Installing on Tablets**:
- **Android**: Chrome/Edge → Menu → "Install app" or "Add to Home Screen"
- **iOS/iPadOS**: Safari → Share button → "Add to Home Screen"
- Recommended tablet settings: disable screen auto-lock, enable "stay awake while charging", set portrait orientation

### 10. Path Aliases

Use `@/` for imports:
```typescript
import { DataService } from '@/services/dataService';
import { Staff } from '@/types';
```

Configured in `vite.config.ts` and `tsconfig.json`.

---

## Component Structure

```
src/
├── App.tsx                  # Router + AuthContext provider (~550 lines)
├── types.ts                 # All TypeScript interfaces/enums (238 lines)
├── eslint.config.js         # ESLint flat config
├── components/
│   ├── CameraCapture.tsx        # Photo capture with preview/retake
│   ├── ApprovalModeSelector.tsx # Visit approval mode UI
│   ├── Toast.tsx                # Toast notifications (success/error/confirm)
│   ├── ErrorBoundary.tsx        # Error handling wrapper
│   ├── PWAInstallPrompt.tsx     # PWA installation UI
│   ├── PWAUpdateNotification.tsx# PWA update alerts
│   ├── SyncOverlay.tsx          # Full-screen sync progress overlay
│   ├── AdminRoute.tsx           # Route protection for admin
│   ├── AdminLayout.tsx          # Admin page wrapper
│   └── UninstallConfirmDialog.tsx # PWA uninstall confirmation
├── config/
│   └── deployment.ts            # Environment-aware deployment config
├── utils/
│   ├── approvalModes.ts         # Approval mode UI configurations
│   └── csvExport.ts             # CSV export utilities for data
├── pages/
│   ├── Setup.tsx                # Device configuration (first-run)
│   ├── Login.tsx                # PIN authentication
│   ├── Dashboard.tsx            # Main menu with AI assistant
│   ├── NewEntry.tsx             # Register visit/delivery (multi-step)
│   ├── DailyList.tsx            # Today's visits list
│   ├── Incidents.tsx            # Incident management with alerts
│   ├── ResidentSearch.tsx       # Resident search functionality
│   ├── News.tsx                 # Condominium news (last 7 days)
│   ├── Settings.tsx             # Device settings and storage info
│   └── admin/                   # Admin pages (15 pages)
│       ├── AdminDashboard.tsx
│       ├── AdminCondominiums.tsx
│       ├── AdminDevices.tsx
│       ├── AdminDeviceRegistrationErrors.tsx  # Device registration error tracking
│       ├── AdminStaff.tsx
│       ├── AdminUnits.tsx
│       ├── AdminResidents.tsx
│       ├── AdminRestaurants.tsx
│       ├── AdminSports.tsx
│       ├── AdminNews.tsx           # News management with categories and image upload
│       ├── AdminVisits.tsx
│       ├── AdminIncidents.tsx
│       ├── AdminVisitTypes.tsx
│       ├── AdminServiceTypes.tsx
│       ├── AdminAnalytics.tsx
│       └── AdminAuditLogs.tsx
├── services/
│   ├── dataService.ts           # CRITICAL: All data operations (1,949 lines)
│   ├── Supabase.ts              # Backend RPC client (2,146 lines)
│   ├── db.ts                    # Dexie database schema (88 lines)
│   ├── deviceUtils.ts           # Device fingerprinting
│   ├── geminiService.ts         # AI concierge integration
│   ├── audioService.ts          # Alert sounds and vibration
│   ├── pwaLifecycleService.ts   # PWA install/uninstall tracking
│   ├── supabaseClient.ts        # Supabase client initialization
│   └── mockSupabase.ts          # Mock data for testing
├── database/                    # SQL migration files
└── docs/                        # Project documentation
```

---

## Key Features

### Audio Alert System (audioService.ts)

The app includes an audio alert system for incident notifications:

```typescript
// Initialize audio (requests permission)
AudioService.initialize()

// Play alert sound (4 cycles of BIP-bip-BIP, ~6 seconds)
AudioService.playAlertSound()

// Test sound manually
AudioService.testSound()
```

**Features**:
- AudioContext singleton with HTML5 Audio fallback
- Data URI beep tone (no external files needed)
- **4 cycles of BIP-bip-BIP** pattern (~6 seconds total)
- **Volume: 60%** for audibility
- Device vibration integration (200ms, pause, 200ms pattern)
- Permission storage in localStorage (`audio_permission_enabled` key)
- Auto-initialization on login if previously granted

**"Testar Som" Button States**:
- 🟠 **Orange (pulsing)**: Sound not yet activated - guard must click once
- 🟢 **Green**: Sound activated - alerts will play automatically

**Console Log Prefixes** (for debugging):
- `[AudioService]` - Audio system logs
- `[Incidents]` - Realtime subscription and incident detection logs

### Incident Realtime Alerts (Incidents.tsx)

Real-time incident detection via Supabase Realtime:

**How it works**:
1. Subscribes to `incidents` table INSERT events via WebSocket
2. Client-side filtering by `resident.condominium_id` (matches guard's condo)
3. On new incident from same condominium:
   - 🔊 Plays alert sound (4 cycles)
   - 📳 Vibrates device (if mobile)
   - 🎨 Shows red banner (auto-dismisses after 10 seconds)
   - 📋 Refreshes incident list

**Realtime Subscription Logs**:
```
[Incidents] 📡 Setting up realtime subscription for condo: X
[Incidents] Subscription status: SUBSCRIBED
[Incidents] 🆕 New incident received via realtime
[Incidents] ✅ Incident belongs to this condominium - triggering alert
```

**Troubleshooting**:
- If `CHANNEL_ERROR` appears: Realtime not enabled in Supabase Dashboard → Database → Replication
- If sound doesn't play: Guard must click "Testar Som" button once (browser autoplay policy)

### PWA Lifecycle Tracking (pwaLifecycleService.ts)

Tracks PWA installation and usage:
- Installation detection (standalone mode + iOS)
- Installation event listeners
- Uninstallation detection heuristics
- Service Worker monitoring
- Visibility tracking
- Inactivity decommissioning checks

### Deployment Configuration (config/deployment.ts)

Environment-aware configuration for different deployment targets:

```typescript
import { config } from '@/config/deployment';

// Access environment-specific settings
config.appUrl          // Base URL for the app
config.supabaseUrl     // Supabase project URL
config.supabaseAnonKey // Supabase anonymous key
config.geminiApiKey    // Google Gemini API key
```

**Features**:
- Automatic environment detection (development/staging/production)
- Centralized configuration management
- Type-safe configuration access

### Approval Modes Configuration (utils/approvalModes.ts)

Centralized UI configuration for all visit approval modes:

```typescript
import { APPROVAL_MODE_CONFIGS, getApprovalModeConfig } from '@/utils/approvalModes';

// Get config for a specific mode
const config = getApprovalModeConfig(ApprovalMode.APP);
// { label: 'App', icon: '📱', color: 'blue', requiresOnline: true, ... }
```

**Features**:
- Maps ApprovalMode enum to UI properties (label, icon, color)
- Tracks which modes require online connectivity
- Used by ApprovalModeSelector component

### CSV Export Utilities (utils/csvExport.ts)

Data export functionality for admin reports:

```typescript
import { exportToCSV, downloadCSV } from '@/utils/csvExport';

// Convert data to CSV string
const csv = exportToCSV(visits, ['visitor_name', 'check_in_at', 'status']);

// Trigger file download
downloadCSV(csv, 'visits-report.csv');
```

**Features**:
- Generic CSV conversion with column selection
- Proper escaping for special characters
- Browser download trigger
- Supports visits, incidents, and other data exports

### Resident App Status Filter (AdminResidents.tsx)

Filter and select residents by app installation status for future bulk SMS/email invitations:

```typescript
// Filter types
type AppStatusFilter = 'ALL' | 'WITH_APP' | 'WITHOUT_APP';

// Client-side filtering using useMemo
const filteredResidents = useMemo(() => {
  if (filterAppStatus === 'ALL') return residents;
  return residents.filter(r =>
    filterAppStatus === 'WITH_APP' ? r.has_app_installed === true : r.has_app_installed !== true
  );
}, [residents, filterAppStatus]);
```

**Features**:
- 3-column filter layout (search, condominium, app status)
- Client-side filtering on `has_app_installed` field
- Bulk selection with "Select All" when filtering "Sem App"
- Disabled "Enviar Convite" button (future SMS/email integration)
- Selection state cleared on filter/data changes

**Future Work**:
- SMS/email invitation sending to selected residents without app
- Backend integration for bulk messaging

### Resident App Integration

The Guard App integrates with the external Resident App for visit approval via push notifications.

**How it works**:
1. Guard registers visit and selects "Aplicativo" approval mode
2. System checks if unit has residents with `has_app_installed = true`
3. Push notification sent to resident's device
4. Resident approves/denies in their app
5. Visit status updated in real-time

**Available RPCs for Resident App**:
| Function | Purpose |
|----------|---------|
| `register_resident_app_login(p_resident_id, p_device_token, p_platform)` | First login - marks `has_app_installed = true` |
| `update_resident_app_activity(p_resident_id)` | Heartbeat - updates `app_last_seen_at` |
| `check_unit_has_app(p_unit_id)` | Check if any resident in unit has app |

**Push Notification Payload** (sent to Resident App):
```typescript
interface VisitApprovalNotification {
  type: 'VISIT_APPROVAL_REQUEST';
  visit_id: number;
  visitor_name: string;
  visitor_photo_url?: string;
  visit_type: string;
  guard_name: string;
}
```

**App Adoption Statistics**:
```sql
SELECT * FROM v_app_adoption_stats;
-- Returns: condominium_name, total_residents, residents_with_app, adoption_percent
```

**Auto-selection Logic** (approvalModes.ts):
- If `has_app_installed = true` → "Aplicativo" mode available
- If no app → Falls back to "Telefone" or "Interfone"

---

## Routing Structure

```
HashRouter (# based URLs for compatibility)
├── /setup          - Device configuration (unrestricted)
├── /login          - Staff authentication (ConfigGuard)
└── Protected Routes (ConfigGuard + ProtectedRoute)
    ├── /           - Dashboard (guard home)
    ├── /new-entry  - New visitor entry
    ├── /day-list   - Daily activity list
    ├── /incidents  - Incident reporting
    ├── /resident-search - Search residents
    ├── /news       - Condominium news (last 7 days)
    ├── /settings   - Device settings
    └── /admin/*    - Admin routes (AdminRoute)
        ├── /admin              - Admin dashboard
        ├── /admin/condominiums - Manage condominiums
        ├── /admin/devices      - Manage devices
        ├── /admin/device-registration-errors - View device registration errors
        ├── /admin/staff        - Manage staff
        ├── /admin/units        - Manage units
        ├── /admin/residents    - Manage residents
        ├── /admin/restaurants  - Manage restaurants
        ├── /admin/sports       - Manage sports
        ├── /admin/news         - Manage news articles and categories
        ├── /admin/visits       - View all visits
        ├── /admin/incidents    - Manage incidents
        ├── /admin/config/visit-types    - Configure visit types
        ├── /admin/config/service-types  - Configure service types
        ├── /admin/analytics    - View statistics
        └── /admin/audit-logs   - View audit trail
```

---

## Development Guidelines

### Coding Standards

**Do NOT use `console.log()` in code**
- Avoid adding console.log statements to any files
- Existing console logs in dataService.ts are for debugging only
- Use proper error handling instead of console logging
- Always run `pnpm lint` and `pnpm test` before committing.

### When Adding Features

1. **Always use DataService for data access** - Never import Supabase directly in components
2. **Add offline support** - All user actions must work offline with `sync_status: PENDING_SYNC`
3. **Update IndexedDB schema** - Increment Dexie version in db.ts when adding tables/indexes
4. **Type safety** - Update types.ts before implementing new features
5. **Device context** - Include `device_id` when creating records that need device tracking
6. **Audio alerts** - Use AudioService for incident-related notifications
7. **Database object** - Read supabase mcp to update the objects in this document

### When Debugging Sync Issues

1. Check `DataService.backendHealthScore` (logged to console)
2. Query IndexedDB for `sync_status: PENDING_SYNC` records
3. Verify `update_device_heartbeat()` is running (every 5 min)
4. Check browser Network tab for failed Supabase RPC calls
5. Whenever possbible get information in supabase mcp regarding tables,rpc,rls,view,buckets

### Common Patterns

**Create Entity with Sync**:
```typescript
// In dataService.ts
async createEntity(data: Partial<Entity>): Promise<Entity> {
  const entity = { ...data, sync_status: SyncStatus.PENDING_SYNC };
  await db.entities.put(entity); // Save locally first

  if (this.isBackendHealthy) {
    try {
      await SupabaseService.createEntity(entity);
      entity.sync_status = SyncStatus.SYNCED;
      await db.entities.put(entity);
    } catch (e) {
      this.backendHealthScore--;
    }
  }
  return entity;
}
```

**Query with Offline Cache**:
```typescript
// In dataService.ts
async getEntities(): Promise<Entity[]> {
  const local = await db.entities.toArray();
  if (local.length > 0) {
    // Return cache immediately, refresh in background
    if (this.isBackendHealthy) {
      this.refreshEntities(); // Fire-and-forget
    }
    return local;
  }

  // No cache, must fetch online
  if (this.isBackendHealthy) {
    const remote = await SupabaseService.getEntities();
    await db.entities.bulkPut(remote);
    return remote;
  }

  return []; // Offline with no cache
}
```

---

## Troubleshooting

**"Dispositivo nao configurado"**:
- Device setup not completed or IndexedDB cleared
- Solution: Navigate to `/setup` and reconfigure

**Login fails offline**:
- Staff not cached locally (first login must be online)
- Solution: Connect to internet and login once

**Visits not syncing**:
- Backend health score = 0 (check console logs)
- Solution: Verify network, check Supabase status, restart app

**Camera not working**:
- HTTPS required for camera access
- Solution: Ensure dev server uses `https://` (vite.config.ts has basicSsl plugin)

**Audio alerts not playing**:
- Browser blocked audio without user interaction
- Solution: Click "Test Sound" button to grant permission

**Admin access**:
- Secret access: Tap logo 5 times on login screen
- Admin PIN: 123456 (for emergency device configuration)

---

## Database Migrations

SQL migration files in `database/` must be applied manually to Supabase:
1. Open Supabase SQL Editor
2. Copy contents of migration file
3. Execute SQL
4. Verify in Table Editor

---

## Detailed Data Models

### Enums

```typescript
enum UserRole { ADMIN, GUARD }
enum VisitType { VISITOR, DELIVERY, SERVICE, STUDENT }
enum VisitStatus { PENDING, APPROVED | DENIED | INSIDE | LEFT }
enum SyncStatus { SYNCED, PENDING_SYNC }
enum ApprovalMode { APP, PHONE, INTERCOM, GUARD_MANUAL, QR_SCAN }
```

### Core Entities

#### Condominium
```typescript
interface Condominium {
  id: number;
  name: string;
  address?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  gps_radius_meters?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  phone_number?: string;
}
```

#### Device
```typescript
interface Device {
  id?: string;               // UUID
  device_identifier: string;  // Unique fingerprint
  device_name?: string;
  condominium_id?: number;
  configured_at?: string;
  last_seen_at?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';
  metadata?: any;
}
```

#### Staff
```typescript
interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  pin_hash?: string;          // bcrypt hash of PIN
  condominium_id: number;
  condominium?: Condominium;
  role: UserRole;
  photo_url?: string;         // URL da foto do staff (bucket: staff-photos)
}
```

#### Visit
```typescript
interface Visit {
  id: number;
  condominium_id: number;
  visitor_name: string;
  visitor_doc?: string;
  visitor_phone?: string;
  visit_type?: string;         // Display name
  visit_type_id: number;       // References visit_types
  service_type?: string;       // Display name
  service_type_id?: number;
  restaurant_id?: number;
  restaurant_name?: string;
  sport_id?: number;
  sport_name?: string;
  unit_id?: number;
  unit_block?: string;
  unit_number?: string;
  reason?: string;
  photo_url?: string;
  qr_token?: string;
  qr_expires_at?: string;
  check_in_at: string;
  check_out_at?: string;
  status: VisitStatus;
  approval_mode?: ApprovalMode;
  guard_id: number;
  device_id?: string;          // Tracks which device registered
  vehicle_license_plate?: string; // Vehicle plate number
  approved_at?: string;        // When visit was approved
  denied_at?: string;          // When visit was denied
  sync_status: SyncStatus;
}
```

#### Unit
```typescript
interface Unit {
  id: number;
  condominium_id: number;
  code_block?: string;
  number: string;
  floor?: string;
  building_name?: string;
  residents?: Resident[];
}
```

#### Resident
```typescript
interface Resident {
  id: number;
  condominium_id: number;
  unit_id: number;
  name: string;
  phone?: string;
  email?: string;
  type?: 'OWNER' | 'TENANT';
  pin_hash?: string;           // bcrypt hash for app login
  has_app_installed?: boolean;
  device_token?: string;       // Push notification token (legacy)
  push_token?: string;         // Push notification token
  avatar_url?: string;         // Resident avatar URL
  app_first_login_at?: string;
  app_last_seen_at?: string;
}
```

#### Incident
```typescript
interface Incident {
  id: number;
  reported_at: string;
  resident_id: number;
  resident?: Resident;
  unit?: Unit;
  description: string;
  type: string;                // References incident_types.code
  type_label?: string;
  status: string;              // References incident_statuses.code
  status_label?: string;
  photo_path?: string;
  acknowledged_at?: string;
  acknowledged_by?: number;
  guard_notes?: string;
  resolved_at?: string;
  sync_status?: SyncStatus;
}
```

#### Street
```typescript
interface Street {
  id: number;
  condominium_id: number;
  name: string;
  code?: string;
}
```

#### AuditLog
```typescript
interface AuditLog {
  id: number;
  created_at: string;
  condominium_id: number;
  actor_id: number;
  action: string;
  target_table: string;
  target_id: number;
  details: any;  // JSON
  ip_address?: string;
  user_agent?: string;
}
```

#### DeviceRegistrationError
```typescript
interface DeviceRegistrationError {
  id: number;
  created_at: string;
  device_identifier?: string | null;
  error_message: string;
  payload?: any;  // JSON - original registration payload
}
```

#### CondominiumStats
```typescript
interface CondominiumStats {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  total_visits_today: number;       // Count of all visits today
  total_incidents_open: number;     // Count of open/acknowledged incidents
  status: 'ACTIVE' | 'INACTIVE';
}
```

#### VisitEvent
```typescript
interface VisitEvent {
  id?: number;                   // SERIAL in Supabase (auto-increment local)
  created_at?: string;           // timestamptz
  visit_id: number;              // INT4 (references visits)
  status: VisitStatus;           // Status recorded at this event
  event_at: string;              // timestamptz - when the status change occurred
  actor_id?: number;             // INT4 (references staff) - who made the change
  device_id?: string;            // UUID (references devices) - device used
  sync_status: SyncStatus;       // 'SINCRONIZADO' or 'PENDENTE_ENVIO'
}
```

**Purpose**: Tracks visit status changes over time for audit trail and history display.

#### ResidentDevice
```typescript
interface ResidentDevice {
  id: number;
  resident_id: number;
  push_token: string;
  device_name?: string;
  platform?: string;           // 'ios' | 'android' | 'web'
  last_active?: string;
  created_at?: string;
}
```

#### ResidentQrCode
```typescript
interface ResidentQrCode {
  id: string;                  // UUID
  resident_id: number;
  condominium_id: number;
  unit_id: number;
  purpose?: string;
  visitor_name?: string;
  visitor_phone?: string;
  notes?: string;
  qr_code: string;             // Unique QR code string
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_days?: string[];
  start_date?: string;
  end_date?: string;
  expires_at?: string;
  status?: string;             // 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  created_at?: string;
  updated_at?: string;
}
```

#### QrValidationResult
```typescript
interface QrValidationResult {
  is_valid: boolean;
  resident_id: number | null;
  unit_id: number | null;
  visitor_name: string | null;
  purpose: string | null;
  message: string;
}
```

**Purpose**: Result returned by `validate_qr_code` RPC for guard QR scanning at the gatehouse.

#### Notification
```typescript
interface Notification {
  id: number;
  resident_id: number;
  condominium_id: number;
  unit_id?: number;
  title: string;
  body: string;
  type?: string;               // 'VISIT_APPROVAL' | 'INCIDENT' | 'NEWS' etc.
  data?: any;                  // JSON payload
  read?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

#### CondominiumNews
```typescript
interface CondominiumNews {
  id: number;
  condominium_id: number;
  title: string;
  description?: string;
  content?: string;
  image_url?: string;
  category_id?: number;
  created_at?: string;
  updated_at?: string;
}
```

#### NewsCategory
```typescript
interface NewsCategory {
  id: number;
  name: string;
  label?: string;
  created_at?: string;
}
```

---

## Page Descriptions

### Guard Pages

#### Setup (/setup)
**Purpose**: Configure tablet by associating it with a condominium.

**Flow**:
1. Lists all active condominiums
2. User selects condominium
3. Registers device in backend
4. Saves configuration to IndexedDB
5. Redirects to /login

**Features**:
- Replace device option (admin PIN required)
- Offline emergency configuration

#### Login (/login)
**Purpose**: PIN-based authentication for guards/staff.

**Features**:
- Numeric keypad UI
- First Name, Last Name, PIN (4-6 digits)
- Online/Offline auth support
- Role-based redirects (ADMIN → /admin, GUARD → /)
- Secret admin access (5 taps on logo)
- Audio service initialization on login

#### Dashboard (/)
**Purpose**: Main menu with quick access to all features.

**Features**:
- Condominium name and logo
- Online/offline status indicator
- Real-time visit list (actionable items)
- Incident detection with audio alerts
- AI Assistant modal ("Ask Concierge")
- Manual audio test button
- Sync functionality
- Navigation menu

#### NewEntry (/new-entry)
**Purpose**: Register new visit/delivery.

**Features**:
- Multi-step form (3 steps)
- Visit type selection (Visitor, Delivery, Service, Student)
- Service type selection (if Service)
- Restaurant/Sport facility selection
- Visitor data input (name, document, phone)
- Unit/Block selection
- Camera photo capture
- Approval mode selector
- QR code support
- Reason/notes field

#### DailyList (/day-list)
**Purpose**: View all visits for current day.

**Features**:
- Responsive design (mobile cards + desktop table)
- Status filtering
- Check-in/Check-out actions
- Call resident functionality
- Status badges with color coding

#### Incidents (/incidents)
**Purpose**: Report and manage security incidents.

**Features**:
- Incident list display
- New incident detection with audio alerts
- Device vibration on new incidents
- Guard notes and acknowledgment
- Status updates (in-progress/resolved)

#### News (/news)
**Purpose**: View condominium news from the last 7 days.

**Features**:
- News cards with title, description, category, and date
- Modal for full article view
- Auto-refresh every 60 seconds
- Offline support with cached news
- Empty state when no news available
- Relative time display (e.g., "há 2 horas")

#### Settings (/settings)
**Purpose**: Device settings and information.

**Features**:
- Device identifier display
- Condominium name
- Storage quota monitoring
- Online/offline status
- Uninstall confirmation

### Admin Pages (/admin/*)

16 pages for full administrative management:

| Page | Purpose |
|------|---------|
| AdminDashboard | Admin overview and quick stats |
| AdminCondominiums | CRUD for condominiums |
| AdminDevices | Device registry and status management |
| AdminDeviceRegistrationErrors | View and troubleshoot device registration errors |
| AdminStaff | Staff management with PIN reset |
| AdminUnits | Unit/Block management |
| AdminResidents | Resident directory with QR codes viewer, app status filter, bulk selection for future SMS/email invitations |
| AdminRestaurants | Restaurant configuration |
| AdminSports | Sports facility configuration |
| AdminNews | News article management with categories, image upload, pagination, and filters |
| AdminVisits | Visit history and management |
| AdminIncidents | Incident oversight |
| AdminVisitTypes | Visit type configuration |
| AdminServiceTypes | Service type configuration |
| AdminAnalytics | Statistics and reporting |
| AdminAuditLogs | Audit trail viewing |

---

## Services Deep Dive

### DataService Methods (dataService.ts)

**Device Setup**:
```typescript
isDeviceConfigured(): Promise<boolean>
getDeviceCondoDetails(): Promise<Condominium | null>
configureDevice(condoId: number): Promise<boolean>
configureDeviceOffline(condoId: number, condoDetails: Condominium): Promise<boolean>
resetDevice(): Promise<void>
```

**Authentication**:
```typescript
login(firstName: string, lastName: string, pin: string): Promise<Staff | null>
```

**QR Code Validation** (Online Only):
```typescript
validateQrCode(qrCode: string): Promise<QrValidationResult | null>
```
*Requires online connection for security. Validates resident-generated QR codes at the gatehouse.*

**Configuration Data**:
```typescript
getVisitTypes(): Promise<VisitTypeConfig[]>
getServiceTypes(): Promise<ServiceTypeConfig[]>
getRestaurants(): Promise<Restaurant[]>
getSports(): Promise<Sport[]>
getNews(): Promise<CondominiumNews[]>
```

**Visits**:
```typescript
getTodaysVisits(): Promise<Visit[]>
createVisit(visitData: Partial<Visit>): Promise<Visit>
updateVisitStatus(visitId: number, status: VisitStatus): Promise<void>
checkOutVisit(visitId: number): Promise<void>
```

**Incidents**:
```typescript
getIncidents(): Promise<Incident[]>
createIncident(incidentData: Partial<Incident>): Promise<Incident>
updateIncidentStatus(incidentId: number, status: string): Promise<void>
```

**Units & Residents**:
```typescript
getUnits(): Promise<Unit[]>
getResidents(unitId: number): Promise<Resident[]>
```

**Synchronization**:
```typescript
syncPendingItems(): Promise<number>
checkOnline(): boolean
```

### Supabase RPC Functions (Supabase.ts)

**Authentication**:
```sql
verify_staff_login(p_first_name TEXT, p_last_name TEXT, p_pin_cleartext TEXT)
-- Returns: { staff_id, first_name, last_name, role, condominium_id, condominium }
```

**Device Management**:
```sql
register_device(p_device_identifier TEXT, p_device_name TEXT, p_condominium_id INT4, p_metadata JSONB)
-- Returns: Device record

update_device_heartbeat(p_device_identifier TEXT)
-- Updates last_seen_at timestamp
```

**Data Sync**:
```sql
get_staff_for_sync(p_condominium_id INT4)
-- Returns: Array of staff with pin_hash for offline auth

get_visit_types(p_condominium_id INT4)
-- Returns: Visit type configurations

get_service_types()
-- Returns: Service type configurations
```

---

## Security Considerations

### Authentication
- PINs stored as **bcrypt hashes** (12 rounds)
- Never store plaintext PINs
- Staff can only login to devices in their condominium
- First login must be online to cache credentials

### Device Fingerprinting
- Unique identifier generated on first access
- Stored in `localStorage` as `device_identifier`
- Synced with backend for audit trail
- Enables device tracking per visit

### Offline Security
- PIN validation offline uses cached bcrypt hash
- Sensitive data in IndexedDB (future: encryption)
- Audit logs for all critical actions
- Device heartbeat for monitoring

---

## Performance & Optimizations

### IndexedDB
- Optimized indexes for frequent queries
- Bulk operations for sync (`bulkPut`)
- Clear strategy to prevent stale data
- Compound index on staff for login

### Network
- Debounced sync operations
- Exponential backoff on retry
- Health check every 1 minute
- Device heartbeat every 5 minutes

### PWA
- Service Worker caching strategy
- Offline-first architecture
- Persistent storage requests
- Installation/uninstallation tracking

---

## Future Roadmap

### Features
- [ ] Push notifications for residents (visit approval)
- [ ] QR Code for recurring visitors
- [ ] Facial biometrics for identification
- [ ] IP camera integration
- [x] Visit history export (CSV/PDF) - *Implemented in utils/csvExport.ts*
- [ ] Vehicle & parking management
- [ ] Internal guard chat

### Technical
- [ ] Complete PWA with Background Sync API
- [ ] E2E encryption for sensitive data
- [ ] Multi-language support (i18n)
- [ ] Automated testing (Jest + Testing Library)
- [ ] CI/CD pipeline
- [ ] Error monitoring (Sentry)
- [x] ESLint configuration - *Implemented in eslint.config.js*

---

## Claude Code Integration

### MCP Server (Notion)

This project integrates with Claude Code via the Model Context Protocol (MCP) for enhanced workflow automation.

**Configuration**: See `docs/MCP.md` for setup instructions.

**Available Skills**:
- `/notion-task` - Automated workflow for starting work on Notion tasks

**Setup Requirements**:
1. Notion integration token configured
2. MCP server enabled in Claude Code settings
3. Database connection established

**Usage**:
```bash
# In Claude Code
/notion-task [task-name]
```

This enables Claude to:
- Query Notion databases for tasks
- Update task status automatically
- Link commits to Notion pages
- Track work progress

---

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plans**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Project Information

**Developer**: Chong Technologies
**Project**: Elite AccessControl
**Version**: 0.0.0 (Alpha)
**License**: Proprietary - All rights reserved
**Last Updated**: 2026-02
