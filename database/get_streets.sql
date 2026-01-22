CREATE OR REPLACE FUNCTION public.get_streets(p_condominium_id int4)
RETURNS SETOF public.streets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.streets
  WHERE condominium_id = p_condominium_id
  ORDER BY name;
END;
$$;
