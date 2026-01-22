CREATE OR REPLACE FUNCTION public.admin_create_device(p_data jsonb)
RETURNS public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.devices;
BEGIN
  INSERT INTO public.devices
  SELECT * FROM jsonb_populate_record(NULL::public.devices, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
