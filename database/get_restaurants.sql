CREATE OR REPLACE FUNCTION public.get_restaurants(p_condominium_id int4)
RETURNS SETOF public.restaurants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.restaurants
  WHERE condominium_id = p_condominium_id
  ORDER BY name;
END;
$$;
