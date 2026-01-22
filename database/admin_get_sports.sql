CREATE OR REPLACE FUNCTION public.admin_get_sports()
RETURNS SETOF public.sports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.sports
  ORDER BY id;
END;
$$;
