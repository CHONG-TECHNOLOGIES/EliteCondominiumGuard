CREATE OR REPLACE FUNCTION public.admin_get_service_types()
RETURNS SETOF public.service_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.service_types
  ORDER BY id;
END;
$$;
