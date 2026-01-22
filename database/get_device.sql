CREATE OR REPLACE FUNCTION public.get_device(p_identifier text)
RETURNS SETOF public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.devices
  WHERE device_identifier = p_identifier;
END;
$$;
