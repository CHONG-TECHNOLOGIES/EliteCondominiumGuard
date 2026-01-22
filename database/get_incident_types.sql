CREATE OR REPLACE FUNCTION public.get_incident_types()
RETURNS SETOF public.incident_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.incident_types
  ORDER BY sort_order, id;
END;
$$;
