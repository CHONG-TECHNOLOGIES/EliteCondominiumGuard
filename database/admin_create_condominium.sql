CREATE OR REPLACE FUNCTION public.admin_create_condominium(p_data jsonb)
RETURNS public.condominiums
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.condominiums;
BEGIN
  INSERT INTO public.condominiums
  SELECT * FROM jsonb_populate_record(NULL::public.condominiums, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
