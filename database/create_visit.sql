CREATE OR REPLACE FUNCTION public.create_visit(p_data jsonb)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.visits;
BEGIN
  INSERT INTO public.visits
  SELECT * FROM jsonb_populate_record(NULL::public.visits, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
