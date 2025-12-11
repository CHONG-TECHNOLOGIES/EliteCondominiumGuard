import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface UninstallConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deviceName?: string;
  condominiumName?: string;
}

export const UninstallConfirmDialog: React.FC<UninstallConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deviceName,
  condominiumName
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = async () => {
    if (confirmText !== 'DESINSTALAR') {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error during uninstall:', error);
      alert('Erro ao desinstalar o dispositivo. Por favor, tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white relative">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Desinstalar Dispositivo</h2>
              <p className="text-red-100 text-sm">Esta ação é irreversível</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              Atenção: Dados Permanentes Serão Apagados
            </h3>
            <p className="text-sm text-red-800">
              Ao desinstalar este dispositivo, os seguintes dados serão <strong>permanentemente removidos</strong>:
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-slate-900">Informações do Dispositivo:</h4>
            <div className="text-sm text-slate-700 space-y-1">
              <p><strong>Nome:</strong> {deviceName || 'Não configurado'}</p>
              <p><strong>Condomínio:</strong> {condominiumName || 'Não atribuído'}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="flex items-start gap-2">
              <Trash2 size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>Todos os dados locais armazenados (visitas, incidentes, configurações)</span>
            </p>
            <p className="flex items-start gap-2">
              <Trash2 size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>Associação deste tablet ao condomínio</span>
            </p>
            <p className="flex items-start gap-2">
              <Trash2 size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>Histórico de sincronizações e cache</span>
            </p>
            <p className="flex items-start gap-2">
              <Trash2 size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>Status do dispositivo será marcado como "DECOMMISSIONED"</span>
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>Nota:</strong> Após a desinstalação, este tablet precisará ser reconfigurado manualmente
              através da tela de Setup para ser usado novamente.
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="pt-4">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Para confirmar, digite <code className="bg-red-100 text-red-700 px-2 py-1 rounded font-mono text-xs">DESINSTALAR</code>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite DESINSTALAR"
              disabled={isProcessing}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-red-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== 'DESINSTALAR' || isProcessing}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                A desinstalar...
              </>
            ) : (
              <>
                <Trash2 size={20} />
                Desinstalar Dispositivo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
