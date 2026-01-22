CREATE OR REPLACE FUNCTION public.get_condominium(p_id int4)
RETURNS SETOF public.condominiums
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.condominiums
  WHERE id = p_id;
END;
$$;
