import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Info, Trash2, RefreshCw, Wifi, Database, HardDrive, Camera } from 'lucide-react';
import { api } from '../services/dataService';
import { UninstallConfirmDialog } from '../components/UninstallConfirmDialog';
import { getDeviceIdentifier } from '../services/deviceUtils';
import { PhotoQuality } from '../types';
import { logger, ErrorCategory } from '@/services/logger';

const Settings: React.FC = () => {
  const [condoName, setCondoName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isOnline, setIsOnline] = useState(api.checkOnline());
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    used: string;
    quota: string;
    percentage: string;
  } | null>(null);
  const [photoQuality, setPhotoQuality] = useState<PhotoQuality>(PhotoQuality.MEDIUM);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(api.checkOnline());

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Load device info
    api.getDeviceCondoDetails().then(details => {
      if (details) setCondoName(details.name);
    });

    setDeviceId(getDeviceIdentifier());

    // Get storage info
    loadStorageInfo();

    // Load photo quality setting
    api.getPhotoQuality().then(setPhotoQuality);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const loadStorageInfo = async () => {
    if (!navigator.storage || !navigator.storage.estimate) {
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / 1024 / 1024;
      const quotaMB = (estimate.quota || 0) / 1024 / 1024;
      const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1) * 100).toFixed(2);

      setStorageInfo({
        used: `${usedMB.toFixed(2)} MB`,
        quota: `${quotaMB.toFixed(2)} MB`,
        percentage: `${percentUsed}%`
      });
    } catch (err) {
      console.error('Error getting storage info:', err);
    }
  };

  const handlePhotoQualityChange = async (quality: PhotoQuality) => {
    setPhotoQuality(quality);
    await api.setPhotoQuality(quality);
  };

  const handleUninstall = async () => {
    const result = await api.decommissionDevice();

    if (result.success) {
      // Redirect to setup after a short delay
      setTimeout(() => {
        window.location.href = '#/setup';
        window.location.reload();
      }, 1000);
    } else {
      alert(`Erro ao desinstalar: ${result.error}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-100">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-xl">
            <SettingsIcon className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Configurações</h1>
            <p className="text-slate-600">Gerir dispositivo e preferências</p>
          </div>
        </div>

        {/* Device Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Info size={20} />
              Informações do Dispositivo
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Condomínio</p>
                <p className="text-lg font-bold text-slate-900">{condoName || 'Não configurado'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Estado de Conexão</p>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <Wifi className="text-green-600" size={20} />
                      <span className="text-lg font-bold text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="text-red-600" size={20} />
                      <span className="text-lg font-bold text-red-600">Offline</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ID do Dispositivo</p>
              <p className="text-sm font-mono text-slate-700 break-all">{deviceId}</p>
            </div>
          </div>
        </div>

        {/* Storage Information */}
        {storageInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HardDrive size={20} />
                Armazenamento Local
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Usado</p>
                  <p className="text-xl font-bold text-purple-900">{storageInfo.used}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-xl font-bold text-purple-900">{storageInfo.quota}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Utilização</p>
                  <p className="text-xl font-bold text-purple-900">{storageInfo.percentage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Quality (Data Saving) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera size={20} />
              Qualidade das Fotos
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Reduza o consumo de dados escolhendo uma qualidade menor para as fotos capturadas.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handlePhotoQualityChange(PhotoQuality.HIGH)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  photoQuality === PhotoQuality.HIGH
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-bold text-slate-800">Alta</p>
                <p className="text-xs text-slate-500">~300KB</p>
              </button>
              <button
                onClick={() => handlePhotoQualityChange(PhotoQuality.MEDIUM)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  photoQuality === PhotoQuality.MEDIUM
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-bold text-slate-800">Média</p>
                <p className="text-xs text-slate-500">~150KB</p>
              </button>
              <button
                onClick={() => handlePhotoQualityChange(PhotoQuality.LOW)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  photoQuality === PhotoQuality.LOW
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-bold text-slate-800">Baixa</p>
                <p className="text-xs text-slate-500">~50KB</p>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {photoQuality === PhotoQuality.LOW && '💡 Modo poupança ativo - ideal para dados móveis'}
              {photoQuality === PhotoQuality.MEDIUM && '⚖️ Equilíbrio entre qualidade e tamanho'}
              {photoQuality === PhotoQuality.HIGH && '📷 Máxima qualidade - consome mais dados'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database size={20} />
              Ações
            </h2>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-3 group"
            >
              <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
                <RefreshCw className="text-white" size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-blue-900">Recarregar Aplicação</p>
                <p className="text-sm text-blue-700">Atualizar dados e interface</p>
              </div>
            </button>

            <button
              onClick={() => setShowUninstallDialog(true)}
              className="w-full px-6 py-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-3 group"
            >
              <div className="p-2 bg-red-600 rounded-lg group-hover:bg-red-700 transition-colors">
                <Trash2 className="text-white" size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-red-900">Desinstalar Dispositivo</p>
                <p className="text-sm text-red-700">Remover todos os dados e desassociar do condomínio</p>
              </div>
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>Atenção:</strong> A desinstalação do dispositivo é uma ação irreversível.
            Todos os dados locais serão apagados e o tablet precisará ser reconfigurado para ser usado novamente.
          </p>
        </div>
      </div>

      {/* Uninstall Dialog */}
      <UninstallConfirmDialog
        isOpen={showUninstallDialog}
        onClose={() => setShowUninstallDialog(false)}
        onConfirm={handleUninstall}
        deviceName={`Tablet ${deviceId.substring(0, 8)}...`}
        condominiumName={condoName}
      />
    </div>
  );
};

export default Settings;
