CREATE OR REPLACE FUNCTION public.admin_get_all_devices()
RETURNS SETOF public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.devices
  ORDER BY id;
END;
$$;
