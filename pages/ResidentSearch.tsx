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
    const scopedResidents = condoId ? residents.filter(resident => resident.condominium_id === condoId) : residents;
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-sky-400 focus:outline-none text-slate-700"
            placeholder="Nome, telefone ou condominio..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Limpar pesquisa"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
            {filteredResidents.length} resultado(s)
          </span>
          {condoName && (
            <span className="bg-sky-50 text-sky-700 px-2 py-1 rounded-full font-semibold">
              {condoName}
            </span>
          )}
          {!isOnline && (
            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-semibold">
              Offline
            </span>
          )}
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
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={22} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Nome completo</p>
                      <p className="text-lg font-bold text-slate-800">{resident.name}</p>
                    </div>
                  </div>
                  {condoName && (
                    <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {condoName}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">Primeiro nome:</span>{' '}
                    {firstName || '-'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Ultimo nome:</span>{' '}
                    {lastName || '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-slate-400" />
                    <span>{resident.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home size={16} className="text-slate-400" />
                    <span>{resident.unitLabel || 'Unidade N/D'}</span>
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

