
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, List, AlertTriangle, RefreshCw, MessageSquare, Send, X, Clock, CheckCircle, LogOut, User, MapPin, ShieldCheck, ChevronRight, Phone } from 'lucide-react';
import { api } from '../services/dataService';
import { askConcierge } from '../services/geminiService';
import { Visit, VisitStatus } from '../types';
import { AuthContext } from '../App';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // AI State
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [thinking, setThinking] = useState(false);

  // Quick Actions State
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);

  const loadQuickActions = async () => {
    const data = await api.getTodaysVisits();
    // Filter for actionable items: Pending (Needs approval) or Inside/Approved (Needs checkout)
    const actionable = data.filter(v => 
      [VisitStatus.PENDING, VisitStatus.APPROVED, VisitStatus.INSIDE].includes(v.status)
    ).sort((a, b) => new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime());
    
    setActiveVisits(actionable);
  };

  useEffect(() => {
    const checkStatus = () => setIsOnline(api.checkOnline());
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    
    loadQuickActions();
    const interval = setInterval(loadQuickActions, 10000); // Refresh every 10s

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    await api.syncPendingItems();
    setSyncing(false);
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setThinking(true);
    const response = await askConcierge(aiQuery, "Regras do Condomínio: Silêncio das 22h às 08h. Entregas apenas até às 18h. Piscina fechada para manutenção.");
    setAiResponse(response);
    setThinking(false);
  };

  const handleQuickAction = async (visit: Visit, action: 'APPROVE' | 'CHECKOUT') => {
    if (action === 'APPROVE') {
      await api.updateVisitStatus(visit.id, VisitStatus.APPROVED);
    } else {
      if (confirm(`Marcar saída para ${visit.visitor_name}?`)) {
        await api.updateVisitStatus(visit.id, VisitStatus.LEFT);
      }
    }
    loadQuickActions();
  };

  const handleContactResident = (visit: Visit) => {
    if (visit.visitor_phone) {
      window.open(`tel:${visit.visitor_phone}`, '_self');
    } else {
      alert('Número de telefone não disponível para este visitante.');
    }
  };

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
          {/* Elegant Sync Status */}
          <button 
            onClick={handleSync}
            disabled={!isOnline || syncing}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm w-full md:w-auto
              ${isOnline 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' 
                : 'bg-red-50 text-red-600 border-red-100'
              }
            `}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'A Sincronizar...' : isOnline ? 'Sincronizar Agora' : 'Modo Offline'}
          </button>
        </div>
      </div>

      {/* --- Scrollable Content --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 md:px-6 max-w-7xl mx-auto w-full space-y-8">
        
        {/* 1. Primary Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
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
            className="group col-span-1 rounded-3xl bg-white p-8 text-slate-800 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-xl md:min-h-[220px] flex flex-col justify-between text-left border border-slate-100"
          >
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
            className="group col-span-1 rounded-3xl bg-white p-8 text-slate-800 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-xl md:min-h-[220px] flex flex-col justify-between text-left border border-slate-100"
          >
             <div className="bg-amber-50 text-amber-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Incidentes</h2>
              <p className="text-slate-500 font-medium">Reportar ou ver ocorrências.</p>
            </div>
          </button>
        </div>

        {/* 2. Active Visits Section (Modern Feed) */}
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
                          <MapPin size={14} className="text-slate-400"/>
                          {visit.restaurant_name || visit.sport_name || (visit.unit_block && visit.unit_number ? `${visit.unit_block} - ${visit.unit_number}` : `Uni. ${visit.unit_id}`)}
                        </span>
                        <span className="flex items-center gap-1"><User size={14} className="text-slate-400"/> {visit.visit_type}</span>
                        <span className="flex items-center gap-1"><Clock size={14} className="text-slate-400"/> {new Date(visit.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="w-full md:w-auto flex gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-50 mt-2 md:mt-0">
                    <button
                      onClick={() => handleContactResident(visit)}
                      className="flex-1 md:flex-none h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                    >
                      <Phone size={18} /> Contactar morador
                    </button>

                    {visit.status === VisitStatus.PENDING && (
                      <button
                        disabled
                        className="flex-1 md:flex-none h-12 px-6 bg-emerald-300 text-emerald-700 rounded-xl font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                      >
                        <CheckCircle size={18} /> Autorizar
                      </button>
                    )}

                    {(visit.status === VisitStatus.APPROVED || visit.status === VisitStatus.INSIDE) && (
                      <button
                        disabled
                        className="flex-1 md:flex-none h-12 px-6 bg-slate-200 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
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

      {/* AI Concierge Floating Button/Panel */}
      <div className="fixed bottom-6 right-6 z-50">
        {!showAI ? (
          <button 
            onClick={() => setShowAI(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-110 active:scale-95"
          >
            <MessageSquare size={24} />
            <span className="font-bold hidden md:inline">Assistente</span>
          </button>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl w-[90vw] md:w-96 flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 fade-in fixed bottom-6 right-4 md:right-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> Concierge IA</h3>
              <button onClick={() => setShowAI(false)} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-4 bg-slate-50 h-64 overflow-y-auto text-sm">
              {aiResponse ? (
                <div className="p-3 bg-white rounded-2xl rounded-tl-none shadow-sm text-slate-800 mb-4 border border-slate-100">
                  <p className="font-semibold text-indigo-600 mb-1 text-xs uppercase tracking-wider">Resposta</p>
                  {aiResponse}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                  <MessageSquare size={32} className="mb-2 opacity-20" />
                  <p>Pergunte sobre regras ou<br/>peça ajuda para mensagens.</p>
                </div>
              )}
              {thinking && <div className="flex justify-center p-4"><span className="animate-pulse text-indigo-400 font-bold">A pensar...</span></div>}
            </div>
            <form onSubmit={handleAskAI} className="p-3 border-t flex gap-2 bg-white">
              <input 
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Escreva a dúvida..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
              />
              <button disabled={thinking} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-colors"><Send size={18}/></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
