CREATE OR REPLACE FUNCTION public.get_visit_types(p_condominium_id int4)
RETURNS SETOF public.visit_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.visit_types
  WHERE condominium_id = p_condominium_id
  ORDER BY id;
END;
$$;
