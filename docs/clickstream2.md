# Clickstream v2 — Entry Registration Flow (Kafka via HTTP)

**Project**: Elite AccessControl
**Date**: 2026-02-21
**Author**: Chong Technologies
**Supersedes**: clickstream1.md (adds richer schema, flow variants, form field tracking, PII protection)

---

## 1. Overview

The entry registration flow (`NewEntry.tsx`) has **22 distinct event types** across 3 wizard steps. This document defines the clickstream design: the Avro schema, the service architecture, the Kafka provider abstraction, and every tracking call to instrument in the UI.

Events are **analytics-only** — fire-and-forget, never block the UI, never persist to IndexedDB.

### What changed from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Schema fields | 14 (flat + properties map) | 22 (explicit fields, no generic map) |
| Event types | 25 | 22 (consolidated, more precise) |
| Flow context | `is_qr_flow` boolean | `flow_variant`: `qr_scan` / `normal` / `free_entry` |
| Form tracking | Not tracked | `form_field_focus` / `form_field_blur` with PII protection |
| Modal lifecycle | Only open + select | `modal_open` / `modal_close` / `modal_item_select` |
| PII handling | Implicit | Explicit rule: never log PII values |
| Provider config | Hardcoded URL | Environment variables (`VITE_KAFKA_*`) |
| Retry strategy | No retry | 3 attempts with exponential backoff |

---

## 2. Kafka Providers

### 2.1 Aiven (Active)

| Property | Value |
|----------|-------|
| Endpoint | `${VITE_KAFKA_REST_URL}/topics/${VITE_KAFKA_TOPIC}` |
| Method | POST |
| Content-Type | `application/vnd.kafka.json.v2+json` |
| Auth | Basic Auth — `${VITE_KAFKA_USER}:${VITE_KAFKA_PASSWORD}` |
| Payload | `{ "records": [{ "value": <ClickstreamEvent> }] }` |

Example curl:
```bash
curl -X POST \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -H "Authorization: Basic <BASE64_AUTH>" \
  -d '{"records": [{"value": {"event_id": "uuid", "event_type": "step_view", "session_id": "uuid"}}]}' \
  'https://kafka-elite-access-control-elite-access-control.b.aivencloud.com:23834/topics/tp_visits'
```

### 2.2 Confluent Cloud (Future — stub only)

Prepared in the service via `ConfluentProvider` class. Not implemented yet. Will use Confluent REST Proxy v3 / Schema Registry when configured. Selected via `VITE_KAFKA_PROVIDER=confluent`.

---

## 3. Avro Schema

**File**: `src/schemas/clickstreamEvent.avsc`

```json
{
  "type": "record",
  "name": "ClickstreamEvent",
  "namespace": "com.eliteaccesscontrol.clickstream",
  "doc": "Tracks user interactions during the entry registration flow (v2)",
  "fields": [
    { "name": "event_id",          "type": "string",                        "doc": "UUID v4, unique per event" },
    { "name": "event_type",        "type": "string",                        "doc": "One of 22 event types (see catalogue)" },
    { "name": "event_at",          "type": "string",                        "doc": "ISO 8601 UTC timestamp" },
    { "name": "session_id",        "type": "string",                        "doc": "UUID generated per NewEntry mount" },
    { "name": "flow_sequence",     "type": "int",                           "doc": "Monotonically increasing within session, starts at 1" },
    { "name": "device_identifier", "type": "string",                        "doc": "Tablet device UUID from localStorage" },
    { "name": "condominium_id",    "type": "int",                           "doc": "Condominium the device belongs to" },
    { "name": "guard_id",          "type": "int",                           "doc": "Staff ID of logged-in guard" },
    { "name": "guard_role",        "type": "string",                        "doc": "ADMIN | GUARD | SUPER_ADMIN" },
    { "name": "page",              "type": "string",                        "doc": "Always 'new_entry' for this flow" },
    { "name": "step",              "type": ["null", "int"],    "default": null, "doc": "Current wizard step: 1, 2, 3, or null" },
    { "name": "component",         "type": "string",                        "doc": "Logical component: visit_type_card, unit_modal, camera_capture, etc." },
    { "name": "flow_variant",      "type": ["null", "string"], "default": null, "doc": "qr_scan | normal | free_entry" },
    { "name": "visit_type_id",     "type": ["null", "string"], "default": null, "doc": "Selected visit type ID (set after step 1)" },
    { "name": "visit_type_name",   "type": ["null", "string"], "default": null, "doc": "Human-readable visit type name" },
    { "name": "action",            "type": "string",                        "doc": "Verb: select, focus, blur, open, close, submit, view, back, etc." },
    { "name": "element_id",        "type": ["null", "string"], "default": null, "doc": "DOM-like identifier for the element interacted with" },
    { "name": "value_selected",    "type": ["null", "string"], "default": null, "doc": "Value selected (ID, mode name, 'filled'/'empty')" },
    { "name": "value_label",       "type": ["null", "string"], "default": null, "doc": "Human-readable label (unit block+number, restaurant name)" },
    { "name": "qr_result_valid",   "type": ["null", "boolean"],"default": null, "doc": "Only set for qr_scan_result events" },
    { "name": "is_online",         "type": "boolean",                       "doc": "navigator.onLine at time of event" },
    { "name": "error_message",     "type": ["null", "string"], "default": null, "doc": "Only set for form_submit_error events" }
  ]
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | string | UUID v4 — unique per event |
| `event_type` | string | One of 22 event types (see catalogue) |
| `event_at` | string | ISO 8601 UTC at time of interaction |
| `session_id` | string | UUID per NewEntry page mount — groups all events in one flow |
| `flow_sequence` | int | Monotonically increasing within session |
| `device_identifier` | string | Tablet device UUID |
| `condominium_id` | int | Condominium the device belongs to |
| `guard_id` | int | Staff ID of the logged-in guard |
| `guard_role` | string | UserRole enum value |
| `page` | string | Always `'new_entry'` (reserved for future pages) |
| `step` | int? | Current wizard step: 1, 2, 3, or null |
| `component` | string | Logical component name |
| `flow_variant` | string? | `qr_scan` / `normal` / `free_entry` — set after visit type chosen |
| `visit_type_id` | string? | Selected visit type ID |
| `visit_type_name` | string? | Human-readable visit type name |
| `action` | string | Verb describing the interaction |
| `element_id` | string? | Identifier for the interacted element |
| `value_selected` | string? | Value selected (never PII — only IDs, modes, `'filled'`/`'empty'`) |
| `value_label` | string? | Human-readable label for the selection |
| `qr_result_valid` | boolean? | QR validation result (only for `qr_scan_result`) |
| `is_online` | boolean | Network status at time of event |
| `error_message` | string? | Error details (only for `form_submit_error`) |

---

## 4. Service Architecture

**File**: `src/services/clickstreamService.ts`

### 4.1 TypeScript Interfaces

```typescript
// Event types
type ClickstreamEventType =
  | 'step_view' | 'visit_type_select' | 'qr_question_shown' | 'qr_question_response'
  | 'form_field_focus' | 'form_field_blur'
  | 'modal_open' | 'modal_close' | 'modal_item_select' | 'step2_next'
  | 'photo_capture' | 'photo_retake'
  | 'qr_scan_start' | 'qr_scan_result'
  | 'approval_mode_select' | 'phone_call_initiate' | 'intercom_call_initiate'
  | 'form_submit' | 'form_submit_success' | 'form_submit_error'
  | 'navigation_back' | 'flow_abandon';

type VisitFlowVariant = 'qr_scan' | 'normal' | 'free_entry';

interface ClickstreamEvent {
  event_id: string;
  event_type: ClickstreamEventType;
  event_at: string;
  session_id: string;
  flow_sequence: number;
  device_identifier: string;
  condominium_id: number;
  guard_id: number;
  guard_role: string;
  page: string;
  step: number | null;
  component: string;
  flow_variant: VisitFlowVariant | null;
  visit_type_id: string | null;
  visit_type_name: string | null;
  action: string;
  element_id: string | null;
  value_selected: string | null;
  value_label: string | null;
  qr_result_valid: boolean | null;
  is_online: boolean;
  error_message: string | null;
}

interface ClickstreamIdentity {
  deviceIdentifier: string;
  condominiumId: number;
  guardId: number;
  guardRole: string;
}

interface IClickstreamProvider {
  sendBatch(events: ClickstreamEvent[]): Promise<void>;
  readonly providerName: string;
}
```

### 4.2 AivenProvider

```typescript
class AivenProvider implements IClickstreamProvider {
  readonly providerName = 'Aiven';
  private readonly endpoint: string;
  private readonly authHeader: string;

  constructor() {
    const host = import.meta.env.VITE_KAFKA_REST_URL;
    const topic = import.meta.env.VITE_KAFKA_TOPIC ?? 'tp_visits';
    const user = import.meta.env.VITE_KAFKA_USER ?? 'avnadmin';
    const pass = import.meta.env.VITE_KAFKA_PASSWORD;
    this.endpoint = `${host}/topics/${topic}`;
    this.authHeader = 'Basic ' + btoa(`${user}:${pass}`);
  }

  async sendBatch(events: ClickstreamEvent[]): Promise<void> {
    const response = await fetch(this.endpoint, {
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
      throw new Error(`Kafka HTTP ${response.status}: ${await response.text()}`);
    }
  }
}
```

### 4.3 ConfluentProvider (stub)

```typescript
class ConfluentProvider implements IClickstreamProvider {
  readonly providerName = 'Confluent';

  async sendBatch(_events: ClickstreamEvent[]): Promise<void> {
    // Not implemented — prepared for future Confluent Cloud integration.
    // Will use Confluent REST Proxy v3 or Schema Registry when configured.
    throw new Error('ConfluentProvider not yet implemented');
  }
}
```

### 4.4 ClickstreamService (Singleton)

```typescript
const FLUSH_INTERVAL_MS = 5_000;   // Flush every 5 seconds
const MAX_BATCH_SIZE = 50;         // Max events per HTTP call
const MAX_BUFFER_SIZE = 500;       // Safety cap: drop oldest if exceeded
const MAX_RETRY_ATTEMPTS = 3;      // Retry with 1s, 2s backoff

class ClickstreamService {
  private provider: IClickstreamProvider;
  private buffer: ClickstreamEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string = '';
  private flowSequence: number = 0;

  // Identity state — set by the component on mount
  private deviceIdentifier: string = '';
  private condominiumId: number = 0;
  private guardId: number = 0;
  private guardRole: string = '';

  constructor() {
    const providerName = import.meta.env.VITE_KAFKA_PROVIDER ?? 'aiven';
    this.provider = providerName === 'confluent'
      ? new ConfluentProvider()
      : new AivenProvider();
    this.startFlushTimer();
  }

  // --- Public API ---

  setIdentity(identity: ClickstreamIdentity): void
  // Sets device/guard/condo context for all subsequent events

  startSession(): void
  // Generates new sessionId via crypto.randomUUID(), resets flowSequence to 0

  track(params: TrackParams): void
  // Builds full ClickstreamEvent from identity + params, pushes to buffer
  // Synchronous — never blocks, never throws
  // If buffer >= MAX_BUFFER_SIZE: evict oldest event

  stopSession(): void
  // Triggers final flush, called on component unmount

  // --- Private ---

  private async flush(): Promise<void>
  // Drains up to MAX_BATCH_SIZE events, calls provider.sendBatch()
  // On failure: retry with exponential backoff (1s, 2s)
  // After MAX_RETRY_ATTEMPTS: silently drop — never affect UI

  private startFlushTimer(): void
  // setInterval(flush, FLUSH_INTERVAL_MS)

  private generateUUID(): string
  // crypto.randomUUID() with polyfill fallback
}

export const clickstreamService = new ClickstreamService();
```

### 4.5 `track()` Method — Simplified API

The `track()` method auto-fills metadata fields. Callers only provide event-specific fields:

```typescript
// What the caller provides:
interface TrackParams {
  event_type: ClickstreamEventType;
  step: number | null;
  component: string;
  action: string;
  element_id?: string | null;
  flow_variant?: VisitFlowVariant | null;
  visit_type_id?: string | null;
  visit_type_name?: string | null;
  value_selected?: string | null;
  value_label?: string | null;
  qr_result_valid?: boolean | null;
  error_message?: string | null;
}

// What gets auto-filled:
// event_id, event_at, session_id, flow_sequence,
// device_identifier, condominium_id, guard_id, guard_role,
// page ('new_entry'), is_online (navigator.onLine)
```

### 4.6 Batching & Flushing Rules

| Trigger | Action |
|---------|--------|
| Every 5 seconds (timer) | Flush if buffer non-empty |
| Buffer reaches MAX_BATCH_SIZE (50) | Immediate flush |
| `stopSession()` called (unmount) | Final flush attempt |
| Network error | Retry 3x (1s, 2s backoff), then silently drop |
| Buffer overflow (500) | Evict oldest event |

---

## 5. Event Catalogue

### Step 1 — Visit Type Selection

| # | event_type | component | action | element_id | value_selected | value_label |
|---|---|---|---|---|---|---|
| 1 | `step_view` | `step1_container` | `view` | — | — | — |
| 2 | `visit_type_select` | `visit_type_card` | `select` | `visit_type_card` | `typeConfig.id` | `typeConfig.name` |
| 3 | `qr_question_shown` | `qr_question_modal` | `open` | `qr_question_modal` | — | — |
| 4 | `qr_question_response` | `qr_question_modal` | `select` | `qr_question_yes_btn` / `qr_question_no_btn` | `'yes'` / `'no'` | — |
| 21 | `navigation_back` | `nav_header` | `back` | `back_btn_step1` | — | — |

### Step 2 — Visitor Details

| # | event_type | component | action | element_id | value_selected | value_label |
|---|---|---|---|---|---|---|
| 1 | `step_view` | `step2_form` | `view` | — | — | — |
| 5 | `form_field_focus` | `visitor_details_form` | `focus` | `visitor_name_input` etc. | — | — |
| 6 | `form_field_blur` | `visitor_details_form` | `blur` | `visitor_name_input` etc. | `'filled'` / `'empty'` | — |
| 7 | `modal_open` | `unit_modal` / `service_modal` / `restaurant_modal` / `sport_modal` | `open` | modal name | — | — |
| 8 | `modal_close` | (same) | `close` | modal name | — | — |
| 9 | `modal_item_select` | `unit_modal` | `select` | `unit_modal_item` | `unit.id` | `Bloco X - N` |
| 9 | `modal_item_select` | `service_modal` | `select` | `service_modal_item` | `serviceType.id` | `serviceType.name` |
| 9 | `modal_item_select` | `restaurant_modal` | `select` | `restaurant_modal_item` | `restaurant.id` | `restaurant.name` |
| 9 | `modal_item_select` | `sport_modal` | `select` | `sport_modal_item` | `sport.id` | `sport.name` |
| 10 | `step2_next` | `step2_form` | `next` | `step2_next_btn` | — | — |
| 21 | `navigation_back` | `nav_header` | `back` | `back_btn_step2` | — | — |

### Step 3 — Photo & Approval

| # | event_type | component | action | element_id | value_selected | value_label |
|---|---|---|---|---|---|---|
| 1 | `step_view` | `step3_container` | `view` | — | — | — |
| 11 | `photo_capture` | `camera_capture` | `capture` | `camera_shutter_btn` | — | — |
| 12 | `photo_retake` | `camera_capture` | `retake` | `camera_retake_btn` | — | — |
| 13 | `qr_scan_start` | `qr_scanner` | `start` | `qr_scan_btn` | — | — |
| 14 | `qr_scan_result` | `qr_scanner` | `result` | `qr_scanner` | `'valid'` / `'invalid'` | `result.message` |
| 15 | `approval_mode_select` | `approval_mode_selector` | `select` | `approval_mode_btn` | `mode` (e.g. `'APP'`) | `config.label` |
| 16 | `phone_call_initiate` | `approval_mode_selector` | `call` | `phone_call_btn` | — | — |
| 17 | `intercom_call_initiate` | `approval_mode_selector` | `call` | `intercom_call_btn` | — | — |
| 21 | `navigation_back` | `nav_header` | `back` | `back_btn_step3` | — | — |

### Submission

| # | event_type | component | action | element_id | value_selected | Notes |
|---|---|---|---|---|---|---|
| 18 | `form_submit` | `submit_section` | `submit` | `submit_btn` | `approval_mode` | step = 3 |
| 19 | `form_submit_success` | `submit_section` | `success` | — | `visit.id` | step = null |
| 20 | `form_submit_error` | `submit_section` | `error` | — | — | `error_message` set |

### Lifecycle

| # | event_type | component | action | Notes |
|---|---|---|---|---|
| 22 | `flow_abandon` | `new_entry_page` | `unmount` | Fired on component unmount if no `form_submit_success` was recorded |

**Total: 22 event types**

---

## 6. PII Protection Rules

| Field | Tracked? | How |
|-------|----------|-----|
| `visitor_name` | NO | Only `'filled'` / `'empty'` on blur |
| `visitor_doc` | NO | Only `'filled'` / `'empty'` on blur |
| `visitor_phone` | NO | Only `'filled'` / `'empty'` on blur |
| `vehicle_plate` | NO | Only `'filled'` / `'empty'` on blur |
| `reason` | NO | Only `'filled'` / `'empty'` on blur |
| Phone numbers (call initiation) | NO | Not included in event |
| QR code tokens | NO | Only `is_valid` boolean tracked |
| Unit selection | YES | Unit ID + block/number label (not PII) |
| Guard ID | YES | Internal system identifier (not PII) |

---

## 7. Integration in `NewEntry.tsx`

### 7.1 Mount / Unmount

```typescript
import { clickstreamService } from '@/services/clickstreamService';
import { getDeviceIdentifier } from '@/services/deviceUtils';

// Inside NewEntry component:
useEffect(() => {
  clickstreamService.setIdentity({
    deviceIdentifier: getDeviceIdentifier(),
    condominiumId: user?.condominium_id ?? 0,
    guardId: user?.id ?? 0,
    guardRole: user?.role ?? '',
  });
  clickstreamService.startSession();
  clickstreamService.track({
    event_type: 'step_view',
    step: 1,
    component: 'step1_container',
    action: 'view',
  });

  return () => clickstreamService.stopSession();
}, []);
```

### 7.2 Step Transitions

```typescript
useEffect(() => {
  if (step === 1) return; // Tracked on mount
  clickstreamService.track({
    event_type: 'step_view',
    step,
    component: step === 2 ? 'step2_form' : 'step3_container',
    action: 'view',
    flow_variant: deriveFlowVariant(),
    visit_type_id: selectedType ? String(selectedType) : null,
    visit_type_name: selectedTypeConfig?.name ?? null,
  });
}, [step]);

// Helper
const deriveFlowVariant = (): VisitFlowVariant | null => {
  if (!selectedTypeConfig) return null;
  if (approvalMode === ApprovalMode.QR_SCAN) return 'qr_scan';
  if (selectedTypeConfig.requires_restaurant || selectedTypeConfig.requires_sport) return 'free_entry';
  return 'normal';
};
```

### 7.3 Visit Type Selection (~L131)

```typescript
function handleTypeSelect(typeConfig: VisitTypeConfig) {
  clickstreamService.track({
    event_type: 'visit_type_select',
    step: 1,
    component: 'visit_type_card',
    action: 'select',
    element_id: 'visit_type_card',
    value_selected: String(typeConfig.id),
    value_label: typeConfig.name,
  });

  // If QR modal opens:
  if (shouldShowQrModal) {
    clickstreamService.track({
      event_type: 'qr_question_shown',
      step: 1,
      component: 'qr_question_modal',
      action: 'open',
      element_id: 'qr_question_modal',
      visit_type_id: String(typeConfig.id),
      visit_type_name: typeConfig.name,
    });
  }

  // ... existing logic
}
```

### 7.4 QR Question Response (~L150)

```typescript
function handleQrQuestionResponse(hasQr: boolean) {
  clickstreamService.track({
    event_type: 'qr_question_response',
    step: 1,
    component: 'qr_question_modal',
    action: 'select',
    element_id: hasQr ? 'qr_question_yes_btn' : 'qr_question_no_btn',
    flow_variant: hasQr ? 'qr_scan' : 'normal',
    value_selected: hasQr ? 'yes' : 'no',
  });
  // ... existing logic
}
```

### 7.5 Form Field Tracking (Step 2 inputs)

Pattern applied to all 5 fields (`visitor_name`, `visitor_doc`, `visitor_phone`, `vehicle_plate`, `reason`):

```typescript
<input
  // ... existing props
  onFocus={() => clickstreamService.track({
    event_type: 'form_field_focus',
    step: 2,
    component: 'visitor_details_form',
    action: 'focus',
    element_id: 'visitor_name_input',
  })}
  onBlur={(e) => clickstreamService.track({
    event_type: 'form_field_blur',
    step: 2,
    component: 'visitor_details_form',
    action: 'blur',
    element_id: 'visitor_name_input',
    value_selected: e.target.value.trim() ? 'filled' : 'empty',
  })}
/>
```

### 7.6 Modal Tracking (Step 2)

```typescript
// Open modal
onClick={() => {
  clickstreamService.track({
    event_type: 'modal_open', step: 2, component: 'unit_modal',
    action: 'open', element_id: 'unit_modal',
  });
  setShowUnitModal(true);
}}

// Select item in modal
onClick={() => {
  clickstreamService.track({
    event_type: 'modal_item_select', step: 2, component: 'unit_modal',
    action: 'select', element_id: 'unit_modal_item',
    value_selected: String(u.id),
    value_label: `Bloco ${u.code_block || '-'} - ${u.number}`,
  });
  setUnitId(String(u.id));
  setShowUnitModal(false);
}}

// Close modal without selection
onClick={() => {
  clickstreamService.track({
    event_type: 'modal_close', step: 2, component: 'unit_modal',
    action: 'close', element_id: 'unit_modal',
  });
  setShowUnitModal(false);
}}
```

Same pattern for `service_modal`, `restaurant_modal`, `sport_modal`.

### 7.7 Photo & Approval (Step 3)

```typescript
// Photo capture (wrap existing handlePhotoCapture)
const handlePhotoCapture = (photoDataUrl: string) => {
  setPhoto(photoDataUrl);
  if (photoDataUrl) {
    clickstreamService.track({
      event_type: 'photo_capture', step: 3, component: 'camera_capture',
      action: 'capture', element_id: 'camera_shutter_btn',
    });
  }
};

// Photo retake — via onPhotoRetaken callback prop on CameraCapture
onPhotoRetaken={() => clickstreamService.track({
  event_type: 'photo_retake', step: 3, component: 'camera_capture',
  action: 'retake', element_id: 'camera_retake_btn',
})}

// Approval mode — wrap onModeSelect
onModeSelect={(mode) => {
  clickstreamService.track({
    event_type: 'approval_mode_select', step: 3, component: 'approval_mode_selector',
    action: 'select', element_id: 'approval_mode_btn',
    value_selected: mode,
  });
  setApprovalMode(mode);
}}

// Phone/intercom — via callback props on ApprovalModeSelector
onPhoneCallInitiated={() => clickstreamService.track({
  event_type: 'phone_call_initiate', step: 3, component: 'approval_mode_selector',
  action: 'call', element_id: 'phone_call_btn',
})}
onIntercomCallInitiated={() => clickstreamService.track({
  event_type: 'intercom_call_initiate', step: 3, component: 'approval_mode_selector',
  action: 'call', element_id: 'intercom_call_btn',
})}
```

### 7.8 QR Scan Flow (Step 3)

```typescript
// Start scan (~L711)
onClick={() => {
  clickstreamService.track({
    event_type: 'qr_scan_start', step: 3, component: 'qr_scanner',
    action: 'start', element_id: 'qr_scan_btn', flow_variant: 'qr_scan',
  });
  handlePerformScan();
}}

// Scan result (inside handleQrScanned, after validation)
clickstreamService.track({
  event_type: 'qr_scan_result', step: 3, component: 'qr_scanner',
  action: 'result', element_id: 'qr_scanner', flow_variant: 'qr_scan',
  value_selected: result?.is_valid ? 'valid' : 'invalid',
  qr_result_valid: result?.is_valid ?? false,
});
```

### 7.9 Submit (~L220)

```typescript
async function handleSubmit() {
  clickstreamService.track({
    event_type: 'form_submit', step: 3, component: 'submit_section',
    action: 'submit', element_id: 'submit_btn',
    value_selected: approvalMode,
  });

  // ... existing validation (alert returns) ...

  try {
    const visit = await api.createVisit(visitData);
    // ... existing logAudit ...

    clickstreamService.track({
      event_type: 'form_submit_success', step: null, component: 'submit_section',
      action: 'success', value_selected: String(visit.id),
    });

    navigate('/day-list');
  } catch (err) {
    clickstreamService.track({
      event_type: 'form_submit_error', step: null, component: 'submit_section',
      action: 'error',
      error_message: err instanceof Error ? err.message : String(err),
    });
  }
}
```

### 7.10 Navigation Back

```typescript
// Step 1 back → Dashboard
onClick={() => {
  clickstreamService.track({
    event_type: 'navigation_back', step: 1, component: 'nav_header',
    action: 'back', element_id: 'back_btn_step1',
  });
  navigate('/');
}}

// Step 2/3 back → previous step
onClick={() => {
  clickstreamService.track({
    event_type: 'navigation_back', step, component: 'nav_header',
    action: 'back', element_id: `back_btn_step${step}`,
  });
  setStep((step - 1) as any);
}}
```

---

## 8. Files Summary

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/schemas/clickstreamEvent.avsc` | Avro schema file |
| Create | `src/services/clickstreamService.ts` | Singleton service with provider abstraction |
| Modify | `src/types.ts` | Add `ClickstreamEventType`, `VisitFlowVariant`, `ClickstreamEvent` |
| Modify | `src/pages/NewEntry.tsx` | Instrument all 22 event types |
| Modify | `src/components/CameraCapture.tsx` | Add optional `onPhotoRetaken` callback prop |
| Modify | `src/components/ApprovalModeSelector.tsx` | Add optional `onPhoneCallInitiated`, `onIntercomCallInitiated` props |
| Modify | `.env.local` | Add `VITE_KAFKA_*` environment variables |

---

## 9. Environment Variables

Add to `.env.local`:

```env
VITE_KAFKA_REST_URL=https://kafka-elite-access-control-elite-access-control.b.aivencloud.com:23834
VITE_KAFKA_USER=avnadmin
VITE_KAFKA_PASSWORD=<AIVEN_PASSWORD>
VITE_KAFKA_TOPIC=tp_visits
VITE_KAFKA_PROVIDER=aiven
```

---

## 10. Implementation Order

1. Add types to `src/types.ts`
2. Create `src/schemas/clickstreamEvent.avsc`
3. Create `src/services/clickstreamService.ts`
4. Add env vars to `.env.local`
5. Add callback props to `CameraCapture.tsx` and `ApprovalModeSelector.tsx`
6. Instrument `NewEntry.tsx` (all 22 event types)

---

## 11. Security Note

The Aiven credentials are now in environment variables (`VITE_KAFKA_*`) but are still embedded in the browser bundle via Vite's `import.meta.env`. This is acceptable if:

- The credentials are **write-only** (no read/admin permissions on the topic)
- Or Aiven has **IP filtering** or **rate limiting** configured

If stricter security is required, proxy requests through a **Vercel Edge Function** or **Supabase Edge Function** to keep credentials server-side.

---

## 12. Known Risk: CORS

The Aiven Kafka REST Proxy may not have CORS headers configured for browser-origin requests. If blocked during testing, we'll need a lightweight proxy (Vercel/Supabase Edge Function) to relay events. This will be discovered during verification step 1.

---

## 13. Verification Checklist

- [ ] Open NewEntry → `step_view` (step 1) arrives in `tp_visits` topic
- [ ] Select visit type → `visit_type_select` event with correct `visit_type_id`
- [ ] Focus/blur form fields → `form_field_focus` / `form_field_blur` with `'filled'`/`'empty'` (never PII)
- [ ] Open/select/close modals → `modal_open` / `modal_item_select` / `modal_close` events
- [ ] Take photo → `photo_capture` event; retake → `photo_retake` event
- [ ] QR scan flow → `qr_scan_start` + `qr_scan_result` events
- [ ] Complete full flow → all events share same `session_id`, `flow_sequence` increments correctly
- [ ] Submit → `form_submit` + `form_submit_success` with visit ID
- [ ] Offline mode → complete flow → no UI errors, events buffered and flushed on reconnect
- [ ] Timer flush → events flushed every 5 seconds
- [ ] Buffer overflow → oldest events evicted, no memory growth
- [ ] Network error → retry 3x, then silently drop
- [ ] Inspect Aiven topic via console or REST consumer
