CREATE OR REPLACE FUNCTION public.get_incidents(p_condominium_id int4)
RETURNS SETOF public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.incidents
  WHERE condominium_id = p_condominium_id
  ORDER BY reported_at DESC;
END;
$$;
