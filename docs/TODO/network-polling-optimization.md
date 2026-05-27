# Network Polling Optimization TODO

Date: 2026-05-27

## Context

`get_service_types` was previously called during the 60s backend health check and has been replaced with a lightweight `HEAD` probe. During that investigation, several other recurring/background calls were found that may add avoidable network load.

## Candidate Optimizations

### 1. Incident config refresh on Dashboard

- Current behavior: `Dashboard.tsx` calls `loadIncidentsCount()` every 10 seconds.
- Path: `loadIncidentsCount()` -> `api.getIncidents()` -> `refreshIncidentConfigs()`.
- Network impact: `get_incident_types`, `get_incident_statuses`, and `get_incidents` can run every 10 seconds while the dashboard is open.
- Proposed fix: throttle/dedupe `refreshIncidentConfigs()` like config refresh, because incident types/statuses are config data.
- Suggested TTL: 5 minutes.
- Keep force refresh for bootstrap or empty local cache.

### 2. Restaurants and sports duplicate refresh

- Current behavior: `NewEntry.tsx` calls `api.getRestaurants()` and `api.getSports()` together.
- Both cached getters can trigger `refreshRestaurantsAndSports()`.
- Network impact: duplicate `get_restaurants` and `get_sports` RPCs on page open.
- Proposed fix: add in-flight dedupe and TTL to `refreshRestaurantsAndSports()`.
- Suggested TTL: 5 minutes.

### 3. Units with residents always fetches online

- Current behavior: `api.getUnitsWithResidents()` fetches from Supabase whenever online.
- Network impact: this can be heavier than config calls because it includes units and residents.
- Proposed fix: decide whether New Entry needs always-fresh resident/unit data or can use cache with background refresh.
- Suggested default: cache-first with background refresh, plus force refresh on manual sync/setup/login.

### 4. News refresh frequency

- Current behavior: Dashboard and News page refresh news every 60 seconds, and cached `api.getNews()` still triggers background refresh.
- Network impact: `get_news` can run frequently, while news usually changes rarely.
- Proposed fix: add TTL/in-flight dedupe to `refreshNews()`.
- Suggested TTL: 5 minutes for dashboard preview, optional manual refresh on News page.

### 5. PWA update checks

- Current behavior: `PWAUpdateNotification.tsx` calls `registration.update()` every 60 seconds when visible and online.
- Network impact: not Supabase RPC load, but still recurring traffic.
- Proposed fix: consider increasing update check interval.
- Suggested TTL: 5-15 minutes unless rapid PWA rollout detection is required.

## Expected/Intentional Network Activity

- `get_todays_visits`: expected guard workflow polling.
- Device heartbeat every 5 minutes: expected device monitoring.
- Layout `api.checkOnline()` every 2 seconds: local state read only, not network.

## Implementation Notes

- Prefer one shared pattern in `DataService`: in-flight promise + `lastRefreshAt` + TTL + optional `{ force: true }`.
- Keep online-first behavior for live operational data like visits/incidents, but separate config refreshes from live data refreshes.
- Preserve offline behavior: cached data should still return immediately, and empty-cache paths may force a backend refresh when healthy.

## Verification

- Build app with `npm run build`.
- Use browser Network tab or Supabase logs to confirm:
  - Incident config RPCs are not called every 10 seconds.
  - Restaurants/sports do not duplicate on New Entry open.
  - News does not refresh every minute unless explicitly intended.
  - `get_todays_visits` polling remains unaffected.
