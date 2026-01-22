CREATE OR REPLACE FUNCTION public.get_incident_statuses()
RETURNS SETOF public.incident_statuses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.incident_statuses
  ORDER BY sort_order, id;
END;
$$;
