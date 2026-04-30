-- Add VIDEOCHAMADA to visit_events status check constraint.
-- Safe to run whether or not the constraint already exists.
ALTER TABLE visit_events DROP CONSTRAINT IF EXISTS visit_events_status_check;
ALTER TABLE visit_events ADD CONSTRAINT visit_events_status_check
  CHECK (status IN (
    'PENDENTE', 'AUTORIZADO', 'NEGADO', 'NO INTERIOR', 'SAIU', 'SEM RESPOSTA', 'VIDEOCHAMADA'
  ));
