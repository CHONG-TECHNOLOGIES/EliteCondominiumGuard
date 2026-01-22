CREATE OR REPLACE FUNCTION public.admin_get_visit_types()
RETURNS SETOF public.visit_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.visit_types
  ORDER BY id;
END;
$$;
