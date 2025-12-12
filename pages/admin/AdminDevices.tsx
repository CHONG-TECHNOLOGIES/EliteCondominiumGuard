import React, { useState, useEffect } from 'react';
import { Tablet, Edit2, Power, Loader2, Search, X, Clock, Building2, Info, Database, Wifi, WifiOff, Settings as SettingsIcon, HardDrive } from 'lucide-react';
import { api } from '../../services/dataService';
import { Device, Condominium } from '../../types';
import { useToast } from '../../components/Toast';

interface DeviceStorageInfo {
  used: number;
  total: number;
  utilization: number;
}

export default function AdminDevices() {
  const { showToast, showConfirm } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceStorage, setDeviceStorage] = useState<DeviceStorageInfo | null>(null);

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

  const openDetailsModal = (device: Device) => {
    setSelectedDevice(device);
    // Estimate storage from metadata (if available)
    if (device.metadata && typeof device.metadata === 'object') {
      const storageData = device.metadata.storage;
      if (storageData) {
        setDeviceStorage({
          used: storageData.used || 0,
          total: storageData.total || 0,
          utilization: storageData.utilization || 0
        });
      } else {
        // Default/mock values if not available
        setDeviceStorage({
          used: 10.14,
          total: 292174.99,
          utilization: 0.0035
        });
      }
    } else {
      setDeviceStorage(null);
    }
    setShowDetailsModal(true);
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
                    onClick={() => openDetailsModal(device)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Ver Detalhes"
                  >
                    <Info size={20} />
                  </button>
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

      {/* Device Details Modal */}
      {showDetailsModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <SettingsIcon className="text-blue-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedDevice(null);
                  setDeviceStorage(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-slate-600">Gerir dispositivo e preferências</p>

              {/* Device Information Section */}
              <div className="bg-slate-800 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="text-white" size={20} />
                  <h3 className="text-xl font-bold">Informações do Dispositivo</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Condominium */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">CONDOMÍNIO</p>
                    <p className="text-lg font-bold">{getCondominiumName(selectedDevice.condominium_id)}</p>
                  </div>

                  {/* Connection Status */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">ESTADO DE CONEXÃO</p>
                    <div className="flex items-center gap-2">
                      {selectedDevice.status === 'ACTIVE' ? (
                        <>
                          <Wifi className="text-green-400" size={18} />
                          <span className="text-lg font-bold text-green-400">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="text-red-400" size={18} />
                          <span className="text-lg font-bold text-red-400">Offline</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Device ID */}
                <div className="bg-slate-700/50 rounded-lg p-4 mt-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">ID DO DISPOSITIVO</p>
                  <p className="text-sm font-mono break-all">{selectedDevice.device_identifier}</p>
                </div>
              </div>

              {/* Local Storage Section */}
              {deviceStorage && (
                <div className="bg-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="text-white" size={20} />
                    <h3 className="text-xl font-bold">Armazenamento Local</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Used */}
                    <div className="bg-purple-500/30 rounded-lg p-4">
                      <p className="text-xs uppercase tracking-wider text-purple-200 mb-1">USADO</p>
                      <p className="text-2xl font-bold">{deviceStorage.used.toFixed(2)} MB</p>
                    </div>

                    {/* Total */}
                    <div className="bg-purple-500/30 rounded-lg p-4">
                      <p className="text-xs uppercase tracking-wider text-purple-200 mb-1">TOTAL</p>
                      <p className="text-2xl font-bold">{deviceStorage.total.toFixed(2)} MB</p>
                    </div>

                    {/* Utilization */}
                    <div className="bg-purple-500/30 rounded-lg p-4">
                      <p className="text-xs uppercase tracking-wider text-purple-200 mb-1">UTILIZAÇÃO</p>
                      <p className="text-2xl font-bold">{(deviceStorage.utilization * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Section */}
              <div className="bg-slate-800 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <HardDrive className="text-white" size={20} />
                  <h3 className="text-xl font-bold">Ações</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openEditModal(selectedDevice);
                    }}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Editar Dispositivo
                  </button>

                  {selectedDevice.status !== 'DECOMMISSIONED' && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleDecommission(selectedDevice);
                      }}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Power size={18} />
                      Desativar Dispositivo
                    </button>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {selectedDevice.configured_at && (
                <div className="bg-slate-100 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Configurado em:</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(selectedDevice.configured_at).toLocaleString('pt-PT')}
                  </p>
                </div>
              )}
              {selectedDevice.last_seen_at && (
                <div className="bg-slate-100 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Último contacto:</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(selectedDevice.last_seen_at).toLocaleString('pt-PT')} ({formatLastSeen(selectedDevice.last_seen_at)})
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedDevice(null);
                  setDeviceStorage(null);
                }}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
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
