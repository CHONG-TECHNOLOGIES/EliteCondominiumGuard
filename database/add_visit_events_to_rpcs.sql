-- Migration: add visit_events insert to status-change RPCs
-- Ensures every status change creates a visit_event record,
-- regardless of whether the change comes from guard app, resident app, or admin.

-- 1. update_visit_status: used by guard app and admin for all status changes
CREATE OR REPLACE FUNCTION public.update_visit_status(p_id integer, p_status text)
 RETURNS visits
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.visits;
BEGIN
  UPDATE public.visits
  SET status = p_status
  WHERE id = p_id
  RETURNING * INTO v_row;

  INSERT INTO public.visit_events (visit_id, status, event_at)
  VALUES (v_row.id, p_status, now());

  RETURN v_row;
END;
$function$;

-- 2. approve_visit: used by resident app (PENDENTE -> AUTORIZADO)
CREATE OR REPLACE FUNCTION public.approve_visit(p_visit_id integer, p_approval_mode text DEFAULT 'app'::text)
 RETURNS SETOF visits
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row public.visits;
BEGIN
  UPDATE public.visits
  SET
    status = 'AUTORIZADO',
    approved_at = now(),
    approval_mode = p_approval_mode
  WHERE id = p_visit_id
  RETURNING * INTO v_row;

  INSERT INTO public.visit_events (visit_id, status, event_at)
  VALUES (v_row.id, 'AUTORIZADO', now());

  RETURN NEXT v_row;
END;
$function$;

-- 3. checkout_visit: used to mark exit (-> SAIU / LEFT)
CREATE OR REPLACE FUNCTION public.checkout_visit(p_id integer)
 RETURNS visits
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.visits;
BEGIN
  UPDATE public.visits
  SET
    status = 'LEFT',
    check_out_at = COALESCE(check_out_at, now())
  WHERE id = p_id
  RETURNING * INTO v_row;

  INSERT INTO public.visit_events (visit_id, status, event_at)
  VALUES (v_row.id, 'LEFT', COALESCE(v_row.check_out_at, now()));

  RETURN v_row;
END;
$function$;
