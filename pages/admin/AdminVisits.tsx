import React, { useState, useEffect } from 'react';
import { UserCheck, Loader2, Search, Download } from 'lucide-react';
import { api } from '../../services/dataService';
import { Visit, Condominium, VisitStatus } from '../../types';
import { useToast } from '../../components/Toast';
import { exportVisitsToCSV } from '../../utils/csvExport';

export default function AdminVisits() {
  const { showToast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today

  useEffect(() => {
    loadData();
  }, [filterCondoId, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[AdminVisits] Loading data with filters:', {
        startDate: startDate ? `${startDate}T00:00:00` : undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        filterCondoId: filterCondoId || undefined
      });

      const [visitsData, condosData] = await Promise.all([
        api.adminGetAllVisits(
          startDate ? `${startDate}T00:00:00` : undefined,
          endDate ? `${endDate}T23:59:59` : undefined,
          filterCondoId || undefined
        ),
        api.adminGetAllCondominiums()
      ]);

      console.log('[AdminVisits] Loaded visits:', visitsData.length, 'visits');
      console.log('[AdminVisits] Loaded condominiums:', condosData.length, 'condos');
      console.log('[AdminVisits] Sample visit data:', visitsData[0]);

      setVisits(visitsData);
      setCondominiums(condosData);
    } catch (error) {
      console.error('[AdminVisits] Error loading data:', error);
      showToast('error', `Erro ao carregar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredVisits = visits.filter(visit => {
    const matchesSearch =
      visit.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.visitor_doc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.unit_block?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.unit_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || visit.status === filterStatus;

    return matchesSearch && matchesStatus;
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

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Visitas</h1>
          <p className="text-slate-600">Visualizar e gerir todas as visitas registadas</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading || filteredVisits.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download size={20} />
          Exportar CSV
        </button>
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
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <UserCheck className="text-blue-600" size={32} />
                  </div>
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
                        onClick={() => handleStatusUpdate(visit, VisitStatus.APPROVED)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(visit, VisitStatus.DENIED)}
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
    </div>
  );
}
