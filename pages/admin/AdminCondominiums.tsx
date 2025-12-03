import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Power, MapPin, Loader2, Search, X } from 'lucide-react';
import { api } from '../../services/dataService';
import { Condominium, Street } from '../../types';
import { useToast } from '../../components/Toast';
import { Trash2 } from 'lucide-react';

export default function AdminCondominiums() {
  const { showToast, showConfirm } = useToast();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    logo_url: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    gps_radius_meters: 100,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    phone_number: ''
  });

  // Street management state
  const [streets, setStreets] = useState<Street[]>([]);
  const [newStreetName, setNewStreetName] = useState('');
  const [loadingStreets, setLoadingStreets] = useState(false);

  useEffect(() => {
    loadCondominiums();
  }, []);

  const loadCondominiums = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetAllCondominiums();
      setCondominiums(data);
    } catch (error) {
      console.error('Error loading condominiums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminCreateCondominium(formData);
      if (result) {
        await loadCondominiums();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Condomínio criado com sucesso!');
      } else {
        showToast('error', 'Erro ao criar condomínio');
      }
    } catch (error) {
      console.error('Error creating condominium:', error);
      showToast('error', 'Erro ao criar condomínio');
    }
  };

  const handleEdit = async () => {
    if (!selectedCondo) return;
    if (!formData.name.trim()) {
      showToast('warning', 'Nome é obrigatório');
      return;
    }

    try {
      const result = await api.adminUpdateCondominium(selectedCondo.id, formData);
      if (result) {
        await loadCondominiums();
        setShowEditModal(false);
        setSelectedCondo(null);
        resetForm();
        showToast('success', 'Condomínio atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar condomínio');
      }
    } catch (error) {
      console.error('Error updating condominium:', error);
      showToast('error', 'Erro ao atualizar condomínio');
    }
  };

  const handleToggleStatus = async (condo: Condominium) => {
    const newStatus = condo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'ativar' : 'desativar';

    showConfirm(
      `Deseja realmente ${action} o condomínio "${condo.name}"?`,
      async () => {
        try {
          const result = await api.adminToggleCondominiumStatus(condo.id, newStatus);
          if (result) {
            await loadCondominiums();
            showToast('success', `Condomínio ${action === 'ativar' ? 'ativado' : 'desativado'} com sucesso!`);
          } else {
            showToast('error', `Erro ao ${action} condomínio`);
          }
        } catch (error) {
          console.error('Error toggling status:', error);
          showToast('error', `Erro ao ${action} condomínio`);
        }
      }
    );
  };

  const openEditModal = (condo: Condominium) => {
    setSelectedCondo(condo);
    setFormData({
      name: condo.name,
      address: condo.address || '',
      logo_url: condo.logo_url || '',
      latitude: condo.latitude,
      longitude: condo.longitude,
      gps_radius_meters: condo.gps_radius_meters || 100,
      status: condo.status || 'ACTIVE',
      phone_number: condo.phone_number || ''
    });
    setShowEditModal(true);
    loadStreets(condo.id);
  };

  const loadStreets = async (condoId: number) => {
    setLoadingStreets(true);
    try {
      const data = await api.adminGetStreets(condoId);
      setStreets(data);
    } catch (error) {
      console.error('Error loading streets:', error);
    } finally {
      setLoadingStreets(false);
    }
  };

  const handleAddStreet = async () => {
    if (!selectedCondo || !newStreetName.trim()) return;

    try {
      const result = await api.adminAddStreet(selectedCondo.id, newStreetName);
      if (result) {
        setNewStreetName('');
        await loadStreets(selectedCondo.id);
        showToast('success', 'Rua adicionada com sucesso!');
      } else {
        showToast('error', 'Erro ao adicionar rua');
      }
    } catch (error) {
      console.error('Error adding street:', error);
      showToast('error', 'Erro ao adicionar rua');
    }
  };

  const handleRemoveStreet = async (streetId: number) => {
    try {
      const result = await api.adminRemoveStreet(streetId);
      if (result) {
        if (selectedCondo) await loadStreets(selectedCondo.id);
        showToast('success', 'Rua removida com sucesso!');
      } else {
        showToast('error', 'Erro ao remover rua');
      }
    } catch (error) {
      console.error('Error removing street:', error);
      showToast('error', 'Erro ao remover rua');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      logo_url: '',
      latitude: undefined,
      longitude: undefined,
      gps_radius_meters: 100,
      status: 'ACTIVE',
      phone_number: ''
    });
  };

  const filteredCondominiums = condominiums.filter(condo =>
    condo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    condo.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Condomínios</h1>
          <p className="text-slate-600">Criar, editar e gerir condomínios no sistema</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Novo Condomínio
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Condominiums List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando condomínios...</p>
        </div>
      ) : filteredCondominiums.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Building2 size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum condomínio cadastrado'}
          </h3>
          <p className="text-slate-600">
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Clique em "Novo Condomínio" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCondominiums.map((condo) => (
            <div
              key={condo.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {condo.logo_url && (
                    <img
                      src={condo.logo_url}
                      alt={condo.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{condo.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${condo.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {condo.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                    {condo.address && (
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <MapPin size={16} />
                        <span>{condo.address}</span>
                      </div>
                    )}
                    {(condo.latitude && condo.longitude) && (
                      <p className="text-sm text-slate-500">
                        GPS: {condo.latitude.toFixed(6)}, {condo.longitude.toFixed(6)}
                        {condo.gps_radius_meters && ` (Raio: ${condo.gps_radius_meters}m)`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(condo)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(condo)}
                    className={`p-2 rounded-lg transition-colors ${condo.status === 'ACTIVE'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-green-600 hover:bg-green-50'
                      }`}
                    title={condo.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                  >
                    <Power size={20} />
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Novo Condomínio</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do condomínio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endereço completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telefone</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Logo URL</label>
                <input
                  type="text"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="-23.550520"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="-46.633308"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Raio GPS (metros)
                </label>
                <input
                  type="number"
                  value={formData.gps_radius_meters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gps_radius_meters: parseInt(e.target.value) || 100
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Condomínio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCondo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Editar Condomínio</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCondo(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do condomínio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endereço completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telefone</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Logo URL</label>
                <input
                  type="text"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="-23.550520"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="-46.633308"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Raio GPS (metros)
                </label>
                <input
                  type="number"
                  value={formData.gps_radius_meters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gps_radius_meters: parseInt(e.target.value) || 100
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>

              {/* Streets Management */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Ruas do Condomínio</h3>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newStreetName}
                    onChange={(e) => setNewStreetName(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome da rua"
                  />
                  <button
                    onClick={handleAddStreet}
                    disabled={!newStreetName.trim()}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Adicionar
                  </button>
                </div>

                {loadingStreets ? (
                  <div className="text-center py-4">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" size={24} />
                  </div>
                ) : streets.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhuma rua cadastrada.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {streets.map((street) => (
                      <div key={street.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-700">{street.name}</span>
                        <button
                          onClick={() => handleRemoveStreet(street.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="Remover rua"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCondo(null);
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
