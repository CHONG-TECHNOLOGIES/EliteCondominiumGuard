CREATE OR REPLACE FUNCTION public.get_resident(p_id int4)
RETURNS SETOF public.residents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.residents
  WHERE id = p_id;
END;
$$;
