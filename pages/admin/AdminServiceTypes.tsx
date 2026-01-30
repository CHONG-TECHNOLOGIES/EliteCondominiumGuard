import React, { useState, useEffect } from 'react';
import {
  Wrench, Plus, Edit2, Trash2, Loader2, Search, X,
  Hammer, Droplets, Zap, Wifi, Sparkles, Flower2, Truck, MoreHorizontal
} from 'lucide-react';
import { api } from '../../services/dataService';
import { ServiceTypeConfig } from '../../types';
import { useToast } from '../../components/Toast';
import { buildAuditChanges, hasAuditChanges } from '../../utils/auditDiff';

// Map service name to icon based on keywords (same logic as NewEntry.tsx)
const getServiceIcon = (name: string, size: number = 32) => {
  const s = name.toLowerCase();
  if (s.includes("obras") || s.includes("construção")) return <Hammer size={size} />;
  if (s.includes("canalização") || s.includes("canalizacao")) return <Droplets size={size} />;
  if (s.includes("electri") || s.includes("eletri")) return <Zap size={size} />;
  if (s.includes("internet") || s.includes("tv")) return <Wifi size={size} />;
  if (s.includes("limpeza")) return <Sparkles size={size} />;
  if (s.includes("jardinagem")) return <Flower2 size={size} />;
  if (s.includes("mudanças") || s.includes("mudancas")) return <Truck size={size} />;
  return <MoreHorizontal size={size} />;
};

export default function AdminServiceTypes() {
  const { showToast, showConfirm } = useToast();
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceTypeConfig | null>(null);

  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetAllServiceTypes();
      setServiceTypes(data);
    } catch (error) {
      console.error('Error loading service types:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminCreateServiceType(formData);
      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Tipo de serviço criado com sucesso!');
      } else {
        showToast('error', 'Erro ao criar tipo de serviço');
      }
    } catch (error) {
      console.error('Error creating service type:', error);
      showToast('error', 'Erro ao criar tipo de serviço');
    }
  };

  const handleEdit = async () => {
    if (!selectedServiceType) return;
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const changes = buildAuditChanges(selectedServiceType, formData, { exclude: ['pin', 'pin_hash'] });
      const auditDetails = hasAuditChanges(changes) ? { changes } : undefined;
      const result = await api.adminUpdateServiceType(selectedServiceType.id, formData, auditDetails);
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedServiceType(null);
        resetForm();
        showToast('success', 'Tipo de serviço atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar tipo de serviço');
      }
    } catch (error) {
      console.error('Error updating service type:', error);
      showToast('error', 'Erro ao atualizar tipo de serviço');
    }
  };

  const handleDelete = async (serviceType: ServiceTypeConfig) => {
    showConfirm(
      `Deseja realmente remover o tipo de serviço "${serviceType.name}"?`,
      async () => {
        try {
          const result = await api.adminDeleteServiceType(serviceType.id);
          if (result) {
            await loadData();
            showToast('success', 'Tipo de serviço removido com sucesso!');
          } else {
            showToast('error', 'Erro ao remover tipo de serviço');
          }
        } catch (error) {
          console.error('Error deleting service type:', error);
          showToast('error', 'Erro ao remover tipo de serviço');
        }
      }
    );
  };

  const openEditModal = (serviceType: ServiceTypeConfig) => {
    setSelectedServiceType(serviceType);
    setFormData({
      name: serviceType.name
    });
    setShowEditModal(true);
  };

  const filteredServiceTypes = serviceTypes.filter(st =>
    st.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Tipos de Serviço</h1>
          <p className="text-text-dim">Configurar tipos de serviço disponíveis no sistema</p>
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
            className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Service Types List */}
      {loading ? (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando tipos de serviço...</p>
        </div>
      ) : filteredServiceTypes.length === 0 ? (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Wrench size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-main mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum tipo de serviço configurado'}
          </h3>
          <p className="text-text-dim">
            {searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Tipo" para adicionar um tipo de serviço'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredServiceTypes.map((serviceType) => (
            <div
              key={serviceType.id}
              className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                    {getServiceIcon(serviceType.name, 32)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-main">{serviceType.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(serviceType)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(serviceType)}
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
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-main">Novo Tipo de Serviço</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nome do Tipo de Serviço *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Obras, Mudanças, Entregas"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-border-main text-text-main rounded-lg hover:bg-bg-root transition-colors"
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
      {showEditModal && selectedServiceType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-[95vw] md:max-w-lg lg:max-w-2xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Editar Tipo de Serviço</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedServiceType(null);
                  resetForm();
                }}
                className="p-2 hover:bg-bg-root rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nome do Tipo de Serviço *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Obras, Mudanças, Entregas"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-main flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedServiceType(null);
                  resetForm();
                }}
                className="px-6 py-2 border border-border-main text-text-main rounded-lg hover:bg-bg-root transition-colors"
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
