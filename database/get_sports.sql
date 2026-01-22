CREATE OR REPLACE FUNCTION public.get_sports(p_condominium_id int4)
RETURNS SETOF public.sports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.sports
  WHERE condominium_id = p_condominium_id
  ORDER BY name;
END;
$$;
