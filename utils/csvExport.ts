/**
 * CSV Export Utilities
 * Provides functions to export data to CSV format
 */

import { Visit, Incident } from '../types';

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[], headers: string[], accessor: (item: any) => any[]): string {
  // Create header row
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  // Create data rows
  data.forEach(item => {
    const values = accessor(item).map(value => {
      // Escape quotes and wrap in quotes if contains comma, newline, or quotes
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Trigger browser download of CSV file
 */
function downloadCSV(csvContent: string, filename: string): void {
  // Add UTF-8 BOM for proper Excel encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Format date/time for CSV (pt-PT format)
 */
function formatDateTime(dateTime: string | null | undefined): string {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Export visits to CSV
 */
export function exportVisitsToCSV(visits: Visit[], filename?: string): void {
  const headers = [
    'ID',
    'Nome do Visitante',
    'Documento',
    'Telefone',
    'Tipo de Visita',
    'Tipo de Serviço',
    'Unidade',
    'Restaurante',
    'Desporto',
    'Motivo',
    'Estado',
    'Modo de Aprovação',
    'Entrada',
    'Saída',
    'Condomínio'
  ];

  const accessor = (visit: Visit) => [
    visit.id || '',
    visit.visitor_name || '',
    visit.visitor_doc || '',
    visit.visitor_phone || '',
    visit.visit_type || '',
    visit.service_type || '',
    visit.unit_block && visit.unit_number ? `${visit.unit_block} ${visit.unit_number}` : '',
    visit.restaurant_name || '',
    visit.sport_name || '',
    visit.reason || '',
    visit.status || '',
    visit.approval_mode || '',
    formatDateTime(visit.check_in_at),
    formatDateTime(visit.check_out_at),
    visit.condominium_name || ''
  ];

  const csvContent = convertToCSV(visits, headers, accessor);
  const defaultFilename = `visitas_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}

/**
 * Export incidents to CSV
 */
export function exportIncidentsToCSV(incidents: Incident[], filename?: string): void {
  const headers = [
    'ID',
    'Tipo',
    'Descrição',
    'Estado',
    'Residente',
    'Unidade',
    'Reportado Em',
    'Reconhecido Em',
    'Resolvido Em',
    'Notas do Guarda',
    'Condomínio'
  ];

  const accessor = (incident: Incident) => [
    incident.id || '',
    incident.type_label || incident.type || '',
    incident.description || '',
    incident.status || '',
    incident.resident?.name || '',
    incident.unit ? `${incident.unit.code_block} ${incident.unit.number}` : '',
    formatDateTime(incident.reported_at),
    formatDateTime(incident.acknowledged_at),
    formatDateTime(incident.resolved_at),
    incident.guard_notes || '',
    incident.condominium?.name || ''
  ];

  const csvContent = convertToCSV(incidents, headers, accessor);
  const defaultFilename = `incidentes_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}
