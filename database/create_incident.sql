CREATE OR REPLACE FUNCTION public.create_incident(p_data jsonb)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.incidents;
BEGIN
  INSERT INTO public.incidents
  SELECT * FROM jsonb_populate_record(NULL::public.incidents, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
