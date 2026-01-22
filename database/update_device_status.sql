CREATE OR REPLACE FUNCTION public.update_device_status(p_id int4, p_status text)
RETURNS public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.devices;
BEGIN
  UPDATE public.devices
  SET status = p_status
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
