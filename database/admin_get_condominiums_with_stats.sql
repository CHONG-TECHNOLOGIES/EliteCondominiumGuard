CREATE OR REPLACE FUNCTION public.admin_get_condominiums_with_stats()
RETURNS TABLE(
  id int4,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  total_visits_today bigint,
  total_incidents_open bigint,
  status text
)
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
  SELECT
    c.id,
    c.name,
    c.address,
    c.latitude,
    c.longitude,
    (
      SELECT COUNT(*)
      FROM public.visits v
      WHERE v.condominium_id = c.id
        AND v.check_in_at >= v_start
        AND v.check_in_at < v_end
    ) AS total_visits_today,
    (
      SELECT COUNT(*)
      FROM public.incidents i
      WHERE i.condominium_id = c.id
        AND i.status IN ('PENDING', 'ACKNOWLEDGED')
    ) AS total_incidents_open,
    c.status::text
  FROM public.condominiums c
  WHERE c.status = 'ACTIVE'
  ORDER BY c.name;
END;
$$;
