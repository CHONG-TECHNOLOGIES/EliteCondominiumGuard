CREATE OR REPLACE FUNCTION public.admin_create_sport(p_data jsonb)
RETURNS public.sports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sports;
BEGIN
  INSERT INTO public.sports
  SELECT * FROM jsonb_populate_record(NULL::public.sports, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
