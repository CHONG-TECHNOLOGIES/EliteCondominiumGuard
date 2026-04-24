
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, List, AlertTriangle, RefreshCw, MessageSquare, Send, X, Clock, LogOut, User, MapPin, ShieldCheck, ChevronRight, Phone, Search, Newspaper, Video } from 'lucide-react';
import { api } from '../services/dataService';
import { SupabaseService } from '../services/Supabase';
import { db } from '../services/db';
import { askConcierge } from '../services/geminiService';
import { CondominiumNews, Visit, VisitStatus, VideoCallSession } from '../types';
import { AuthContext } from '../App';
import { useToast } from '../components/Toast';
import { audioService } from '../services/audioService';
import { logger, ErrorCategory } from '@/services/logger';
import { VideoCallModal } from '../components/VideoCallModal';
import { getDeviceIdentifier } from '@/services/deviceUtils';

const CONTACT_DELAY_MS = 7 * 60 * 1000;

function useContactButtonsVisible(visit: Visit): boolean {
  const [visible, setVisible] = useState(
    () => Date.now() - new Date(visit.created_at ?? visit.check_in_at).getTime() >= CONTACT_DELAY_MS
  );
  useEffect(() => {
    if (visible) return;
    const elapsed = Date.now() - new Date(visit.created_at ?? visit.check_in_at).getTime();
    const remaining = CONTACT_DELAY_MS - elapsed;
    if (remaining <= 0) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), remaining);
    return () => clearTimeout(timer);
  }, [visit.created_at, visit.check_in_at, visible]);
  return visible;
}

function DashContactButtons({
  visit,
  onPhone,
  onVideo,
  isOnline
}: {
  visit: Visit;
  onPhone: (v: Visit) => void;
  onVideo: (v: Visit) => void;
  isOnline: boolean;
}) {
  const visible = useContactButtonsVisible(visit);
  if (!visible) return null;

  return (
    <>
      <button
        onClick={() => onPhone(visit)}
        className="flex-1 md:flex-none h-12 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all animate-pulse ring-2 ring-amber-400 ring-offset-1"
      >
        <Phone size={18} /> Ligar
      </button>
      <button
        onClick={() => onVideo(visit)}
        disabled={!isOnline}
        className={`flex-1 md:flex-none h-12 px-5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all ${isOnline ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20 animate-pulse ring-2 ring-amber-400 ring-offset-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'}`}
      >
        <Video size={18} /> Vídeo
      </button>
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showToast, showConfirm } = useToast();
  const [isOnline, setIsOnline] = useState(api.checkOnline());

  // AI State
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [thinking, setThinking] = useState(false);

  // Quick Actions State
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [todaysVisitsCount, setTodaysVisitsCount] = useState(0);
  const [activeVideoCall, setActiveVideoCall] = useState<{ session: VideoCallSession; visit: Visit } | null>(null);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const previousIncidentCountRef = useRef<number>(-1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [latestNews, setLatestNews] = useState<CondominiumNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const loadQuickActions = async () => {
    const data = await api.getTodaysVisits();
    setTodaysVisitsCount(data.length); // Total count for the day

    // Filter for actionable items: Pending (Needs approval) or Inside/Approved (Needs checkout)
    const actionable = data.filter(v =>
      [VisitStatus.PENDING, VisitStatus.APPROVED, VisitStatus.INSIDE].includes(v.status)
    ).sort((a, b) => new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime());

    setActiveVisits(actionable);
  };

  const playAlertSound = () => {
    const played = audioService.playAlertSound();
    if (!played) {
      logger.warn('Audio not enabled - user must enable it first');
    }
  };

  const vibrateDevice = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
      logger.info('Device vibrated');
    }
  };

  const testAlertSound = async () => {
    logger.info('Manual test sound triggered');
    const success = await audioService.testSound();
    if (success) {
      vibrateDevice();
      showToast('success', '✅ Som de alerta tocado! Agora os alertas de incidentes irão tocar automaticamente.');
    } else {
      showToast('error', '❌ Erro ao tocar som. Verifique as permissões do navegador.');
    }
  };

  const loadIncidentsCount = async () => {
    try {
      const incidents = await api.getIncidents();
      // Count only new/unacknowledged incidents
      const newIncidents = incidents.filter(inc => inc.status === 'new');
      const currentCount = newIncidents.length;

      // Detect if new incidents appeared (only if we have previous data, -1 = not yet loaded)
      if (previousIncidentCountRef.current >= 0 && currentCount > previousIncidentCountRef.current) {
        const newIncidentCount = currentCount - previousIncidentCountRef.current;
        logger.info('New incident(s) detected', { newIncidentCount: newIncidentCount });

        // Play alert sound and vibrate
        playAlertSound();
        vibrateDevice();

        // Show toast notification
        showToast('error', `🚨 ${newIncidentCount} novo(s) incidente(s) reportado(s)!`);
      }

      previousIncidentCountRef.current = currentCount;
      setIncidentsCount(currentCount);
    } catch (error) {
      logger.error('Error loading incidents count', error, ErrorCategory.NETWORK);
    }
  };

  const loadLatestNews = async () => {
    try {
      setNewsLoading(true);
      const data = await api.getNews();
      setLatestNews(data.slice(0, 3));
    } catch (error) {
      logger.error('Error loading latest news', error, ErrorCategory.NETWORK);
    } finally {
      setNewsLoading(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
  };

  useEffect(() => {
    const checkStatus = () => setIsOnline(api.checkOnline());
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    // Check audio status periodically
    const checkAudio = () => {
      setAudioEnabled(audioService.isEnabled());
    };
    checkAudio(); // Initial check

    loadQuickActions();
    loadIncidentsCount();
    loadLatestNews();
    const interval = setInterval(() => {
      loadQuickActions();
      loadIncidentsCount();
      checkAudio(); // Check audio status
    }, 10000); // Refresh every 10s

    const newsInterval = setInterval(() => {
      if (api.checkOnline()) {
        loadLatestNews();
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    // syncPendingItems now emits events that App.tsx listens to
    // The SyncOverlay will automatically show/hide based on those events
    await api.syncPendingItems();
    // Refresh data after sync
    loadQuickActions();
    loadIncidentsCount();
    loadLatestNews();
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setThinking(true);
    const response = await askConcierge(aiQuery, "Regras do Condomínio: Silêncio das 22h às 08h. Entregas apenas até às 18h. Piscina fechada para manutenção.");
    setAiResponse(response);
    setThinking(false);
  };

  const handleQuickAction = async (visit: Visit, action: 'APPROVE' | 'MARK_INSIDE' | 'CHECKOUT') => {
    if (action === 'APPROVE') {
      await api.updateVisitStatus(visit.id, VisitStatus.APPROVED);
      loadQuickActions();
      return;
    }

    if (action === 'MARK_INSIDE') {
      showConfirm(
        `Marcar entrada (interior) para ${visit.visitor_name}?`,
        async () => {
          await api.updateVisitStatus(visit.id, VisitStatus.INSIDE);
          loadQuickActions();
          showToast('success', 'Entrada marcada como interior!');
        }
      );
      return;
    }

    showConfirm(
      `Marcar saída para ${visit.visitor_name}?`,
      async () => {
        await api.updateVisitStatus(visit.id, VisitStatus.LEFT);
        loadQuickActions();
        showToast('success', 'Saída registada com sucesso!');
      }
    );
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
        context: 'dashboard',
        targetTable: 'visits',
        targetId: visit.id
      });
      window.open(`tel:${visit.visitor_phone}`, '_self');
    });
  };

  const handleVideoCall = useCallback(async (visit: Visit) => {
    if (!user) return;
    if (!visit.unit_id) {
      showToast('error', 'Esta visita não tem unidade associada para chamada de vídeo.');
      return;
    }

    const resident = await db.residents.where('unit_id').equals(visit.unit_id).first();
    if (!resident?.has_app_installed) {
      showToast('error', 'O morador desta unidade não tem a app instalada.');
      return;
    }

    const session = await SupabaseService.createVideoCallSession({
      visit_id: visit.id,
      guard_id: user.id,
      resident_id: resident.id,
      unit_id: visit.unit_id,
      condominium_id: user.condominium_id,
      device_id: getDeviceIdentifier() ?? undefined
    });

    if (!session) {
      showToast('error', 'Não foi possível iniciar a chamada de vídeo.');
      return;
    }

    await SupabaseService.createVideoCallNotification({
      resident_id: resident.id,
      condominium_id: user.condominium_id,
      unit_id: visit.unit_id,
      session_id: session.id,
      visit_id: visit.id,
      visitor_name: visit.visitor_name,
      visitor_photo_url: visit.photo_url ?? undefined,
      guard_name: `${user.first_name} ${user.last_name}`,
      unit_number: visit.unit_number ?? undefined,
      unit_block: visit.unit_block ?? undefined
    });

    setActiveVideoCall({ session, visit });
  }, [user, showToast]);

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.PENDING: return 'bg-amber-100 text-amber-800 border-amber-200';
      case VisitStatus.APPROVED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case VisitStatus.INSIDE: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">

      {/* --- Header Section with Greeting --- */}
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Olá, {user?.first_name} 👋</h1>
            <p className="text-slate-500">Aqui está o resumo da portaria hoje.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {/* Audio Status Indicator - Only show if audio is NOT enabled */}
            {!audioEnabled && (
              <button
                onClick={testAlertSound}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 text-white border-orange-600 animate-pulse"
                title="Clique para ativar alertas sonoros de incidentes"
              >
                🔊 Ativar Som
              </button>
            )}
            {/* Audio Enabled Indicator - Subtle green indicator */}
            {audioEnabled && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                🔊 Alertas Ativos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Scrollable Content --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 md:px-6 max-w-7xl mx-auto w-full space-y-8">

        {/* 1. Primary Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Hero Button: New Entry */}
          <button
            onClick={() => navigate('/new-entry')}
            className="group relative col-span-1 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 p-8 text-white shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 hover:shadow-2xl md:min-h-[220px] flex flex-col justify-between text-left"
          >
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150"></div>

            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 group-hover:bg-white/30 transition-colors">
              <UserPlus size={28} />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-1">Nova Entrada</h2>
              <p className="text-sky-100 font-medium">Registar visitante, entregas ou serviços.</p>
            </div>

            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
              <ChevronRight size={24} />
            </div>
          </button>

          {/* Secondary Button: Daily List */}
          <button
            onClick={() => navigate('/day-list')}
            className="group col-span-1 rounded-3xl bg-white p-8 text-slate-800 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-xl md:min-h-[220px] flex flex-col justify-between text-left border border-slate-100 relative"
          >
            {/* Count Badge */}
            {todaysVisitsCount > 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                {todaysVisitsCount}
              </div>
            )}

            <div className="bg-indigo-50 text-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
              <List size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Lista do Dia</h2>
              <p className="text-slate-500 font-medium">Consultar histórico e saídas.</p>
            </div>
          </button>

          {/* Secondary Button: Incidents */}
          <button
            onClick={() => navigate('/incidents')}
            className="group col-span-1 rounded-3xl bg-white p-8 text-slate-800 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-xl md:min-h-[220px] flex flex-col justify-between text-left border border-slate-100 relative"
          >
            {/* Count Badge - Show "+" if there are new incidents */}
            {incidentsCount > 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
                {incidentsCount > 9 ? '9+' : incidentsCount}
              </div>
            )}

            <div className="bg-amber-50 text-amber-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Incidentes</h2>
              <p className="text-slate-500 font-medium">Reportar ou ver ocorrências.</p>
            </div>
          </button>

          {/* Secondary Button: Resident Search */}
          <button
            onClick={() => navigate('/resident-search')}
            className="group col-span-1 rounded-3xl bg-white p-8 text-slate-800 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-xl md:min-h-[220px] flex flex-col justify-between text-left border border-slate-100 relative"
          >
            <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors">
              <Search size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Pesquisar Morador</h2>
              <p className="text-slate-500 font-medium">Nome, telefone ou condominio.</p>
            </div>
          </button>

        </div>

        {/* 2. Latest News Preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Newspaper size={22} className="text-slate-400" />
              Últimas Notícias
            </h3>
            <button
              onClick={() => navigate('/news')}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              Ver todas →
            </button>
          </div>

          {newsLoading ? (
            <div className="flex items-center justify-center py-10 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
              <RefreshCw size={24} className="animate-spin mr-2" />
              Carregando notícias...
            </div>
          ) : latestNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
              <Newspaper size={48} className="mb-2 opacity-20" />
              <p className="font-medium">Sem notícias nos últimos 7 dias.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {latestNews.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate('/news')}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    {item.category_label ? (
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        {item.category_label}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {item.created_at && formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Active Visits Section (Modern Feed) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock size={24} className="text-slate-400" />
              Em Progresso
              <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">{activeVisits.length}</span>
            </h3>
          </div>

          <div className="grid gap-4">
            {activeVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
                <ShieldCheck size={48} className="mb-2 opacity-20" />
                <p className="font-medium">Tudo calmo. Sem visitas ativas.</p>
              </div>
            ) : (
              activeVisits.map(visit => (
                <div key={visit.id} className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all hover:shadow-md">

                  {/* Avatar & Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      {visit.photo_url ? (
                        <img src={visit.photo_url} alt="v" className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shadow-inner" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-2xl text-slate-400">
                          {visit.visitor_name[0]}
                        </div>
                      )}
                      {/* Status Indicator Dot */}
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${visit.status === VisitStatus.PENDING ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg text-slate-800">{visit.visitor_name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide ${getStatusColor(visit.status)}`}>
                          {visit.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400" />
                          {visit.restaurant_name || visit.sport_name || (visit.unit_block && visit.unit_number ? `${visit.unit_block} - ${visit.unit_number}` : `Uni. ${visit.unit_id}`)}
                        </span>
                        <span className="flex items-center gap-1"><User size={14} className="text-slate-400" /> {visit.visit_type}</span>
                        <span className="flex items-center gap-1"><Clock size={14} className="text-slate-400" /> {new Date(visit.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="w-full md:w-auto flex gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-50 mt-2 md:mt-0">
                    {/* PENDING: Contact buttons visible after 7 minutes */}
                    {visit.status === VisitStatus.PENDING && (
                      <DashContactButtons
                        visit={visit}
                        onPhone={handleContactResident}
                        onVideo={handleVideoCall}
                        isOnline={isOnline}
                      />
                    )}

                    {/* APPROVED: Show "Mark Inside" */}
                    {visit.status === VisitStatus.APPROVED && (
                      <button
                        onClick={() => handleQuickAction(visit, 'MARK_INSIDE')}
                        className="flex-1 md:flex-none h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <ShieldCheck size={18} /> Marcar Interior
                      </button>
                    )}

                    {/* INSIDE: Show "Mark Exit" */}
                    {visit.status === VisitStatus.INSIDE && (
                      <button
                        onClick={() => handleQuickAction(visit, 'CHECKOUT')}
                        className="flex-1 md:flex-none h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <LogOut size={18} /> Marcar Saída
                      </button>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* AI Concierge Floating Button/Panel - DISABLED FOR NOW */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          disabled={true}
          className="bg-slate-400 text-white p-4 rounded-full shadow-lg flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <MessageSquare size={24} />
          <span className="font-bold hidden md:inline">Assistente</span>
        </button>
      </div>

      {/* Video Call Modal */}
      {activeVideoCall && (
        <VideoCallModal
          session={activeVideoCall.session}
          visit={activeVideoCall.visit}
          onClose={() => setActiveVideoCall(null)}
        />
      )}
    </div>
  );
}
