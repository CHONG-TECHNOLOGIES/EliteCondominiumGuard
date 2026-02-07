import React, { useState, useEffect, useRef } from 'react';
import { Home, Plus, Edit2, Trash2, Loader2, Search, X, Building2, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/dataService';
import { Unit, Condominium } from '../../types';
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
  className?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
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

export default function AdminUnits() {
  const { showToast, showConfirm } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    condominium_id: null as number | null,
    code_block: '',
    number: '',
    floor: undefined as number | undefined,
    building_name: ''
  });

  useEffect(() => {
    loadData();
  }, [filterCondoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsData, condosData] = await Promise.all([
        api.adminGetAllUnits(filterCondoId || undefined),
        api.adminGetAllCondominiums()
      ]);
      setUnits(unitsData);
      setCondominiums(condosData);
    } catch (error) {
      logger.error('Error loading data', error, ErrorCategory.NETWORK);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.condominium_id) {
      showToast('warning', 'Condomínio é obrigatório');
      return;
    }
    if (!formData.code_block.trim() || !formData.number.trim()) {
      showToast('warning', 'Bloco e Número são obrigatórios');
      return;
    }

    try {
      const result = await api.adminCreateUnit(formData);
      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Unidade criada com sucesso!');
      } else {
        showToast('error', 'Erro ao criar unidade');
      }
    } catch (error) {
      logger.error('Error creating unit', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao criar unidade');
    }
  };

  const handleEdit = async () => {
    if (!selectedUnit) return;
    if (!formData.code_block.trim() || !formData.number.trim()) {
      showToast('warning', 'Bloco e Número são obrigatórios');
      return;
    }

    try {
      const changes = buildAuditChanges(selectedUnit, formData, { exclude: ['pin', 'pin_hash'] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;
      const result = await api.adminUpdateUnit(String(selectedUnit.id), formData, auditDetails);
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedUnit(null);
        resetForm();
        showToast('success', 'Unidade atualizada com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar unidade');
      }
    } catch (error) {
      logger.error('Error updating unit', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao atualizar unidade');
    }
  };

  const handleDelete = async (unit: Unit) => {
    showConfirm(
      `Deseja realmente remover a unidade ${unit.code_block} ${unit.number}?`,
      async () => {
        try {
          const result = await api.adminDeleteUnit(String(unit.id));
          if (result) {
            await loadData();
            showToast('success', 'Unidade removida com sucesso!');
          } else {
            showToast('error', 'Erro ao remover unidade');
          }
        } catch (error) {
          logger.error('Error deleting unit', error, ErrorCategory.NETWORK);
          showToast('error', 'Erro ao remover unidade');
        }
      }
    );
  };

  const openEditModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      condominium_id: unit.condominium_id,
      code_block: unit.code_block,
      number: unit.number,
      floor: unit.floor,
      building_name: unit.building_name || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      condominium_id: null,
      code_block: '',
      number: '',
      floor: undefined,
      building_name: ''
    });
  };

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const filteredUnits = units.filter(unit =>
    `${unit.code_block} ${unit.number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.building_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-text-main">Gestão de Unidades</h1>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
              {filteredUnits.length === units.length
                ? `${units.length} total`
                : `${filteredUnits.length} de ${units.length}`
              }
            </span>
          </div>
          <p className="text-text-dim">Gerir apartamentos e frações dos condomínios</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Nova Unidade
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por bloco, número ou edifício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <SearchableSelect
          options={condominiums.map(condo => ({ value: condo.id, label: condo.name }))}
          value={filterCondoId}
          onChange={(val) => setFilterCondoId(val ? (val as number) : null)}
          placeholder="Todos os Condomínios"
          searchPlaceholder="Pesquisar condomínio..."
          emptyMessage="Nenhum condomínio encontrado"
        />
      </div>

      {/* Units List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando unidades...</p>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Home size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma unidade cadastrada'}
          </h3>
          <p className="text-text-dim">
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Clique em "Nova Unidade" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-white rounded-xl shadow-sm border border-border-main p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Home className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-text-main">
                        {unit.code_block} {unit.number}
                      </h3>
                      {unit.floor !== null && unit.floor !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-text-main">
                          Piso {unit.floor}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-dim">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} />
                        <span>{getCondominiumName(unit.condominium_id)}</span>
                      </div>
                      {unit.building_name && (
                        <span className="text-text-dim">• Edifício: {unit.building_name}</span>
                      )}
                    </div>
                    {unit.residents && unit.residents.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {unit.residents.length} residente(s)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(unit)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(unit)}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Nova Unidade</h2>
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
                    .map(condo => ({ value: condo.id, label: condo.name }))
                  }
                  value={formData.condominium_id}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      condominium_id: val as number | null
                    })
                  }
                  placeholder="Selecione um condomínio"
                  searchPlaceholder="Pesquisar condomínio..."
                  emptyMessage="Nenhum condomínio encontrado"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Bloco <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code_block}
                    onChange={(e) => setFormData({ ...formData, code_block: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A, B, C..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="101, 202..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Piso</label>
                  <input
                    type="number"
                    value={formData.floor !== undefined ? formData.floor : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0, 1, 2..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Nome do Edifício
                  </label>
                  <input
                    type="text"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Torre Sul, Bloco Norte..."
                  />
                </div>
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
                Criar Unidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Editar Unidade</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUnit(null);
                }}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Condomínio (Apenas Leitura)
                </label>
                <input
                  type="text"
                  value={getCondominiumName(selectedUnit.condominium_id)}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-border-main bg-bg-surface text-text-main rounded-lg text-text-dim cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Bloco <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code_block}
                    onChange={(e) => setFormData({ ...formData, code_block: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A, B, C..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="101, 202..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Piso</label>
                  <input
                    type="number"
                    value={formData.floor !== undefined ? formData.floor : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0, 1, 2..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Nome do Edifício
                  </label>
                  <input
                    type="text"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Torre Sul, Bloco Norte..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUnit(null);
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
