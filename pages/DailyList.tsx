
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/dataService';
import { Visit, VisitEvent, VisitStatus, SyncStatus } from '../types';
import { initiatePhoneCall } from '@/utils/approvalModes';
import { CheckCircle, LogOut, Clock, AlertCircle, User, MapPin, ArrowLeft, Phone, History, X } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function DailyList() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [eventModal, setEventModal] = useState<{
    isOpen: boolean;
    visit: Visit | null;
    events: VisitEvent[];
    loading: boolean;
  }>({ isOpen: false, visit: null, events: [], loading: false });

  const loadVisits = async () => {
    const data = await api.getTodaysVisits();
    setVisits(data.sort((a, b) => new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()));
  };

  useEffect(() => {
    loadVisits();
    const interval = setInterval(loadVisits, 30000); // Auto refresh list
    return () => clearInterval(interval);
  }, []);

  const handleCheckout = async (id: number) => {
    showConfirm(
      "Confirmar saída?",
      async () => {
        await api.updateVisitStatus(id, VisitStatus.LEFT);
        loadVisits();
        showToast('success', 'Saída registada com sucesso!');
      }
    );
  };

  const handleApprove = async (id: number) => {
    await api.updateVisitStatus(id, VisitStatus.APPROVED);
    loadVisits();
  };

  const handleContactResident = (visit: Visit) => {
    if (!visit.visitor_phone) {
      alert('N?mero de telefone n?o dispon?vel para este visitante.');
      return;
    }

    const unitLabel = visit.unit_block && visit.unit_number
      ? `${visit.unit_block} ${visit.unit_number}`
      : undefined;

    showConfirm(`Confirmar chamada para ${visit.visitor_phone}?`, async () => {
      await api.logCallInitiated({
        phone: visit.visitor_phone,
        source: 'visitor',
        visitId: visit.id,
        unitId: visit.unit_id,
        unitLabel,
        context: 'daily_list',
        targetTable: 'visits',
        targetId: visit.id
      });
      initiatePhoneCall(visit.visitor_phone!);
    });
  };

  const openEventModal = async (visit: Visit) => {
    setEventModal({ isOpen: true, visit, events: [], loading: true });
    const events = await api.getVisitEvents(visit.id);
    setEventModal({ isOpen: true, visit, events, loading: false });
  };

  const closeEventModal = () => {
    setEventModal({ isOpen: false, visit: null, events: [], loading: false });
  };

  const getStatusBadge = (status: VisitStatus) => {
    // Note: VisitStatus enum values are already in Portuguese (e.g. 'PENDENTE', 'APROVADO')
    switch (status) {
      case VisitStatus.PENDING: return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs md:text-sm font-bold">{status}</span>;
      case VisitStatus.APPROVED: return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs md:text-sm font-bold">{status}</span>;
      case VisitStatus.INSIDE: return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs md:text-sm font-bold">{status}</span>;
      case VisitStatus.LEFT: return <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs md:text-sm font-bold">{status}</span>;
      case VisitStatus.DENIED: return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs md:text-sm font-bold">{status}</span>;
      default: return null;
    }
  };

  const getStatusDotClass = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.PENDING:
        return 'bg-yellow-500';
      case VisitStatus.APPROVED:
        return 'bg-green-500';
      case VisitStatus.DENIED:
        return 'bg-red-500';
      case VisitStatus.INSIDE:
        return 'bg-blue-500';
      case VisitStatus.LEFT:
        return 'bg-slate-500';
      default:
        return 'bg-slate-400';
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
        >
          <ArrowLeft size={28} className="text-slate-700" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Atividade de Hoje</h2>
      </div>

      {visits.length === 0 ? (
        <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
          Nenhuma visita registada hoje.
        </div>
      ) : (
        <>
          {/* Mobile Card View (< 768px) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {visits.map(visit => (
              <div key={visit.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {visit.photo_url ? (
                      <img src={visit.photo_url} alt="v" className="w-12 h-12 rounded-full object-cover bg-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                        {visit.visitor_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800">{visit.visitor_name}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} />
                        {new Date(visit.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(visit.status)}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1"><User size={14} /> {visit.visit_type}</div>
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    {visit.restaurant_name || visit.sport_name || (visit.unit_block && visit.unit_number ? `${visit.unit_block} - ${visit.unit_number}` : `Unidade ${visit.unit_id}`)}
                  </div>
                  {visit.vehicle_license_plate && (
                    <div className="flex items-center gap-1">
                      <span>🚗</span> {visit.vehicle_license_plate}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  {/* PENDING: Show "Contact Resident" + "Authorize" buttons */}
                  {visit.status === VisitStatus.PENDING && (
                    <>
                      <button
                        onClick={() => handleContactResident(visit)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                        <Phone size={16} /> Contactar morador
                      </button>
                      <button
                        disabled
                        className="flex-1 px-3 py-2 bg-green-300 text-green-700 rounded-lg font-bold text-sm flex justify-center items-center gap-2 opacity-50 cursor-not-allowed"
                      >
                        <CheckCircle size={16} /> Autorizar
                      </button>
                    </>
                  )}

                  {/* APPROVED/INSIDE: Show only "Mark Exit" button (enabled) */}
                  {(visit.status === VisitStatus.APPROVED || visit.status === VisitStatus.INSIDE) && (
                    <button
                      onClick={() => handleCheckout(visit.id)}
                      className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2 hover:bg-emerald-700 transition-colors"
                    >
                      <LogOut size={16} /> Saída
                    </button>
                  )}
                </div>
                <button
                  onClick={() => openEventModal(visit)}
                  className="w-full px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm flex justify-center items-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <History size={16} /> Historico
                </button>
              </div>
            ))}
          </div>

          {/* Tablet/Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-600">Visitante</th>
                  <th className="p-4 font-bold text-slate-600">Tipo / Unidade</th>
                  <th className="p-4 font-bold text-slate-600">Hora</th>
                  <th className="p-4 font-bold text-slate-600">Estado</th>
                  <th className="p-4 font-bold text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map(visit => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {visit.photo_url ? (
                          <img src={visit.photo_url} alt="v" className="w-12 h-12 rounded-full object-cover bg-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                            {visit.visitor_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{visit.visitor_name}</p>
                          {visit.sync_status === SyncStatus.PENDING_SYNC && (
                            <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
                              <AlertCircle size={12} /> Não Sincronizado
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openEventModal(visit)}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <History size={16} /> Historico
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-700">{visit.visit_type}</p>
                      {visit.service_type && <p className="text-sm text-slate-500">{visit.service_type}</p>}
                      <p className="text-sm text-slate-500">
                        {visit.restaurant_name || visit.sport_name || (visit.unit_block && visit.unit_number ? `${visit.unit_block} - ${visit.unit_number}` : `Unidade ${visit.unit_id}`)}
                      </p>
                      {visit.vehicle_license_plate && (
                        <p className="text-sm text-slate-500">🚗 {visit.vehicle_license_plate}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={16} />
                        {new Date(visit.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(visit.status)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* PENDING: Show "Contact Resident" + "Authorize" buttons */}
                        {visit.status === VisitStatus.PENDING && (
                          <>
                            <button
                              onClick={() => handleContactResident(visit)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
                            >
                              <Phone size={16} /> Contactar morador
                            </button>
                            <button
                              disabled
                              className="px-4 py-2 bg-green-300 text-green-700 rounded-lg font-bold text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
                            >
                              <CheckCircle size={16} /> Autorizar
                            </button>
                          </>
                        )}

                        {/* APPROVED/INSIDE: Show only "Mark Exit" button (enabled) */}
                        {(visit.status === VisitStatus.APPROVED || visit.status === VisitStatus.INSIDE) && (
                          <button
                            onClick={() => handleCheckout(visit.id)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 transition-colors"
                          >
                            <LogOut size={16} /> Saída
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Event History Modal */}
      {eventModal.isOpen && eventModal.visit && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={closeEventModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 rounded-t-xl bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Historico da Visita</h2>
                <button
                  onClick={closeEventModal}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-slate-200 mt-1">
                {eventModal.visit.visitor_name} • {eventModal.visit.visit_type || 'N/A'}
              </p>
            </div>

            <div className="p-6">
              {eventModal.loading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Clock className="mr-2" size={18} />
                  A carregar eventos...
                </div>
              ) : eventModal.events.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Sem eventos registados.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
                  {eventModal.events.map((event) => (
                    <div
                      key={`${event.id}-${event.event_at}`}
                      className="relative"
                    >
                      <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full ${getStatusDotClass(event.status)}`} />
                      <div className="border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(event.status)}
                          <span className="text-sm text-slate-600">
                            {formatDateTime(event.event_at)}
                          </span>
                        </div>
                        {event.actor_id && (
                          <span className="text-xs text-slate-400">ID Guard: {event.actor_id}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
