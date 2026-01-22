CREATE OR REPLACE FUNCTION public.admin_create_unit(p_data jsonb)
RETURNS public.units
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.units;
BEGIN
  INSERT INTO public.units
  SELECT * FROM jsonb_populate_record(NULL::public.units, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
