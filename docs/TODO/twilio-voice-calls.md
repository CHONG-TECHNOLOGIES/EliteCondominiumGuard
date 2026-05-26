# 05. Twilio Voice Calls

**Priority:** High  
**Effort:** Medium  
**Status:** Planned

## Context

The Guard app already has SMS delivery documented through Supabase Edge Functions and Twilio. The next step is to add an equivalent voice-call function so the system can call a resident or visitor and play an automated message.

This is useful when SMS is not enough:

- call a resident for urgent entry confirmation
- call a visitor with access instructions
- provide an audio fallback for users who do not reliably read SMS
- support future emergency and incident workflows

## Current State in Codebase

**What already exists**

- SMS setup is documented in `src/docs/SUPABASE_AND_TWILIO.md`
- Supabase Edge Functions are already used in this repo
- Twilio credentials are expected as Supabase secrets:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
- The deployed `send-sms` function was verified successfully with Twilio
- The repo currently has `supabase/functions/send-video-call-push/index.ts`

**What is still missing**

- no `supabase/functions/send-call/index.ts`
- no `send-call` documentation in the main Twilio doc
- no frontend/service wrapper for voice calls
- no admin/test screen action for triggering a voice-call test
- no production policy for which flows are allowed to trigger calls

## Twilio Requirements

Before implementing or testing outbound calls, confirm these settings in the Twilio Console.

### 1. Account status

Check whether the Twilio account is Trial or upgraded.

Path:

```text
Twilio Console > Account/Billing
```

If the account is Trial:

- outbound calls can only be made to verified phone numbers
- Twilio may play a trial message before the custom message
- the Twilio `From` number must belong to the project or be a verified caller ID
- international destinations may still need explicit permission

### 2. Verified destination numbers for Trial accounts

For Trial accounts, add test numbers here:

```text
Twilio Console > Phone Numbers > Manage > Verified Caller IDs
```

Example test number:

```text
+244933198143
```

The user must receive a verification call or SMS from Twilio and enter the code in the Console.

### 3. Twilio number Voice capability

The number configured as `TWILIO_PHONE_NUMBER` must support Voice.

Path:

```text
Twilio Console > Phone Numbers > Manage > Active numbers
```

Open the active number and confirm it has the `Voice` capability. If it only supports SMS, buy a new Twilio number with the Voice filter enabled.

### 4. Geographic permissions for Angola

International voice calls may be blocked by Twilio geographic permissions.

Path:

```text
Twilio Console > Voice > Settings > Geo permissions
```

Enable Angola / `+244` for outbound voice calls.

## Supabase Secrets

The voice-call function can reuse the same Twilio secrets as SMS:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

No new secret is required for v1 if the same Twilio number supports both SMS and Voice.

## Edge Function Contract

Create:

```text
supabase/functions/send-call/index.ts
```

Request body:

```json
{
  "to": "+244933198143",
  "message": "Teste de chamada do Elite CondoGuard."
}
```

Success response:

```json
{
  "success": true,
  "callId": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Failure response:

```json
{
  "success": false,
  "error": "Twilio error message"
}
```

## Implementation Notes

Use Twilio Programmable Voice Calls API:

```text
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json
```

Required Twilio form fields:

- `To`: destination phone number in E.164 format
- `From`: Twilio phone number with Voice capability
- `Twiml`: XML instructions for the call

The simplest v1 TwiML uses `<Say>`:

```xml
<Response>
  <Say language="pt-PT">Teste de chamada do Elite CondoGuard.</Say>
</Response>
```

Important implementation details:

- escape XML characters in the message before inserting it into TwiML
- accept phone numbers with or without `+244`
- normalize local Angola numbers to E.164
- return the Twilio `sid` as `callId`
- do not log Twilio credentials
- return Twilio error details in development, but avoid leaking sensitive data

## Example Edge Function

```typescript
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ success: false, error: "Method not allowed" }, 405);
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return json({ success: false, error: "Missing to or message" }, 400);
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !from) {
      return json({ success: false, error: "Missing Twilio config" }, 500);
    }

    const normalizedTo = normalizeAngolaPhone(to);
    const twiml = `<Response><Say language="pt-PT">${escapeXml(message)}</Say></Response>`;

    const body = new URLSearchParams({
      To: normalizedTo,
      From: from,
      Twiml: twiml,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return json({ success: false, error: result.message, details: result }, response.status);
    }

    return json({ success: true, callId: result.sid });
  } catch (error) {
    return json({ success: false, error: String(error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeAngolaPhone(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("244")) return `+${digits}`;
  return `+244${digits}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
```

## Deploy

```bash
supabase functions deploy send-call
```

## Manual Test

```bash
curl -X POST "https://SEU_PROJECT_REF.supabase.co/functions/v1/send-call" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"+244933198143","message":"Teste de chamada do Elite CondoGuard."}'
```

## Frontend Integration

Add a service wrapper after the Edge Function is deployed.

Suggested interface:

```typescript
type SendCallResult = {
  success: boolean;
  callId?: string;
  error?: string;
};

DataService.sendCall(to: string, message: string): Promise<SendCallResult>
```

Potential v1 entry points:

- admin-only test action
- resident contact fallback in visitor approval flows
- urgent notification action from incident detail
- future visitor access notification flow

## UI References

The attached screenshots define the first Guard UI surfaces where this feature should appear.

Store the screenshots in:

```text
src/docs/TODO/assets/twilio-call-entry-approval.png
src/docs/TODO/assets/twilio-call-activity-card.png
```

Then keep these image references in this document:

![Entry approval call action](./assets/twilio-call-entry-approval.png)

**Reference behavior:** in the final approval step, when the selected unit has no resident app installed, the existing `Telefone` approval option should be able to trigger the Twilio voice-call flow. The call action currently appears as a green `Ligar +11846490264` button below the phone approval method.

![Today activity call action](./assets/twilio-call-activity-card.png)

**Reference behavior:** in `Atividade de Hoje`, each pending visit card can expose a direct `Ligar` action next to the `Video` action. The highlighted `Ligar` button is a natural entry point for the outbound voice-call feature.

## Security and Abuse Controls

Voice calls cost money and can be abused. Add controls before exposing this broadly.

- restrict caller actions to authenticated staff/admin flows
- avoid exposing arbitrary message text to unauthenticated users
- rate-limit calls per destination number
- rate-limit calls per guard/admin user
- log who triggered the call, destination number, and Twilio `callId`
- never log Twilio auth tokens
- consider a fixed approved message template list for v1

## Error Handling

Common Twilio errors to surface clearly:

- Trial account cannot call unverified number
- destination country blocked by Geo Permissions
- Twilio number does not support Voice
- insufficient balance
- invalid destination phone number
- destination carrier rejected the call

The UI should show a human-readable failure and keep a technical detail available for admins.

## Testing Checklist

- [ ] Confirm Twilio account is upgraded or the test number is verified.
- [ ] Confirm `TWILIO_PHONE_NUMBER` supports Voice.
- [ ] Confirm Angola / `+244` is enabled in Voice Geo Permissions.
- [ ] Deploy `send-call`.
- [ ] Call a verified test number.
- [ ] Confirm the call plays the Portuguese message.
- [ ] Test a local Angola number without `+244`; confirm it normalizes correctly.
- [ ] Test an invalid number; confirm the function returns a clear error.
- [ ] Test missing `to`; confirm HTTP 400.
- [ ] Test missing `message`; confirm HTTP 400.
- [ ] Confirm Twilio credentials are not printed in logs.
- [ ] Confirm the returned `callId` maps to the call in Twilio Console logs.

## References

- Existing SMS documentation: `src/docs/SUPABASE_AND_TWILIO.md`
- Existing Supabase functions folder: `supabase/functions`
- Twilio Console: `https://console.twilio.com/`
- Twilio Voice logs: `Twilio Console > Monitor > Logs > Calls`
