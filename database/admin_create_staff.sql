CREATE OR REPLACE FUNCTION public.admin_create_staff(p_data jsonb)
RETURNS public.staff
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.staff;
BEGIN
  INSERT INTO public.staff
  SELECT * FROM jsonb_populate_record(NULL::public.staff, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
