import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Home, Phone, Search, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/dataService';
import { Resident, Unit } from '../types';

type ResidentDirectoryItem = Resident & {
  unitLabel?: string;
};

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  return { firstName, lastName };
};

export default function ResidentSearch() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<ResidentDirectoryItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [condoName, setCondoName] = useState('');
  const [condoId, setCondoId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(api.checkOnline());

  useEffect(() => {
    const handleStatus = () => setIsOnline(api.checkOnline());
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const loadDirectory = async () => {
      setLoading(true);
      const condo = await api.getDeviceCondoDetails();
      setCondoName(condo?.name || '');
      setCondoId(condo?.id ?? null);
      const directory = await api.getResidentDirectory(condo?.id);
      setUnits(directory.units || []);
      setResidents(directory.residents || []);
      setLoading(false);
    };

    void loadDirectory();

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const unitLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    const scopedUnits = condoId ? units.filter(unit => unit.condominium_id === condoId) : units;
    scopedUnits.forEach((unit) => {
      const label = unit.code_block ? `${unit.code_block} - ${unit.number}` : unit.number;
      map.set(unit.id, label);
    });
    return map;
  }, [units, condoId]);

  const filteredResidents = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    const scopedResidents = condoId ? residents.filter(resident => resident.condominium_id === condoId) : [];
    if (!trimmed) {
      return scopedResidents.map(resident => ({
        ...resident,
        unitLabel: unitLabelMap.get(resident.unit_id)
      }));
    }

    const digitsQuery = trimmed.replace(/\D/g, '');
    const condoMatch = condoName.toLowerCase().includes(trimmed);

    return scopedResidents
      .filter(resident => {
        const nameMatch = resident.name.toLowerCase().includes(trimmed);
        const phoneDigits = (resident.phone || '').replace(/\D/g, '');
        const phoneMatch = digitsQuery ? phoneDigits.includes(digitsQuery) : false;
        return nameMatch || phoneMatch || condoMatch;
      })
      .map(resident => ({
        ...resident,
        unitLabel: unitLabelMap.get(resident.unit_id)
      }));
  }, [searchTerm, residents, unitLabelMap, condoName, condoId]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
          aria-label="Voltar"
        >
          <ArrowLeft size={28} className="text-slate-700" />
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Pesquisar Morador</h2>
          <p className="text-slate-500">Pesquise por nome, telefone ou condominio.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none" />

        <div className="relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={22} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:outline-none text-slate-700 placeholder:text-slate-400 transition-all font-medium text-lg"
              placeholder="Nome, telefone ou condomínio..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-full transition-colors"
                aria-label="Limpar pesquisa"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-slate-400">Filtros:</span>
            <span className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-full text-xs font-bold border border-sky-100 flex items-center gap-1.5">
              <User size={12} strokeWidth={3} />
              {filteredResidents.length} encontrados
            </span>
            {condoName && (
              <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200">
                {condoName}
              </span>
            )}
            {!isOnline && (
              <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
          A carregar moradores...
        </div>
      ) : filteredResidents.length === 0 ? (
        <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
          {isOnline ? 'Nenhum morador encontrado.' : 'Sem dados offline. Conecte-se para pesquisar.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResidents.map((resident) => {
            const { firstName, lastName } = splitName(resident.name);
            return (
              <div
                key={`${resident.id}-${resident.unit_id}`}
                className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Decorative Side Gradient */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between gap-4 mb-4 pl-2">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center text-sky-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <User size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-0.5">Nome completo</p>
                      <p className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">
                        {resident.name}
                      </p>
                    </div>
                  </div>
                  {condoName && (
                    <div className="text-[10px] font-bold bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full border border-slate-100">
                      {condoName}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 pl-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 group-hover:border-sky-100 transition-colors">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone</p>
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <Phone size={14} className="text-sky-500" />
                      <span>{resident.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 group-hover:border-sky-100 transition-colors">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unidade</p>
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <Home size={14} className="text-sky-500" />
                      <span className="truncate">{resident.unitLabel || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

