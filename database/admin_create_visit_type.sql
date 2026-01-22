CREATE OR REPLACE FUNCTION public.admin_create_visit_type(p_data jsonb)
RETURNS public.visit_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.visit_types;
BEGIN
  INSERT INTO public.visit_types
  SELECT * FROM jsonb_populate_record(NULL::public.visit_types, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
