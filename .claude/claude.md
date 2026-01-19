# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Elite AccessControl** is an offline-first Progressive Web App (PWA) for condominium and building security gate management. Guards can register visits, deliveries, and incidents even without internet connectivity, with automatic synchronization when connection is restored.

**Stack**: React 19 + TypeScript, Vite 6, Dexie.js (IndexedDB), Supabase (PostgreSQL backend), Tailwind CSS, Google Gemini AI

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
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
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
     - `VITE_GEMINI_API_KEY`
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

**ALL data operations go through `DataService`** (services/dataService.ts - 1,949 lines), which implements a Cache-Then-Network strategy:

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

### 3. Device Configuration Flow

Each tablet must be configured before use:

```
1. Setup.tsx → configureDevice(condoId)
   - Generates unique device fingerprint (deviceUtils.ts)
   - Registers device in Supabase
   - Saves config to IndexedDB

2. ConfigGuard checks if device configured
   - Redirects to /setup if not configured
   - Loads condominium details for display

3. Login requires staff.condominium_id === device.condominium_id
   - Guards can only login to their assigned condominium's devices
```

**Offline Emergency Configuration**:
- Admin can configure device manually without internet using `configureDeviceOffline()`
- Requires admin PIN verification (123456)

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
- `GUARD` - Standard guard access
- `ADMIN` - Administrative access to management pages
- `SUPER_ADMIN` - Full system access

### 5. Database Schema (IndexedDB via Dexie)

**Tables** (services/db.ts - Version 8):
```typescript
visits          // User visits with sync_status and device_id
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
```

**Critical Indexes**:
- `visits`: `id, condominium_id, status, sync_status, check_in_at, device_id`
- `staff`: `id, condominium_id, [first_name+last_name]` (compound index for login)
- `units`: `id, condominium_id, code_block, number`

### 6. Type System (types.ts)

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

### 7. Backend Integration (Supabase)

**RPC Functions** (services/Supabase.ts - 2,146 lines):
```typescript
// Authentication
verify_staff_login(first_name, last_name, pin_cleartext)

// Device Management
register_device(device_identifier, device_name, condominium_id, metadata)
update_device_heartbeat(device_identifier)

// Data Sync
get_staff_for_sync(condominium_id)
get_visit_types(condominium_id)
get_service_types()
```

**Database Migrations**: Located in `database/*.sql` (apply manually to Supabase)

### 8. PWA Configuration (vite.config.ts)

**Service Worker** (VitePWA):
- Prompt-based registration (user controls updates)
- `skipWaiting: false` - prevents sudden reload
- Runtime caching for Supabase API (NetworkFirst, 5min TTL)
- Image caching (CacheFirst, 7 days)

**HTTPS Required**: `@vitejs/plugin-basic-ssl` enables camera access on tablets

### 9. Path Aliases

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
├── App.tsx                  # Router + AuthContext provider (462 lines)
├── types.ts                 # All TypeScript interfaces/enums (239 lines)
├── components/
│   ├── CameraCapture.tsx        # Photo capture with preview/retake
│   ├── ApprovalModeSelector.tsx # Visit approval mode UI
│   ├── Toast.tsx                # Toast notifications (success/error/confirm)
│   ├── ErrorBoundary.tsx        # Error handling wrapper
│   ├── PWAInstallPrompt.tsx     # PWA installation UI
│   ├── PWAUpdateNotification.tsx# PWA update alerts
│   ├── AdminRoute.tsx           # Route protection for admin
│   ├── AdminLayout.tsx          # Admin page wrapper
│   └── UninstallConfirmDialog.tsx # PWA uninstall confirmation
├── pages/
│   ├── Setup.tsx                # Device configuration (first-run)
│   ├── Login.tsx                # PIN authentication
│   ├── Dashboard.tsx            # Main menu with AI assistant
│   ├── NewEntry.tsx             # Register visit/delivery (multi-step)
│   ├── DailyList.tsx            # Today's visits list
│   ├── Incidents.tsx            # Incident management with alerts
│   ├── Settings.tsx             # Device settings and storage info
│   └── admin/                   # Admin pages (14 pages)
│       ├── AdminDashboard.tsx
│       ├── AdminCondominiums.tsx
│       ├── AdminDevices.tsx
│       ├── AdminStaff.tsx
│       ├── AdminUnits.tsx
│       ├── AdminResidents.tsx
│       ├── AdminRestaurants.tsx
│       ├── AdminSports.tsx
│       ├── AdminVisits.tsx
│       ├── AdminIncidents.tsx
│       ├── AdminVisitTypes.tsx
│       ├── AdminServiceTypes.tsx
│       ├── AdminAnalytics.tsx
│       └── AdminAuditLogs.tsx
└── services/
    ├── dataService.ts           # CRITICAL: All data operations (1,949 lines)
    ├── Supabase.ts              # Backend RPC client (2,146 lines)
    ├── db.ts                    # Dexie database schema (89 lines)
    ├── deviceUtils.ts           # Device fingerprinting
    ├── geminiService.ts         # AI concierge integration
    ├── audioService.ts          # Alert sounds and vibration
    ├── pwaLifecycleService.ts   # PWA install/uninstall tracking
    ├── supabaseClient.ts        # Supabase client initialization
    └── mockSupabase.ts          # Mock data for testing
```

---

## Key Features

### Audio Alert System (audioService.ts)

The app includes an audio alert system for incident notifications:

```typescript
// Initialize audio (requests permission)
AudioService.initialize()

// Play alert sound (plays 4 times with delays)
AudioService.playAlertSound()

// Test sound manually
AudioService.testSound()
```

**Features**:
- AudioContext singleton with HTML5 Audio fallback
- Data URI beep tone (no external files needed)
- Device vibration integration (200ms pattern)
- Permission storage in localStorage
- Auto-initialization on login if previously granted

### AI Concierge (geminiService.ts)

Guards can ask questions to an AI assistant:

```typescript
const response = await askConcierge(question, condoContext);
```

**Configuration**:
- Model: `gemini-2.5-flash`
- Max output tokens: 150 (brief responses)
- Language: Portuguese (Portugal)
- System instruction for guard assistance context

### PWA Lifecycle Tracking (pwaLifecycleService.ts)

Tracks PWA installation and usage:
- Installation detection (standalone mode + iOS)
- Installation event listeners
- Uninstallation detection heuristics
- Service Worker monitoring
- Visibility tracking
- Inactivity decommissioning checks

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
    ├── /settings   - Device settings
    └── /admin/*    - Admin routes (AdminRoute)
        ├── /admin              - Admin dashboard
        ├── /admin/condominiums - Manage condominiums
        ├── /admin/devices      - Manage devices
        ├── /admin/staff        - Manage staff
        ├── /admin/units        - Manage units
        ├── /admin/residents    - Manage residents
        ├── /admin/restaurants  - Manage restaurants
        ├── /admin/sports       - Manage sports
        ├── /admin/visits       - View all visits
        ├── /admin/incidents    - Manage incidents
        ├── /admin/visit-types  - Configure visit types
        ├── /admin/service-types- Configure service types
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

### When Adding Features

1. **Always use DataService for data access** - Never import Supabase directly in components
2. **Add offline support** - All user actions must work offline with `sync_status: PENDING_SYNC`
3. **Update IndexedDB schema** - Increment Dexie version in db.ts when adding tables/indexes
4. **Type safety** - Update types.ts before implementing new features
5. **Device context** - Include `device_id` when creating records that need device tracking
6. **Audio alerts** - Use AudioService for incident-related notifications

### When Debugging Sync Issues

1. Check `DataService.backendHealthScore` (logged to console)
2. Query IndexedDB for `sync_status: PENDING_SYNC` records
3. Verify `update_device_heartbeat()` is running (every 5 min)
4. Check browser Network tab for failed Supabase RPC calls

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

**Migration Files**:
- `add_audit_logging.sql` - Audit trail for all actions
- `add_otp_system.sql` - OTP verification for residents
- `add_pin_reset_rpcs.sql` - PIN reset functionality
- `add_resident_app_tracking.sql` - Resident app installation tracking

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
  device_token?: string;       // Push notification token
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

#### Settings (/settings)
**Purpose**: Device settings and information.

**Features**:
- Device identifier display
- Condominium name
- Storage quota monitoring
- Online/offline status
- Uninstall confirmation

### Admin Pages (/admin/*)

14 pages for full administrative management:

| Page | Purpose |
|------|---------|
| AdminDashboard | Admin overview and quick stats |
| AdminCondominiums | CRUD for condominiums |
| AdminDevices | Device registry and status management |
| AdminStaff | Staff management with PIN reset |
| AdminUnits | Unit/Block management |
| AdminResidents | Resident directory |
| AdminRestaurants | Restaurant configuration |
| AdminSports | Sports facility configuration |
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

**Configuration Data**:
```typescript
getVisitTypes(): Promise<VisitTypeConfig[]>
getServiceTypes(): Promise<ServiceTypeConfig[]>
getRestaurants(): Promise<Restaurant[]>
getSports(): Promise<Sport[]>
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
- [ ] Visit history export (CSV/PDF)
- [ ] Vehicle & parking management
- [ ] Internal guard chat

### Technical
- [ ] Complete PWA with Background Sync API
- [ ] E2E encryption for sensitive data
- [ ] Multi-language support (i18n)
- [ ] Automated testing (Jest + Testing Library)
- [ ] CI/CD pipeline
- [ ] Error monitoring (Sentry)

---

## Project Information

**Developer**: Chong Technologies
**Project**: Elite AccessControl
**Version**: 0.0.0 (Alpha)
**License**: Proprietary - All rights reserved
**Last Updated**: 2026-01
