import React, { useState, useEffect } from 'react';
import { UserCheck, Loader2, Search, Download, X, FileText } from 'lucide-react';
import { api } from '../../services/dataService';
import { Visit, Condominium, VisitStatus, VisitTypeConfig, ServiceTypeConfig } from '../../types';
import { useToast } from '../../components/Toast';
import { exportVisitsToCSV, exportVisitsToPDF } from '../../utils/csvExport';

// Calculate months difference between two dates
const getMonthsDifference = (start: string, end: string): number => {
  const startD = new Date(start);
  const endD = new Date(end);
  return (endD.getFullYear() - startD.getFullYear()) * 12 +
         (endD.getMonth() - startD.getMonth());
};

export default function AdminVisits() {
  const { showToast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitTypeConfig[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterVisitType, setFilterVisitType] = useState<string>('');
  const [filterServiceType, setFilterServiceType] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [usesBackendFiltering, setUsesBackendFiltering] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    visit: Visit | null;
    action: VisitStatus | null;
  }>({ isOpen: false, visit: null, action: null });
  const [residentAware, setResidentAware] = useState(false);

  // Reload when date range or condominium changes
  // Also reload when filters change AND we're using backend filtering
  useEffect(() => {
    loadData();
  }, [filterCondoId, startDate, endDate, filterVisitType, filterServiceType, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Determine if we should use backend filtering (>= 6 months date range)
      const monthsDiff = getMonthsDifference(startDate, endDate);
      const useBackendFilters = monthsDiff >= 6;
      setUsesBackendFiltering(useBackendFilters);

      console.log('[AdminVisits] Loading data with filters:', {
        startDate: startDate ? `${startDate}T00:00:00` : undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        filterCondoId: filterCondoId || undefined,
        monthsDiff,
        useBackendFilters
      });

      let visitsData: Visit[];

      if (useBackendFilters) {
        // >= 6 months: Use new RPC with all filters in backend
        console.log('[AdminVisits] Using backend filtering (>= 6 months)');
        visitsData = await api.adminGetAllVisitsFiltered(
          startDate ? `${startDate}T00:00:00` : undefined,
          endDate ? `${endDate}T23:59:59` : undefined,
          filterCondoId || undefined,
          filterVisitType || undefined,
          filterServiceType || undefined,
          filterStatus || undefined
        );
      } else {
        // < 6 months: Use current RPC (frontend filtering)
        console.log('[AdminVisits] Using frontend filtering (< 6 months)');
        visitsData = await api.adminGetAllVisits(
          startDate ? `${startDate}T00:00:00` : undefined,
          endDate ? `${endDate}T23:59:59` : undefined,
          filterCondoId || undefined
        );
      }

      const [condosData, visitTypesData, serviceTypesData] = await Promise.all([
        api.adminGetAllCondominiums(),
        api.getVisitTypes(),
        api.getServiceTypes()
      ]);

      console.log('[AdminVisits] Loaded visits:', visitsData.length, 'visits');
      console.log('[AdminVisits] Loaded condominiums:', condosData.length, 'condos');

      setVisits(visitsData);
      setCondominiums(condosData);
      setVisitTypes(visitTypesData);
      setServiceTypes(serviceTypesData);
    } catch (error) {
      console.error('[AdminVisits] Error loading data:', error);
      showToast('error', `Erro ao carregar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Open confirmation modal for Approve/Deny actions
  const openConfirmModal = (visit: Visit, action: VisitStatus) => {
    setConfirmModal({ isOpen: true, visit, action });
    setResidentAware(false);
  };

  // Close confirmation modal
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, visit: null, action: null });
    setResidentAware(false);
  };

  // Confirm and execute status update
  const confirmStatusUpdate = async () => {
    if (!confirmModal.visit || !confirmModal.action) return;

    try {
      const result = await api.adminUpdateVisitStatus(confirmModal.visit.id, confirmModal.action);
      if (result) {
        await loadData();
        const actionLabel = confirmModal.action === VisitStatus.APPROVED ? 'aprovada' : 'negada';
        showToast('success', `Visita ${actionLabel} com sucesso!`);
      } else {
        showToast('error', 'Erro ao atualizar estado da visita');
      }
    } catch (error) {
      console.error('Error updating visit status:', error);
      showToast('error', 'Erro ao atualizar estado da visita');
    } finally {
      closeConfirmModal();
    }
  };

  // Direct status update (for non-approve/deny actions)
  const handleStatusUpdate = async (visit: Visit, newStatus: VisitStatus) => {
    try {
      const result = await api.adminUpdateVisitStatus(visit.id, newStatus);
      if (result) {
        await loadData();
        showToast('success', 'Estado da visita atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar estado da visita');
      }
    } catch (error) {
      console.error('Error updating visit status:', error);
      showToast('error', 'Erro ao atualizar estado da visita');
    }
  };

  const getStatusBadge = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.PENDING:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">PENDENTE</span>;
      case VisitStatus.APPROVED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">AUTORIZADO</span>;
      case VisitStatus.DENIED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">NEGADO</span>;
      case VisitStatus.INSIDE:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">NO INTERIOR</span>;
      case VisitStatus.LEFT:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">SAIU</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">DESCONHECIDO</span>;
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

  // Check if selected visit type requires service type
  const selectedVisitType = visitTypes.find(vt => vt.name === filterVisitType);
  const showServiceTypeFilter = selectedVisitType?.requires_service_type === true;

  const filteredVisits = visits.filter(visit => {
    // Search filter is always applied locally
    const matchesSearch =
      visit.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.visitor_doc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.unit_block?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.unit_number?.toLowerCase().includes(searchTerm.toLowerCase());

    // If using backend filtering, only apply search locally (other filters already applied in RPC)
    if (usesBackendFiltering) {
      return matchesSearch;
    }

    // If < 6 months, apply all filters locally
    const matchesStatus = !filterStatus || visit.status === filterStatus;
    const matchesVisitType = !filterVisitType || visit.visit_type === filterVisitType;
    const matchesServiceType = !filterServiceType || visit.service_type === filterServiceType;

    return matchesSearch && matchesStatus && matchesVisitType && matchesServiceType;
  });

  // Debug logging for filters
  console.log('[AdminVisits] Filter summary:', {
    totalVisits: visits.length,
    filteredVisits: filteredVisits.length,
    searchTerm,
    filterStatus,
    statusCounts: visits.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  const handleExportCSV = () => {
    if (filteredVisits.length === 0) {
      showToast('warning', 'Nenhuma visita para exportar');
      return;
    }
    exportVisitsToCSV(filteredVisits);
    showToast('success', `${filteredVisits.length} visitas exportadas para CSV`);
  };

  const handleExportPDF = () => {
    if (filteredVisits.length === 0) {
      showToast('warning', 'Nenhuma visita para exportar');
      return;
    }
    exportVisitsToPDF(filteredVisits);
    showToast('success', `${filteredVisits.length} visitas exportadas para PDF`);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Visitas</h1>
          <p className="text-slate-600">Visualizar e gerir todas as visitas registadas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={loading || filteredVisits.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileText size={20} />
            Exportar PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || filteredVisits.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={20} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, documento, unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCondoId || ''}
            onChange={(e) => setFilterCondoId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Condomínios</option>
            {condominiums.map(condo => (
              <option key={condo.id} value={condo.id}>{condo.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Estados</option>
            <option value={VisitStatus.PENDING}>Pendente</option>
            <option value={VisitStatus.APPROVED}>Autorizado</option>
            <option value={VisitStatus.DENIED}>Negado</option>
            <option value={VisitStatus.INSIDE}>No Interior</option>
            <option value={VisitStatus.LEFT}>Saiu</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={filterVisitType}
            onChange={(e) => {
              setFilterVisitType(e.target.value);
              setFilterServiceType(''); // Reset service type when visit type changes
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Tipos de Visita</option>
            {visitTypes.map(vt => (
              <option key={vt.id} value={vt.name}>{vt.name}</option>
            ))}
          </select>
          {showServiceTypeFilter && (
            <select
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Tipos de Serviço</option>
              {serviceTypes.map(st => (
                <option key={st.id} value={st.name}>{st.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando visitas...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <UserCheck size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm || filterStatus ? 'Nenhum resultado encontrado' : 'Nenhuma visita registada'}
          </h3>
          <p className="text-slate-600">
            {searchTerm || filterStatus ? 'Tente ajustar os filtros de pesquisa' : 'Visitas aparecerão aqui quando forem registadas'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredVisits.map((visit) => (
            <div
              key={visit.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {visit.photo_url ? (
                    <img
                      src={visit.photo_url}
                      alt={visit.visitor_name}
                      className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border border-slate-200"
                      onClick={() => setZoomPhoto(visit.photo_url!)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
                      <UserCheck className="text-blue-600" size={32} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {visit.visitor_name}
                      </h3>
                      {getStatusBadge(visit.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                      {visit.visitor_doc && (
                        <p><span className="font-medium">Documento:</span> {visit.visitor_doc}</p>
                      )}
                      {visit.visitor_phone && (
                        <p><span className="font-medium">Telefone:</span> {visit.visitor_phone}</p>
                      )}
                      <p><span className="font-medium">Tipo:</span> {visit.visit_type || 'N/A'}</p>
                      {visit.service_type && (
                        <p><span className="font-medium">Serviço:</span> {visit.service_type}</p>
                      )}
                      {visit.unit_block && visit.unit_number && (
                        <p><span className="font-medium">Unidade:</span> {visit.unit_block} {visit.unit_number}</p>
                      )}
                      {visit.restaurant_name && (
                        <p><span className="font-medium">Restaurante:</span> {visit.restaurant_name}</p>
                      )}
                      {visit.sport_name && (
                        <p><span className="font-medium">Desporto:</span> {visit.sport_name}</p>
                      )}
                      <p><span className="font-medium">Entrada:</span> {formatDateTime(visit.check_in_at)}</p>
                      {visit.check_out_at && (
                        <p><span className="font-medium">Saída:</span> {formatDateTime(visit.check_out_at)}</p>
                      )}
                    </div>
                    {visit.reason && (
                      <p className="text-sm text-slate-500 italic">Motivo: {visit.reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {visit.status === VisitStatus.PENDING && (
                    <>
                      <button
                        onClick={() => openConfirmModal(visit, VisitStatus.APPROVED)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => openConfirmModal(visit, VisitStatus.DENIED)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Negar
                      </button>
                    </>
                  )}
                  {visit.status === VisitStatus.APPROVED && (
                    <button
                      onClick={() => handleStatusUpdate(visit, VisitStatus.INSIDE)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Marcar Interior
                    </button>
                  )}
                  {visit.status === VisitStatus.INSIDE && (
                    <button
                      onClick={() => handleStatusUpdate(visit, VisitStatus.LEFT)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      Marcar Saída
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.visit && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={closeConfirmModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 rounded-t-xl ${
              confirmModal.action === VisitStatus.APPROVED
                ? 'bg-green-600'
                : 'bg-red-600'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {confirmModal.action === VisitStatus.APPROVED
                    ? 'Confirmar Aprovação'
                    : 'Confirmar Negação'}
                </h2>
                <button
                  onClick={closeConfirmModal}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Visitor Photo and Name */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                {confirmModal.visit.photo_url ? (
                  <img
                    src={confirmModal.visit.photo_url}
                    alt={confirmModal.visit.visitor_name}
                    className="w-20 h-20 rounded-lg object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-blue-50 rounded-lg flex items-center justify-center">
                    <UserCheck className="text-blue-600" size={40} />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {confirmModal.visit.visitor_name}
                  </h3>
                  {getStatusBadge(confirmModal.visit.status)}
                </div>
              </div>

              {/* Visit Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {confirmModal.visit.visitor_doc && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Documento</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.visitor_doc}</p>
                  </div>
                )}
                {confirmModal.visit.visitor_phone && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Telefone</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.visitor_phone}</p>
                  </div>
                )}
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-medium">Tipo de Visita</p>
                  <p className="text-slate-900 font-semibold">{confirmModal.visit.visit_type || 'N/A'}</p>
                </div>
                {confirmModal.visit.service_type && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Tipo de Serviço</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.service_type}</p>
                  </div>
                )}
                {confirmModal.visit.unit_block && confirmModal.visit.unit_number && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Unidade</p>
                    <p className="text-slate-900 font-semibold">
                      {confirmModal.visit.unit_block} {confirmModal.visit.unit_number}
                    </p>
                  </div>
                )}
                {confirmModal.visit.restaurant_name && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Restaurante</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.restaurant_name}</p>
                  </div>
                )}
                {confirmModal.visit.sport_name && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Desporto</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.sport_name}</p>
                  </div>
                )}
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-medium">Data/Hora Entrada</p>
                  <p className="text-slate-900 font-semibold">{formatDateTime(confirmModal.visit.check_in_at)}</p>
                </div>
                {confirmModal.visit.condominium_name && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Condomínio</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.condominium_name}</p>
                  </div>
                )}
                {confirmModal.visit.approval_mode && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-medium">Modo de Aprovação</p>
                    <p className="text-slate-900 font-semibold">{confirmModal.visit.approval_mode}</p>
                  </div>
                )}
              </div>

              {/* Reason */}
              {confirmModal.visit.reason && (
                <div className="bg-amber-50 p-4 rounded-lg mb-6">
                  <p className="text-xs text-amber-700 uppercase font-medium mb-1">Motivo da Visita</p>
                  <p className="text-amber-900">{confirmModal.visit.reason}</p>
                </div>
              )}

              {/* Resident Awareness Checkbox */}
              <div className={`p-4 rounded-lg mb-6 ${
                confirmModal.action === VisitStatus.APPROVED
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={residentAware}
                    onChange={(e) => setResidentAware(e.target.checked)}
                    className={`mt-1 w-5 h-5 rounded border-2 ${
                      confirmModal.action === VisitStatus.APPROVED
                        ? 'text-green-600 focus:ring-green-500'
                        : 'text-red-600 focus:ring-red-500'
                    }`}
                  />
                  <span className={`text-sm font-medium ${
                    confirmModal.action === VisitStatus.APPROVED
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    Confirmo que o residente tem conhecimento desta {
                      confirmModal.action === VisitStatus.APPROVED
                        ? 'aprovação'
                        : 'negação'
                    } de entrada do visitante.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeConfirmModal}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmStatusUpdate}
                  disabled={!residentAware}
                  className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-medium ${
                    confirmModal.action === VisitStatus.APPROVED
                      ? residentAware
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-green-300 cursor-not-allowed'
                      : residentAware
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  {confirmModal.action === VisitStatus.APPROVED ? 'Aprovar Visita' : 'Negar Visita'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomPhoto}
              alt="Foto do visitante"
              className="max-w-full max-h-[90vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
            >
              <X size={24} className="text-slate-800" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
