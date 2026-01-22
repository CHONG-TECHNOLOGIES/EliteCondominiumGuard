CREATE OR REPLACE FUNCTION public.admin_create_resident(p_data jsonb)
RETURNS public.residents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.residents;
BEGIN
  INSERT INTO public.residents
  SELECT * FROM jsonb_populate_record(NULL::public.residents, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
