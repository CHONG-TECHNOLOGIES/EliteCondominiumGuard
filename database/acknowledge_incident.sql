CREATE OR REPLACE FUNCTION public.acknowledge_incident(p_id int4, p_guard_id int4)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.incidents;
BEGIN
  UPDATE public.incidents
  SET
    status = 'ACKNOWLEDGED',
    acknowledged_at = now(),
    acknowledged_by = p_guard_id
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
