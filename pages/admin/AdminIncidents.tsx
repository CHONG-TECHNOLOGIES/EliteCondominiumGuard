import React, { useState, useEffect, useContext, useRef } from 'react';
import { AlertTriangle, Loader2, Search, Eye, CheckCircle2, MessageSquare, X, Download, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/dataService';
import { Incident, Condominium } from '../../types';
import { useToast } from '../../components/Toast';
import { AuthContext } from '../../App';
import { exportIncidentsToCSV } from '../../utils/csvExport';
import { buildAuditChanges, hasAuditChanges } from '../../utils/auditDiff';
import { logger, ErrorCategory } from '@/services/logger';

// Searchable Select Component
interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  alwaysVisibleValues?: Array<number | string>;
  className?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  alwaysVisibleValues = [],
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    alwaysVisibleValues.includes(option.value) ||
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: number | string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between cursor-pointer"
      >
        <span className={selectedOption ? 'text-text-main' : 'text-text-dim'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-bg-root rounded transition-colors"
            >
              <X size={14} className="text-text-dim" />
            </button>
          )}
          <ChevronDown size={18} className={`text-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-main rounded-lg shadow-lg">
          <div className="p-2 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-dim text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-root flex items-center justify-between transition-colors ${option.value === value ? 'bg-accent/10 text-accent' : 'text-text-main'
                    }`}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={16} className="text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminIncidents() {
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionStatus, setActionStatus] = useState<'inprogress' | 'resolved'>('resolved');

  useEffect(() => {
    loadData();
  }, [filterCondoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incidentsData, condosData] = await Promise.all([
        api.adminGetAllIncidents(filterCondoId || undefined),
        api.adminGetAllCondominiums()
      ]);
      setIncidents(incidentsData);
      setCondominiums(condosData);
    } catch (error) {
      logger.error('Error loading data', error, ErrorCategory.NETWORK);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (incident: Incident) => {
    if (!user?.id) {
      showToast('error', 'Utilizador não autenticado');
      return;
    }

    try {
      const updates = { status: 'ACKNOWLEDGED' };
      const changes = buildAuditChanges(incident, updates, { exclude: ['pin', 'pin_hash'] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;
      const result = await api.adminAcknowledgeIncident(incident.id, user.id, undefined, auditDetails);
      if (result) {
        await loadData();
        showToast('success', 'Incidente reconhecido com sucesso!');
      } else {
        showToast('error', 'Erro ao reconhecer incidente');
      }
    } catch (error) {
      logger.error('Error acknowledging incident', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao reconhecer incidente');
    }
  };

  const handleOpenActionModal = (incident: Incident) => {
    setSelectedIncident(incident);
    setActionNotes('');
    setActionStatus('resolved');
    setShowActionModal(true);
  };

  const handleCloseActionModal = () => {
    setShowActionModal(false);
    setSelectedIncident(null);
    setActionNotes('');
  };

  const handleSubmitAction = async () => {
    if (!selectedIncident || !user?.id) return;
    if (!actionNotes.trim()) {
      showToast('error', 'Por favor, descreva a ação tomada');
      return;
    }

    try {
      await api.adminReportIncidentAction(selectedIncident.id, actionNotes, actionStatus, user.id);
      await loadData();
      handleCloseActionModal();
      showToast('success', actionStatus === 'resolved' ? 'Incidente resolvido com sucesso!' : 'Incidente atualizado com sucesso!');
    } catch (error) {
      logger.error('Error submitting incident action', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao reportar ação');
    }
  };

  const getStatusBadge = (status: string, statusLabel?: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">{statusLabel || 'NOVO'}</span>;
      case 'acknowledged':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{statusLabel || 'VISTO PELO GUARDA'}</span>;
      case 'inprogress':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">{statusLabel || 'EM PROGRESSO'}</span>;
      case 'resolved':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">{statusLabel || 'RESOLVIDO'}</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{statusLabel || status}</span>;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch =
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.resident?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.type_label?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || incident.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    if (filteredIncidents.length === 0) {
      showToast('warning', 'Nenhum incidente para exportar');
      return;
    }
    exportIncidentsToCSV(filteredIncidents);
    void api.logAudit({
      condominium_id: user?.condominium_id ?? null,
      actor_id: user?.id ?? null,
      action: 'EXPORT',
      target_table: 'incidents',
      target_id: null,
      details: {
        format: 'CSV',
        count: filteredIncidents.length,
        filters: {
          search: searchTerm || null,
          condominium_id: filterCondoId ?? null,
          status: filterStatus || null
        }
      }
    });
    showToast('success', `${filteredIncidents.length} incidentes exportados para CSV`);
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Gestão de Incidentes</h1>
          <p className="text-text-dim">Visualizar e gerir todos os incidentes reportados</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading || filteredIncidents.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download size={20} />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por descrição, residente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <SearchableSelect
          options={[
            { value: 'ALL', label: 'Todos os Condomínios' },
            ...condominiums.map(condo => ({ value: condo.id, label: condo.name }))
          ]}
          value={filterCondoId}
          onChange={(val) => setFilterCondoId(val === 'ALL' ? null : val as number | null)}
          placeholder="Todos os condomínios"
          searchPlaceholder="Pesquisar condomínio..."
          emptyMessage="Nenhum condomínio encontrado"
          alwaysVisibleValues={['ALL']}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os Estados</option>
          <option value="new">Novo</option>
          <option value="acknowledged">Visto pelo guarda</option>
          <option value="inprogress">Em Progresso</option>
          <option value="resolved">Resolvido</option>
        </select>
      </div>

      {/* Incidents List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando incidentes...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <AlertTriangle size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm || filterStatus ? 'Nenhum resultado encontrado' : 'Nenhum incidente reportado'}
          </h3>
          <p className="text-text-dim">
            {searchTerm || filterStatus ? 'Tente ajustar os filtros de pesquisa' : 'Incidentes aparecerão aqui quando forem reportados'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-white rounded-xl shadow-sm border border-border-main p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${
                    incident.status.toLowerCase() === 'resolved' ? 'bg-green-50' :
                    incident.status.toLowerCase() === 'acknowledged' ? 'bg-blue-50' :
                    'bg-orange-50'
                  }`}>
                    <AlertTriangle className={
                      incident.status.toLowerCase() === 'resolved' ? 'text-green-600' :
                      incident.status.toLowerCase() === 'acknowledged' ? 'text-blue-600' :
                      'text-orange-600'
                    } size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-text-main">
                        {incident.type_label || incident.type}
                      </h3>
                      {getStatusBadge(incident.status, incident.status_label)}
                    </div>
                    <p className="text-text-main mb-3">{incident.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-dim mb-2">
                      {incident.resident && (
                        <p><span className="font-medium">Residente:</span> {incident.resident.name}</p>
                      )}
                      {incident.unit && (
                        <p><span className="font-medium">Unidade:</span> {incident.unit.code_block} {incident.unit.number}</p>
                      )}
                      <p><span className="font-medium">Reportado:</span> {formatDateTime(incident.reported_at)}</p>
                      {incident.acknowledged_at && (
                        <p><span className="font-medium">Reconhecido:</span> {formatDateTime(incident.acknowledged_at)}</p>
                      )}
                      {incident.resolved_at && (
                        <p><span className="font-medium">Resolvido:</span> {formatDateTime(incident.resolved_at)}</p>
                      )}
                    </div>
                    {incident.guard_notes && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-text-dim mb-1">Notas do Guarda:</p>
                        <p className="text-sm text-text-main">{incident.guard_notes}</p>
                      </div>
                    )}
                    {incident.photo_path && (
                      <div className="mt-3">
                        <img
                          src={incident.photo_path}
                          alt="Foto do incidente"
                          className="w-32 h-32 object-cover rounded-lg border border-border-main"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {incident.status.toLowerCase() === 'new' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(incident)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Eye size={16} />
                        Reconhecer
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(incident)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        Reportar Ação
                      </button>
                    </>
                  )}
                  {incident.status.toLowerCase() === 'acknowledged' && (
                    <button
                      onClick={() => handleOpenActionModal(incident)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Reportar Ação
                    </button>
                  )}
                  {incident.status.toLowerCase() === 'inprogress' && (
                    <button
                      onClick={() => handleOpenActionModal(incident)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Fechar Incidente
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Report Modal */}
      {showActionModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Reportar Ação do Guarda</h2>
              <button
                onClick={handleCloseActionModal}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-text-dim mb-1">
                  <span className="font-medium">Incidente:</span> {selectedIncident.type_label || selectedIncident.type}
                </p>
                <p className="text-sm text-text-main">
                  <span className="font-medium">Descrição:</span> {selectedIncident.description}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-text-main mb-2">Estado Final:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="inprogress"
                      checked={actionStatus === 'inprogress'}
                      onChange={(e) => setActionStatus(e.target.value as 'inprogress' | 'resolved')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Em Progresso</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="resolved"
                      checked={actionStatus === 'resolved'}
                      onChange={(e) => setActionStatus(e.target.value as 'inprogress' | 'resolved')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Resolvido</span>
                  </label>
                </div>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-bold text-text-main mb-2">
                  Descreva a ação tomada: *
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Ex: Contactei o residente por telefone. Confirmou que verificou as câmeras e não encontrou nada suspeito. Situação resolvida."
                  className="w-full h-32 px-4 py-3 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-text-dim mt-1">
                  Descreva as ações tomadas, como contactou o residente, e o resultado.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={handleCloseActionModal}
                className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitAction}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Submeter Ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
