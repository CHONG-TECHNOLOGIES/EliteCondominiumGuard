CREATE OR REPLACE FUNCTION public.create_street(p_data jsonb)
RETURNS public.streets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.streets;
BEGIN
  INSERT INTO public.streets
  SELECT * FROM jsonb_populate_record(NULL::public.streets, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
