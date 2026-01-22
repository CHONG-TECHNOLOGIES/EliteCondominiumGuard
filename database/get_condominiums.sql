CREATE OR REPLACE FUNCTION public.get_condominiums()
RETURNS SETOF public.condominiums
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.condominiums
  ORDER BY id;
END;
$$;
