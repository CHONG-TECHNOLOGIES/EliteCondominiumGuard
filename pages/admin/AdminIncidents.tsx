import React, { useState, useEffect, useContext } from 'react';
import { AlertTriangle, Loader2, Search, Eye, CheckCircle2, MessageSquare, X, Download } from 'lucide-react';
import { api } from '../../services/dataService';
import { Incident, Condominium } from '../../types';
import { useToast } from '../../components/Toast';
import { AuthContext } from '../../App';
import { exportIncidentsToCSV } from '../../utils/csvExport';

export default function AdminIncidents() {
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [notes, setNotes] = useState('');

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
      console.error('Error loading data:', error);
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
      const result = await api.adminAcknowledgeIncident(incident.id, user.id);
      if (result) {
        await loadData();
        showToast('success', 'Incidente reconhecido com sucesso!');
      } else {
        showToast('error', 'Erro ao reconhecer incidente');
      }
    } catch (error) {
      console.error('Error acknowledging incident:', error);
      showToast('error', 'Erro ao reconhecer incidente');
    }
  };

  const handleResolve = async (incident: Incident, withNotes?: boolean) => {
    if (!user?.id) {
      showToast('error', 'Utilizador não autenticado');
      return;
    }

    if (withNotes) {
      setSelectedIncident(incident);
      setNotes(incident.guard_notes || '');
      setShowNotesModal(true);
      return;
    }

    try {
      const result = await api.adminResolveIncident(incident.id, user.id);
      if (result) {
        await loadData();
        showToast('success', 'Incidente resolvido com sucesso!');
      } else {
        showToast('error', 'Erro ao resolver incidente');
      }
    } catch (error) {
      console.error('Error resolving incident:', error);
      showToast('error', 'Erro ao resolver incidente');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedIncident || !user?.id) return;

    try {
      const result = await api.adminResolveIncident(selectedIncident.id, user.id, notes);
      if (result) {
        await loadData();
        setShowNotesModal(false);
        setSelectedIncident(null);
        setNotes('');
        showToast('success', 'Incidente resolvido com notas!');
      } else {
        showToast('error', 'Erro ao resolver incidente');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      showToast('error', 'Erro ao resolver incidente');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">PENDENTE</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">RECONHECIDO</span>;
      case 'RESOLVED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">RESOLVIDO</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
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

    const matchesStatus = !filterStatus || incident.status.toUpperCase() === filterStatus.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    if (filteredIncidents.length === 0) {
      showToast('warning', 'Nenhum incidente para exportar');
      return;
    }
    exportIncidentsToCSV(filteredIncidents);
    showToast('success', `${filteredIncidents.length} incidentes exportados para CSV`);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Incidentes</h1>
          <p className="text-slate-600">Visualizar e gerir todos os incidentes reportados</p>
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
          <option value="PENDING">Pendente</option>
          <option value="ACKNOWLEDGED">Reconhecido</option>
          <option value="RESOLVED">Resolvido</option>
        </select>
      </div>

      {/* Incidents List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando incidentes...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertTriangle size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm || filterStatus ? 'Nenhum resultado encontrado' : 'Nenhum incidente reportado'}
          </h3>
          <p className="text-slate-600">
            {searchTerm || filterStatus ? 'Tente ajustar os filtros de pesquisa' : 'Incidentes aparecerão aqui quando forem reportados'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${
                    incident.status.toUpperCase() === 'RESOLVED' ? 'bg-green-50' :
                    incident.status.toUpperCase() === 'ACKNOWLEDGED' ? 'bg-blue-50' :
                    'bg-orange-50'
                  }`}>
                    <AlertTriangle className={
                      incident.status.toUpperCase() === 'RESOLVED' ? 'text-green-600' :
                      incident.status.toUpperCase() === 'ACKNOWLEDGED' ? 'text-blue-600' :
                      'text-orange-600'
                    } size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {incident.type_label || incident.type}
                      </h3>
                      {getStatusBadge(incident.status)}
                    </div>
                    <p className="text-slate-700 mb-3">{incident.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
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
                        <p className="text-xs font-medium text-slate-600 mb-1">Notas do Guarda:</p>
                        <p className="text-sm text-slate-700">{incident.guard_notes}</p>
                      </div>
                    )}
                    {incident.photo_path && (
                      <div className="mt-3">
                        <img
                          src={incident.photo_path}
                          alt="Foto do incidente"
                          className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {incident.status.toUpperCase() === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(incident)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Eye size={16} />
                        Reconhecer
                      </button>
                      <button
                        onClick={() => handleResolve(incident, true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        Resolver
                      </button>
                    </>
                  )}
                  {incident.status.toUpperCase() === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => handleResolve(incident, true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Resolver
                    </button>
                  )}
                  {incident.status.toUpperCase() !== 'RESOLVED' && (
                    <button
                      onClick={() => {
                        setSelectedIncident(incident);
                        setNotes(incident.guard_notes || '');
                        setShowNotesModal(true);
                      }}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Notas
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedIncident.status.toUpperCase() === 'RESOLVED' ? 'Ver Notas' : 'Resolver com Notas'}
              </h2>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedIncident(null);
                  setNotes('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-medium">Incidente:</span> {selectedIncident.type_label || selectedIncident.type}
                </p>
                <p className="text-sm text-slate-700">{selectedIncident.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas do Guarda
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={selectedIncident.status.toUpperCase() === 'RESOLVED'}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  rows={5}
                  placeholder="Descreva as ações tomadas para resolver o incidente..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedIncident(null);
                  setNotes('');
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {selectedIncident.status.toUpperCase() === 'RESOLVED' ? 'Fechar' : 'Cancelar'}
              </button>
              {selectedIncident.status.toUpperCase() !== 'RESOLVED' && (
                <button
                  onClick={handleSaveNotes}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Resolver Incidente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
