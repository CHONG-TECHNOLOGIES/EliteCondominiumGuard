# Clickstream — Entry Registration Flow (Kafka via HTTP)

**Project**: Elite AccessControl
**Date**: 2026-02-20
**Author**: Chong Technologies

---

## 1. Overview

The entry registration flow (`NewEntry.tsx`) has ~25 distinct user interactions across 3 steps. This document defines the clickstream design: the Avro schema, the service architecture, the Kafka provider abstraction, and every tracking call to instrument in the UI.

Events are **analytics-only** — fire-and-forget, never block the UI, never persist to IndexedDB.

---

## 2. Kafka Providers

### 2.1 Aiven (Active)

| Property | Value |
|----------|-------|
| Endpoint | `https://kafka-elite-access-control-elite-access-control.b.aivencloud.com:23834/topics/tp_visits` |
| Method | POST |
| Content-Type | `application/vnd.kafka.json.v2+json` |
| Auth | Basic Auth — `avnadmin:<AIVEN_PASSWORD>` |
| Payload | `{ "records": [{ "value": <ClickStreamEvent> }] }` |

Example curl:
```bash
curl -X POST \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -H "Authorization: Basic <BASE64_AUTH>" \
  -d '{"records": [{"value": {"event_name": "entry_started", "session_id": "uuid"}}]}' \
  'https://kafka-elite-access-control-elite-access-control.b.aivencloud.com:23834/topics/tp_visits'
```

### 2.2 Confluent Cloud (Future — stub only)

Prepared in the service via `ConfluentProvider` class. Not implemented yet. Will use Confluent REST Proxy v3 / Schema Registry when configured.

---

## 3. Avro Schema

**File**: `src/schemas/clickStreamEvent.avsc`

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
      "doc": "Flexible key-value map for event-specific extra data"
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
| `event_name` | string | Event identifier (see catalogue below) |
| `event_timestamp` | string | ISO 8601 UTC at time of interaction |
| `sequence_number` | int | Monotonically increasing within a session |
| `step` | int? | Current form step: 1, 2, 3 or null |
| `is_online` | boolean | Network status at time of event |
| `is_qr_flow` | boolean | Whether the session took the QR code path |
| `visit_type_id` | int? | Selected visit type ID (set after step 1) |
| `visit_type_name` | string? | Human-readable visit type name |
| `approval_mode` | string? | Selected approval mode (APP, PHONE, etc.) |
| `properties` | map<string> | Extra data specific to each event |

---

## 4. Service Architecture

**File**: `src/services/clickStreamService.ts`

### 4.1 TypeScript Interfaces

```typescript
interface ClickStreamEvent {
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

interface ClickStreamContext {
  session_id: string;
  device_id: string | null;
  condominium_id: number | null;
  guard_id: number | null;
}

interface KafkaProvider {
  send(events: ClickStreamEvent[]): Promise<void>;
}
```

### 4.2 AivenProvider

```typescript
class AivenProvider implements KafkaProvider {
  private readonly url =
    'https://kafka-elite-access-control-elite-access-control.b.aivencloud.com:23834/topics/tp_visits';
  private readonly authHeader = 'Basic <BASE64_AUTH>';

  async send(events: ClickStreamEvent[]): Promise<void> {
    await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.kafka.json.v2+json',
        'Authorization': this.authHeader,
      },
      body: JSON.stringify({
        records: events.map(e => ({ value: e })),
      }),
    });
  }
}
```

### 4.3 ConfluentProvider (stub)

```typescript
class ConfluentProvider implements KafkaProvider {
  async send(_events: ClickStreamEvent[]): Promise<void> {
    // Not implemented — prepared for future Confluent Cloud integration.
    // Will use Confluent REST Proxy v3 or Schema Registry when configured.
  }
}
```

### 4.4 ClickStreamService (Singleton)

```typescript
class ClickStreamService {
  private context: ClickStreamContext | null = null;
  private sequence = 0;
  private queue: ClickStreamEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private provider: KafkaProvider = new AivenProvider();

  // Session-level mutable enrichment
  private isOnline = true;
  private isQrFlow = false;
  private visitTypeId: number | null = null;
  private visitTypeName: string | null = null;
  private approvalMode: string | null = null;

  // --- Public API ---

  init(context: ClickStreamContext): void
  // Sets session context, resets sequence to 0, starts 5-second flush timer

  track(eventName: string, step: number | null, properties?: Record<string, string>): void
  // Builds ClickStreamEvent from context + current enrichment, pushes to queue
  // If queue.length >= 10: flush immediately (fire-and-forget)

  setVisitContext(visitTypeId: number | null, visitTypeName: string | null): void
  setApprovalMode(mode: string | null): void
  setQrFlow(isQr: boolean): void
  setOnlineStatus(isOnline: boolean): void

  destroy(): void
  // Clears flush timer. Attempts final flush of remaining queue.

  // --- Private ---

  private async flush(): Promise<void>
  // Drains queue into local snapshot, calls provider.send()
  // All errors silently caught — never throw, never affect UI
}

export const clickStreamService = new ClickStreamService();
```

### 4.5 Batching & Flushing Rules

| Trigger | Action |
|---------|--------|
| Queue reaches 10 events | Flush immediately |
| Every 5 seconds (timer) | Flush if queue non-empty |
| `destroy()` called | Final flush attempt |
| Network error | Events silently dropped — no retry, no IndexedDB |

---

## 5. Event Catalogue

### Step 1 — Visit Type Selection

| Event | Trigger | Properties |
|-------|---------|------------|
| `entry_started` | Component mounts | — |
| `visit_type_selected` | User clicks a visit type button | `{ visit_type_id, visit_type_name }` |
| `qr_modal_opened` | QR question modal shown (Visitor/Delivery/Service) | — |
| `qr_question_answered` | User clicks "Sim" or "Não" | `{ answer: 'yes' \| 'no' }` |
| `entry_cancelled` | User clicks back arrow on step 1 | `{ step: '1' }` |

### Step 2 — Visitor Details

| Event | Trigger | Properties |
|-------|---------|------------|
| `step2_reached` | `setStep(2)` executes | — |
| `unit_modal_opened` | User clicks unit selector button | — |
| `unit_selected` | User picks a unit | `{ unit_id, unit_label }` |
| `service_type_modal_opened` | User clicks service type button | — |
| `service_type_selected` | User picks a service type | `{ service_type_id, service_type_name }` |
| `restaurant_modal_opened` | User clicks restaurant button | — |
| `restaurant_selected` | User picks a restaurant | `{ restaurant_id, restaurant_name }` |
| `sport_modal_opened` | User clicks sport button | — |
| `sport_selected` | User picks a sport | `{ sport_id, sport_name }` |
| `step2_validation_passed` | User clicks "Seguinte" (valid form) | — |
| `step2_back_clicked` | User clicks "← Voltar" on step 2 | — |

### Step 3 — Photo & Approval

| Event | Trigger | Properties |
|-------|---------|------------|
| `step3_reached` | `setStep(3)` executes | — |
| `photo_captured` | `onCapture` callback fires with photo data | — |
| `photo_retaken` | User clicks "Repetir Foto" | — |
| `approval_mode_selected` | User picks an approval mode | `{ mode }` |
| `phone_call_initiated` | User clicks "Ligar" button | — |
| `intercom_call_initiated` | User clicks "Chamar" button | — |
| `qr_scan_started` | User clicks "Scan QRCODE" | — |
| `qr_scan_success` | QR validated successfully | `{ visitor_name, unit_id }` |
| `qr_scan_error` | QR validation failed | `{ error_message }` |
| `qr_scan_retry` | User clicks "Tentar Novamente" | — |
| `entry_submitted` | User clicks submit button | `{ approval_mode }` |
| `entry_created_success` | Visit created online | `{ visit_id, is_synced: 'true' }` |
| `entry_created_offline` | Visit saved locally (offline) | `{ temp_id }` |
| `step3_back_clicked` | User clicks "← Voltar" on step 3 | — |
| `entry_cancelled` | User clicks "Cancelar Leitura" (QR flow) | `{ step: '3', reason: 'qr_cancelled' }` |

**Total: 25 events**

---

## 6. Integration in `NewEntry.tsx`

### Mount / Unmount

```typescript
useEffect(() => {
  clickStreamService.init({
    session_id: crypto.randomUUID(),
    device_id: dataService.currentDeviceId,
    condominium_id: currentCondoId,
    guard_id: user?.id ?? null,
  });
  clickStreamService.track('entry_started', 1);

  return () => clickStreamService.destroy();
}, []);
```

### Online status sync

```typescript
useEffect(() => {
  clickStreamService.setOnlineStatus(dataService.checkOnline());
}, [/* on health score change */]);
```

### Handler instrumentation (examples)

```typescript
// Step 1: visit type click
function handleTypeSelect(typeConfig) {
  clickStreamService.setVisitContext(typeConfig.id, typeConfig.name);
  clickStreamService.track('visit_type_selected', 1, {
    visit_type_id: String(typeConfig.id),
    visit_type_name: typeConfig.name,
  });
  // ... existing logic
}

// Step 2: unit selected
function handleUnitSelect(unit) {
  clickStreamService.track('unit_selected', 2, {
    unit_id: String(unit.id),
    unit_label: `${unit.code_block} ${unit.number}`,
  });
  setUnitId(String(unit.id));
  setShowUnitModal(false);
}

// Step 3: photo captured
// In onCapture prop passed to CameraCapture:
onCapture={(data) => {
  if (data) clickStreamService.track('photo_captured', 3);
  setPhoto(data);
}}

// Submit
async function handleSubmit() {
  clickStreamService.track('entry_submitted', 3, { approval_mode: approvalMode ?? '' });
  // ... existing logic
  const visit = await api.createVisit(visitData);
  if (visit.id > 0) {
    clickStreamService.track('entry_created_success', 3, {
      visit_id: String(visit.id),
      is_synced: 'true',
    });
  } else {
    clickStreamService.track('entry_created_offline', 3, {
      temp_id: String(visit.id),
    });
  }
  navigate('/day-list');
}
```

---

## 7. Files Summary

| Action | Path |
|--------|------|
| Create | `src/schemas/clickStreamEvent.avsc` |
| Create | `src/services/clickStreamService.ts` |
| Modify | `src/pages/NewEntry.tsx` |

---

## 8. Security Note

The Aiven credentials (`avnadmin:<AIVEN_PASSWORD>`) are embedded in the browser bundle and therefore visible to anyone who inspects it. This is acceptable if:

- The credentials are **write-only** (no read/admin permissions)
- Or Aiven has **IP filtering** or **rate limiting** configured

If stricter security is required, proxy requests through a **Vercel Edge Function** or **Supabase Edge Function** to keep credentials server-side.

---

## 9. Verification Checklist

- [ ] Open NewEntry → `entry_started` arrives in `tp_visits` topic
- [ ] Select visit type → `visit_type_selected` event with correct `visit_type_id`
- [ ] Complete full flow → all events share same `session_id`, `sequence_number` increments correctly
- [ ] Offline mode → complete flow → no UI errors, events silently dropped
- [ ] Queue of 10 → flush fires immediately (not waiting 5 seconds)
- [ ] Timer flush → after 5 seconds of inactivity with queued events
- [ ] Inspect Aiven topic via REST: `GET /topics/tp_visits/messages`
