CREATE OR REPLACE FUNCTION public.get_devices_by_condominium(p_condominium_id int4)
RETURNS SETOF public.devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.devices
  WHERE condominium_id = p_condominium_id
  ORDER BY last_seen_at DESC NULLS LAST, id;
END;
$$;
