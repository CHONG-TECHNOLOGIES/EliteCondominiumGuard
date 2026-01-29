import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, Trash2, Loader2, Search, X, Building2, Home, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/dataService';
import { Resident, Condominium, Unit } from '../../types';
import { useToast } from '../../components/Toast';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCondominiums = async () => {
    try {
      const condosData = await api.adminGetAllCondominiums();
      setCondominiums(condosData);
    } catch (error) {
      console.error('Error loading condominiums:', error);
    }
  };

  const loadUnitsForCondominium = async (condoId: number) => {
    try {
      const unitsData = await api.adminGetAllUnits(condoId);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading units:', error);
    }
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
      setResidents(prev => [...prev, ...moreResidents]);
      setHasMore(moreResidents.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more residents:', error);
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
      console.error('Error creating resident:', error);
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
      const result = await api.adminUpdateResident(String(selectedResident.id), formData);
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
      console.error('Error updating resident:', error);
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
          console.error('Error deleting resident:', error);
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

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const getUnitInfo = (unitId: number) => {
    const unit = units.find(u => u.id === unitId);
    if (unit) {
      return `${unit.code_block} ${unit.number}`;
    }
    // If unit not found in current units list, try to find in resident's unit_id
    const resident = residents.find(r => r.unit_id === unitId);
    if (resident) {
      return `Unidade ${unitId}`;
    }
    return 'Desconhecida';
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
                    <div className="flex items-center gap-3 mb-1">
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
    </div>
  );
}
