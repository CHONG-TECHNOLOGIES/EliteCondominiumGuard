import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, Trash2, Loader2, Search, X, Building2, Home, ChevronDown, Check, Smartphone, QrCode, Calendar, Clock, User } from 'lucide-react';
import { api } from '../../services/dataService';
import { Resident, Condominium, Unit, ResidentQrCode } from '../../types';
import { useToast } from '../../components/Toast';
import { buildAuditChanges, hasAuditChanges } from '../../utils/auditDiff';
import { logger, ErrorCategory } from '@/services/logger';

// Searchable Select Component
interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  alwaysVisibleValues?: Array<number | string>;
  className?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  alwaysVisibleValues = [],
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    alwaysVisibleValues.includes(option.value) ||
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: number | string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between cursor-pointer"
      >
        <span className={selectedOption ? 'text-text-main' : 'text-text-dim'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-bg-root rounded transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-main rounded-lg shadow-lg">
          <div className="p-2 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-dim text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between transition-colors ${
                    option.value === value ? 'bg-blue-50 text-blue-700' : 'text-text-main'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={16} className="text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminResidents() {
  const { showToast, showConfirm } = useToast();
  const PAGE_SIZE = 100;
  const [residents, setResidents] = useState<Resident[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitLookup, setUnitLookup] = useState<Record<number, Unit>>({});
  const unitsByCondoRef = useRef<Record<number, Unit[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [showQrCodesModal, setShowQrCodesModal] = useState(false);
  const [selectedResidentForQr, setSelectedResidentForQr] = useState<Resident | null>(null);
  const [qrCodes, setQrCodes] = useState<ResidentQrCode[]>([]);
  const [loadingQrCodes, setLoadingQrCodes] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    condominium_id: null as number | null,
    unit_id: null as number | null,
    name: '',
    email: '',
    phone: '',
    type: 'OWNER' as 'OWNER' | 'TENANT'
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    loadData();
  }, [filterCondoId, searchQuery]);

  useEffect(() => {
    // Load units when condominium is selected
    if (formData.condominium_id) {
      loadUnitsForCondominium(formData.condominium_id);
    } else {
      setUnits([]);
    }
  }, [formData.condominium_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const residentsData = await api.adminGetAllResidents(
        filterCondoId || undefined,
        PAGE_SIZE,
        searchQuery || undefined
      );
      setResidents(residentsData);
      setHasMore(residentsData.length === PAGE_SIZE);
      await loadUnitsForResidentList(residentsData);
    } catch (error) {
      logger.error('Error loading data', error, ErrorCategory.NETWORK);
    } finally {
      setLoading(false);
    }
  };

  const loadCondominiums = async () => {
    try {
      const condosData = await api.adminGetAllCondominiums();
      setCondominiums(condosData);
    } catch (error) {
      logger.error('Error loading condominiums', error, ErrorCategory.NETWORK);
    }
  };

  const loadUnitsForCondominium = async (condoId: number) => {
    try {
      const unitsData = await api.adminGetAllUnits(condoId);
      setUnits(unitsData);
    } catch (error) {
      logger.error('Error loading units', error, ErrorCategory.NETWORK);
    }
  };

  const loadUnitsForResidentList = async (residentList: Resident[]) => {
    const condoIds = Array.from(
      new Set(residentList.map(resident => resident.condominium_id).filter(Boolean))
    );

    if (condoIds.length === 0) {
      setUnitLookup({});
      return;
    }

    const missingCondoIds = condoIds.filter(condoId => !unitsByCondoRef.current[condoId]);
    if (missingCondoIds.length > 0) {
      const results = await Promise.all(
        missingCondoIds.map(condoId => api.adminGetAllUnits(condoId))
      );
      missingCondoIds.forEach((condoId, index) => {
        unitsByCondoRef.current[condoId] = results[index] || [];
      });
    }

    const lookup: Record<number, Unit> = {};
    condoIds.forEach(condoId => {
      const unitsForCondo = unitsByCondoRef.current[condoId] || [];
      unitsForCondo.forEach(unit => {
        lookup[unit.id] = unit;
      });
    });
    setUnitLookup(lookup);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    if (residents.length === 0) return;
    const lastResident = residents[residents.length - 1];
    if (!lastResident) return;
    setLoadingMore(true);
    try {
      const moreResidents = await api.adminGetAllResidents(
        filterCondoId || undefined,
        PAGE_SIZE,
        searchQuery || undefined,
        lastResident.name,
        lastResident.id
      );
      const updatedResidents = [...residents, ...moreResidents];
      setResidents(updatedResidents);
      setHasMore(moreResidents.length === PAGE_SIZE);
      await loadUnitsForResidentList(updatedResidents);
    } catch (error) {
      logger.error('Error loading more residents', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao carregar mais residentes');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.condominium_id) {
      showToast('warning', 'Condomínio é obrigatório');
      return;
    }
    if (!formData.unit_id) {
      showToast('warning', 'Unidade é obrigatória');
      return;
    }
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminCreateResident(formData);
      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Residente criado com sucesso!');
      } else {
        showToast('error', 'Erro ao criar residente');
      }
    } catch (error) {
      logger.error('Error creating resident', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao criar residente');
    }
  };

  const handleEdit = async () => {
    if (!selectedResident) return;
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const changes = buildAuditChanges(selectedResident, formData, { exclude: ['pin', 'pin_hash'] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;
      const result = await api.adminUpdateResident(String(selectedResident.id), formData, auditDetails);
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedResident(null);
        resetForm();
        showToast('success', 'Residente atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar residente');
      }
    } catch (error) {
      logger.error('Error updating resident', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao atualizar residente');
    }
  };

  const handleDelete = async (resident: Resident) => {
    showConfirm(
      `Deseja realmente remover o residente ${resident.name}?`,
      async () => {
        try {
          const result = await api.adminDeleteResident(String(resident.id));
          if (result) {
            await loadData();
            showToast('success', 'Residente removido com sucesso!');
          } else {
            showToast('error', 'Erro ao remover residente');
          }
        } catch (error) {
          logger.error('Error deleting resident', error, ErrorCategory.NETWORK);
          showToast('error', 'Erro ao remover residente');
        }
      }
    );
  };

  const openEditModal = async (resident: Resident) => {
    setSelectedResident(resident);
    setFormData({
      condominium_id: resident.condominium_id,
      unit_id: resident.unit_id,
      name: resident.name,
      email: resident.email || '',
      phone: resident.phone || '',
      type: resident.type || 'OWNER'
    });
    // Load units for the resident's condominium
    await loadUnitsForCondominium(resident.condominium_id);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      condominium_id: null,
      unit_id: null,
      name: '',
      email: '',
      phone: '',
      type: 'OWNER'
    });
    setUnits([]);
  };

  const openQrCodesModal = async (resident: Resident) => {
    setSelectedResidentForQr(resident);
    setShowQrCodesModal(true);
    setLoadingQrCodes(true);

    try {
      const codes = await api.adminGetResidentQrCodes(resident.id);
      setQrCodes(codes);
    } catch (error) {
      logger.error('Error loading QR codes', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao carregar QR codes');
    } finally {
      setLoadingQrCodes(false);
    }
  };

  const closeQrCodesModal = () => {
    setShowQrCodesModal(false);
    setSelectedResidentForQr(null);
    setQrCodes([]);
  };

  const formatQrCodeStatus = (status?: string): { label: string; className: string } => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Ativo', className: 'bg-green-100 text-green-700' };
      case 'EXPIRED':
        return { label: 'Expirado', className: 'bg-gray-100 text-gray-700' };
      case 'REVOKED':
        return { label: 'Revogado', className: 'bg-red-100 text-red-700' };
      default:
        return { label: status || 'Desconhecido', className: 'bg-gray-100 text-gray-700' };
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const formatUnitLabel = (unit?: Unit | null, fallbackId?: number) => {
    if (!unit) {
      return fallbackId ? `Unidade ${fallbackId}` : 'Unidade';
    }

    const parts: string[] = [];
    if (unit.building_name) parts.push(unit.building_name);
    if (unit.code_block) parts.push(`Bloco ${unit.code_block}`);
    if (unit.number) parts.push(`Unidade ${unit.number}`);
    if (unit.floor) parts.push(`Andar ${unit.floor}`);

    if (parts.length > 0) {
      return parts.join(' • ');
    }

    return fallbackId ? `Unidade ${fallbackId}` : 'Unidade';
  };

  const getUnitInfo = (unitId: number) => {
    const unit = unitLookup[unitId] || units.find(u => u.id === unitId);
    return formatUnitLabel(unit, unitId);
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-text-main">Gestão de Residentes</h1>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
              {searchQuery
                ? `${residents.length} encontrados`
                : `${residents.length} carregados`
              }
            </span>
          </div>
          <p className="text-text-dim">Gerir residentes e proprietários das unidades</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Novo Residente
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <SearchableSelect
          options={[
            { value: 'ALL', label: 'Todos os Condomínios' },
            ...condominiums.map(condo => ({ value: condo.id, label: condo.name }))
          ]}
          value={filterCondoId}
          onChange={(val) => setFilterCondoId(val === 'ALL' ? null : val as number | null)}
          placeholder="Todos os condomínios"
          searchPlaceholder="Pesquisar condomínio..."
          emptyMessage="Nenhum condomínio encontrado"
          alwaysVisibleValues={['ALL']}
        />
      </div>

      {/* Residents List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando residentes...</p>
        </div>
      ) : residents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Users size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum residente cadastrado'}
          </h3>
          <p className="text-text-dim">
            {searchQuery
              ? 'Tente buscar com outros termos'
              : 'Clique em "Novo Residente" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {residents.map((resident) => (
            <div
              key={resident.id}
              className="bg-white rounded-xl shadow-sm border border-border-main p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-text-main">
                        {resident.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        resident.type === 'OWNER'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {resident.type === 'OWNER' ? 'Proprietário' : 'Inquilino'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                          resident.has_app_installed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                        title={resident.has_app_installed ? 'App instalada' : 'Sem app'}
                      >
                        <Smartphone size={12} />
                        {resident.has_app_installed ? 'App' : 'Sem App'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-text-dim">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Building2 size={14} />
                          <span>{getCondominiumName(resident.condominium_id)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          <span>{getUnitInfo(resident.unit_id)}</span>
                        </div>
                      </div>
                      {resident.email && (
                        <p className="text-text-dim">{resident.email}</p>
                      )}
                      {resident.phone && (
                        <p className="text-text-dim">{resident.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {resident.has_app_installed && (
                    <button
                      onClick={() => openQrCodesModal(resident)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Ver QR Codes"
                    >
                      <QrCode size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(resident)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(resident)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && residents.length > 0 && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMore && <Loader2 size={18} className="animate-spin" />}
            {loadingMore ? 'Carregando...' : 'Mostrar mais'}
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Novo Residente</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Condomínio <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={condominiums
                    .filter(c => c.status === 'ACTIVE')
                    .map(condo => ({ value: condo.id, label: condo.name }))}
                  value={formData.condominium_id}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      condominium_id: val as number | null,
                      unit_id: null
                    })
                  }
                  placeholder="Selecione um condom?nio"
                  searchPlaceholder="Pesquisar condom?nio..."
                  emptyMessage="Nenhum condom?nio encontrado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Unidade <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.unit_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_id: e.target.value ? parseInt(e.target.value) : null
                    })
                  }
                  disabled={!formData.condominium_id}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione uma unidade</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code_block} {unit.number} {unit.building_name ? `- ${unit.building_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo do residente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'OWNER' | 'TENANT' })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OWNER">Proprietário</option>
                  <option value="TENANT">Inquilino</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Residente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Editar Residente</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedResident(null);
                }}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Condomínio <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={condominiums
                    .filter(c => c.status === 'ACTIVE')
                    .map(condo => ({ value: condo.id, label: condo.name }))}
                  value={formData.condominium_id}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      condominium_id: val as number | null,
                      unit_id: null
                    })
                  }
                  placeholder="Selecione um condomínio"
                  searchPlaceholder="Pesquisar condomínio..."
                  emptyMessage="Nenhum condomínio encontrado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Unidade <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.unit_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_id: e.target.value ? parseInt(e.target.value) : null
                    })
                  }
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma unidade</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code_block} {unit.number} {unit.building_name ? `- ${unit.building_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo do residente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'OWNER' | 'TENANT' })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OWNER">Proprietário</option>
                  <option value="TENANT">Inquilino</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedResident(null);
                }}
                className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Codes Modal */}
      {showQrCodesModal && selectedResidentForQr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border-main flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-text-main">QR Codes do Residente</h2>
                <p className="text-sm text-text-dim mt-1">{selectedResidentForQr.name}</p>
              </div>
              <button
                onClick={closeQrCodesModal}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingQrCodes ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                  <p className="text-text-dim">Carregando QR codes...</p>
                </div>
              ) : qrCodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <QrCode size={64} className="text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum QR Code</h3>
                  <p className="text-text-dim text-center">
                    Este residente ainda não gerou nenhum QR code de convite.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {qrCodes.map((qr) => (
                    <div
                      key={qr.id}
                      className="bg-white border border-border-main rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User size={16} className="text-slate-500" />
                            <span className="font-semibold text-text-main">
                              {qr.visitor_name || 'Visitante não especificado'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${formatQrCodeStatus(qr.status).className}`}>
                              {formatQrCodeStatus(qr.status).label}
                            </span>
                          </div>

                          {qr.purpose && (
                            <p className="text-sm text-text-dim mb-2">
                              <span className="font-medium">Propósito:</span> {qr.purpose}
                            </p>
                          )}

                          {qr.visitor_phone && (
                            <p className="text-sm text-text-dim mb-2">
                              <span className="font-medium">Telefone:</span> {qr.visitor_phone}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-text-dim">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>Criado: {formatDate(qr.created_at)}</span>
                            </div>
                            {qr.expires_at && (
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>Expira: {formatDate(qr.expires_at)}</span>
                              </div>
                            )}
                          </div>

                          {qr.is_recurring && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                Recorrente
                                {qr.recurrence_pattern && ` - ${qr.recurrence_pattern}`}
                              </span>
                            </div>
                          )}

                          {qr.notes && (
                            <p className="mt-2 text-sm text-text-dim italic">
                              Notas: {qr.notes}
                            </p>
                          )}
                        </div>

                        <div className="ml-4 p-2 bg-slate-50 rounded-lg">
                          <QrCode size={40} className="text-slate-400" />
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border-main">
                        <p className="text-xs text-text-dim font-mono break-all">
                          QR: {qr.qr_code}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border-main shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-dim">
                  {qrCodes.length} QR code{qrCodes.length !== 1 ? 's' : ''} encontrado{qrCodes.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={closeQrCodesModal}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
