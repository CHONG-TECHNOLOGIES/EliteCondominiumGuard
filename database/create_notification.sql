CREATE OR REPLACE FUNCTION public.create_notification(p_data jsonb)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.notifications;
BEGIN
  INSERT INTO public.notifications
  SELECT * FROM jsonb_populate_record(NULL::public.notifications, p_data)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
