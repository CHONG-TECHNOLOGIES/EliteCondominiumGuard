-- Migration: Add setup-controlled entry permissions to condominiums
-- Apply manually via Supabase SQL Editor

-- 1. Add columns (DEFAULT true preserves existing condominiums behaviour)
ALTER TABLE condominiums
  ADD COLUMN IF NOT EXISTS visitor_photo_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intercom_approval_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guard_manual_approval_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. RPC callable during device setup
--    SECURITY DEFINER: allows the unauthenticated setup screen to write to
--    condominiums without triggering RLS, while still being a named, auditable operation.
CREATE OR REPLACE FUNCTION set_condo_setup_settings(
  p_condo_id                      INTEGER,
  p_visitor_photo_enabled         BOOLEAN,
  p_intercom_approval_enabled     BOOLEAN,
  p_guard_manual_approval_enabled BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE condominiums
  SET
    visitor_photo_enabled = p_visitor_photo_enabled,
    intercom_approval_enabled = p_intercom_approval_enabled,
    guard_manual_approval_enabled = p_guard_manual_approval_enabled
  WHERE id = p_condo_id;
END;
$$;

-- 3. Backward-compatible wrapper for older clients that only set the photo flag.
CREATE OR REPLACE FUNCTION set_condo_visitor_photo_setting(
  p_condo_id INTEGER,
  p_enabled   BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE condominiums
  SET visitor_photo_enabled = p_enabled
  WHERE id = p_condo_id;
END;
$$;

-- 4. Update admin condominium creation so create/edit admin screens can set
--    these flags at creation time instead of relying only on defaults.
CREATE OR REPLACE FUNCTION public.admin_create_condominium(p_data jsonb)
RETURNS condominiums
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.condominiums;
BEGIN
  INSERT INTO public.condominiums (
    name,
    address,
    logo_url,
    latitude,
    longitude,
    gps_radius_meters,
    status,
    phone_number,
    contact_person,
    contact_email,
    manager_name,
    visitor_photo_enabled,
    intercom_approval_enabled,
    guard_manual_approval_enabled
  )
  VALUES (
    p_data->>'name',
    p_data->>'address',
    p_data->>'logo_url',
    (p_data->>'latitude')::float8,
    (p_data->>'longitude')::float8,
    (p_data->>'gps_radius_meters')::int4,
    COALESCE(p_data->>'status', 'ACTIVE'),
    p_data->>'phone_number',
    p_data->>'contact_person',
    p_data->>'contact_email',
    p_data->>'manager_name',
    COALESCE((p_data->>'visitor_photo_enabled')::boolean, true),
    COALESCE((p_data->>'intercom_approval_enabled')::boolean, true),
    COALESCE((p_data->>'guard_manual_approval_enabled')::boolean, true)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
