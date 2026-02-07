import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Plus, Edit2, Trash2, Loader2, Search, X, Building2, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/dataService';
import { Restaurant, Condominium } from '../../types';
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
        className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between cursor-pointer"
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
              <X size={14} className="text-text-dim" />
            </button>
          )}
          <ChevronDown size={18} className={`text-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-main rounded-lg shadow-lg">
          <div className="p-2 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
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
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-root flex items-center justify-between transition-colors ${option.value === value ? 'bg-accent/10 text-accent' : 'text-text-main'
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

export default function AdminRestaurants() {
  const { showToast, showConfirm } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    condominium_id: null as number | null,
    name: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  useEffect(() => {
    loadData();
  }, [filterCondoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [restaurantsData, condosData] = await Promise.all([
        api.adminGetAllRestaurants(filterCondoId || undefined),
        api.adminGetAllCondominiums()
      ]);
      setRestaurants(restaurantsData);
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
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminCreateRestaurant(formData);
      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Restaurante criado com sucesso!');
      } else {
        showToast('error', 'Erro ao criar restaurante');
      }
    } catch (error) {
      logger.error('Error creating restaurant', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao criar restaurante');
    }
  };

  const handleEdit = async () => {
    if (!selectedRestaurant) return;
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const changes = buildAuditChanges(selectedRestaurant, formData, { exclude: ['pin', 'pin_hash'] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;
      const result = await api.adminUpdateRestaurant(String(selectedRestaurant.id), formData, auditDetails);
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedRestaurant(null);
        resetForm();
        showToast('success', 'Restaurante atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar restaurante');
      }
    } catch (error) {
      logger.error('Error updating restaurant', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao atualizar restaurante');
    }
  };

  const handleDelete = async (restaurant: Restaurant) => {
    showConfirm(
      `Deseja realmente remover o restaurante ${restaurant.name}?`,
      async () => {
        try {
          const result = await api.adminDeleteRestaurant(String(restaurant.id));
          if (result) {
            await loadData();
            showToast('success', 'Restaurante removido com sucesso!');
          } else {
            showToast('error', 'Erro ao remover restaurante');
          }
        } catch (error) {
          logger.error('Error deleting restaurant', error, ErrorCategory.NETWORK);
          showToast('error', 'Erro ao remover restaurante');
        }
      }
    );
  };

  const openEditModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      condominium_id: restaurant.condominium_id,
      name: restaurant.name,
      description: restaurant.description || '',
      status: restaurant.status || 'ACTIVE'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      condominium_id: null,
      name: '',
      description: '',
      status: 'ACTIVE'
    });
  };

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Gestão de Restaurantes</h1>
          <p className="text-text-dim">Gerir restaurantes e estabelecimentos comerciais</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Novo Restaurante
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
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

      {/* Restaurants List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando restaurantes...</p>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Utensils size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum restaurante cadastrado'}
          </h3>
          <p className="text-text-dim">
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Clique em "Novo Restaurante" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-white rounded-xl shadow-sm border border-border-main p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Utensils className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-text-main">
                        {restaurant.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        restaurant.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-text-main'
                      }`}>
                        {restaurant.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {restaurant.description && (
                      <p className="text-sm text-text-dim mb-2">{restaurant.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-text-dim">
                      <Building2 size={14} />
                      <span>{getCondominiumName(restaurant.condominium_id)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(restaurant)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(restaurant)}
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
              <h2 className="text-2xl font-bold text-text-main">Novo Restaurante</h2>
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
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do restaurante"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Breve descrição do restaurante"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
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
                Criar Restaurante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Editar Restaurante</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRestaurant(null);
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
                  value={getCondominiumName(selectedRestaurant.condominium_id)}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-border-main bg-bg-surface text-text-main rounded-lg text-text-dim cursor-not-allowed"
                />
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
                  placeholder="Nome do restaurante"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Breve descrição do restaurante"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRestaurant(null);
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
