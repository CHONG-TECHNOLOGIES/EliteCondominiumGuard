CREATE OR REPLACE FUNCTION public.get_staff_by_condominium(p_condominium_id int4)
RETURNS SETOF public.staff
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.staff
  WHERE condominium_id = p_condominium_id
  ORDER BY last_name, first_name;
END;
$$;
