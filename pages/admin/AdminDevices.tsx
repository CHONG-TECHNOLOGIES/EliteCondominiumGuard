import React, { useState, useEffect } from 'react';
import { Tablet, Edit2, Power, Loader2, Search, X, Clock, Building2 } from 'lucide-react';
import { api } from '../../services/dataService';
import { Device, Condominium } from '../../types';
import { useToast } from '../../components/Toast';

export default function AdminDevices() {
  const { showToast, showConfirm } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    device_name: '',
    condominium_id: null as number | null
  });

  useEffect(() => {
    loadData();
  }, [filterCondoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesData, condosData] = await Promise.all([
        api.adminGetAllDevices(filterCondoId || undefined),
        api.adminGetAllCondominiums()
      ]);
      setDevices(devicesData);
      setCondominiums(condosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDevice) return;

    try {
      const result = await api.adminUpdateDevice(selectedDevice.id!, {
        device_name: formData.device_name,
        condominium_id: formData.condominium_id
      });
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedDevice(null);
        showToast('success', 'Dispositivo atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar dispositivo');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      showToast('error', 'Erro ao atualizar dispositivo');
    }
  };

  const handleDecommission = async (device: Device) => {
    if (!device.id) return;

    showConfirm(
      `Deseja realmente desativar o dispositivo "${device.device_name || device.device_identifier}"?`,
      async () => {
        try {
          const result = await api.adminDecommissionDevice(String(device.id));
          if (result) {
            await loadData();
            showToast('success', 'Dispositivo desativado com sucesso!');
          } else {
            showToast('error', 'Erro ao desativar dispositivo');
          }
        } catch (error) {
          console.error('Error decommissioning device:', error);
          showToast('error', 'Erro ao desativar dispositivo');
        }
      }
    );
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      device_name: device.device_name || '',
      condominium_id: device.condominium_id || null
    });
    setShowEditModal(true);
  };

  const getCondominiumName = (condoId?: number) => {
    if (!condoId) return 'Não Atribuído';
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">ATIVO</span>;
      case 'INACTIVE':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">INATIVO</span>;
      case 'DECOMMISSIONED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">DESATIVADO</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">DESCONHECIDO</span>;
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Nunca';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const filteredDevices = devices.filter(device =>
    (device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     device.device_identifier?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Dispositivos</h1>
        <p className="text-slate-600">Gerir tablets e dispositivos associados aos condomínios</p>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou identificador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCondoId || ''}
          onChange={(e) => setFilterCondoId(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os Condomínios</option>
          {condominiums.map(condo => (
            <option key={condo.id} value={condo.id}>{condo.name}</option>
          ))}
        </select>
      </div>

      {/* Devices List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando dispositivos...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Tablet size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dispositivo registado'}
          </h3>
          <p className="text-slate-600">
            {searchTerm ? 'Tente buscar com outros termos' : 'Dispositivos serão registados automaticamente quando configurados'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Tablet className="text-blue-600" size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {device.device_name || 'Dispositivo Sem Nome'}
                      </h3>
                      {getStatusBadge(device.status)}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      ID: {device.device_identifier}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} />
                        <span>{getCondominiumName(device.condominium_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Último contacto: {formatLastSeen(device.last_seen_at)}</span>
                      </div>
                    </div>
                    {device.configured_at && (
                      <p className="text-xs text-slate-400 mt-2">
                        Configurado: {new Date(device.configured_at).toLocaleString('pt-PT')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(device)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  {device.status !== 'DECOMMISSIONED' && (
                    <button
                      onClick={() => handleDecommission(device)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desativar"
                    >
                      <Power size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Editar Dispositivo</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDevice(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Identificador (Apenas Leitura)
                </label>
                <input
                  type="text"
                  value={selectedDevice.device_identifier}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome do Dispositivo
                </label>
                <input
                  type="text"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Portaria Principal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condomínio Associado
                </label>
                <select
                  value={formData.condominium_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condominium_id: e.target.value ? parseInt(e.target.value) : null
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Não Atribuído</option>
                  {condominiums
                    .filter(c => c.status === 'ACTIVE')
                    .map(condo => (
                      <option key={condo.id} value={condo.id}>{condo.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDevice(null);
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
