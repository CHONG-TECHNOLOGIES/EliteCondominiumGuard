import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Loader2, Search, X, Check, XIcon } from 'lucide-react';
import { api } from '../../services/dataService';
import { VisitTypeConfig } from '../../types';
import { useToast } from '../../components/Toast';

export default function AdminVisitTypes() {
  const { showToast, showConfirm } = useToast();
  const [visitTypes, setVisitTypes] = useState<VisitTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVisitType, setSelectedVisitType] = useState<VisitTypeConfig | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    icon_key: 'user',
    requires_service_type: false,
    requires_restaurant: false,
    requires_sport: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetAllVisitTypes();
      setVisitTypes(data);
    } catch (error) {
      console.error('Error loading visit types:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon_key: 'user',
      requires_service_type: false,
      requires_restaurant: false,
      requires_sport: false
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminCreateVisitType(formData);
      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Tipo de visita criado com sucesso!');
      } else {
        showToast('error', 'Erro ao criar tipo de visita');
      }
    } catch (error) {
      console.error('Error creating visit type:', error);
      showToast('error', 'Erro ao criar tipo de visita');
    }
  };

  const handleEdit = async () => {
    if (!selectedVisitType) return;
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminUpdateVisitType(selectedVisitType.id, formData);
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedVisitType(null);
        resetForm();
        showToast('success', 'Tipo de visita atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar tipo de visita');
      }
    } catch (error) {
      console.error('Error updating visit type:', error);
      showToast('error', 'Erro ao atualizar tipo de visita');
    }
  };

  const handleDelete = async (visitType: VisitTypeConfig) => {
    showConfirm(
      `Deseja realmente remover o tipo de visita "${visitType.name}"?`,
      async () => {
        try {
          const result = await api.adminDeleteVisitType(visitType.id);
          if (result) {
            await loadData();
            showToast('success', 'Tipo de visita removido com sucesso!');
          } else {
            showToast('error', 'Erro ao remover tipo de visita');
          }
        } catch (error) {
          console.error('Error deleting visit type:', error);
          showToast('error', 'Erro ao remover tipo de visita');
        }
      }
    );
  };

  const openEditModal = (visitType: VisitTypeConfig) => {
    setSelectedVisitType(visitType);
    setFormData({
      name: visitType.name,
      icon_key: visitType.icon_key,
      requires_service_type: visitType.requires_service_type,
      requires_restaurant: visitType.requires_restaurant || false,
      requires_sport: visitType.requires_sport || false
    });
    setShowEditModal(true);
  };

  const filteredVisitTypes = visitTypes.filter(vt =>
    vt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tipos de Visita</h1>
          <p className="text-slate-600">Configurar tipos de visita disponíveis no sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Novo Tipo
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Visit Types List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando tipos de visita...</p>
        </div>
      ) : filteredVisitTypes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Tag size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum tipo de visita configurado'}
          </h3>
          <p className="text-slate-600">
            {searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Tipo" para adicionar um tipo de visita'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredVisitTypes.map((visitType) => (
            <div
              key={visitType.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Tag className="text-purple-600" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{visitType.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        Ícone: {visitType.icon_key}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        {visitType.requires_service_type ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <XIcon size={16} className="text-red-600" />
                        )}
                        <span className={visitType.requires_service_type ? 'text-green-700' : 'text-slate-500'}>
                          Requer Tipo de Serviço
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {visitType.requires_restaurant ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <XIcon size={16} className="text-red-600" />
                        )}
                        <span className={visitType.requires_restaurant ? 'text-green-700' : 'text-slate-500'}>
                          Requer Restaurante
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {visitType.requires_sport ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <XIcon size={16} className="text-red-600" />
                        )}
                        <span className={visitType.requires_sport ? 'text-green-700' : 'text-slate-500'}>
                          Requer Desporto
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(visitType)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(visitType)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={20} />
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Novo Tipo de Visita</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome do Tipo de Visita *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Visitante, Entrega, Serviço"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ícone (chave)
                </label>
                <input
                  type="text"
                  value={formData.icon_key}
                  onChange={(e) => setFormData({ ...formData, icon_key: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: user, package, truck"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_service_type}
                    onChange={(e) => setFormData({ ...formData, requires_service_type: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Requer Tipo de Serviço</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_restaurant}
                    onChange={(e) => setFormData({ ...formData, requires_restaurant: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Requer Restaurante</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_sport}
                    onChange={(e) => setFormData({ ...formData, requires_sport: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Requer Desporto</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedVisitType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Editar Tipo de Visita</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVisitType(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome do Tipo de Visita *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Visitante, Entrega, Serviço"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ícone (chave)
                </label>
                <input
                  type="text"
                  value={formData.icon_key}
                  onChange={(e) => setFormData({ ...formData, icon_key: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: user, package, truck"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_service_type}
                    onChange={(e) => setFormData({ ...formData, requires_service_type: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Requer Tipo de Serviço</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_restaurant}
                    onChange={(e) => setFormData({ ...formData, requires_restaurant: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Requer Restaurante</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_sport}
                    onChange={(e) => setFormData({ ...formData, requires_sport: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Requer Desporto</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVisitType(null);
                  resetForm();
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
