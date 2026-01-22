CREATE OR REPLACE FUNCTION public.update_device_heartbeat(p_identifier text)
RETURNS public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.devices;
BEGIN
  UPDATE public.devices
  SET last_seen_at = now()
  WHERE device_identifier = p_identifier
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
