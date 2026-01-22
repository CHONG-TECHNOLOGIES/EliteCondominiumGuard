CREATE OR REPLACE FUNCTION public.get_todays_visits(p_condominium_id int4)
RETURNS SETOF public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  v_start := date_trunc('day', now());
  v_end := v_start + interval '1 day';

  RETURN QUERY
  SELECT *
  FROM public.visits
  WHERE condominium_id = p_condominium_id
    AND check_in_at >= v_start
    AND check_in_at < v_end
  ORDER BY check_in_at DESC;
END;
$$;
