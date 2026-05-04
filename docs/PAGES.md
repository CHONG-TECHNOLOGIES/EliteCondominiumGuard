# Page Descriptions

This document summarizes the application screens currently registered in `App.tsx`.
Components that exist in `src/pages` but are not routed are listed separately.

## Public Pages

### Setup (`/setup`)
**Purpose**: Configure a tablet by associating it with a condominium.

**Flow**:
1. Lists active condominiums
2. User selects a condominium
3. Registers or recovers the device in the backend
4. Saves device configuration locally
5. Redirects to `/login`

**Features**:
- Device recovery / replacement flow
- Device identifier display and copy action
- Offline emergency configuration through `ConfigGuard`
- Validation for condominium id and condominium name in offline setup

### Login (`/login`)
**Purpose**: PIN-based authentication for guards and administrative users.

**Features**:
- First name, last name, and 4-6 digit PIN authentication
- Online/offline auth support
- Role-based redirects: guards to `/`, admins and super admins to `/admin`
- Secret admin access by repeated logo taps
- Audio service initialization after user interaction
- Session-scoped auth persistence via `sessionStorage`

### UserManual (`/manual`)
**Purpose**: Public and authenticated user manual.

**Features**:
- Audience-specific manual views through `?audience=public|guard|admin|super-admin`
- Practical guard workflows for dashboard, new entry, daily list, incidents, resident search, news, and offline operation
- Admin and super admin summaries
- Available before and after login
- Page-level scroll handling for long-form documentation

### PrivacyPolicy (`/privacy-policy`)
**Purpose**: Public privacy policy for EntryFlow.

**Features**:
- Portuguese and English language toggle
- Data controller, collected data, purposes, vendors, retention, rights, permissions, and contact information
- Link to account deletion page

### AccountDeletion (`/account-deletion`)
**Purpose**: Public account and data deletion instructions.

**Features**:
- Portuguese and English language toggle
- Email-based deletion request instructions
- Summary of data normally deleted, data that may be retained, and retention periods
- Link back to privacy policy

## Guard Pages

### Dashboard (`/`)
**Purpose**: Main guard workspace and quick action hub.

**Features**:
- Condominium name and online/offline status
- Primary navigation to new entry, daily list, incidents, resident search, news, and manual
- Current actionable visits: pending, approved, and inside
- Quick actions for contacting residents, marking visitors inside, and checking visitors out
- Incident count and new incident audio alerts
- Latest news preview
- AI assistant modal
- Manual audio activation/test controls
- Pending item synchronization

### NewEntry (`/new-entry`)
**Purpose**: Register a new visitor, delivery, service provider, student, restaurant access, or sports access.

**Features**:
- Multi-step form
- Visit type selection
- QR availability decision flow
- QR scan and validation flow when online
- Service type selection for service visits
- Restaurant and sports facility selection for free-entry flows
- Visitor data input: name, document, phone, license plate, and notes
- Unit search by block, number, or resident name
- Camera photo capture
- Approval mode selector
- Automatic approved status for configured free-entry categories

### DailyList (`/day-list`)
**Purpose**: View and operate on the current day's visits.

**Features**:
- Responsive mobile cards and desktop table
- Search by visitor name, phone, unit, visit type, or status
- Status badges for pending, approved, inside, left, denied, without response, and video call
- Contact resident action
- Video call action where available
- Mark inside and checkout actions
- Visit event history modal
- Pending sync indicators for offline-created records

### Incidents (`/incidents`)
**Purpose**: Report on and manage security incidents visible to the guard.

**Features**:
- Incident list for the configured condominium
- Realtime incident subscription when online
- New incident banner, audio alert, and vibration support
- Manual audio test control
- Acknowledge incident action
- Report action modal for in-progress and resolved states
- Guard action notes and incident status updates

### ResidentSearch (`/resident-search`)
**Purpose**: Search the resident directory during guard operations.

**Features**:
- Search by resident name, phone number, or condominium name
- Condominium-scoped resident results
- Unit label display with block and number
- Online/offline status indicator
- Empty state when no cached offline directory is available

### News (`/news`)
**Purpose**: View recent condominium news.

**Features**:
- News from the configured condominium
- News cards with title, description, category, date, and image when available
- Full article modal
- Refresh action and automatic refresh
- Offline support with cached news
- Empty state when no news is available

## Admin Pages (`/admin/*`)

18 pages for administrative management:

| Route | Page | Purpose |
|---|---|---|
| `/admin` | AdminDashboard | Admin overview, key stats, and quick navigation |
| `/admin/condominiums` | AdminCondominiums | Condominium CRUD and status management |
| `/admin/devices` | AdminDevices | Device registry, assignment, and status management |
| `/admin/staff` | AdminStaff | Staff management, roles, profile photos, and PIN reset |
| `/admin/units` | AdminUnits | Unit and block management |
| `/admin/residents` | AdminResidents | Resident directory, QR code viewer, app status filter, CSV import, and bulk selection |
| `/admin/restaurants` | AdminRestaurants | Restaurant configuration for free-entry flows |
| `/admin/sports` | AdminSports | Sports facility configuration for free-entry flows |
| `/admin/events` | AdminEvents | Condominium events with categories, dates, RSVP settings, filters, create, edit, and deactivate actions |
| `/admin/news` | AdminNews | News article management with categories, image upload, pagination, and filters |
| `/admin/subscriptions` | AdminSubscriptions | Subscription, payment, pricing rule, arrears, and alert management |
| `/admin/visits` | AdminVisits | Visit history, filtering, status actions, event history, CSV export, and PDF export |
| `/admin/incidents` | AdminIncidents | Incident oversight and status management |
| `/admin/config/visit-types` | AdminVisitTypes | Visit type configuration |
| `/admin/config/service-types` | AdminServiceTypes | Service type configuration |
| `/admin/analytics` | AdminAnalytics | Statistics and operational reporting |
| `/admin/audit-logs` | AdminAuditLogs | Audit trail viewing, filtering, pagination, and CSV export |
| `/admin/device-registration-errors` | AdminDeviceRegistrationErrors | View and troubleshoot device registration errors |

## Shared Route Behavior

- The app uses hash routing.
- `/setup`, `/manual`, `/privacy-policy`, and `/account-deletion` are public routes.
- `/login` is guarded by device configuration.
- Guard routes require an authenticated guard and redirect admins to `/admin`.
- Admin routes require device configuration, authentication, and admin/super-admin authorization.
- Unknown routes redirect to `/`.

## Unrouted Page Components

### Settings (`src/pages/Settings.tsx`)
**Current status**: Component exists, but no `/settings` route is registered in `App.tsx`.

**Intended purpose**: Device settings and local app information.

**Features present in component**:
- Device identifier display
- Condominium details
- Storage quota usage
- Online/offline status
- Visitor photo quality setting
- Local data and pending sync information
- Uninstall/decommission confirmation flow
