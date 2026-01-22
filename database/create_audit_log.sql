CREATE OR REPLACE FUNCTION public.create_audit_log(p_data jsonb)
RETURNS public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.audit_logs;
BEGIN
  INSERT INTO public.audit_logs
  SELECT * FROM jsonb_populate_record(NULL::public.audit_logs, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
