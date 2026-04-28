-- Add offer_sdp column so resident app can fetch the offer even if it missed the broadcast
ALTER TABLE video_call_sessions ADD COLUMN IF NOT EXISTS offer_sdp TEXT;

-- Guard calls this after createOffer() to persist the SDP
CREATE OR REPLACE FUNCTION update_video_call_session_offer(
  p_session_id UUID,
  p_offer_sdp  TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE video_call_sessions SET offer_sdp = p_offer_sdp WHERE id = p_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION update_video_call_session_offer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_video_call_session_offer(UUID, TEXT) TO service_role;

-- Resident app calls this on VideoCallScreen mount to get the stored offer SDP
CREATE OR REPLACE FUNCTION get_video_call_session_offer(p_session_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT offer_sdp FROM video_call_sessions WHERE id = p_session_id;
$$;
GRANT EXECUTE ON FUNCTION get_video_call_session_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_call_session_offer(UUID) TO service_role;
