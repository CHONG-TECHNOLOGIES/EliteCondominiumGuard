CREATE OR REPLACE FUNCTION public.get_units(p_condominium_id int4)
RETURNS SETOF public.units
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.units
  WHERE condominium_id = p_condominium_id
  ORDER BY code_block, number;
END;
$$;
