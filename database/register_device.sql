CREATE OR REPLACE FUNCTION public.register_device(p_data jsonb)
RETURNS public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.devices;
  v_identifier text;
BEGIN
  v_identifier := p_data->>'device_identifier';
  IF v_identifier IS NULL OR v_identifier = '' THEN
    RAISE EXCEPTION 'device_identifier required';
  END IF;

  SELECT * INTO v_row
  FROM public.devices
  WHERE device_identifier = v_identifier
  LIMIT 1;

  IF v_row.id IS NULL THEN
    INSERT INTO public.devices
    SELECT * FROM jsonb_populate_record(NULL::public.devices, p_data)
    RETURNING * INTO v_row;
  ELSE
    v_row := public.admin_update_device(v_row.id, p_data);
  END IF;

  RETURN v_row;
END;
$$;
