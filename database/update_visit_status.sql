CREATE OR REPLACE FUNCTION public.update_visit_status(
  p_id int4,
  p_status text
)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.visits;
BEGIN
  UPDATE public.visits
  SET status = p_status
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
