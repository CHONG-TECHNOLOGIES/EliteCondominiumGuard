CREATE OR REPLACE FUNCTION public.admin_create_restaurant(p_data jsonb)
RETURNS public.restaurants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.restaurants;
BEGIN
  INSERT INTO public.restaurants
  SELECT * FROM jsonb_populate_record(NULL::public.restaurants, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
