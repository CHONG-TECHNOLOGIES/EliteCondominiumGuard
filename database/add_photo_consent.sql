-- Migration: Add photo_consent_given to visits table
-- Apply manually via Supabase SQL Editor
--
-- NULL = not applicable (visitor_photo_enabled = false for this condo)
-- TRUE = visitor explicitly accepted photo capture
-- FALSE = should never be stored (app blocks submission on refusal)

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS photo_consent_given BOOLEAN;

-- Update create_visit RPC to accept and persist the new field
CREATE OR REPLACE FUNCTION public.create_visit(p_data jsonb)
  RETURNS visits
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.visits;
BEGIN
  INSERT INTO public.visits (
    condominium_id, visitor_name, visitor_doc, visitor_phone, vehicle_license_plate,
    visit_type_id, service_type_id, restaurant_id, sport_id,
    unit_id, reason, photo_url, qr_token, qr_expires_at,
    check_in_at, check_out_at, status, approval_mode,
    guard_id, device_id,
    photo_consent_given
  ) VALUES (
    (p_data->>'condominium_id')::int,
    p_data->>'visitor_name',
    p_data->>'visitor_doc',
    p_data->>'visitor_phone',
    p_data->>'vehicle_license_plate',
    (p_data->>'visit_type_id')::int,
    (p_data->>'service_type_id')::int,
    NULLIF(p_data->>'restaurant_id', '')::uuid,
    NULLIF(p_data->>'sport_id', '')::uuid,
    (p_data->>'unit_id')::int,
    p_data->>'reason',
    p_data->>'photo_url',
    p_data->>'qr_token',
    (p_data->>'qr_expires_at')::timestamptz,
    (p_data->>'check_in_at')::timestamptz,
    (p_data->>'check_out_at')::timestamptz,
    p_data->>'status',
    p_data->>'approval_mode',
    (p_data->>'guard_id')::int,
    NULLIF(p_data->>'device_id', '')::uuid,
    (p_data->>'photo_consent_given')::boolean
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
