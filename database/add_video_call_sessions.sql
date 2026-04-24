-- Migration: add_video_call_sessions
-- Creates the video_call_sessions table and 3 supporting RPCs

CREATE TABLE IF NOT EXISTS video_call_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        INT4 NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  guard_id        INT4 NOT NULL REFERENCES staff(id),
  resident_id     INT4 REFERENCES residents(id),
  unit_id         INT4 REFERENCES units(id),
  condominium_id  INT4 NOT NULL REFERENCES condominiums(id),
  device_id       TEXT,
  status          TEXT NOT NULL DEFAULT 'CALLING'
                  CHECK (status IN ('CALLING','ACCEPTED','REJECTED','MISSED','ENDED','FAILED')),
  initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at     TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INT4,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_call_sessions_visit_id     ON video_call_sessions(visit_id);
CREATE INDEX IF NOT EXISTS idx_video_call_sessions_resident_id  ON video_call_sessions(resident_id);
CREATE INDEX IF NOT EXISTS idx_video_call_sessions_status       ON video_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_call_sessions_initiated_at ON video_call_sessions(initiated_at DESC);

ALTER TABLE video_call_sessions ENABLE ROW LEVEL SECURITY;

-- Guards can insert and read sessions for their condominium
CREATE POLICY "guard_insert_video_call_sessions" ON video_call_sessions
  FOR INSERT WITH CHECK (
    condominium_id IN (
      SELECT condominium_id FROM staff WHERE id = guard_id
    )
  );

CREATE POLICY "guard_select_video_call_sessions" ON video_call_sessions
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM staff
      WHERE id = (SELECT id FROM staff WHERE id = guard_id LIMIT 1)
    )
  );

-- Service role can do everything (used by Edge Functions)
CREATE POLICY "service_role_all_video_call_sessions" ON video_call_sessions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── RPC: create_video_call_session ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_video_call_session(p_data JSONB)
RETURNS video_call_sessions
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session video_call_sessions;
BEGIN
  INSERT INTO video_call_sessions (
    visit_id,
    guard_id,
    resident_id,
    unit_id,
    condominium_id,
    device_id,
    status
  ) VALUES (
    (p_data->>'visit_id')::INT4,
    (p_data->>'guard_id')::INT4,
    NULLIF(p_data->>'resident_id', '')::INT4,
    NULLIF(p_data->>'unit_id', '')::INT4,
    (p_data->>'condominium_id')::INT4,
    p_data->>'device_id',
    'CALLING'
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- ─── RPC: update_video_call_session_status ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_video_call_session_status(
  p_session_id      UUID,
  p_status          TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE video_call_sessions
  SET
    status           = p_status,
    rejection_reason = COALESCE(p_rejection_reason, rejection_reason),
    answered_at      = CASE WHEN p_status = 'ACCEPTED'  THEN NOW() ELSE answered_at END,
    ended_at         = CASE WHEN p_status IN ('ENDED','REJECTED','MISSED','FAILED') THEN NOW() ELSE ended_at END,
    duration_seconds = CASE
                         WHEN p_status = 'ENDED' AND answered_at IS NOT NULL
                         THEN EXTRACT(EPOCH FROM (NOW() - answered_at))::INT4
                         ELSE duration_seconds
                       END
  WHERE id = p_session_id;
END;
$$;

-- ─── RPC: get_active_video_call_for_resident ───────────────────────────────────

CREATE OR REPLACE FUNCTION get_active_video_call_for_resident(p_resident_id INT4)
RETURNS SETOF video_call_sessions
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT *
  FROM video_call_sessions
  WHERE resident_id = p_resident_id
    AND status IN ('CALLING', 'ACCEPTED')
  ORDER BY initiated_at DESC
  LIMIT 1;
$$;
