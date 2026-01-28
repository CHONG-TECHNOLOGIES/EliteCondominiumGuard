import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/dataService';
import { ShieldCheck, AlertCircle, Loader2, Search, Building, RefreshCw, KeyRound } from 'lucide-react';
import { Condominium } from '../types';

export default function Setup() {
  const navigate = useNavigate();
  const [condos, setCondos] = useState<Condominium[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCondoId, setSelectedCondoId] = useState<number | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [error, setError] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminName, setAdminName] = useState('');
  const [replaceError, setReplaceError] = useState('');
  const [logoErrors, setLogoErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadCondos();
  }, []);

  const loadCondos = async () => {
    try {
      setLoadingList(true);
      const list = await api.getAvailableCondominiums();
      setCondos(list);
    } catch (err) {
      setError("Erro ao carregar lista de condomínios.");
    } finally {
      setLoadingList(false);
    }
  };

  const handlePreSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCondoId) return;
    setShowConfirmModal(true);
  };

  const executeSetup = async () => {
    if (!selectedCondoId) return;

    setIsConfiguring(true);
    setError('');

    try {
      const result = await api.configureDevice(selectedCondoId);
      if (result.success) {
        navigate('/login');
      } else {
        setError(result.error || "Erro ao configurar. Tente novamente.");
        setShowConfirmModal(false);
      }
    } catch (err) {
      setError("Erro ao conectar ao servidor.");
      setShowConfirmModal(false);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleReplaceDevice = async () => {
    if (!selectedCondoId || !adminName || !adminPin) {
      setReplaceError("Preencha todos os campos.");
      return;
    }

    setIsConfiguring(true);
    setReplaceError('');

    try {
      // 1. Verify Admin Credentials
      const staff = await api.login(adminName.split(' ')[0], adminName.split(' ').slice(1).join(' '), adminPin);

      if (!staff) {
        setReplaceError("Credenciais inválidas.");
        setIsConfiguring(false);
        return;
      }

      // 2. Force Configure
      const result = await api.forceConfigureDevice(selectedCondoId, staff);

      if (result.success) {
        navigate('/login');
      } else {
        setReplaceError(result.error || "Erro ao substituir dispositivo.");
      }
    } catch (err: any) {
      setReplaceError(err.message || "Erro ao verificar credenciais.");
    } finally {
      setIsConfiguring(false);
    }
  };

  const filteredCondos = condos.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCondo = condos.find(c => c.id === selectedCondoId);
  const isLogoAvailable = (condo: Condominium) => Boolean(condo.logo_url && !logoErrors[condo.id]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="p-8 pb-4 text-center border-b border-slate-100">
          <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Ativação do AccesControl</h1>
          <p className="text-slate-500 mt-1">
            Selecione o condomínio para associar a este tablet.
          </p>
        </div>
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Pesquisar condomínio..."
            />
          </div>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 mx-4 mt-4 rounded-lg text-sm flex flex-col gap-2 items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
            {error.includes("já está associado") && (
              <button
                onClick={() => setShowReplaceModal(true)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-full font-bold transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} />
                Substituir Dispositivo Existente
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {loadingList ? (
            <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>A carregar condomínios...</p>
            </div>
          ) : filteredCondos.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-400">
              Nenhum condomínio encontrado.
            </div>
          ) : (
            filteredCondos.map(condo => (
              <button
                key={condo.id}
                onClick={() => setSelectedCondoId(condo.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 hover:shadow-md ${selectedCondoId === condo.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-100 bg-white hover:border-blue-300'
                  }`}
              >
                <div className={`mt-1 p-2 rounded-lg ${selectedCondoId === condo.id ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isLogoAvailable(condo) ? (
                    <img
                      src={condo.logo_url}
                      alt={`Logo ${condo.name}`}
                      className="h-7 w-7 object-contain"
                      onError={() => setLogoErrors(prev => ({ ...prev, [condo.id]: true }))}
                    />
                  ) : (
                    <Building size={20} />
                  )}
                </div>
                <div>
                  <h3 className={`font-bold ${selectedCondoId === condo.id ? 'text-blue-900' : 'text-slate-800'}`}>
                    {condo.name}
                  </h3>
                  {condo.address && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {condo.address}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handlePreSetup}
            disabled={isConfiguring || !selectedCondoId}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isConfiguring ? <Loader2 className="animate-spin" /> : 'CONFIRMAR E ATIVAR'}
          </button>
        </div>
      </div>
      {showConfirmModal && selectedCondo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Tem a certeza?</h3>
            <p className="text-slate-500 mb-6">
              Esta ação irá vincular este tablet permanentemente ao condomínio abaixo.
              Verifique se é a escolha correta.
            </p>
            <div className="bg-slate-50 w-full p-4 rounded-xl border border-slate-200 mb-6 flex items-center gap-3 text-left">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                {isLogoAvailable(selectedCondo) ? (
                  <img
                    src={selectedCondo.logo_url}
                    alt={`Logo ${selectedCondo.name}`}
                    className="h-7 w-7 object-contain"
                    onError={() => setLogoErrors(prev => ({ ...prev, [selectedCondo.id]: true }))}
                  />
                ) : (
                  <Building className="text-blue-600" size={24} />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800">{selectedCondo.name}</p>
                <p className="text-xs text-slate-500">{selectedCondo.address}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeSetup}
                disabled={isConfiguring}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                {isConfiguring ? <Loader2 className="animate-spin" size={20} /> : 'Sim, Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplaceModal && selectedCondo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <RefreshCw size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Substituir Dispositivo</h3>
            <p className="text-slate-500 mb-6 text-center text-sm">
              Para desativar o dispositivo anterior e ativar este tablet para <strong>{selectedCondo.name}</strong>, insira as credenciais de Administrador.
            </p>

            <div className="w-full space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Administrador</label>
                <input
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PIN de Acesso</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none font-mono text-lg tracking-widest"
                    placeholder="••••"
                    maxLength={6}
                  />
                </div>
              </div>
              {replaceError && (
                <p className="text-red-500 text-xs font-bold text-center">{replaceError}</p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowReplaceModal(false);
                  setReplaceError('');
                  setAdminPin('');
                  setAdminName('');
                }}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReplaceDevice}
                disabled={isConfiguring || !adminName || !adminPin}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isConfiguring ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Troca'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
