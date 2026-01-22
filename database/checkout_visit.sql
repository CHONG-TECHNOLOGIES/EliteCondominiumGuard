CREATE OR REPLACE FUNCTION public.checkout_visit(p_id int4)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.visits;
BEGIN
  UPDATE public.visits
  SET
    status = 'LEFT',
    check_out_at = COALESCE(check_out_at, now())
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
