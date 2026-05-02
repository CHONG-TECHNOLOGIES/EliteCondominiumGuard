import React, { useContext, useEffect, useRef, useState } from 'react';
import { Building2, CalendarDays, Check, ChevronDown, Clock3, Edit2, Loader2, MapPin, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { AuthContext } from '../../App';
import { useToast } from '../../components/Toast';
import { api } from '../../services/dataService';
import { logger, ErrorCategory } from '@/services/logger';
import { buildAuditChanges, hasAuditChanges } from '../../utils/auditDiff';
import { Condominium, CondominiumEvent, CondominiumEventCategory, CondominiumEventInput, UserRole } from '../../types';

interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  alwaysVisibleValues?: Array<number | string>;
  className?: string;
  disabled?: boolean;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  alwaysVisibleValues = [],
  className = '',
  disabled = false
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span className={selectedOption ? 'text-text-main' : 'text-text-dim'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
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

      {isOpen && !disabled && (
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
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-root flex items-center justify-between transition-colors ${option.value === value ? 'bg-accent/10 text-accent' : 'text-text-main'}`}
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

const EVENT_CATEGORY_OPTIONS: Array<{ value: CondominiumEventCategory; label: string }> = [
  { value: 'general', label: 'Geral' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Desporto' },
  { value: 'closure', label: 'Interdição' }
];

const CATEGORY_BADGE_STYLES: Record<CondominiumEventCategory, string> = {
  general: 'bg-slate-100 text-slate-700',
  meeting: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  social: 'bg-pink-100 text-pink-700',
  sports: 'bg-emerald-100 text-emerald-700',
  closure: 'bg-red-100 text-red-700'
};

const DEFAULT_FORM = {
  condominium_id: null as number | null,
  title: '',
  description: '',
  location: '',
  category: 'general' as CondominiumEventCategory,
  start_at: '',
  end_at: '',
  is_all_day: false,
  requires_rsvp: false,
  max_attendees: ''
};

const formatDateTimeInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
};

const formatDateTimeDisplay = (value?: string, isAllDay?: boolean): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('pt-PT', isAllDay
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  );
};

export default function AdminEvents() {
  const { user } = useContext(AuthContext);
  const { showToast, showConfirm } = useToast();
  const [events, setEvents] = useState<CondominiumEvent[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<CondominiumEventCategory | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CondominiumEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [filterCondoId, filterCategory, filterDateFrom, filterDateTo, showInactive, debouncedSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, condosData] = await Promise.all([
        api.adminGetAllCondominiumEvents(
          filterCondoId || undefined,
          200,
          debouncedSearch || undefined,
          filterCategory || undefined,
          filterDateFrom || undefined,
          filterDateTo || undefined,
          showInactive
        ),
        api.adminGetAllCondominiums()
      ]);
      setEvents(eventsData);
      setCondominiums(condosData);
    } catch (error) {
      logger.error('Error loading events data', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
  };

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(item => item.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const getCategoryLabel = (category: CondominiumEventCategory) => (
    EVENT_CATEGORY_OPTIONS.find(option => option.value === category)?.label || category
  );

  const buildPayload = (effectiveCondoId: number): CondominiumEventInput => ({
    condominium_id: effectiveCondoId,
    title: formData.title.trim(),
    description: formData.description.trim(),
    location: formData.location.trim(),
    category: formData.category,
    start_at: new Date(formData.start_at).toISOString(),
    end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
    is_all_day: formData.is_all_day,
    requires_rsvp: formData.requires_rsvp,
    max_attendees: formData.max_attendees ? Number(formData.max_attendees) : null,
    created_by: user?.id ?? null,
    is_active: true
  });

  const validateForm = (effectiveCondoId?: number | null) => {
    if (!effectiveCondoId) {
      showToast('warning', 'Condomínio é obrigatório');
      return false;
    }
    if (!formData.title.trim()) {
      showToast('warning', 'Título é obrigatório');
      return false;
    }
    if (!formData.start_at) {
      showToast('warning', 'Data de início é obrigatória');
      return false;
    }
    if (formData.end_at && new Date(formData.end_at).getTime() < new Date(formData.start_at).getTime()) {
      showToast('warning', 'A data final não pode ser anterior à data inicial');
      return false;
    }
    if (formData.max_attendees) {
      const maxAttendees = Number(formData.max_attendees);
      if (!Number.isInteger(maxAttendees) || maxAttendees <= 0) {
        showToast('warning', 'O limite de participantes deve ser um número positivo');
        return false;
      }
    }
    return true;
  };

  const handleCreate = async () => {
    const effectiveCondoId = isSuperAdmin ? formData.condominium_id : user?.condominium_id;
    if (!validateForm(effectiveCondoId)) return;

    setSaving(true);
    try {
      const payload = buildPayload(effectiveCondoId!);
      const created = await api.adminCreateCondominiumEvent(payload);
      if (!created) {
        showToast('error', 'Erro ao criar evento');
        return;
      }

      await loadData();
      setShowCreateModal(false);
      resetForm();
      showToast('success', 'Evento criado com sucesso!');
    } catch (error) {
      logger.error('Error creating event', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao criar evento');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEvent) return;
    const effectiveCondoId = selectedEvent.condominium_id;
    if (!validateForm(effectiveCondoId)) return;

    setSaving(true);
    try {
      const payload = buildPayload(effectiveCondoId);
      const comparisonSnapshot = {
        ...selectedEvent,
        title: payload.title,
        description: payload.description || '',
        location: payload.location || '',
        category: payload.category,
        start_at: payload.start_at,
        end_at: payload.end_at || undefined,
        is_all_day: payload.is_all_day,
        requires_rsvp: payload.requires_rsvp,
        max_attendees: payload.max_attendees || undefined
      };
      const changes = buildAuditChanges(selectedEvent, comparisonSnapshot, { exclude: ['rsvp_count', 'created_at', 'updated_at'] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;

      const updated = await api.adminUpdateCondominiumEvent(selectedEvent.id, payload, auditDetails);
      if (!updated) {
        showToast('error', 'Erro ao atualizar evento');
        return;
      }

      await loadData();
      setShowEditModal(false);
      setSelectedEvent(null);
      resetForm();
      showToast('success', 'Evento atualizado com sucesso!');
    } catch (error) {
      logger.error('Error updating event', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao atualizar evento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: CondominiumEvent) => {
    showConfirm(
      `Deseja realmente desativar o evento "${event.title}"?`,
      async () => {
        try {
          const result = await api.adminDeleteCondominiumEvent(event.id, {
            condominium_id: event.condominium_id,
            title: event.title
          });
          if (result) {
            await loadData();
            showToast('success', 'Evento desativado com sucesso!');
          } else {
            showToast('error', 'Erro ao desativar evento');
          }
        } catch (error) {
          logger.error('Error deleting event', error, ErrorCategory.NETWORK);
          showToast('error', 'Erro ao desativar evento');
        }
      }
    );
  };

  const openEditModal = (event: CondominiumEvent) => {
    setSelectedEvent(event);
    setFormData({
      condominium_id: event.condominium_id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      category: event.category,
      start_at: formatDateTimeInput(event.start_at),
      end_at: formatDateTimeInput(event.end_at),
      is_all_day: event.is_all_day ?? false,
      requires_rsvp: event.requires_rsvp ?? false,
      max_attendees: event.max_attendees ? String(event.max_attendees) : ''
    });
    setShowEditModal(true);
  };

  const renderModal = (mode: 'create' | 'edit') => {
    const isEdit = mode === 'edit';
    const isOpen = isEdit ? showEditModal : showCreateModal;
    if (!isOpen) return null;

    const selectedCondoName = isEdit && selectedEvent
      ? getCondominiumName(selectedEvent.condominium_id)
      : (user?.condominium_id ? getCondominiumName(user.condominium_id) : '');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-border-main flex items-center justify-between sticky top-0 bg-bg-surface">
            <h2 className="text-2xl font-bold text-text-main">{isEdit ? 'Editar Evento' : 'Novo Evento'}</h2>
            <button
              onClick={() => {
                if (isEdit) {
                  setShowEditModal(false);
                  setSelectedEvent(null);
                } else {
                  setShowCreateModal(false);
                }
                resetForm();
              }}
              className="p-2 hover:bg-bg-root rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {isSuperAdmin && !isEdit && (
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Condomínio <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={condominiums
                    .filter(condo => condo.status === 'ACTIVE')
                    .map(condo => ({ value: condo.id, label: condo.name }))}
                  value={formData.condominium_id}
                  onChange={(value) => setFormData({ ...formData, condominium_id: value as number | null })}
                  placeholder="Selecione um condomínio"
                  searchPlaceholder="Pesquisar condomínio..."
                  emptyMessage="Nenhum condomínio encontrado"
                />
              </div>
            )}
            {(isEdit || !isSuperAdmin) && (
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Condomínio
                </label>
                <input
                  type="text"
                  value={isEdit && selectedEvent ? getCondominiumName(selectedEvent.condominium_id) : selectedCondoName}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-border-main text-text-dim rounded-lg cursor-not-allowed"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex.: Assembleia Geral"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Categoria
              </label>
              <SearchableSelect
                options={EVENT_CATEGORY_OPTIONS}
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value as CondominiumEventCategory })}
                placeholder="Selecione uma categoria"
                searchPlaceholder="Pesquisar categoria..."
                emptyMessage="Nenhuma categoria encontrada"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Local
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex.: Salão de festas"
                maxLength={160}
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
                placeholder="Detalhes relevantes do evento"
                rows={4}
                maxLength={600}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Fim
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 rounded-lg border border-border-main px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_all_day}
                  onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
                  className="h-4 w-4 rounded border-border-main text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-text-main font-medium">Evento de dia inteiro</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border-main px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_rsvp}
                  onChange={(e) => setFormData({ ...formData, requires_rsvp: e.target.checked })}
                  className="h-4 w-4 rounded border-border-main text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-text-main font-medium">Exigir confirmação de presença</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Limite de participantes
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.max_attendees}
                onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="p-6 border-t border-border-main flex justify-end gap-3 sticky bottom-0 bg-bg-surface">
            <button
              onClick={() => {
                if (isEdit) {
                  setShowEditModal(false);
                  setSelectedEvent(null);
                } else {
                  setShowCreateModal(false);
                }
                resetForm();
              }}
              className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={isEdit ? handleEdit : handleCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={saving}
            >
              {saving && <Loader2 className="animate-spin" size={18} />}
              {isEdit ? 'Salvar Alterações' : 'Criar Evento'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Gestão de Eventos</h1>
          <p className="text-text-dim">Gerir eventos e atividades do condomínio</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Novo Evento
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título, descrição ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isSuperAdmin && (
          <SearchableSelect
            options={[
              { value: 'ALL', label: 'Todos os Condomínios' },
              ...condominiums.map(condo => ({ value: condo.id, label: condo.name }))
            ]}
            value={filterCondoId}
            onChange={(value) => setFilterCondoId(value === 'ALL' ? null : value as number | null)}
            placeholder="Todos os condomínios"
            searchPlaceholder="Pesquisar condomínio..."
            emptyMessage="Nenhum condomínio encontrado"
            alwaysVisibleValues={['ALL']}
          />
        )}

        <SearchableSelect
          options={[
            { value: 'ALL', label: 'Todas as Categorias' },
            ...EVENT_CATEGORY_OPTIONS
          ]}
          value={filterCategory}
          onChange={(value) => setFilterCategory(value === 'ALL' ? null : value as CondominiumEventCategory | null)}
          placeholder="Todas as categorias"
          searchPlaceholder="Pesquisar categoria..."
          emptyMessage="Nenhuma categoria encontrada"
          alwaysVisibleValues={['ALL']}
        />

        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Data inicial"
        />

        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Data final"
        />
      </div>

      <div className="mb-6">
        <label className="inline-flex items-center gap-3 rounded-lg border border-border-main bg-bg-surface px-4 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-border-main text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-text-main font-medium">Mostrar eventos inativos</span>
        </label>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando eventos...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <CalendarDays size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {debouncedSearch || filterCategory || filterDateFrom || filterDateTo || showInactive
              ? 'Nenhum resultado encontrado'
              : 'Nenhum evento cadastrado'}
          </h3>
          <p className="text-text-dim">
            {debouncedSearch || filterCategory || filterDateFrom || filterDateTo || showInactive
              ? 'Tente ajustar os filtros aplicados'
              : 'Clique em "Novo Evento" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-sm border border-border-main p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <CalendarDays className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-text-main">{event.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CATEGORY_BADGE_STYLES[event.category]}`}>
                        {getCategoryLabel(event.category)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${event.is_active === false ? 'bg-slate-200 text-slate-700' : 'bg-green-100 text-green-700'}`}>
                        {event.is_active === false ? 'Inativo' : 'Ativo'}
                      </span>
                      {event.is_all_day && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                          Dia inteiro
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-text-dim mb-3 line-clamp-2">{event.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm text-text-dim">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} />
                        <span>{getCondominiumName(event.condominium_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 size={14} />
                        <span>
                          {formatDateTimeDisplay(event.start_at, event.is_all_day)}
                          {event.end_at ? ` - ${formatDateTimeDisplay(event.end_at, event.is_all_day)}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{event.location || 'Sem local definido'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        <span>
                          {event.requires_rsvp ? `RSVP: ${event.rsvp_count ?? 0}` : 'RSVP opcional'}
                          {event.max_attendees ? ` / ${event.max_attendees}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(event)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  {event.is_active !== false && (
                    <button
                      onClick={() => handleDelete(event)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desativar"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {renderModal('create')}
      {renderModal('edit')}
    </div>
  );
}
