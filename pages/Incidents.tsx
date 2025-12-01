
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../services/dataService';
import { Incident } from '../types';
import { CheckSquare, ArrowLeft, AlertTriangle, AlertCircle, Info, FileText, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { audioService } from '../services/audioService';

export default function Incidents() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIncidentIdsRef = useRef<Set<number>>(new Set());
  const [newIncidentAlert, setNewIncidentAlert] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(audioService.isEnabled());

  // Action report modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionStatus, setActionStatus] = useState<'inprogress' | 'resolved'>('resolved');

  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);

      // Detect new incidents using ID set (more reliable than count)
      const newIncidentIds = data.map(inc => inc.id);
      const hasNewIncidents = newIncidentIds.some(id => !knownIncidentIdsRef.current.has(id));

      if (hasNewIncidents && knownIncidentIdsRef.current.size > 0) {
        console.log('[Incidents] 🚨 NEW INCIDENT DETECTED!');
        playAlertSound();
        vibrateDevice();
        showNewIncidentBanner();
      }

      // Update known incident IDs
      knownIncidentIdsRef.current = new Set(newIncidentIds);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAlertSound = () => {
    const played = audioService.playAlertSound();
    if (played) {
      setAudioEnabled(true);
    }
  };

  const testAlertSound = async () => {
    try {
      const success = await audioService.testSound();

      if (success) {
        setAudioEnabled(true);
        vibrateDevice();
        alert('✅ Som de teste tocado! Agora as notificações de incidentes irão tocar som automaticamente, mesmo após fazer login ou navegar entre páginas.');
      } else {
        alert('❌ Erro ao tocar som. Verifique as permissões do navegador.');
      }
    } catch (err) {
      console.error('[Incidents] ❌ Error testing sound:', err);
      alert('❌ Erro ao tocar som. Verifique as permissões do navegador.');
    }
  };

  const vibrateDevice = () => {
    // Vibrate on mobile devices (pattern: vibrate 200ms, pause 100ms, vibrate 200ms)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
      console.log('[Incidents] 📳 Device vibrated');
    }
  };

  const showNewIncidentBanner = () => {
    setNewIncidentAlert(true);
    // Auto-hide banner after 10 seconds
    setTimeout(() => {
      setNewIncidentAlert(false);
    }, 10000);
  };

  useEffect(() => {
    loadIncidents();

    // Set up real-time subscription for new incidents
    if (supabase) {
      const condoId = user?.condominium_id;
      if (!condoId) {
        console.warn('[Incidents] No condominium ID - subscription not created');
        return;
      }

      console.log('[Incidents] 📡 Setting up realtime subscription for condo:', condoId);

      const subscription = supabase
        .channel('incidents-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'incidents'
            // Note: Cannot filter by condominium_id directly as it's not a column in incidents table
            // It's related through residents table. We'll filter client-side instead.
          },
          async (payload) => {
            console.log('[Incidents] 🆕 New incident received via realtime:', payload);

            // Verify if incident belongs to this condominium
            // Get resident_id from payload and check condominium
            const newIncident = payload.new as any;

            // Fetch resident info to check condominium
            if (newIncident.resident_id) {
              try {
                const { data: resident } = await supabase
                  .from('residents')
                  .select('condominium_id')
                  .eq('id', newIncident.resident_id)
                  .single();

                if (resident?.condominium_id === condoId) {
                  console.log('[Incidents] ✅ Incident belongs to this condominium - triggering alert');

                  // Play alert IMMEDIATELY when new incident arrives
                  playAlertSound();
                  vibrateDevice();
                  showNewIncidentBanner();

                  // Then reload incidents to update the list
                  loadIncidents();
                } else {
                  console.log('[Incidents] ⏭️ Incident from different condominium - ignoring');
                }
              } catch (err) {
                console.error('[Incidents] Error checking resident condominium:', err);
                // If error, still show alert to be safe
                playAlertSound();
                vibrateDevice();
                showNewIncidentBanner();
                loadIncidents();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'incidents'
          },
          async (payload) => {
            console.log('[Incidents] 🔄 Incident updated via realtime:', payload);

            // Verify if incident belongs to this condominium
            const updatedIncident = payload.new as any;

            if (updatedIncident.resident_id) {
              try {
                const { data: resident } = await supabase
                  .from('residents')
                  .select('condominium_id')
                  .eq('id', updatedIncident.resident_id)
                  .single();

                if (resident?.condominium_id === condoId) {
                  // Reload incidents when one is updated
                  loadIncidents();
                }
              } catch (err) {
                console.error('[Incidents] Error checking resident condominium on update:', err);
                // If error, still reload to be safe
                loadIncidents();
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[Incidents] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[Incidents] ✅ Successfully subscribed to incident changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Incidents] ❌ Subscription error - realtime may not be enabled');
          }
        });

      return () => {
        console.log('[Incidents] 🔌 Unsubscribing from incident changes');
        subscription.unsubscribe();
      };
    } else {
      console.warn('[Incidents] Supabase client not available - no realtime subscription');
    }
  }, [user?.condominium_id]);

  const handleAcknowledge = async (id: number) => {
    if (!user?.id) {
      alert('Erro: Utilizador não autenticado');
      return;
    }

    try {
      await api.acknowledgeIncident(id, user.id);
      await loadIncidents();
    } catch (error) {
      console.error('Error acknowledging incident:', error);
      alert('Erro ao confirmar leitura do incidente');
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
    if (!selectedIncident) return;
    if (!actionNotes.trim()) {
      alert('Por favor, descreva a ação tomada');
      return;
    }

    try {
      await api.reportIncidentAction(selectedIncident.id, actionNotes, actionStatus);
      await loadIncidents();
      handleCloseActionModal();
    } catch (error) {
      console.error('Error reporting action:', error);
      alert('Erro ao reportar ação');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'perigo': return 'border-red-500 bg-red-50';
      case 'incendio': return 'border-orange-500 bg-orange-50';
      case 'suspeita': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-slate-500 bg-slate-50';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'perigo': return 'bg-red-100 text-red-800';
      case 'incendio': return 'bg-orange-100 text-orange-800';
      case 'suspeita': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'perigo': return <AlertTriangle size={20} className="text-red-600" />;
      case 'incendio': return <AlertTriangle size={20} className="text-orange-600" />;
      case 'suspeita': return <AlertCircle size={20} className="text-yellow-600" />;
      default: return <Info size={20} className="text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string, statusLabel?: string) => {
    const label = statusLabel || status;
    switch (status) {
      case 'new': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">{label}</span>;
      case 'acknowledged': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">{label}</span>;
      case 'inprogress': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">{label}</span>;
      case 'resolved': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">{label}</span>;
      default: return <span className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded font-bold">{label}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400 font-medium">Carregando incidentes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
      {/* New Incident Alert Banner */}
      {newIncidentAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-4 border-red-400">
            <AlertTriangle size={32} className="animate-pulse" />
            <div>
              <p className="font-bold text-lg">🚨 NOVO INCIDENTE REPORTADO!</p>
              <p className="text-sm">Verifique os detalhes abaixo</p>
            </div>
            <button
              onClick={() => setNewIncidentAlert(false)}
              className="ml-4 p-2 hover:bg-red-700 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
          >
            <ArrowLeft size={28} className="text-slate-700" />
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Registo de Incidentes</h2>
        </div>

        {/* Test Sound Button */}
        <button
          onClick={testAlertSound}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md ${
            audioEnabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-orange-600 hover:bg-orange-700 text-white animate-pulse'
          }`}
          title="Clique para testar o som de alerta e habilitar notificações"
        >
          🔊 {audioEnabled ? 'Som Ativo' : 'Testar Som'}
        </button>
      </div>

      {/* Audio Permission Warning */}
      {!audioEnabled && (
        <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-orange-800">⚠️ Notificações Sonoras Desabilitadas</p>
              <p className="text-sm text-orange-700 mt-1">
                Para receber alertas sonoros quando novos incidentes forem reportados, clique no botão <strong>"Testar Som"</strong> acima.
                Isso é necessário devido às políticas de segurança do navegador.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
            Não há incidentes registados.
          </div>
        ) : (
          incidents.map(inc => (
            <div
              key={inc.id}
              className={`bg-white p-4 md:p-6 rounded-xl shadow-sm border-l-8 ${getTypeColor(inc.type)} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {getTypeIcon(inc.type)}
                  <h3 className="text-lg md:text-xl font-bold text-slate-800">
                    {inc.type_label || inc.type}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${getTypeBadgeColor(inc.type)}`}>
                    {inc.type_label || inc.type}
                  </span>
                  {getStatusBadge(inc.status, inc.status_label)}
                </div>
                <p className="text-slate-600 mb-2">{inc.description}</p>

                {/* Resident and Unit info */}
                {inc.resident && (
                  <p className="text-slate-500 text-sm mb-2">
                    <strong>Reportado por:</strong> {inc.resident.name}
                    {inc.unit && (
                      <span className="ml-2 text-slate-600 font-medium">
                        ({inc.unit.code_block ? `${inc.unit.code_block} - ` : ''}Apt {inc.unit.number})
                      </span>
                    )}
                  </p>
                )}

                {/* Photo if available */}
                {inc.photo_path && (
                  <img
                    src={inc.photo_path}
                    alt="Incident"
                    className="w-full max-w-xs rounded-lg mt-2 mb-2"
                  />
                )}

                {/* Guard action notes if available */}
                {inc.guard_notes && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-bold text-blue-800 mb-1">Ação do Guarda:</p>
                    <p className="text-sm text-slate-700">{inc.guard_notes}</p>
                    {inc.resolved_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        Fechado em: {new Date(inc.resolved_at).toLocaleString('pt-PT')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1 text-xs md:text-sm text-slate-400 mt-2">
                  <p>Reportado em: {new Date(inc.reported_at).toLocaleString('pt-PT')}</p>
                  {inc.acknowledged_at && (
                    <p className="text-green-600">
                      Visto em: {new Date(inc.acknowledged_at).toLocaleString('pt-PT')}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {inc.status === 'new' && (
                  <button
                    onClick={() => handleAcknowledge(inc.id)}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 md:px-6 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
                  >
                    <CheckSquare size={20}/> Confirmar Leitura
                  </button>
                )}

                {inc.status === 'acknowledged' && (
                  <button
                    onClick={() => handleOpenActionModal(inc)}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-3 md:px-6 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
                  >
                    <FileText size={20}/> Reportar Ação
                  </button>
                )}

                {inc.status === 'inprogress' && (
                  <button
                    onClick={() => handleOpenActionModal(inc)}
                    className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 md:px-6 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
                  >
                    <FileText size={20}/> Fechar Incidente
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Report Modal */}
      {showActionModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-slate-800">Reportar Ação do Guarda</h3>
              <button
                onClick={handleCloseActionModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-600" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">
                <strong>Incidente:</strong> {selectedIncident.type_label || selectedIncident.type}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Descrição:</strong> {selectedIncident.description}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Estado Final:
              </label>
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

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Descreva a ação tomada: *
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Ex: Contactei o residente por telefone. Confirmou que verificou as câmeras e não encontrou nada suspeito. Situação resolvida."
                className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                Descreva as ações tomadas, como contactou o residente, e o resultado.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseActionModal}
                className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitAction}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
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
