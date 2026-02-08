import React, { useState, useEffect, useRef, useContext } from 'react';
import { Newspaper, Plus, Edit2, Trash2, Loader2, Search, X, Building2, ChevronDown, Check, Upload, Image, Tag } from 'lucide-react';
import { api } from '../../services/dataService';
import { CondominiumNews, NewsCategory, Condominium, UserRole } from '../../types';
import { useToast } from '../../components/Toast';
import { buildAuditChanges, hasAuditChanges } from '../../utils/auditDiff';
import { logger, ErrorCategory } from '@/services/logger';
import { AuthContext } from '../../App';

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

export default function AdminNews() {
  const { user } = useContext(AuthContext);
  const { showToast, showConfirm } = useToast();
  const [news, setNews] = useState<CondominiumNews[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [selectedNews, setSelectedNews] = useState<CondominiumNews | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  // Form state for news
  const [formData, setFormData] = useState({
    condominium_id: null as number | null,
    title: '',
    description: '',
    content: '',
    image_url: '',
    category_id: null as number | null
  });

  // Form state for category
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    label: ''
  });

  const PAGE_SIZE = 50;

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [filterCondoId, debouncedSearch, filterCategoryId, filterDateFrom, filterDateTo]);

  const loadData = async () => {
    setLoading(true);
    setHasMore(true);
    try {
      const effectiveCondoId = isSuperAdmin ? filterCondoId : user?.condominium_id;
      const [newsData, categoriesData, condosData] = await Promise.all([
        api.adminGetAllNews(
          effectiveCondoId || undefined,
          PAGE_SIZE,
          debouncedSearch || undefined,
          filterCategoryId || undefined,
          filterDateFrom || undefined,
          filterDateTo || undefined
        ),
        api.getNewsCategories(),
        api.adminGetAllCondominiums()
      ]);
      setNews(newsData);
      setHasMore(newsData.length === PAGE_SIZE);
      setCategories(categoriesData);
      setCondominiums(condosData);
    } catch (error) {
      logger.error('Error loading news data', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || news.length === 0) return;

    const lastNews = news[news.length - 1];
    setLoadingMore(true);
    try {
      const effectiveCondoId = isSuperAdmin ? filterCondoId : user?.condominium_id;
      const moreNews = await api.adminGetAllNews(
        effectiveCondoId || undefined,
        PAGE_SIZE,
        debouncedSearch || undefined,
        filterCategoryId || undefined,
        filterDateFrom || undefined,
        filterDateTo || undefined,
        lastNews.created_at,
        lastNews.id
      );
      setNews([...news, ...moreNews]);
      setHasMore(moreNews.length === PAGE_SIZE);
    } catch (error) {
      logger.error('Error loading more news', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao carregar mais notícias');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('warning', 'Por favor selecione um arquivo de imagem');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showToast('warning', 'A imagem deve ter no máximo 5MB');
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
  };

  const handleCreate = async () => {
    const effectiveCondoId = isSuperAdmin ? formData.condominium_id : user?.condominium_id;

    if (!effectiveCondoId) {
      showToast('warning', 'Condomínio é obrigatório');
      return;
    }
    if (!formData.title.trim()) {
      showToast('warning', 'Título é obrigatório');
      return;
    }

    setUploading(true);
    try {
      // Create news first
      const newsToCreate = {
        ...formData,
        condominium_id: effectiveCondoId
      };

      const created = await api.adminCreateNews(newsToCreate);

      if (created) {
        // Upload image if selected
        if (imageFile) {
          const imageUrl = await api.uploadNewsImage(imageFile, effectiveCondoId, created.id);
          if (imageUrl) {
            await api.adminUpdateNews(created.id, { image_url: imageUrl });
          }
        }

        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Notícia criada com sucesso!');
      } else {
        showToast('error', 'Erro ao criar notícia');
      }
    } catch (error) {
      logger.error('Error creating news', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao criar notícia');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedNews) return;
    if (!formData.title.trim()) {
      showToast('warning', 'Título é obrigatório');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        // Delete old image if exists
        if (selectedNews.image_url) {
          await api.deleteNewsImage(selectedNews.image_url);
        }
        const newImageUrl = await api.uploadNewsImage(imageFile, selectedNews.condominium_id, selectedNews.id);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      }

      const changes = buildAuditChanges(selectedNews, { ...formData, image_url: imageUrl }, { exclude: [] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;

      const result = await api.adminUpdateNews(selectedNews.id, { ...formData, image_url: imageUrl }, auditDetails);

      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedNews(null);
        resetForm();
        showToast('success', 'Notícia atualizada com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar notícia');
      }
    } catch (error) {
      logger.error('Error updating news', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao atualizar notícia');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (newsItem: CondominiumNews) => {
    showConfirm(
      `Deseja realmente remover a notícia "${newsItem.title}"?`,
      async () => {
        try {
          // Delete image from storage if exists
          if (newsItem.image_url) {
            await api.deleteNewsImage(newsItem.image_url);
          }

          const result = await api.adminDeleteNews(newsItem.id, newsItem.title);
          if (result) {
            await loadData();
            showToast('success', 'Notícia removida com sucesso!');
          } else {
            showToast('error', 'Erro ao remover notícia');
          }
        } catch (error) {
          logger.error('Error deleting news', error, ErrorCategory.NETWORK);
          showToast('error', 'Erro ao remover notícia');
        }
      }
    );
  };

  const openEditModal = (newsItem: CondominiumNews) => {
    setSelectedNews(newsItem);
    setFormData({
      condominium_id: newsItem.condominium_id,
      title: newsItem.title,
      description: newsItem.description || '',
      content: newsItem.content || '',
      image_url: newsItem.image_url || '',
      category_id: newsItem.category_id || null
    });
    if (newsItem.image_url) {
      setImagePreview(newsItem.image_url);
    }
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      condominium_id: null,
      title: '',
      description: '',
      content: '',
      image_url: '',
      category_id: null
    });
    clearImage();
  };

  // Category handlers
  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }
    if (!categoryFormData.label.trim()) {
      showToast('warning', 'Rótulo é obrigatório');
      return;
    }

    try {
      const result = await api.adminCreateNewsCategory(categoryFormData);
      if (result) {
        await loadData();
        setShowCategoryModal(false);
        resetCategoryForm();
        showToast('success', 'Categoria criada com sucesso!');
      } else {
        showToast('error', 'Erro ao criar categoria');
      }
    } catch (error) {
      logger.error('Error creating category', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao criar categoria');
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    if (!categoryFormData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }
    if (!categoryFormData.label.trim()) {
      showToast('warning', 'Rótulo é obrigatório');
      return;
    }

    try {
      const changes = buildAuditChanges(editingCategory, categoryFormData, { exclude: [] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;

      const result = await api.adminUpdateNewsCategory(editingCategory.id, categoryFormData, auditDetails);
      if (result) {
        await loadData();
        setShowCategoryModal(false);
        setEditingCategory(null);
        resetCategoryForm();
        showToast('success', 'Categoria atualizada com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar categoria');
      }
    } catch (error) {
      logger.error('Error updating category', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao atualizar categoria');
    }
  };

  const handleDeleteCategory = async (category: NewsCategory) => {
    showConfirm(
      `Deseja realmente remover a categoria "${category.label}"?`,
      async () => {
        try {
          const result = await api.adminDeleteNewsCategory(category.id, category.name);
          if (result) {
            await loadData();
            showToast('success', 'Categoria removida com sucesso!');
          } else {
            showToast('error', 'Erro ao remover categoria');
          }
        } catch (error) {
          logger.error('Error deleting category', error, ErrorCategory.NETWORK);
          showToast('error', 'Erro ao remover categoria');
        }
      }
    );
  };

  const openEditCategoryModal = (category: NewsCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      label: category.label || ''
    });
    setShowCategoryModal(true);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      label: ''
    });
    setEditingCategory(null);
  };

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const getCategoryLabel = (categoryId: number | undefined | null) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.label || category?.name || null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Gestão de Notícias</h1>
          <p className="text-text-dim">Gerir notícias e comunicados do condomínio</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Nova Notícia
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título, descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Condominium filter (SuperAdmin only) */}
        {isSuperAdmin && (
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
        )}

        {/* Category filter */}
        <SearchableSelect
          options={[
            { value: 'ALL', label: 'Todas as Categorias' },
            ...categories.map(cat => ({ value: cat.id, label: cat.label || cat.name }))
          ]}
          value={filterCategoryId}
          onChange={(val) => setFilterCategoryId(val === 'ALL' ? null : val as number | null)}
          placeholder="Todas as categorias"
          searchPlaceholder="Pesquisar categoria..."
          emptyMessage="Nenhuma categoria encontrada"
          alwaysVisibleValues={['ALL']}
        />

        {/* Date From */}
        <div>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Data início"
          />
        </div>

        {/* Date To */}
        <div>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Data fim"
          />
        </div>
      </div>

      {/* News List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando notícias...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Newspaper size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {debouncedSearch || filterCategoryId || filterDateFrom || filterDateTo ? 'Nenhum resultado encontrado' : 'Nenhuma notícia cadastrada'}
          </h3>
          <p className="text-text-dim">
            {debouncedSearch || filterCategoryId || filterDateFrom || filterDateTo
              ? 'Tente buscar com outros termos ou filtros'
              : 'Clique em "Nova Notícia" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {news.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-border-main p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Image thumbnail */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Image className="text-slate-400" size={32} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-text-main truncate">
                          {item.title}
                        </h3>
                        {getCategoryLabel(item.category_id) && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {getCategoryLabel(item.category_id)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-dim mb-2 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-text-dim">
                        <div className="flex items-center gap-1">
                          <Building2 size={14} />
                          <span>{getCondominiumName(item.condominium_id)}</span>
                        </div>
                        {item.created_at && (
                          <span>{formatDate(item.created_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!loading && news.length > 0 && hasMore && (
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

      {/* Category Management Section */}
      <div className="mt-8 pt-6 border-t border-border-main">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-main">Categorias de Notícias</h2>
            <p className="text-sm text-text-dim">Gerir categorias para organizar as notícias</p>
          </div>
          <button
            onClick={() => {
              resetCategoryForm();
              setShowCategoryModal(true);
            }}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Nova Categoria
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="bg-slate-50 rounded-lg p-6 text-center">
            <Tag size={48} className="text-slate-300 mx-auto mb-2" />
            <p className="text-text-dim">Nenhuma categoria cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(category => (
              <div
                key={category.id}
                className="bg-white rounded-lg border border-border-main p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-text-main">{category.label || category.name}</p>
                  <p className="text-xs text-text-dim">ID: {category.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCategoryModal(category)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create News Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-main flex items-center justify-between sticky top-0 bg-bg-surface">
              <h2 className="text-2xl font-bold text-text-main">Nova Notícia</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {isSuperAdmin && (
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
                  placeholder="Título da notícia"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Categoria
                </label>
                <SearchableSelect
                  options={categories.map(cat => ({ value: cat.id, label: cat.label || cat.name }))}
                  value={formData.category_id}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      category_id: val as number | null
                    })
                  }
                  placeholder="Selecione uma categoria"
                  searchPlaceholder="Pesquisar categoria..."
                  emptyMessage="Nenhuma categoria encontrada"
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
                  placeholder="Breve descrição da notícia"
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Conteúdo
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Conteúdo completo da notícia"
                  rows={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Imagem
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-main rounded-lg cursor-pointer hover:bg-bg-root transition-colors">
                    <Upload size={32} className="text-text-dim mb-2" />
                    <span className="text-sm text-text-dim">Clique para selecionar uma imagem</span>
                    <span className="text-xs text-text-dim mt-1">PNG, JPG ou WebP (máx. 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3 sticky bottom-0 bg-bg-surface">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {uploading && <Loader2 className="animate-spin" size={18} />}
                Criar Notícia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit News Modal */}
      {showEditModal && selectedNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-main flex items-center justify-between sticky top-0 bg-bg-surface">
              <h2 className="text-2xl font-bold text-text-main">Editar Notícia</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedNews(null);
                  resetForm();
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
                  value={getCondominiumName(selectedNews.condominium_id)}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-border-main text-text-dim rounded-lg cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título da notícia"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Categoria
                </label>
                <SearchableSelect
                  options={categories.map(cat => ({ value: cat.id, label: cat.label || cat.name }))}
                  value={formData.category_id}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      category_id: val as number | null
                    })
                  }
                  placeholder="Selecione uma categoria"
                  searchPlaceholder="Pesquisar categoria..."
                  emptyMessage="Nenhuma categoria encontrada"
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
                  placeholder="Breve descrição da notícia"
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Conteúdo
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Conteúdo completo da notícia"
                  rows={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Imagem
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-main rounded-lg cursor-pointer hover:bg-bg-root transition-colors">
                    <Upload size={32} className="text-text-dim mb-2" />
                    <span className="text-sm text-text-dim">Clique para selecionar uma imagem</span>
                    <span className="text-xs text-text-dim mt-1">PNG, JPG ou WebP (máx. 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3 sticky bottom-0 bg-bg-surface">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedNews(null);
                  resetForm();
                }}
                className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {uploading && <Loader2 className="animate-spin" size={18} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal (Create/Edit) */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-main">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nome (ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: avisos, eventos, manutencao"
                />
                <p className="text-xs text-text-dim mt-1">Identificador único (sem espaços)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Rótulo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryFormData.label}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, label: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Avisos, Eventos, Manutenção"
                />
                <p className="text-xs text-text-dim mt-1">Nome exibido para os usuários</p>
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
                className="px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingCategory ? handleEditCategory : handleCreateCategory}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
