# 05. Twilio IVR Voice Calls — Guard Entry Approval

**Priority:** High
**Effort:** Medium
**Status:** Designed — Ready for Implementation

---

## Context

Guards at condo gates use tablets (no SIM card). The current "Telefone" approval mode uses a native `tel:` URI that silently fails on tablets without phone capability. This feature replaces it with a server-side Twilio IVR call:

1. Guard clicks "Ligar" on NewEntry step 3 (PHONE approval mode, no QR, no resident app)
2. Twilio calls the resident's Angola (+244) number
3. TTS message in Portuguese: *"Visitante [nome] aguarda na portaria. Para autorizar, pressione 1. Para recusar, pressione 2."*
4. Resident presses 1 (sim) or 2 (não) via DTMF
5. Guard's screen updates in real-time via Supabase Realtime:
   - **1 pressed → APPROVED** → "Registar Entrada" button unlocks
   - **2 pressed → DENIED** → button locked, retry available
   - **No answer / timeout → NO_ANSWER** → retry available

---

## Pricing (Angola +244)

| Destination | Rate |
|---|---|
| Angola Mobile (9XX) | ~$0.53 / min |
| Angola Landline (2XX) | ~$0.81 / min |
| Twilio phone number | ~$1.15 / month |

Typical IVR interaction (~30 sec): **~$0.27–$0.53 per call attempt**.

---

## Architecture

```
Guard clicks "Ligar"
        │
        ▼
DataService.initiateResidentCall(params)
        │
        ▼
Edge Function: send-call
  • Inserts call_sessions row (status: CALLING)
  • Calls Twilio REST API → Twilio dials resident's Angola number
  • TwiML <Gather> plays PT message, action → twilio-call-webhook?type=gather&sessionId=X
  • statusCallback → twilio-call-webhook?type=status&sessionId=X
        │
        ▼ (Twilio calls +244 resident)
Resident hears:
  "Visitante [nome] aguarda na portaria.
   Para autorizar a entrada, pressione 1.
   Para recusar, pressione 2."
        │
        ├── presses 1 → APPROVED
        ├── presses 2 → DENIED
        └── no answer / timeout → NO_ANSWER
                │
                ▼
        Edge Function: twilio-call-webhook
          • Updates call_sessions row
          • Returns TwiML farewell
                │
                ▼
        Supabase Realtime → Guard UI updates
```

---

## Pre-requisites (Twilio Console)

1. **Upgrade Twilio account** from Trial — Trial only calls verified numbers, not enough for production
2. **Buy a Twilio number with Voice capability** (~$1.15/month)
   - Path: `Twilio Console > Phone Numbers > Manage > Active numbers`
   - Confirm the `Voice` capability checkbox is enabled
3. **Enable Angola geo permissions**
   - Path: `Twilio Console > Voice > Settings > Geo permissions`
   - Enable Angola / `+244` for outbound voice calls
4. **Set Supabase secrets** (reuse same secrets as SMS):
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
   supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
   supabase secrets set TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```

### Trial Account Testing

For Trial accounts, add test numbers here before going live:
```
Twilio Console > Phone Numbers > Manage > Verified Caller IDs
```
Example: `+244933198143`

---

## Database Migration

**File:** `src/database/call_sessions.sql`

```sql
CREATE TABLE call_sessions (
  id                SERIAL PRIMARY KEY,

  -- Context
  -- visit_id is nullable: the call is made BEFORE the visit record is created.
  -- Visit is created only when guard clicks "Registar Entrada". Updated post-submit.
  visit_id          INTEGER REFERENCES visits(id) ON DELETE SET NULL,
  condominium_id    INTEGER NOT NULL REFERENCES condominiums(id),
  unit_id           INTEGER NOT NULL REFERENCES units(id),
  resident_id       INTEGER REFERENCES residents(id),
  guard_id          INTEGER NOT NULL REFERENCES staff(id),
  device_id         TEXT REFERENCES devices(id),

  -- Call details
  resident_phone    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'CALLING',
                    -- CALLING | APPROVED | DENIED | NO_ANSWER | FAILED
  twilio_call_sid   TEXT,

  -- Timestamps
  initiated_at      TIMESTAMPTZ DEFAULT NOW(),
  answered_at       TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_sessions_visit_id       ON call_sessions(visit_id);
CREATE INDEX idx_call_sessions_condominium_id ON call_sessions(condominium_id);
CREATE INDEX idx_call_sessions_guard_id       ON call_sessions(guard_id);

-- RLS: guards read their own sessions (required for Realtime subscription via anon key)
-- Webhook writes via service role key (bypasses RLS automatically)
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guards can view own call sessions"
  ON call_sessions FOR SELECT
  USING (
    guard_id IN (
      SELECT id FROM staff WHERE id = auth.uid()::integer
    )
  );

CREATE POLICY "Service role full access"
  ON call_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

Apply via `/db-migrate src/database/call_sessions.sql` or `mcp__supabase__apply_migration` (project: `nfuglaftnaohzacilike`).

Also add `call_sessions` DDL to `src/database/schema_complete.sql`.

---

## TypeScript Types (`src/types.ts`)

```typescript
export type CallStatus =
  | 'CALLING'
  | 'APPROVED'
  | 'DENIED'
  | 'NO_ANSWER'
  | 'FAILED'

export interface CallSession {
  id: number
  visit_id: number | null
  condominium_id: number
  unit_id: number
  resident_id: number | null
  guard_id: number
  device_id: string | null
  resident_phone: string
  status: CallStatus
  twilio_call_sid: string | null
  initiated_at: string
  answered_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  created_at: string
  updated_at: string
}
```

---

## Edge Functions

### `supabase/functions/send-call/index.ts`

**Request body:**
```json
{
  "visit_id": null,
  "resident_phone": "+244933198143",
  "visitor_name": "Marcos",
  "resident_id": 45,
  "unit_id": 12,
  "condominium_id": 3,
  "guard_id": 7,
  "device_id": "uuid-xxx"
}
```

**Success response:**
```json
{ "success": true, "sessionId": 1, "callId": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

**Failure response:**
```json
{ "success": false, "error": "Twilio error message" }
```

**Logic:**
1. Validate required fields: `resident_phone`, `visitor_name`, `unit_id`, `condominium_id`, `guard_id`
2. Normalize phone to E.164 via `normalizeAngolaPhone()`
3. Insert `call_sessions` row → get `sessionId`
4. Build webhook base URL from `Deno.env.get('SUPABASE_URL')` (auto-injected, resolves to `https://nfuglaftnaohzacilike.supabase.co`):
   ```
   ${supabaseUrl}/functions/v1/twilio-call-webhook
   ```
5. Build TwiML with `<Gather>`:
   ```xml
   <Response>
     <Gather numDigits="1" timeout="10"
       action="{webhookUrl}?type=gather&sessionId={sessionId}"
       method="POST">
       <Say language="pt-PT">
         Olá. O visitante {visitorName} aguarda na portaria.
         Para autorizar a entrada, pressione 1.
         Para recusar, pressione 2.
       </Say>
     </Gather>
     <Say language="pt-PT">Nenhuma resposta recebida. A visita ficará pendente.</Say>
   </Response>
   ```
6. POST to Twilio REST API (`https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json`):
   - `To`: normalizedPhone
   - `From`: `TWILIO_PHONE_NUMBER`
   - `Twiml`: TwiML string (XML-escaped)
   - `statusCallback`: `{webhookUrl}?type=status&sessionId={sessionId}`
   - `statusCallbackEvent`: `answered completed no-answer busy failed`
   - `timeout`: `20` (ring timeout seconds)
7. Update `call_sessions.twilio_call_sid` with Twilio's returned `sid`
8. Return `{ success: true, sessionId, callId: sid }`

**Error handling:** Surface known Twilio errors clearly (geo blocked, unverified number, insufficient balance, invalid number). Never log auth tokens.

**Helper functions:**
```typescript
function normalizeAngolaPhone(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '').replace(/^0+/, '')
  if (digits.startsWith('244')) return `+${digits}`
  return `+244${digits}`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
```

---

### `supabase/functions/twilio-call-webhook/index.ts`

Handles two event types via `?type=` query param. Uses `SUPABASE_SERVICE_ROLE_KEY` (auto-injected) for DB writes.

**Event: `type=gather`** (resident keypress via DTMF)

| Digits | DB update | TwiML response |
|---|---|---|
| `1` | `status='APPROVED'`, `updated_at=NOW()` | `<Say language="pt-PT">Entrada autorizada. Obrigado.</Say>` |
| `2` | `status='DENIED'`, `updated_at=NOW()` | `<Say language="pt-PT">Entrada recusada. Obrigado.</Say>` |
| _(none)_ | `status='NO_ANSWER'`, `updated_at=NOW()` | `<Response/>` |

Returns `Content-Type: text/xml`.

**Event: `type=status`** (Twilio call lifecycle)

| CallStatus | DB update |
|---|---|
| `answered` | `answered_at=NOW()` |
| `completed` | `ended_at=NOW()`, `duration_seconds={CallDuration}` |
| `no-answer` | `status='NO_ANSWER'`, `ended_at=NOW()` |
| `busy` | `status='FAILED'`, `ended_at=NOW()` |
| `failed` | `status='FAILED'`, `ended_at=NOW()` |

Returns HTTP 200 JSON (no TwiML needed).

**Deploy:**
```bash
supabase functions deploy send-call
supabase functions deploy twilio-call-webhook
```

---

## DataService (`src/services/dataService.ts`)

```typescript
async initiateResidentCall(params: {
  visitId: number | null
  residentPhone: string
  visitorName: string
  residentId: number | null
  unitId: number
  condominiumId: number
  guardId: number
  deviceId: string
}): Promise<{ success: boolean; sessionId?: number; callId?: string; error?: string }>
```

- If `!this.isBackendHealthy`: return `{ success: false, error: 'Chamada requer conexão à internet' }` — calls have no offline fallback
- Otherwise: delegate to `SupabaseService.initiateResidentCall(params)`
- Never throws — always returns structured result

Also add:
```typescript
async updateCallSessionVisitId(sessionId: number, visitId: number): Promise<void>
```
Called after visit creation on submit to link the session to the new visit.

---

## Supabase.ts (`src/services/Supabase.ts`)

```typescript
static async initiateResidentCall(params: InitiateCallParams): Promise<CallSessionResult> {
  const { data, error } = await supabase.functions.invoke('send-call', { body: params })
  if (error) throw error
  return data
}
```

---

## Frontend Changes

### Guard UI State Machine (`src/components/ApprovalModeSelector.tsx`)

```
IDLE
  │  guard clicks "Ligar"
  ▼
CALLING  ← spinner + "Chamando residente..."  (button disabled)
  │
  ├── Realtime UPDATE: status=APPROVED
  │     ▼
  │   APPROVED  ← green banner "✓ Residente autorizou entrada"
  │               "Registar Entrada" button UNLOCKS
  │
  ├── Realtime UPDATE: status=DENIED
  │     ▼
  │   DENIED  ← red banner "✗ Residente recusou entrada"
  │             "Ligar novamente" button available
  │
  ├── Realtime UPDATE: status=NO_ANSWER
  │     ▼
  │   NO_ANSWER  ← amber banner "Sem resposta. Tente novamente."
  │               "Ligar novamente" button available
  │
  └── network / Edge Function error
        ▼
      FAILED  ← red banner "Erro na chamada."
                "Tentar novamente" button available
```

**New props:**
```typescript
visitId: number | null
guardId: number
onCallSessionCreated?: (sessionId: number) => void
```

**New local state:**
```typescript
type CallState = 'IDLE' | 'CALLING' | 'APPROVED' | 'DENIED' | 'NO_ANSWER' | 'FAILED'
const [callState, setCallState] = useState<CallState>('IDLE')
const [callSessionId, setCallSessionId] = useState<number | null>(null)
```

**Realtime subscription** (mounts when `callSessionId` set, cleans up on unmount):
```typescript
supabase
  .channel(`call-session-${callSessionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'call_sessions',
    filter: `id=eq.${callSessionId}`
  }, (payload) => {
    const { status } = payload.new
    setCallState(status as CallState)
    if (status === 'APPROVED') onCallMade?.()
  })
  .subscribe()
```

**Button + banner by state:**

| State | Button | Banner |
|---|---|---|
| `IDLE` | Green "Ligar: +244..." | — |
| `CALLING` | Disabled spinner "Chamando..." | Blue "Aguardando resposta do residente..." |
| `APPROVED` | Hidden | Green "✓ Residente autorizou entrada" |
| `DENIED` | "Ligar novamente" | Red "✗ Residente recusou entrada" |
| `NO_ANSWER` | "Ligar novamente" | Amber "Sem resposta. Tente novamente." |
| `FAILED` | "Tentar novamente" | Red "Erro na chamada." |

Reset `callState` to `IDLE` and `callSessionId` to `null` when `unitId` or `approvalMode` changes.

### `src/utils/approvalModes.ts`
- Remove `initiatePhoneCall()` (native `tel:` URI — silently fails on tablets)
- Add `initiateResidentCall()` async function that calls `DataService.initiateResidentCall()`

### `src/pages/NewEntry.tsx`
- Pass `guardId` (from `currentUser.id`) and `onCallSessionCreated` callback to `ApprovalModeSelector`
- Track `callSessionId` in local state alongside existing `callMade`
- After visit is created on submit, call `DataService.updateCallSessionVisitId(callSessionId, newVisitId)` to link the session

---

## Implementation Order

1. [ ] Add `CallStatus` and `CallSession` to `src/types.ts`
2. [ ] Create migration `src/database/call_sessions.sql` + apply via `/db-migrate`
3. [ ] Add `call_sessions` DDL to `src/database/schema_complete.sql`
4. [ ] Create `supabase/functions/send-call/index.ts`
5. [ ] Create `supabase/functions/twilio-call-webhook/index.ts`
6. [ ] Deploy both Edge Functions
7. [ ] Add `initiateResidentCall()` and `updateCallSessionVisitId()` to `src/services/Supabase.ts`
8. [ ] Add `initiateResidentCall()` and `updateCallSessionVisitId()` to `src/services/dataService.ts`
9. [ ] Update `src/utils/approvalModes.ts` — replace `initiatePhoneCall()` with async Twilio call
10. [ ] Update `src/components/ApprovalModeSelector.tsx` — new props, state machine, Realtime sub
11. [ ] Update `src/pages/NewEntry.tsx` — pass `guardId`, track `callSessionId`, update on submit

---

## Security and Abuse Controls

Voice calls cost money. Add before production exposure:

- Restrict to authenticated staff/admin flows only
- Rate-limit calls per destination number (max 3 attempts per visit)
- Rate-limit calls per guard per hour
- Log all calls with `guard_id`, `twilio_call_sid`, destination, and result
- Never log Twilio auth tokens
- Use fixed TTS message template — do not accept arbitrary message text from frontend
- Future v2: verify `X-Twilio-Signature` header in webhook to prevent spoofed POSTs

---

## Error Handling (UI Messages)

| Twilio Error | Guard sees |
|---|---|
| Trial account / unverified number | "Número não verificado na conta Twilio." |
| Geo permissions blocked | "Chamadas para Angola não estão activadas. Contacte o administrador." |
| Twilio number has no Voice | "Número Twilio não suporta voz. Contacte o administrador." |
| Insufficient balance | "Saldo Twilio insuficiente. Contacte o administrador." |
| Invalid phone number | "Número de telefone inválido." |
| Network / Edge Function error | "Erro na chamada. Tente novamente." |

---

## Verification / Testing Checklist

- [ ] Confirm Twilio account is upgraded or test number is verified
- [ ] Confirm `TWILIO_PHONE_NUMBER` has Voice capability
- [ ] Confirm Angola `+244` enabled in Voice Geo Permissions
- [ ] Deploy `send-call` and `twilio-call-webhook`
- [ ] Test via curl with a verified Angola number — confirm `call_sessions` row created with `status=CALLING`
- [ ] Resident receives call → presses 1 → row updates to `APPROVED` → guard screen shows ✓ banner + button unlocks
- [ ] Resident presses 2 → `DENIED` → guard screen shows ✗ banner + "Ligar novamente"
- [ ] Call rings out (no answer) → `NO_ANSWER` → guard screen shows amber banner + retry button
- [ ] Test phone normalization: bare `933198143`, `244933198143`, `+244933198143` all normalize correctly
- [ ] Test offline guard: `isBackendHealthy=false` → immediate error, no call placed
- [ ] Verify `twilio_call_sid` in DB matches call in Twilio Console → Monitor → Logs → Calls
- [ ] Verify `answered_at`, `ended_at`, `duration_seconds` populated after completed call
- [ ] Confirm Twilio credentials never appear in Edge Function logs

---

## References

- Existing SMS documentation: `src/docs/SUPABASE_AND_TWILIO.md`
- Existing Edge Functions: `supabase/functions/send-video-call-push/`
- Twilio Console: `https://console.twilio.com/`
- Twilio Voice Geo Permissions: `Twilio Console > Voice > Settings > Geo permissions`
- Twilio Voice logs: `Twilio Console > Monitor > Logs > Calls`
- Twilio Angola pricing: `https://www.twilio.com/en-us/voice/pricing/ao`
- Supabase project ID: `nfuglaftnaohzacilike`
