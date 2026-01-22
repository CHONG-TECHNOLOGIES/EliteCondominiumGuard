CREATE OR REPLACE FUNCTION public.get_notifications(p_resident_id int4)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.notifications
  WHERE resident_id = p_resident_id
  ORDER BY created_at DESC, id DESC;
END;
$$;
