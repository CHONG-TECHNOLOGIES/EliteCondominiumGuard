-- RPC: get_residents_by_unit_id
-- Returns all residents belonging to a given unit.
-- Used by the Guard PWA to look up residents before placing a phone or video call.

CREATE OR REPLACE FUNCTION get_residents_by_unit_id(p_unit_id INT)
RETURNS SETOF residents
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM residents
  WHERE unit_id = p_unit_id;
$$;

GRANT EXECUTE ON FUNCTION get_residents_by_unit_id(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_residents_by_unit_id(INT) TO service_role;

CREATE INDEX IF NOT EXISTS idx_residents_unit_id ON residents(unit_id);
