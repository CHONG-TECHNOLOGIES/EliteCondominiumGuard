CREATE OR REPLACE FUNCTION public.admin_get_residents(p_condominium_id int4)
RETURNS SETOF public.residents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.residents
  WHERE condominium_id = p_condominium_id
  ORDER BY name;
END;
$$;
