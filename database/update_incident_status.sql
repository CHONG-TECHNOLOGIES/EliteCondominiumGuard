CREATE OR REPLACE FUNCTION public.update_incident_status(
  p_id int4,
  p_status text,
  p_notes text
)
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
    status = p_status,
    guard_notes = p_notes
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
