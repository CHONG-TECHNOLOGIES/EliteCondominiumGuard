# Elite CondoGuard - Project Report

## 1. Project Overview
**Elite CondoGuard** is a Progressive Web Application (PWA) designed for condominium security management. It is specifically optimized for use on kiosks or tablets at guard posts in kiosk mode, facilitating visitor management, incident reporting, staff coordination, and AI-assisted concierge services.

The application follows an **offline-first architecture**, allowing guards to continue operations even without internet connectivity, with automatic synchronization when the connection is restored.

## 2. Technology Stack

### Frontend
- **Framework:** React 19.2.0
- **Build Tool:** Vite 6.2.0
- **Language:** TypeScript 5.8.2
- **Routing:** React Router DOM v7.9.6 (using HashRouter for compatibility)
- **Styling:** TailwindCSS (via CDN with custom theme configuration)
- **Icons:** Lucide React 0.554.0
- **Module Resolution:** Import maps for CDN-based package delivery

### Backend & Data
- **Cloud Backend:** Supabase 2.86.0
- **Local Database:** Dexie.js 4.0.1 (IndexedDB wrapper)
- **Database Name:** `CondoGuardDB`
- **Authentication:** Custom PIN-based authentication with bcrypt (bcryptjs 2.4.3)
- **Security:** Role-based access control (ADMIN/GUARD)

### AI Integration
- **Library:** Google GenAI SDK 1.30.0
- **Model:** Gemini 2.5 Flash
- **Purpose:** AI-powered concierge assistant for guards to clarify rules and draft messages to residents

### Development Tools
- **Plugin:** @vitejs/plugin-react 5.0.0
- **Type Definitions:** @types/node 22.14.0
- **Dev Server:** Vite dev server on port 3000, accessible at 0.0.0.0

## 3. Application Architecture

### 3.1 Offline-First Design
The application implements a sophisticated offline-first architecture with:
- **Health Score System:** Tracks backend connectivity with a score (0-3) to determine reliability
- **Automatic Fallback:** Gracefully degrades to local IndexedDB when cloud backend is unavailable
- **Sync Queue:** Pending items are marked with `PENDING_SYNC` status and synchronized automatically
- **Cache-then-Network Strategy:** Displays cached data immediately, refreshes in background

### 3.2 PWA Features
- **Kiosk Mode Optimization:**
  - Pull-to-refresh disabled (`overscroll-behavior-y: none`)
  - Text selection disabled globally (enabled only for inputs)
  - Touch manipulation optimized
  - User-scalable viewport disabled
  - Fullscreen/kiosk-friendly layout
- **Hardware Permissions:** Camera and microphone access for visitor photo capture
- **Responsive Design:** Optimized for tablet interfaces with adaptive layouts

### 3.3 State Management
- **Auth Context:** Global authentication state using React Context API
  - User session management
  - Login/logout handlers
  - Protected routes
- **Device Configuration:** Persistent storage of condominium assignment in IndexedDB
- **Network Status:** Real-time online/offline detection with visual indicators

## 4. Key Features

### 4.1 Device Configuration & Setup
- **Initial Setup Flow:** `/setup` route for configuring device to a specific condominium
- **Condominium Selection:** Fetches list of active condominiums from cloud or shows demo mode
- **GPS Configuration:** Stores condominium coordinates and radius for future location-based features
- **Device Reset:** Complete data wipe and reconfiguration capability

### 4.2 Authentication & Security
- **PIN-Based Login:** Staff login using first name, last name, and PIN
- **Online Authentication:** Primary verification via Supabase RPC functions
- **Offline Authentication:** Fallback to locally cached staff data with bcrypt hash verification
- **Condominium Verification:** Ensures staff only access their assigned condominium
- **Auto-Sync on Login:** Refreshes staff list and configurations after successful login

### 4.3 Visitor Management
- **New Entry Processing (`/new-entry`):**
  - Visitor information capture (name, document, phone)
  - Unit selection from dynamic list
  - Visit type selection (Visitor, Delivery, Service, Student)
  - Service type specification for service visits
  - Camera-based photo capture
  - QR code generation for future re-entry
  - Approval mode tracking (App, Phone, Intercom, Manual, QR Scan)
  
- **Daily Activity List (`/day-list`):**
  - Real-time view of all daily visits
  - Status filtering (Pending, Approved, Inside, Left)
  - Quick actions for status updates
  - Check-in/check-out timestamp tracking
  
- **Visit Status Management:**
  - PENDING → APPROVED/DENIED → INSIDE → LEFT workflow
  - Manual approval by guard
  - Status change logging

### 4.4 Dashboard (`/`)
- **Quick Stats Overview:**
  - Today's visitor count
  - Current visitors inside
  - Pending approvals
  - Active incidents
  
- **Quick Actions Panel:**
  - Fast approval of pending visits
  - Quick checkout of visitors
  - Direct navigation to key screens
  
- **AI Concierge Integration:**
  - Natural language questions to Gemini AI
  - Context-aware responses about condominium rules
  - Message drafting assistance for guards
  - Portuguese (Portugal) language support

- **System Status Indicators:**
  - Online/Offline badge with color coding
  - Sync status display
  - Manual sync trigger
  - Backend health monitoring

### 4.5 Incident Reporting (`/incidents`)
- **Incident Creation:**
  - Title and description
  - Severity levels (BAIXA, MÉDIA, ALTA)
  - Automatic timestamp
  
- **Incident Tracking:**
  - Status transitions (ABERTO → VISTO → RESOLVIDO)
  - Acknowledgment tracking
  - Staff attribution

### 4.6 Camera Integration
- **CameraCapture Component:**
  - Environment-facing camera access
  - Live video preview
  - Photo capture with JPEG compression (0.7 quality)
  - Image scaling (0.5x) for performance
  - Base64 encoding for storage
  - Retake functionality
  - Error handling for permission issues

## 5. Data Models & Database Schema

### 5.1 IndexedDB Tables (Dexie)
```typescript
- visits: id, condominium_id, status, sync_status, check_in_at
- units: id, condominium_id, block, number
- visitTypes: id
- serviceTypes: id  
- settings: key (stores device_condo_details)
- staff: id, condominium_id
```

### 5.2 Core Entities

**Staff**
- id (UUID), first_name, last_name, pin_hash, condominium_id
- role: ADMIN | GUARD
- Includes nested condominium details

**Condominium**
- id (UUID), name, address, logo_url
- latitude, longitude, gps_radius_meters (for future geofencing)
- status: ACTIVE | INACTIVE

**Visit**
- id (UUID), condominium_id, visitor_name, visitor_doc, visitor_phone
- visit_type, visit_type_id (supports legacy name-based and new ID-based)
- service_type, service_type_id
- unit_id, reason, photo_url, qr_token
- check_in_at, check_out_at
- status: PENDING | APPROVED | DENIED | INSIDE | LEFT
- approval_mode: APP | PHONE | INTERCOM | GUARD_MANUAL | QR_SCAN
- sync_status: SYNCED | PENDING_SYNC
- guard_id (staff who processed)

**Unit**
- id (UUID), condominium_id, block, number
- residents[] (array of Resident objects)

**Resident**
- id (UUID), name, phone, type (OWNER | TENANT), unit_id

**Incident**
- id (UUID), condominium_id, title, description
- severity: BAIXA | MÉDIA | ALTA
- status: ABERTO | VISTO | RESOLVIDO
- reported_at, acknowledged_at, acknowledged_by

**AuditLog**
- id (UUID), created_at, condominium_id, actor_id
- action, target_table, target_id, details (JSON)

## 6. Services Architecture

### 6.1 DataService (`dataService.ts`)
**Responsibilities:**
- Orchestrates online/offline data access
- Backend health monitoring
- Automatic synchronization
- Network status management

**Key Methods:**
- Device configuration: `isDeviceConfigured()`, `configureDevice()`, `resetDevice()`
- Authentication: `login()`, `syncStaff()`
- Configurations: `getVisitTypes()`, `getServiceTypes()`
- Visits: `getTodaysVisits()`, `createVisit()`, `updateVisitStatus()`
- Other: `getUnits()`, `getIncidents()`, `syncPendingItems()`

### 6.2 SupabaseService (`Supabase.ts`)
**Responsibilities:**
- Direct interaction with Supabase backend
- RPC function calls
- Data fetching and mutations
- Cloud synchronization

### 6.3 MockSupabase (`mockSupabase.ts`)
**Responsibilities:**
- Demo/testing fallback
- Offline development support
- Mock data generation

### 6.4 Local Database (`db.ts`)
**Responsibilities:**
- IndexedDB management via Dexie
- Local data persistence
- Bulk operations for sync
- Complete data wipe capability

### 6.5 Gemini Service (`geminiService.ts`)
**Responsibilities:**
- AI assistant integration
- Natural language processing
- Context-aware responses
- Portuguese language support

**Function:** `askConcierge(question, condoContext)`
- System instruction for guard assistance
- Max 150 tokens for brevity
- Error handling for API failures

## 7. UI/UX Design

### 7.1 Design System
**Color Palette (Tailwind Custom Theme):**
- Primary: #0f172a (Slate 900) - Dark professional background
- Secondary: #334155 (Slate 700) - Secondary UI elements
- Accent: #0ea5e9 (Sky 500) - Call-to-action highlights
- Success: #10b981 (Emerald 500) - Positive actions
- Warning: #f59e0b (Amber 500) - Alerts
- Danger: #ef4444 (Red 500) - Critical actions

### 7.2 Layout Components
**Header:**
- Branding with ShieldCheck icon
- Condominium name display
- Page title indicator
- Online/Offline status badge
- User info (name, ID)
- Logout button

**Main Content:**
- Full-height scrollable container
- Responsive padding
- Grid and flex layouts for cards

### 7.3 Accessibility & Kiosk Optimization
- Large touch targets for tablet interaction
- High contrast colors for visibility
- Clear visual hierarchy
- Disabled text selection (except inputs)
- No scrollbar styling for clean interface
- Responsive design (mobile, tablet, desktop)

## 8. Routing & Navigation

### 8.1 Route Structure
```
HashRouter (# based URLs for compatibility)
├── /setup - Device configuration (unrestricted)
├── /login - Staff authentication (ConfigGuard)
└── Protected Routes (ConfigGuard + ProtectedRoute)
    ├── / - Dashboard
    ├── /new-entry - New visitor entry
    ├── /day-list - Daily activity list
    └── /incidents - Incident reporting
```

### 8.2 Route Guards
- **ConfigGuard:** Ensures device is configured before allowing access
- **ProtectedRoute:** Requires authenticated user session
- **Layout:** Wraps authenticated routes with header and navigation

## 9. Build & Deployment

### 9.1 Vite Configuration
- Dev server: Port 3000, accessible at 0.0.0.0
- Environment variables: Loaded from `.env.local`
- Process.env mapping: `GEMINI_API_KEY` → `process.env.API_KEY`
- Path alias: `@` resolves to root directory
- React plugin for JSX/TSX support

### 9.2 Scripts
```json
"dev": "vite",           // Start development server
"build": "vite build",   // Production build
"preview": "vite preview" // Preview production build
```

### 9.3 Environment Setup
Required in `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 9.4 CDN Strategy
The application uses import maps to load dependencies from `aistudiocdn.com`:
- Eliminates node_modules in production
- Faster deployment
- Automatic caching
- All dependencies served via CDN

### 9.5 AI Studio Integration
- Hosted project: https://ai.studio/apps/drive/1Z66JkBAU8FPTGiaObtBVAeV7parFPZ6a
- Managed deployment through Google AI Studio
- Single-command deployment workflow

## 10. Current Implementation Status

### 10.1 Completed Features ✅
- ✅ Device configuration and setup flow
- ✅ Staff authentication (online + offline)
- ✅ Visitor management UI (NewEntry, DailyList)
- ✅ Dashboard with quick actions
- ✅ Camera capture component
- ✅ Incident reporting UI
- ✅ Offline-first data service architecture
- ✅ IndexedDB persistence layer
- ✅ AI concierge integration
- ✅ Online/offline status detection
- ✅ Responsive layout with kiosk optimizations

### 10.2 Partially Implemented ⚠️
- ⚠️ DataService methods (stubs exist, full implementation pending)
- ⚠️ Supabase integration (service layer ready, backend schema needed)
- ⚠️ Synchronization logic (framework exists, needs testing)
- ⚠️ QR code generation (mentioned in types, not implemented)
- ⚠️ GPS geofencing (data structures exist, logic pending)

### 10.3 Missing Features ❌
- ❌ Unit and resident management interface
- ❌ Audit log viewer
- ❌ Reporting/analytics dashboard
- ❌ Multi-language support (currently Portuguese only)
- ❌ Notification system for admins
- ❌ Mobile app for residents (companion app)
- ❌ Advanced search and filtering
- ❌ Data export functionality
- ❌ Automated testing suite

## 11. Security Considerations

### 11.1 Authentication
- PIN-based system with bcrypt hashing
- No plaintext password storage
- Offline authentication fallback
- Session management via React Context

### 11.2 Authorization
- Role-based access control (ADMIN/GUARD)
- Condominium-level isolation
- Device-condominium binding

### 11.3 Data Privacy
- Local data encryption (via IndexedDB)
- Secure HTTPS communication (Supabase)
- Photo compression to reduce storage/bandwidth

### 11.4 Audit Trail
- AuditLog entity for all actions
- Actor tracking
- Timestamp recording
- JSON detail storage

## 12. Performance Optimizations

### 12.1 Frontend
- Lazy loading potential (not currently implemented)
- Image compression (0.7 JPEG quality, 0.5x scaling)
- CDN-based dependency delivery
- Minimal bundle size via Vite

### 12.2 Data
- IndexedDB indexes for fast queries
- Bulk operations for sync
- Cache-first strategy for reads
- Debounced sync operations

### 12.3 Network
- Health score system prevents unnecessary requests
- Automatic fallback to offline mode
- Background synchronization
- Optimized API calls

## 13. Recommendations

### 13.1 Immediate Priorities
1. **Complete DataService Implementation:** Finish stub methods for visits, units, incidents
2. **Supabase Schema:** Create SQL schema and RPC functions (currently empty SQL file)
3. **Testing:** Add unit tests for services and integration tests for critical flows
4. **Error Handling:** Implement comprehensive error boundaries and user-friendly messages
5. **Loading States:** Add skeleton loaders and progress indicators

### 13.2 Short-term Enhancements
1. **QR Code System:** Implement visitor re-entry via QR scan
2. **GPS Geofencing:** Enable location verification for remote check-ins
3. **Advanced Search:** Add filtering and search in DailyList
4. **Notification System:** Real-time alerts for admins on incidents
5. **Export Functionality:** CSV/PDF export for reports

### 13.3 Long-term Improvements
1. **Resident Mobile App:** Companion app for pre-approval and notifications
2. **Analytics Dashboard:** Visitor trends, peak hours, security metrics
3. **Multi-language Support:** i18n for Spanish, English support
4. **Voice Commands:** Hands-free operation for guards
5. **Facial Recognition:** Optional AI-powered visitor identification
6. **Backup & Restore:** Cloud backup of local data

### 13.4 Documentation Needs
1. **README.md:** Comprehensive setup guide (current version is minimal)
2. **API Documentation:** Document all service methods and types
3. **Deployment Guide:** Step-by-step production deployment instructions
4. **User Manual:** Guide for guards and administrators
5. **Architecture Diagram:** Visual representation of system components

### 13.5 Code Quality
1. **ESLint Configuration:** Add linting rules
2. **Prettier Setup:** Enforce consistent code formatting
3. **Type Safety:** Resolve any `any` types, add strict TypeScript mode
4. **Component Documentation:** Add JSDoc comments
5. **Code Splitting:** Implement route-based code splitting for faster loads

## 14. File Inventory

### 14.1 Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build tool configuration
- `.env.local` - Environment variables (API keys)
- `.gitignore` - Git exclusions
- `metadata.json` - PWA metadata

### 14.2 Source Files
**Root:**
- `index.html` - HTML entry point with Tailwind config
- `index.tsx` - React entry point
- `App.tsx` - Main app component with routing (158 lines)
- `types.ts` - TypeScript type definitions (133 lines)

**Pages:** (6 files, ~66KB total)
- `Dashboard.tsx` - Main dashboard (292 lines, 15KB)
- `NewEntry.tsx` - Visitor entry form (21KB)
- `DailyList.tsx` - Activity list (9.5KB)
- `Login.tsx` - Authentication (9.8KB)
- `Incidents.tsx` - Incident reporting (2.9KB)
- `Setup.tsx` - Device configuration (7.9KB)

**Components:** (1 file)
- `CameraCapture.tsx` - Camera photo capture (122 lines, 3.7KB)

**Services:** (6 files)
- `dataService.ts` - Main data orchestration (186 lines, 6.7KB)
- `Supabase.ts` - Cloud backend integration (6.7KB)
- `supabaseClient.ts` - Supabase client initialization (596 bytes)
- `mockSupabase.ts` - Mock data service (10.5KB)
- `db.ts` - IndexedDB wrapper (40 lines, 1.2KB)
- `geminiService.ts` - AI integration (40 lines, 1.3KB)

**Database:**
- `supabase_functions.sql` - Empty (needs implementation)

**Knowledge:**
- `Project_Report.md` - This document

---

**Last Updated:** 2025-11-28  
**Report Version:** 2.0  
**Total Files Analyzed:** 24  
**Total Lines of Code:** ~2,000+ (estimated)
