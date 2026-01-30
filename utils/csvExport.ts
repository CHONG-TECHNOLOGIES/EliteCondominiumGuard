/**
 * Export Utilities
 * Provides functions to export data to CSV and PDF formats
 */

import { Visit, Incident, AuditLog } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: AuditLog[], filename?: string): void {
  const headers = [
    'ID',
    'Data/Hora',
    'Ação',
    'Tabela',
    'ID Alvo',
    'Utilizador',
    'Condomínio',
    'Detalhes'
  ];

  const accessor = (log: AuditLog) => [
    log.id || '',
    formatDateTime(log.created_at),
    log.action || '',
    log.target_table || '',
    log.target_id ?? '',
    log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : '',
    log.condominium?.name || '',
    log.details ? JSON.stringify(log.details) : ''
  ];

  const csvContent = convertToCSV(logs, headers, accessor);
  const defaultFilename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename || defaultFilename);
}

/**
 * Get status label in Portuguese
 */
function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pendente',
    'APPROVED': 'Autorizado',
    'DENIED': 'Negado',
    'INSIDE': 'No Interior',
    'LEFT': 'Saiu'
  };
  return statusMap[status] || status;
}

/**
 * Export visits to PDF
 */
export function exportVisitsToPDF(visits: Visit[], filename?: string): void {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Visitas', 14, 15);

  // Date range info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Gerado em: ${dateStr}`, 14, 22);
  doc.text(`Total de registos: ${visits.length}`, 14, 27);

  // Table headers
  const headers = [
    'Nome',
    'Documento',
    'Telefone',
    'Tipo',
    'Unidade',
    'Estado',
    'Entrada',
    'Saída'
  ];

  // Table data
  const data = visits.map(visit => [
    visit.visitor_name || '',
    visit.visitor_doc || '',
    visit.visitor_phone || '',
    visit.visit_type || '',
    visit.unit_block && visit.unit_number ? `${visit.unit_block} ${visit.unit_number}` : '',
    getStatusLabel(visit.status),
    formatDateTime(visit.check_in_at).replace(',', ''),
    visit.check_out_at ? formatDateTime(visit.check_out_at).replace(',', '') : ''
  ]);

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 32,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 64, 175], // blue-800
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Nome
      1: { cellWidth: 30 }, // Documento
      2: { cellWidth: 30 }, // Telefone
      3: { cellWidth: 25 }, // Tipo
      4: { cellWidth: 25 }, // Unidade
      5: { cellWidth: 25 }, // Estado
      6: { cellWidth: 35 }, // Entrada
      7: { cellWidth: 35 }, // Saída
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount} - Elite AccessControl`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const defaultFilename = `visitas_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
}
