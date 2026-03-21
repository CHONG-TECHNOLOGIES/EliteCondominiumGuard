# Plan: Clickstream Tracking for Entry Registration Flow

## Context

We need to track every user interaction during the visit entry flow (`NewEntry.tsx`) and send events to Kafka via HTTP REST Proxy. This enables analytics on guard behavior: funnel drop-offs, time-per-step, QR adoption rate, approval mode distribution, etc.

An initial design doc exists at [docs/clickstream1.md](clickstream1.md). This plan builds on it, adding: offline persistence with localStorage, a `useClickstream` React hook, `flow.abandon` detection, environment variable externalization (no hardcoded credentials), retry with backoff, a NoOpProvider for disabled environments, and privacy rules.

---

## Files to Create

| File | Description |
|------|-------------|
| `src/schemas/clickStreamEvent.avsc` | Avro schema definition |
| `src/services/clickStreamService.ts` | Core singleton service (providers + queue + flush) |
| `src/hooks/useClickstream.ts` | React hook for clean NewEntry integration |

## Files to Modify

| File | Description |
|------|-------------|
| `src/pages/NewEntry.tsx` | Add ~30 tracking calls via `useClickstream` hook |
| `src/config/deployment.ts` | Add Kafka config fields |
| `.env.local` | Add `VITE_KAFKA_*` environment variables |

---

## 1. Avro Schema (`src/schemas/clickStreamEvent.avsc`)

```json
{
  "type": "record",
  "name": "ClickStreamEvent",
  "namespace": "com.eliteaccesscontrol.clickstream",
  "doc": "Tracks user interactions during the entry registration flow",
  "fields": [
    { "name": "schema_version",  "type": "string",           "default": "1.0" },
    { "name": "session_id",      "type": "string",           "doc": "UUID generated per NewEntry page mount" },
    { "name": "device_id",       "type": ["null", "string"], "default": null },
    { "name": "condominium_id",  "type": ["null", "int"],    "default": null },
    { "name": "guard_id",        "type": ["null", "int"],    "default": null },
    { "name": "event_name",      "type": "string" },
    { "name": "event_timestamp", "type": "string",           "doc": "ISO 8601 UTC" },
    { "name": "sequence_number", "type": "int",              "doc": "Incrementing per session, starts at 1" },
    { "name": "step",            "type": ["null", "int"],    "default": null, "doc": "1 | 2 | 3 | null" },
    { "name": "is_online",       "type": "boolean" },
    { "name": "is_qr_flow",      "type": "boolean",          "default": false },
    { "name": "visit_type_id",   "type": ["null", "int"],    "default": null },
    { "name": "visit_type_name", "type": ["null", "string"], "default": null },
    { "name": "approval_mode",   "type": ["null", "string"], "default": null },
    {
      "name": "properties",
      "type": { "type": "map", "values": "string" },
      "default": {},
      "doc": "Flexible key-value map for event-specific extra data. All values must be strings."
    }
  ]
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | string | Schema version for forward compatibility |
| `session_id` | string | UUID per NewEntry page mount — groups all events in one flow |
| `device_id` | string? | Tablet device UUID |
| `condominium_id` | int? | Condominium the device belongs to |
| `guard_id` | int? | Staff ID of the logged-in guard |
| `event_name` | string | Event identifier (see catalogue in section 5) |
| `event_timestamp` | string | ISO 8601 UTC at time of interaction |
| `sequence_number` | int | Monotonically increasing within a session |
| `step` | int? | Current form step: 1, 2, 3 or null |
| `is_online` | boolean | Network status at time of event |
| `is_qr_flow` | boolean | Whether the session took the QR code path |
| `visit_type_id` | int? | Selected visit type ID (set after step 1) |
| `visit_type_name` | string? | Human-readable visit type name |
| `approval_mode` | string? | Selected approval mode (APP, PHONE, etc.) |
| `properties` | map\<string\> | Extra data specific to each event |

---

## 2. Environment Variables

Add to `.env.local` (externalize credentials from source code):

```env
VITE_KAFKA_PROVIDER=aiven
VITE_KAFKA_REST_URL=https://kafka-elite-access-control-elite-access-control.b.aivencloud.com:23834
VITE_KAFKA_TOPIC=tp_clickstream_visits
VITE_KAFKA_REST_USERNAME=avnadmin
VITE_KAFKA_REST_PASSWORD=<AIVEN_PASSWORD>
```

Update `src/config/deployment.ts` — add `kafka` section to `DeploymentConfig`:

```typescript
kafka: {
  provider: string;   // 'aiven' | 'confluent' | 'none'
  restUrl: string;
  topic: string;
  username: string;
  password: string;
}
```

**Topic**: Use `tp_clickstream_visits` (separate from `tp_visits` to avoid mixing operational and analytics data).

---

## 3. ClickStreamService (`src/services/clickStreamService.ts`)

Singleton class following the `audioService.ts` pattern.

### 3.1 TypeScript Interfaces

```typescript
export interface ClickStreamEvent {
  schema_version: string;
  session_id: string;
  device_id: string | null;
  condominium_id: number | null;
  guard_id: number | null;
  event_name: string;
  event_timestamp: string;
  sequence_number: number;
  step: number | null;
  is_online: boolean;
  is_qr_flow: boolean;
  visit_type_id: number | null;
  visit_type_name: string | null;
  approval_mode: string | null;
  properties: Record<string, string>;
}

export interface ClickStreamContext {
  session_id: string;
  device_id: string | null;
  condominium_id: number | null;
  guard_id: number | null;
}

export interface KafkaProvider {
  send(events: ClickStreamEvent[]): Promise<void>;
  readonly name: string;
}
```

### 3.2 Provider Abstraction

```
KafkaProvider (interface)
  ├── AivenProvider      — reads URL/credentials from env vars (not hardcoded)
  ├── ConfluentProvider   — stub, throws "not implemented"
  └── NoOpProvider        — silently discards (when VITE_KAFKA_PROVIDER=none or missing config)
```

#### AivenProvider

```typescript
class AivenProvider implements KafkaProvider {
  readonly name = 'aiven';
  private readonly url: string;
  private readonly authHeader: string;

  constructor() {
    const baseUrl = import.meta.env.VITE_KAFKA_REST_URL;
    const topic = import.meta.env.VITE_KAFKA_TOPIC || 'tp_clickstream_visits';
    this.url = `${baseUrl}/topics/${topic}`;

    const username = import.meta.env.VITE_KAFKA_REST_USERNAME || '';
    const password = import.meta.env.VITE_KAFKA_REST_PASSWORD || '';
    this.authHeader = 'Basic <BASE64_AUTH>';
  }

  async send(events: ClickStreamEvent[]): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.kafka.json.v2+json',
        'Authorization': this.authHeader,
      },
      body: JSON.stringify({
        records: events.map(e => ({ value: e })),
      }),
    });
    if (!response.ok) {
      throw new Error(`Kafka REST proxy returned ${response.status}`);
    }
  }
}
```

#### ConfluentProvider (stub)

```typescript
class ConfluentProvider implements KafkaProvider {
  readonly name = 'confluent';
  async send(_events: ClickStreamEvent[]): Promise<void> {
    // Not implemented — prepared for future Confluent Cloud integration.
    // Will use Confluent REST Proxy v3 or Schema Registry when configured.
    throw new Error('ConfluentProvider not yet implemented');
  }
}
```

#### NoOpProvider

```typescript
class NoOpProvider implements KafkaProvider {
  readonly name = 'noop';
  async send(_events: ClickStreamEvent[]): Promise<void> {
    // Silently discard — clickstream is disabled
  }
}
```

#### Provider Selection Logic

```typescript
private createProvider(): KafkaProvider {
  const providerName = import.meta.env.VITE_KAFKA_PROVIDER || 'none';
  switch (providerName) {
    case 'aiven':
      if (!import.meta.env.VITE_KAFKA_REST_URL) {
        logger.warn('Kafka REST URL not configured, clickstream disabled');
        return new NoOpProvider();
      }
      return new AivenProvider();
    case 'confluent':
      return new ConfluentProvider();
    default:
      return new NoOpProvider();
  }
}
```

### 3.3 Queue + Offline Persistence

The existing clickstream1.md doc says "Network error → Events silently dropped — no retry, no IndexedDB". This plan improves that:

- **In-memory queue** with `localStorage` backup (`clickstream_queue` key)
- On `track()`: push to queue + persist to localStorage
- **Max 200 persisted events** — oldest dropped when exceeded (~60KB max)
- On construction: restore any persisted events from previous session
- On `window.addEventListener('online')`: attempt flush of persisted queue

### 3.4 Flush Logic

| Trigger | Action |
|---------|--------|
| Queue reaches 10 events | Immediate flush |
| Every 5 seconds (timer) | Flush if non-empty |
| `destroy()` called | Final flush attempt |
| `online` event fires | Flush persisted queue |
| Network error | Retry 2x with backoff (1s, 2s), then re-persist |

**Retry**: Max 2 retries with exponential backoff. After final failure, events go back to localStorage queue. `isFlushing` guard prevents concurrent flushes.

```typescript
private async flush(): Promise<void> {
  if (this.isFlushing || this.queue.length === 0) return;
  this.isFlushing = true;

  const batch = this.queue.splice(0, this.queue.length);

  try {
    const success = await this.sendWithRetry(batch);
    if (success) {
      this.persistQueue();
    } else {
      this.queue.unshift(...batch);
      this.trimQueue();
      this.persistQueue();
    }
  } catch {
    this.queue.unshift(...batch);
    this.trimQueue();
    this.persistQueue();
  } finally {
    this.isFlushing = false;
  }
}

private async sendWithRetry(events: ClickStreamEvent[]): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await this.provider.send(events);
      return true;
    } catch {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  return false;
}
```

### 3.5 Public API

```typescript
class ClickStreamService {
  // Session lifecycle
  init(context: ClickStreamContext): void     // Set session, reset sequence, start timer
  destroy(): void                             // Stop timer, final flush

  // Event tracking
  track(eventName: string, step: number | null, properties?: Record<string, string>): void

  // Session enrichment (called as user progresses through form)
  setVisitContext(id: number | null, name: string | null): void
  setApprovalMode(mode: string | null): void
  setQrFlow(isQr: boolean): void
  setOnlineStatus(isOnline: boolean): void
}

export const clickStreamService = new ClickStreamService();
```

### 3.6 Logging

Use `logger.debug()` for event queuing, `logger.info()` for flush success, `logger.warn()` for flush failures. Never `logger.error()` (avoid Sentry alerts for analytics failures).

### 3.7 Constants

```typescript
private static readonly STORAGE_KEY = 'clickstream_queue';
private static readonly MAX_PERSISTED_EVENTS = 200;
private static readonly FLUSH_INTERVAL_MS = 5000;
private static readonly BATCH_SIZE_TRIGGER = 10;
private static readonly MAX_RETRIES = 2;
private static readonly RETRY_DELAY_MS = 1000;
private static readonly SCHEMA_VERSION = '1.0';
```

---

## 4. React Hook (`src/hooks/useClickstream.ts`)

New `src/hooks/` directory. The hook encapsulates all lifecycle management:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { clickStreamService } from '@/services/clickStreamService';
import { getDeviceIdentifier } from '@/services/deviceUtils';

interface UseClickstreamOptions {
  guardId: number | null;
  condominiumId: number | null;
}

interface UseClickstreamReturn {
  track: (eventName: string, step: number | null, properties?: Record<string, string>) => void;
  trackInputStart: (eventName: string, step: number) => void;
  trackVisitTypeSelected: (typeConfig: { id: number; name: string }) => void;
  trackFlowComplete: (visit: { id: number }) => void;
}

export function useClickstream(options: UseClickstreamOptions): UseClickstreamReturn {
  const trackedInputsRef = useRef<Set<string>>(new Set());
  const flowCompletedRef = useRef(false);

  useEffect(() => {
    const sessionId = crypto.randomUUID();

    clickStreamService.init({
      session_id: sessionId,
      device_id: getDeviceIdentifier(),
      condominium_id: options.condominiumId,
      guard_id: options.guardId,
    });
    clickStreamService.track('flow.start', 1);

    const handleOnline = () => clickStreamService.setOnlineStatus(true);
    const handleOffline = () => clickStreamService.setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeUnload = () => {
      if (!flowCompletedRef.current) {
        clickStreamService.track('flow.abandon', null, { reason: 'page_unload' });
      }
      clickStreamService.destroy();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!flowCompletedRef.current) {
        clickStreamService.track('flow.abandon', null, { reason: 'component_unmount' });
      }
      clickStreamService.destroy();
    };
  }, [options.guardId, options.condominiumId]);

  const track = useCallback(
    (eventName: string, step: number | null, properties?: Record<string, string>) => {
      clickStreamService.track(eventName, step, properties);
    }, []
  );

  // Fires only once per field per session (avoids tracking every keystroke)
  const trackInputStart = useCallback(
    (eventName: string, step: number) => {
      if (!trackedInputsRef.current.has(eventName)) {
        trackedInputsRef.current.add(eventName);
        clickStreamService.track(eventName, step);
      }
    }, []
  );

  const trackVisitTypeSelected = useCallback(
    (typeConfig: { id: number; name: string }) => {
      clickStreamService.setVisitContext(typeConfig.id, typeConfig.name);
      clickStreamService.track('visit_type_selected', 1, {
        visit_type_id: String(typeConfig.id),
        visit_type_name: typeConfig.name,
      });
    }, []
  );

  const trackFlowComplete = useCallback(
    (visit: { id: number }) => {
      flowCompletedRef.current = true;
      clickStreamService.track('flow.complete', 3, {
        visit_id: String(visit.id),
        is_synced: visit.id > 0 ? 'true' : 'false',
      });
    }, []
  );

  return { track, trackInputStart, trackVisitTypeSelected, trackFlowComplete };
}
```

### Key Design Decisions

- `trackedInputsRef` — prevents firing `input.visitor_name` on every keystroke. Only the first character typed fires the event. Uses ref (not state) to avoid re-renders.
- `flowCompletedRef` — prevents `flow.abandon` from firing after a successful submit.
- `beforeunload` — captures tab close / browser navigation away.
- Hook cleanup (useEffect return) — captures React route navigation away.
- React Strict Mode double-mount — handled by `init()` which calls `destroy()` first if already initialized.

---

## 5. Event Catalogue (28 events)

### Step 1 — Visit Type Selection

| Event | Trigger | Properties |
|-------|---------|------------|
| `flow.start` | Component mounts (auto via hook) | — |
| `visit_type_selected` | User clicks a visit type card | `{ visit_type_id, visit_type_name }` |
| `qr_question_answered` | User clicks "Sim" or "Não" | `{ answer: 'yes' \| 'no' }` |
| `entry_cancelled` | User clicks back arrow on step 1 | `{ step: '1' }` |

### Step 2 — Visitor Details

| Event | Trigger | Properties |
|-------|---------|------------|
| `input.visitor_name` | First keystroke in name field | — |
| `input.visitor_doc` | First keystroke in document field | — |
| `input.visitor_phone` | First keystroke in phone field | — |
| `input.vehicle_plate` | First keystroke in vehicle plate field | — |
| `input.reason` | First keystroke in reason/notes field | — |
| `unit_modal_opened` | User clicks unit selector | — |
| `unit_selected` | User picks a unit | `{ unit_id }` |
| `unit_modal_closed` | User closes unit modal without selecting | — |
| `service_type_modal_opened` | User clicks service type button | — |
| `service_type_selected` | User picks a service type | `{ service_type_id }` |
| `service_type_modal_closed` | User closes service modal without selecting | — |
| `restaurant_modal_opened` | User clicks restaurant button | — |
| `restaurant_selected` | User picks a restaurant | `{ restaurant_id }` |
| `sport_modal_opened` | User clicks sport button | — |
| `sport_selected` | User picks a sport | `{ sport_id }` |
| `step2_validation_passed` | User clicks "Seguinte" (valid form) | — |
| `step2_back_clicked` | User clicks back on step 2 | — |

### Step 3 — Photo & Approval

| Event | Trigger | Properties |
|-------|---------|------------|
| `photo_captured` | Camera captures photo | — |
| `photo_retaken` | User clicks "Repetir Foto" | — |
| `approval_mode_selected` | User picks an approval mode | `{ mode }` |
| `phone_call_initiated` | User clicks "Ligar" | — |
| `intercom_call_initiated` | User clicks "Chamar" | — |
| `qr_scan_started` | User clicks "Scan QRCODE" | — |
| `qr_scan_success` | QR validated successfully | `{ unit_id }` |
| `qr_scan_error` | QR validation failed | `{ error_message }` |
| `entry_submitted` | User clicks submit button | `{ approval_mode }` |
| `step3_back_clicked` | User clicks back on step 3 | — |
| `entry_cancelled` | User clicks "Cancelar Leitura" (QR) | `{ step: '3', reason: 'qr_cancelled' }` |

### Meta Events (automatic via hook)

| Event | Trigger | Properties |
|-------|---------|------------|
| `flow.start` | Component mount | — |
| `flow.complete` | Successful submit via `trackFlowComplete()` | `{ visit_id, is_synced }` |
| `flow.abandon` | Unmount without complete, or `beforeunload` | `{ reason: 'component_unmount' \| 'page_unload' }` |

---

## 6. NewEntry.tsx Instrumentation Summary

Add `useClickstream` hook at top of component:

```typescript
const cs = useClickstream({
  guardId: user?.id ?? null,
  condominiumId: user?.condominium_id ?? null,
});
```

Then add tracking calls to existing handlers (~30 one-line additions, no structural changes):

### Step 1 Examples
```typescript
// Back button
onClick={() => { cs.track('entry_cancelled', 1); navigate('/'); }}

// Visit type card
const handleTypeSelect = (typeConfig: VisitTypeConfig) => {
  cs.trackVisitTypeSelected(typeConfig);
  // ... existing logic unchanged
};

// QR modal
onClick={() => { cs.track('qr_question_answered', 1, { answer: 'no' }); handleQrQuestionResponse(false); }}
onClick={() => { cs.track('qr_question_answered', 1, { answer: 'yes' }); handleQrQuestionResponse(true); }}
```

### Step 2 Examples
```typescript
// Input field (first interaction only)
onChange={e => { setVisitorName(e.target.value); cs.trackInputStart('input.visitor_name', 2); }}

// Unit modal
onClick={() => { cs.track('unit_modal_opened', 2); setShowUnitModal(true); }}
onClick={() => { cs.track('unit_selected', 2, { unit_id: String(u.id) }); setUnitId(String(u.id)); setShowUnitModal(false); }}
onClick={() => { cs.track('unit_modal_closed', 2); setShowUnitModal(false); }}
```

### Step 3 Examples
```typescript
// Photo
onCapture={(data) => {
  if (photo) cs.track('photo_retaken', 3);
  else if (data) cs.track('photo_captured', 3);
  setPhoto(data);
}}

// Submit
async function handleSubmit() {
  cs.track('entry_submitted', 3, { approval_mode: approvalMode ?? '' });
  const visit = await api.createVisit(visitData);
  cs.trackFlowComplete(visit);
  navigate('/day-list');
}
```

---

## 7. Privacy Rules

### NEVER track (PII / sensitive data)

| Data | Reason |
|------|--------|
| Visitor name | PII |
| Visitor document / CC number | Sensitive PII |
| Visitor phone number | PII |
| Vehicle license plate | PII |
| Resident names / phone numbers | PII |
| Photo data | Sensitive media + storage cost |
| PIN codes | Authentication secret |
| QR code content | Contains resident identifiers |

### Safe to track

| Data | Reason |
|------|--------|
| `device_id` | Device identifier, not personal |
| `condominium_id` | Organizational unit |
| `guard_id` | Staff identifier (internal) |
| `visit_type_id` / `name` | Category of visit |
| `unit_id` | Destination unit (no resident info) |
| `service_type_id` | Service category |
| `restaurant_id` / `sport_id` | Facility identifier |
| `approval_mode` | Process selection |
| Event names + timestamps | Behavioral analytics |

---

## 8. Security Notes

- Kafka REST credentials are in the browser bundle via `VITE_*` env vars. Acceptable if the Aiven user has **write-only** permissions (no read/admin).
- If stricter security is needed, proxy requests through a **Vercel Edge Function** or **Supabase Edge Function** to keep credentials server-side.
- The `NoOpProvider` ensures zero network calls when clickstream is disabled (`VITE_KAFKA_PROVIDER=none`).

---

## 9. CORS Consideration

The Aiven Kafka REST Proxy must have CORS headers configured to accept requests from the app's origin. If CORS is blocked, the `fetch()` calls will fail silently (caught by retry logic, events re-persisted). **Mitigation**: Test with a browser fetch first. If blocked, route through an edge function proxy.

---

## 10. Implementation Sequence

### Phase 1: Foundation
1. Create `src/schemas/clickStreamEvent.avsc`
2. Create `src/services/clickStreamService.ts` (interfaces, providers, singleton)
3. Create `src/hooks/useClickstream.ts`

### Phase 2: Configuration
4. Update `.env.local` with `VITE_KAFKA_*` variables
5. Update `src/config/deployment.ts` with Kafka config fields

### Phase 3: Instrumentation
6. Modify `src/pages/NewEntry.tsx` — add ~30 tracking calls

### Phase 4: Verification
7. Full flow test → events in Kafka topic
8. Offline test → events persist and flush on reconnect
9. Abandon test → `flow.abandon` fires on navigation away
10. Disabled test → `VITE_KAFKA_PROVIDER=none` → no network calls

---

## 11. Dependencies

**No new npm packages required.** Uses only native browser APIs:
- `fetch()` — HTTP requests
- `crypto.randomUUID()` — session ID generation (requires HTTPS context, which the app already has)
- `localStorage` — offline queue persistence
- `btoa()` — Base64 encoding for auth header

---

## 12. Kafka Topic Strategy

| Topic | Purpose | Retention |
|-------|---------|-----------|
| `tp_clickstream_visits` | All clickstream events from entry flow | 30 days |
| `tp_visits` | Operational visit data (existing, unchanged) | as configured |

Partition key: `condominium_id` (ensures per-condo ordering for analytics).
