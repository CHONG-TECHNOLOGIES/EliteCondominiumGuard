import { AuditLog, Incident, IncidentActionEntry } from '../types';

const LEGACY_SEPARATOR = '\n---\n';

function buildActorName(log: AuditLog): string | undefined {
  const firstName = log.actor?.first_name?.trim();
  const lastName = log.actor?.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || undefined;
}

function resolveIncidentId(log: AuditLog): string | null {
  const detailsIncidentId = log.details?.incident_id;
  if (typeof log.target_id === 'string' && log.target_id.trim()) {
    return log.target_id.trim();
  }
  if (typeof detailsIncidentId === 'string' && detailsIncidentId.trim()) {
    return detailsIncidentId.trim();
  }
  return null;
}

function extractLatestNote(log: AuditLog): string | undefined {
  const guardNotesChange = log.details?.changes?.guard_notes;
  if (typeof guardNotesChange?.to === 'string') {
    const nextValue = guardNotesChange.to.trim();
    const previousValue = typeof guardNotesChange.from === 'string'
      ? guardNotesChange.from.trim()
      : '';

    if (previousValue && nextValue.startsWith(previousValue)) {
      const suffix = nextValue.slice(previousValue.length).replace(/^\n---\n/, '').trim();
      return suffix || nextValue;
    }

    if (nextValue.includes(LEGACY_SEPARATOR)) {
      return nextValue.split(LEGACY_SEPARATOR).pop()?.trim() || nextValue;
    }

    return nextValue;
  }

  if (typeof log.details?.note === 'string' && log.details.note.trim()) {
    return log.details.note.trim();
  }

  if (log.details?.field === 'guard_notes' && typeof log.details?.new_value === 'string' && log.details.new_value.trim()) {
    return log.details.new_value.trim();
  }

  return undefined;
}

function resolveAction(log: AuditLog, status?: string, note?: string): IncidentActionEntry['action'] {
  switch (status) {
    case 'acknowledged':
      return 'acknowledged';
    case 'inprogress':
      return 'inprogress';
    case 'resolved':
      return 'resolved';
    default:
      return note ? 'note' : 'updated';
  }
}

function normalizeStatus(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

function parseLegacyTimestamp(note: string): { created_at?: string; text: string } {
  const match = note.match(/^\[(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2})\]\s*(.*)$/s);
  if (!match) {
    return { text: note.trim() };
  }

  const [, day, month, year, hour, minute, text] = match;
  return {
    created_at: `${year}-${month}-${day}T${hour}:${minute}:00`,
    text: text.trim()
  };
}

function buildLegacyHistory(incident: Incident): IncidentActionEntry[] {
  const entries: IncidentActionEntry[] = [];

  if (incident.acknowledged_at) {
    entries.push({
      id: `${incident.id}-acknowledged`,
      incident_id: incident.id,
      created_at: incident.acknowledged_at,
      actor_id: incident.acknowledged_by ?? null,
      action: 'acknowledged',
      status: 'acknowledged',
      is_legacy: true
    });
  }

  if (incident.guard_notes) {
    incident.guard_notes
      .split(LEGACY_SEPARATOR)
      .map(item => item.trim())
      .filter(Boolean)
      .forEach((note, index) => {
        const parsed = parseLegacyTimestamp(note);
        entries.push({
          id: `${incident.id}-legacy-${index}`,
          incident_id: incident.id,
          created_at: parsed.created_at,
          action: incident.resolved_at && index === 0 && !incident.acknowledged_at ? 'resolved' : 'note',
          status: incident.status,
          note: parsed.text,
          is_legacy: true
        });
      });
  }

  return entries.sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return leftTime - rightTime;
  });
}

export function buildIncidentActionHistoryIndex(logs: AuditLog[]): Record<string, IncidentActionEntry[]> {
  const grouped: Record<string, IncidentActionEntry[]> = {};

  logs.forEach(log => {
    const incidentId = resolveIncidentId(log);
    if (!incidentId) return;

    const status = normalizeStatus(log.details?.changes?.status?.to)
      || (log.details?.field === 'status' ? normalizeStatus(log.details?.new_value) : undefined)
      || normalizeStatus(log.details?.status);
    const note = extractLatestNote(log);
    const entry: IncidentActionEntry = {
      id: `${incidentId}-${log.id}`,
      incident_id: incidentId,
      created_at: log.created_at,
      actor_id: log.actor_id,
      actor_name: buildActorName(log),
      action: resolveAction(log, status, note),
      status,
      note,
      source: log.details?.source
    };

    if (!grouped[incidentId]) {
      grouped[incidentId] = [];
    }
    grouped[incidentId].push(entry);
  });

  Object.keys(grouped).forEach(incidentId => {
    grouped[incidentId].sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return leftTime - rightTime;
    });
  });

  return grouped;
}

export function getIncidentActionHistory(incident: Incident): IncidentActionEntry[] {
  if (incident.action_history && incident.action_history.length > 0) {
    return [...incident.action_history].sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return leftTime - rightTime;
    });
  }

  return buildLegacyHistory(incident);
}

export function getIncidentActionLabel(entry: IncidentActionEntry): string {
  switch (entry.action) {
    case 'acknowledged':
      return 'Leitura confirmada';
    case 'inprogress':
      return 'Incidente em progresso';
    case 'resolved':
      return 'Incidente resolvido';
    case 'note':
      return 'Ação registada';
    default:
      return 'Atualização do incidente';
  }
}

export function getIncidentActorLabel(entry: IncidentActionEntry): string {
  if (entry.actor_name) {
    return entry.actor_name;
  }

  return entry.is_legacy ? 'Guarda não identificado' : 'Guarda';
}
