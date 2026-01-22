CREATE OR REPLACE FUNCTION public.admin_get_restaurants()
RETURNS SETOF public.restaurants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.restaurants
  ORDER BY id;
END;
$$;
