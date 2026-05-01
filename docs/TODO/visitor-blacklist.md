# 04. Visitor Blacklist / Block List

**Priority:** Critical  
**Effort:** Medium  
**Status:** Backend implemented in this repo; Guard app integration pending

## Context

Residents need a way to permanently flag visitors who should be treated as risky on future visits. A one-time denial is not enough: the guard needs a warning the next time the same person appears, whether the match comes from phone number or document number.

This feature closes the loop between resident reporting and guard action:

- residents can block a visitor by phone or document
- the backend stores that block as an active blacklist entry
- the Guard app checks the blacklist during check-in
- the guard must stop and follow the defined decision flow before completing entry

## Current State in Codebase

**What already exists in this repo**

- `visits` already stores `visitor_name`, `visitor_phone`, and `visitor_doc`
- `visitor_blacklist` already exists in `src/database/schema_complete.sql`
- `add_to_blacklist`, `remove_from_blacklist`, `get_blacklist`, and `is_visitor_blacklisted` already exist in `src/database/schema_complete.sql`
- Guard check-in already runs through `src/pages/NewEntry.tsx`
- QR validation already runs through `src/services/Supabase.ts` and `src/services/dataService.ts`
- QR consumption already happens only after successful visit creation; that ordering must be preserved
- Guard-side call helpers already exist in `src/utils/approvalModes.ts`
- Shared toast/confirm primitives already exist in `src/components/Toast.tsx`
- Guard observability utilities already exist in `src/services/logger.ts`

**What is still missing**

- no guard-side `BlacklistCheckResult` type
- no `SupabaseService.isVisitorBlacklisted(...)` wrapper
- no `DataService.checkVisitorBlacklist(...)` wrapper
- no persistent blocking warning UI in the Guard check-in flow
- no automatic revalidation when `unit_id`, `visitor_phone`, or `visitor_doc` changes
- no guard-side logging for blacklist warning, override, and denial actions

## Repository Alignment

This document is now the implementation reference for the Guard app side of the feature in this repo.

- the backend contract already exists here
- the remaining work is Guard frontend and service integration
- the main integration target is `src/pages/NewEntry.tsx`
- supporting integration points are `src/services/Supabase.ts`, `src/services/dataService.ts`, `src/utils/approvalModes.ts`, `src/components/Toast.tsx`, and `src/services/logger.ts`
- `mark_qr_code_used` must remain after successful visit creation only
- a blocked visitor must never consume the QR code before the blacklist decision is resolved

## User Stories

- As a resident, after denying a visit, I want the option to permanently block that visitor so they are flagged if they return.
- As a resident, I want to view my blocked visitors list and remove someone if I blocked them by mistake.
- As a resident, I want to manually add a person to the block list by name and phone/document, even if they have not visited yet.
- As a guard, when checking in a visitor, I want to see a warning if any resident in the destination unit has blocked this person.
- As a condominium admin, I want a condominium-wide blacklist for trespassed individuals that applies to all units.

## Database Schema Changes

The schema below is already implemented in this repo and is retained here as the reference contract.

### `visitor_blacklist`

```sql
CREATE TABLE public.visitor_blacklist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  condominium_id integer NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  resident_id integer REFERENCES public.residents(id) ON DELETE SET NULL,
  unit_id integer REFERENCES public.units(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'unit' CHECK (scope IN ('unit', 'condominium')),
  visitor_name text NOT NULL,
  visitor_phone text,
  visitor_doc text,
  reason text,
  blocked_at timestamp with time zone DEFAULT now(),
  blocked_by_name text,
  is_active boolean DEFAULT true,
  unblocked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_blacklist_phone ON public.visitor_blacklist(condominium_id, visitor_phone)
  WHERE is_active = true AND visitor_phone IS NOT NULL;

CREATE INDEX idx_blacklist_doc ON public.visitor_blacklist(condominium_id, visitor_doc)
  WHERE is_active = true AND visitor_doc IS NOT NULL;

CREATE INDEX idx_blacklist_resident ON public.visitor_blacklist(resident_id)
  WHERE is_active = true;
```

**Design decisions**

- `scope = 'unit'` means a resident-level block that applies only to the target unit
- `scope = 'condominium'` means an admin/condominium-level block that applies everywhere
- `visitor_phone` and `visitor_doc` are nullable because either identifier can be used for matching
- `is_active` uses soft delete so unblock history is preserved
- `resident_id` uses `ON DELETE SET NULL` so the blacklist entry survives resident deletion
- `blocked_by_name` stores a display-ready name for the Guard warning UI

## RPC Functions

The RPCs below are already implemented in this repo. Guard v1 must consume them as-is.

### `add_to_blacklist`

```sql
CREATE OR REPLACE FUNCTION public.add_to_blacklist(
  p_condominium_id integer,
  p_resident_id integer,
  p_unit_id integer,
  p_visitor_name text,
  p_visitor_phone text DEFAULT NULL,
  p_visitor_doc text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_scope text DEFAULT 'unit'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id uuid;
  v_resident_name text;
  v_normalized_phone text;
  v_normalized_doc text;
BEGIN
  v_normalized_phone := NULLIF(REGEXP_REPLACE(COALESCE(p_visitor_phone, ''), '[^0-9]', '', 'g'), '');
  v_normalized_doc := NULLIF(UPPER(REGEXP_REPLACE(COALESCE(p_visitor_doc, ''), '[^A-Za-z0-9]', '', 'g')), '');

  IF v_normalized_phone IS NULL AND v_normalized_doc IS NULL THEN
    RAISE EXCEPTION 'Phone or document number is required';
  END IF;

  SELECT name INTO v_resident_name
  FROM public.residents
  WHERE id = p_resident_id;

  INSERT INTO public.visitor_blacklist (
    condominium_id, resident_id, unit_id, scope,
    visitor_name, visitor_phone, visitor_doc, reason, blocked_by_name
  ) VALUES (
    p_condominium_id,
    p_resident_id,
    p_unit_id,
    COALESCE(NULLIF(p_scope, ''), 'unit'),
    p_visitor_name,
    v_normalized_phone,
    v_normalized_doc,
    NULLIF(p_reason, ''),
    v_resident_name
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
```

### `remove_from_blacklist`

```sql
CREATE OR REPLACE FUNCTION public.remove_from_blacklist(
  p_id uuid,
  p_resident_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.visitor_blacklist
  SET is_active = false,
      unblocked_at = now(),
      updated_at = now()
  WHERE id = p_id
    AND resident_id = p_resident_id
    AND is_active = true;

  RETURN FOUND;
END;
$function$;
```

### `get_blacklist`

```sql
CREATE OR REPLACE FUNCTION public.get_blacklist(p_resident_id integer)
RETURNS TABLE(
  id uuid,
  visitor_name text,
  visitor_phone text,
  visitor_doc text,
  reason text,
  scope text,
  blocked_at timestamptz,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT b.id,
         b.visitor_name,
         b.visitor_phone,
         b.visitor_doc,
         b.reason,
         b.scope,
         b.blocked_at,
         b.is_active
  FROM public.visitor_blacklist b
  WHERE b.resident_id = p_resident_id
    AND b.is_active = true
  ORDER BY b.blocked_at DESC;
END;
$function$;
```

### `is_visitor_blacklisted`

```sql
CREATE OR REPLACE FUNCTION public.is_visitor_blacklisted(
  p_condominium_id integer,
  p_unit_id integer,
  p_visitor_phone text DEFAULT NULL,
  p_visitor_doc text DEFAULT NULL
)
RETURNS TABLE(
  is_blocked boolean,
  blocked_by text,
  reason text,
  scope text,
  blocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_normalized_phone text;
  v_normalized_doc text;
  v_result RECORD;
BEGIN
  v_normalized_phone := NULLIF(REGEXP_REPLACE(COALESCE(p_visitor_phone, ''), '[^0-9]', '', 'g'), '');
  v_normalized_doc := NULLIF(UPPER(REGEXP_REPLACE(COALESCE(p_visitor_doc, ''), '[^A-Za-z0-9]', '', 'g')), '');

  SELECT INTO v_result
    b.blocked_by_name,
    b.reason,
    b.scope,
    b.blocked_at
  FROM public.visitor_blacklist b
  WHERE b.condominium_id = p_condominium_id
    AND b.is_active = true
    AND (
      b.scope = 'condominium'
      OR (b.scope = 'unit' AND b.unit_id = p_unit_id)
    )
    AND (
      (v_normalized_phone IS NOT NULL AND b.visitor_phone = v_normalized_phone)
      OR (v_normalized_doc IS NOT NULL AND b.visitor_doc = v_normalized_doc)
    )
  ORDER BY b.scope DESC, b.blocked_at DESC
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN QUERY
    SELECT true,
           v_result.blocked_by_name,
           v_result.reason,
           v_result.scope,
           v_result.blocked_at;
  ELSE
    RETURN QUERY
    SELECT false, NULL::text, NULL::text, NULL::text, NULL::timestamptz;
  END IF;
END;
$function$;
```

## Guard App Implementation Spec

### Scope for Guard v1

- Guard v1 is intentionally strict
- only flows that resolve to a concrete `unit_id` are eligible for blacklist enforcement
- restaurant and sport free-entry flows without `unit_id` are out of scope for blacklist enforcement in v1
- no new schema work is required
- no new backend RPCs are required

### Public interfaces to add

Add this guard-side result type:

```typescript
type BlacklistCheckResult = {
  is_blocked: boolean;
  blocked_by: string | null;
  reason: string | null;
  scope: "unit" | "condominium" | null;
  blocked_at: string | null;
};
```

Add these wrappers:

```typescript
SupabaseService.isVisitorBlacklisted(
  condominiumId: number,
  unitId: number,
  visitorPhone?: string,
  visitorDoc?: string
): Promise<BlacklistCheckResult | null>

DataService.checkVisitorBlacklist(
  condominiumId: number,
  unitId: number,
  visitorPhone?: string,
  visitorDoc?: string
): Promise<BlacklistCheckResult | null>
```

### Main integration point

The main Guard integration point is `src/pages/NewEntry.tsx`.

The same entry screen must cover:

- manual check-in
- QR-based check-in
- the final submit gate that currently creates the visit

### When to call `is_visitor_blacklisted`

Run the blacklist check only when both conditions are true:

- `unit_id` is known
- at least one visitor identifier is present: `visitor_phone` or `visitor_doc`

Trigger the check in three places:

- after a QR code is validated successfully
- whenever `unit_id`, `visitor_phone`, or `visitor_doc` changes
- immediately before final submit as the last validation gate

### Check execution rules

- frontend field-change checks should use a `300ms` debounce
- submit-time validation must always run even if a recent debounced result already exists
- normalize `visitor_phone` before the RPC by stripping non-digits
- normalize `visitor_doc` before the RPC by stripping spaces/punctuation and uppercasing the result
- send both phone and document when both are available
- a failed lookup is not the same as `is_blocked = false`

### QR ordering rule

- call `validate_qr_code` first
- after a valid QR response, call `is_visitor_blacklisted` before the guard can finish the entry flow
- never call `mark_qr_code_used` before the blacklist result is resolved
- preserve the current ordering where `mark_qr_code_used` happens only after successful visit creation
- if entry is denied because of blacklist, the QR code must remain unused

### Decision policy

#### `scope = unit`

- the resident is the final authority in v1
- the guard must contact or manually verify with the resident before continuing
- if the resident explicitly authorizes entry, the guard may continue
- if the resident denies entry or does not answer, the guard must refuse entry

#### `scope = condominium`

- this is an admin or condominium-level blacklist
- it is an absolute block in v1
- the guard must refuse entry
- there is no resident override in v1

#### RPC failure, timeout, or offline state

- the app must not continue silently
- automatic completion must pause
- the UI must show an explicit failure state
- the guard must manually verify with the resident before entry can be completed

## Guard-side UX behavior

### Core behavior

- do not rely only on a temporary toast
- use a persistent blocking warning in the entry screen itself
- the guard must not be able to miss the warning and continue accidentally

### Required warning content

The warning UI must show:

- primary warning text
- `blocked_by`
- `reason`
- `scope`
- `blocked_at`

### Unit-scope warning actions

For `scope = unit`, show:

- `Ligar ao morador`
- `Morador autorizou`
- `Recusar entrada`

Behavior:

- `Morador autorizou` clears the block state for the current attempt only and allows the normal submit flow to resume
- `Recusar entrada` ends the flow immediately without creating the visit

### Condominium-scope warning actions

For `scope = condominium`, show only:

- `Recusar entrada`

There is no resident-override action for condominium-scope blocks in v1.

### Resident contact rule

- the phone shown in the warning UI must come from the selected unit's resident data
- never use the visitor phone field as the resident contact target
- if the platform cannot open the system dialer, keep the warning visible and require a manual call using the resident phone shown on screen

### Guard UI copy for v1

- primary warning: `Visitante bloqueado. Ligue ao morador antes de prosseguir.`
- failure title: `Falha ao verificar blacklist.`
- failure detail: `Verificacao manual obrigatoria com o morador antes de concluir a entrada.`

No i18n refactor is required for v1. Inline Portuguese copy is acceptable for the first implementation.

## Guard-side observability

Use the existing logger from `src/services/logger.ts`.

- `logger.trackAction("blacklist_warning_shown", { scope })` when the blocking warning UI is rendered
- `logger.trackAction("blacklist_entry_allowed_after_resident_confirmation")` when a unit-scope match is explicitly overridden by the resident
- `logger.trackAction("blacklist_entry_denied")` when entry is refused after a blacklist match
- `logger.warn("Blacklisted visitor attempted entry", { condominiumId, scope })` when a blocked visitor reaches the warning state

## Out of Scope for Guard v1

- push notification type `blocked_visitor_attempt`
- separate audit RPC for resident-approved overrides
- any override for `scope = condominium`
- dedicated video-call-based unblock flow
- blacklist enforcement for flows that do not resolve to a destination unit
- broader i18n refactor for blacklist copy

## Edge Cases

- **Block by phone vs document:** A visitor could give a fake phone but real document, or the opposite. The RPC checks both independently with OR logic.
- **Same visitor, multiple units:** If unit 101 blocks "Maria" and she tries to visit unit 202, the block does not apply. Only condominium-scope blocks apply everywhere.
- **Condominium-scope match:** A condominium-level blacklist entry is an absolute deny in Guard v1.
- **Resident leaves the building:** `ON DELETE SET NULL` preserves the block entry.
- **Re-blocking after unblock:** Since unblock is a soft delete, re-blocking creates a new row and preserves history.
- **Phone normalization:** The RPC strips non-digits before comparison.
- **Free-entry flows:** Visits without `unit_id` skip blacklist enforcement in v1.
- **Verification failure:** A failed blacklist lookup is not a clean result; it must force the manual-verification path.

## Testing Checklist

- [ ] Deny a visit. "Bloquear permanentemente?" prompt appears. Tap "Sim". Visitor added to blacklist.
- [ ] Open Profile > Lista de Bloqueados. Blocked visitor appears with name, phone, reason, and date.
- [ ] Tap "Desbloquear" on a blocked visitor. Confirmation prompt. Visitor removed from active list.
- [ ] Tap "+ Bloquear Visitante" to manually add. Enter name + phone. Saves successfully.
- [ ] Try to add without phone AND without document. Error message shown.
- [ ] From visit detail for a past visit, tap "Bloquear visitante". Modal pre-fills visitor info.
- [ ] Guard app: check in a visitor whose phone is blocked. Blocking warning appears.
- [ ] Guard app: check in a visitor whose document is blocked. Blocking warning appears.
- [ ] Guard app: manual check-in with blocked phone requires resident confirmation before entry can continue.
- [ ] Guard app: manual check-in with blocked document requires resident confirmation before entry can continue.
- [ ] Guard app: changing `unit_id`, `visitor_phone`, or `visitor_doc` revalidates the blacklist before final submit.
- [ ] Guard app: resident authorizes after the call. The guard can continue and complete the check-in.
- [ ] Guard app: resident denies entry. Entry is refused.
- [ ] Guard app: resident does not answer. Entry is refused.
- [ ] Guard app: valid QR but blocked visitor. Warning appears before the QR is consumed.
- [ ] Guard app: valid QR plus resident authorization for a unit-scope match allows check-in and only then consumes the QR.
- [ ] Block visitor on unit 101. Try to visit unit 202. No warning.
- [ ] Admin creates a condominium-scope block. Visitor is refused at any unit in the building.
- [ ] Guard app: condominium-scope block shows a blocking warning with no resident-override action.
- [ ] Guard app: blacklist check RPC/network failure shows an explicit error and does not silently continue the normal check-in flow.
- [ ] Guard app: offline or timeout state requires manual resident verification before the visit can be completed.
- [ ] Guard app: a free-entry flow without `unit_id` does not execute blacklist enforcement in v1.
- [ ] Guard app: the contact action uses the resident/unit phone number, never the visitor phone number.

## Effort Estimate

**Remaining Guard work: Medium (1-2 days).**

- Day 1: add Guard-side types plus `SupabaseService` and `DataService` wrappers, then integrate checks into `NewEntry`
- Day 2: implement blocking warning UX, resident-call actions, observability, and regression testing

Note: The backend is already present in this repo. The remaining task is Guard integration only.

## Dependencies

- no new schema work is required for Guard v1
- no new RPCs are required for Guard v1
- Guard implementation depends on the existing `visitor_blacklist` backend contract already present in this repo
- the Guard app must have access to `unit_id` before check-in is finalized, including QR validation flows
- system dialer integration is optional; if unavailable, the guard still performs the resident confirmation call manually
- selected unit data must expose resident phone information for the call/manual verification step

## References

- Guard entry flow: `src/pages/NewEntry.tsx`
- QR validation and QR consumption wrappers: `src/services/Supabase.ts`, `src/services/dataService.ts`
- Resident call helper: `src/utils/approvalModes.ts`
- Shared toast/confirm primitives: `src/components/Toast.tsx`
- Guard observability: `src/services/logger.ts`
