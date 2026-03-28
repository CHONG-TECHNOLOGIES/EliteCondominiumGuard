# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**EntryFlow** is an Progressive Web App (PWA) for condominium and building security gate management. Guards can register visits, deliveries, and incidents even without internet connectivity, with automatic synchronization when connection is restored.

**Stack**: React 19 + TypeScript, Vite 6, Dexie.js (IndexedDB), Supabase (PostgreSQL backend), Tailwind CSS, Leaflet (maps)

## Development Commands

```bash
# Development server with HTTPS (required for camera access)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint TypeScript/TSX files (max-warnings=0)
npm run lint

# Lint and auto-fix
npm run lint:fix
```

**Important**: The dev server runs on `https://0.0.0.0:3000` with self-signed SSL certificate to enable camera access on tablets.

**ESLint Hook**: ESLint runs automatically after every `Edit`/`Write` on `.ts`/`.tsx` files (PostToolUse hook). Output is prefixed `[ESLint]`. Editing `.env*` files is blocked by a PreToolUse safety hook.

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

## Deployment

Vercel recommended. HTTPS is mandatory (camera API + PWA + Service Workers). See **[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)** for full Vercel/Netlify/GitHub Actions setup, CI/CD comparison, and pre-deployment checklist.

---

## Critical Architecture Patterns

> Full details with code examples, scenario matrices, and sync event system: **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)**

### 1. Offline-First Data Flow

**ALL data operations go through `DataService`** (services/dataService.ts), which implements Cache-Then-Network strategy:

```
Component → DataService → IndexedDB (primary) + Supabase (sync)
                       ↓
                Backend Health Check (score 0-3)
```

**Never bypass DataService** to access Supabase directly from components. DataService manages offline/online detection, automatic retry with exponential backoff, local-first writes with background sync, device fingerprinting, and multi-layer storage sync.

### 2. Data Synchronization

- **Config data**: Cache-Then-Network (return local immediately, refresh in background)
- **User data**: Write-Through with Retry (IndexedDB first, then backend sync with `sync_status: PENDING_SYNC`)
- **Background sync**: `syncPendingItems()` retries on health check recovery and user-triggered sync
- Sync events: `sync:start`, `sync:progress`, `sync:complete`, `sync:error`

### 3. Device Configuration

Each tablet must be configured before use (Setup.tsx → configureDevice). Storage priority: Central DB > IndexedDB > localStorage. Offline emergency configuration available with admin PIN (123456).

### 4. Authentication & Security

- PINs stored as bcrypt hashes (never plaintext)
- Online: `verify_staff_login()` RPC | Offline: local bcrypt comparison
- First login must be online to cache credentials
- Roles: `GUARD`, `ADMIN`, `SUPER_ADMIN`

### 5. Database Schema (IndexedDB via Dexie)

**Tables** (services/db.ts - Version 12): visits, visitEvents, units, visitTypes, serviceTypes, settings, staff, condominiums, restaurants, sports, incidents, incidentTypes, incidentStatuses, devices, residents, news

**Critical Indexes**:
- `visits`: `id, condominium_id, status, sync_status, check_in_at, device_id`
- `visitEvents`: `++id, visit_id, status, sync_status, event_at`
- `staff`: `id, condominium_id, [first_name+last_name]`
- `units`: `id, condominium_id, code_block, number`

### 6. PostgreSQL Tables (Supabase)

**Core**: condominiums, units, residents, staff, devices, visits, visit_events, incidents, audit_logs
**Config**: visit_types, service_types, incident_types, incident_statuses, restaurants, sports, streets, news_categories
**Resident App**: resident_devices, resident_qr_codes, notifications, condominium_news
**Other**: device_registration_errors, v_app_adoption_stats (view)

> Full column details: **[docs/DATA_MODELS.md](../docs/DATA_MODELS.md)**

### 7. Type System (types.ts)

**All types use numeric IDs** (Supabase SERIAL/INT4), not UUIDs. Exception: `Device.id: string` (UUID).

**Key Enums**: `UserRole` (ADMIN|GUARD|SUPER_ADMIN), `VisitStatus` (PENDING|APPROVED|DENIED|INSIDE|LEFT), `SyncStatus` (SYNCED|PENDING_SYNC), `ApprovalMode` (APP|PHONE|INTERCOM|GUARD_MANUAL|QR_SCAN), `Theme` (ELITE|MIDNIGHT)

> Full interfaces: **[docs/DATA_MODELS.md](../docs/DATA_MODELS.md)**

### 8. Backend Integration (Supabase)

**111 RPC functions** in services/Supabase.ts, grouped by: Authentication (3), Device Management (7), Visits (8), Condominiums (7), Staff (6), Units (4), Residents (5), Incidents (7), Configuration (11), Restaurants & Sports (10), News (9), QR Codes (5), Notifications (6), OTP/PIN Reset (3), Streets (3), Audit (3), Dashboard (3), Subscriptions (9)

**Storage Buckets**: visitor-photos, staff-photos, logo_condominio, news-images

> Full RPC reference with parameters: **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)**

### 9. Path Aliases

Use `@/` for imports: `import { DataService } from '@/services/dataService';`

Configured in `vite.config.ts` and `tsconfig.json`.

---

## Component Structure

```
src/
├── App.tsx                  # Router + AuthContext + ThemeProvider (610 lines)
├── types.ts                 # All TypeScript interfaces/enums (385 lines)
├── eslint.config.js         # ESLint flat config
├── components/
│   ├── CameraCapture.tsx        # Photo capture with preview/retake
│   ├── ApprovalModeSelector.tsx # Visit approval mode UI
│   ├── Toast.tsx                # Toast notifications (success/error/confirm)
│   ├── ErrorBoundary.tsx        # Error handling wrapper
│   ├── ImportResidentsModal.tsx # Bulk CSV import for residents
│   ├── PWAInstallPrompt.tsx     # PWA installation UI
│   ├── PWAUpdateNotification.tsx# PWA update alerts
│   ├── SyncOverlay.tsx          # Full-screen sync progress overlay
│   ├── AdminRoute.tsx           # Route protection for admin
│   ├── AdminLayout.tsx          # Admin page wrapper
│   └── UninstallConfirmDialog.tsx # PWA uninstall confirmation
├── config/
│   ├── deployment.ts            # Environment-aware deployment config
│   └── sentry.ts                # Sentry error tracking configuration
├── context/
│   └── ThemeContext.tsx          # Theme provider (ELITE/MIDNIGHT themes)
├── utils/
│   ├── approvalModes.ts         # Approval mode UI configurations
│   ├── auditDiff.ts             # Audit diff utilities for change tracking
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
│   └── admin/                   # Admin pages (17 pages)
│       ├── AdminDashboard.tsx
│       ├── AdminCondominiums.tsx
│       ├── AdminDevices.tsx
│       ├── AdminDeviceRegistrationErrors.tsx
│       ├── AdminStaff.tsx
│       ├── AdminUnits.tsx
│       ├── AdminResidents.tsx
│       ├── AdminRestaurants.tsx
│       ├── AdminSports.tsx
│       ├── AdminNews.tsx
│       ├── AdminSubscriptions.tsx
│       ├── AdminVisits.tsx
│       ├── AdminIncidents.tsx
│       ├── AdminVisitTypes.tsx
│       ├── AdminServiceTypes.tsx
│       ├── AdminAnalytics.tsx
│       └── AdminAuditLogs.tsx
├── services/
│   ├── dataService.ts           # CRITICAL: All data operations (4,016 lines)
│   ├── Supabase.ts              # Backend RPC client (2,907 lines)
│   ├── db.ts                    # Dexie database schema (115 lines)
│   ├── logger.ts                # Sentry-integrated logging service (145 lines)
│   ├── deviceUtils.ts           # Device fingerprinting
│   ├── geminiService.ts         # AI concierge integration
│   ├── audioService.ts          # Alert sounds and vibration
│   ├── pwaLifecycleService.ts   # PWA install/uninstall tracking
│   ├── supabaseClient.ts        # Supabase client initialization
│   └── mockSupabase.ts          # Mock data for testing
├── database/                    # SQL migration files
└── docs/                        # Project documentation
```

> Page-by-page descriptions: **[docs/PAGES.md](../docs/PAGES.md)**
> Feature deep dives (audio, realtime, PWA, themes, CSV, Sentry): **[docs/FEATURES.md](../docs/FEATURES.md)**
> Observability & monitoring: **[docs/OBSERVABILITY.md](../docs/OBSERVABILITY.md)**

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
        ├── /admin/subscriptions - Subscription & payment management
        ├── /admin/analytics    - View statistics
        └── /admin/audit-logs   - View audit trail
```

---

## Development Guidelines

### Coding Standards

**Do NOT use `console.log()` in code**
- Avoid adding console.log statements to any files
- Use proper error handling instead of console logging
- Always run `npm run lint` before committing (or let the PostToolUse hook catch issues automatically).

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
    if (this.isBackendHealthy) {
      this.refreshEntities(); // Fire-and-forget
    }
    return local;
  }
  if (this.isBackendHealthy) {
    const remote = await SupabaseService.getEntities();
    await db.entities.bulkPut(remote);
    return remote;
  }
  return []; // Offline with no cache
}
```

---

## Database Migrations

SQL migration files in `database/` must be applied manually to Supabase:
1. Open Supabase SQL Editor
2. Copy contents of migration file
3. Execute SQL
4. Verify in Table Editor

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

## Claude Code Integration

### MCP Server (Notion)

This project integrates with Claude Code via the Model Context Protocol (MCP) for enhanced workflow automation.

**Configuration**: See `docs/MCP.md` for setup instructions.

**Available Skills** (user-invocable slash commands):
- `/notion-task [task]` - Start work on a Notion task (query, update status, link commits)
- `/db-migrate [path]` - Apply a SQL migration file to Supabase with confirmation and verification
- `/deploy-test` - Deploy to Vercel preview environment for testing
- `/create-new-branch [name]` - Create a new git branch
- `/create-commit-push-pr [message]` - Commit, push, and open a PR
- `/simplify` - Review changed code for reuse, quality, and efficiency

**Auto-Triggered Skills** (not user-invocable):
- `sync-debug` - Automatically triggered when sync/offline issues are reported. Runs SQL diagnostics, checks health score, verifies heartbeat, suggests fixes.

**Available Agents** (use with Agent tool or automatically):
- `pwa-qa-reviewer` - PWA quality assurance for offline-first patterns, Service Worker config, Dexie schema safety, caching strategies, and tablet UX. Use **proactively** before deployments or after changes to `vite.config.ts`, `dataService.ts`, `db.ts`, or any sync-related code.
- `code-architect` - Feature architecture design with implementation blueprints
- `fullstack-developer` - Full-stack feature implementation
- `frontend-developer` - React UI components and responsive design
- `security-auditor` - Security reviews, auth flows, OWASP compliance
- `supabase-realtime-optimizer` - Supabase realtime performance and subscription optimization

**Setup Requirements**:
1. Notion integration token configured (for `/notion-task`)
2. MCP server enabled in Claude Code settings
3. Supabase MCP (`mcp__claude_ai_Supabase__*`) configured for `/db-migrate`

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

## Reference Documentation

| Document | Contents |
|----------|----------|
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | Full architecture deep dive, sync strategies, device config scenarios, RPC reference (111 functions), services API |
| [docs/DATA_MODELS.md](../docs/DATA_MODELS.md) | All TypeScript interfaces, enums, PostgreSQL schema tables |
| [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Vercel/Netlify setup, CI/CD comparison, GitHub Actions, pre-deployment checklist |
| [docs/FEATURES.md](../docs/FEATURES.md) | Audio alerts, realtime incidents, PWA lifecycle, themes, CSV export, Sentry, resident app integration |
| [docs/PAGES.md](../docs/PAGES.md) | Guard and admin page descriptions with features |
| [docs/OBSERVABILITY.md](../docs/OBSERVABILITY.md) | Sentry integration, custom logger, health checks, audit logging, sync tracking, performance monitoring |
| [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) | Common issues & solutions, PWA debugging, future roadmap |

---

## Project Information

**Developer**: Chong Technologies
**Project**: EntryFlow
**Version**: 0.0.0 (Alpha)
**License**: Proprietary - All rights reserved
**Last Updated**: 2026-03-28
