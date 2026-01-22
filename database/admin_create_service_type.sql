CREATE OR REPLACE FUNCTION public.admin_create_service_type(p_data jsonb)
RETURNS public.service_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.service_types;
BEGIN
  INSERT INTO public.service_types
  SELECT * FROM jsonb_populate_record(NULL::public.service_types, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
