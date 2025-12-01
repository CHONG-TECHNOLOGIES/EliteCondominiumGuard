import React, { useState, useEffect } from 'react';
import { ApprovalMode, Unit } from '../types';
import {
  getAvailableApprovalModes,
  initiatePhoneCall,
  initiateIntercomCall,
  getResidentPhones,
  unitHasAppInstalled
} from '../utils/approvalModes';
import {
  Smartphone,
  Phone,
  PhoneCall,
  UserCheck,
  QrCode,
  CheckCircle2,
  WifiOff,
  PhoneOutgoing,
  AlertCircle
} from 'lucide-react';

interface ApprovalModeSelectorProps {
  selectedMode: ApprovalMode;
  onModeSelect: (mode: ApprovalMode) => void;
  isOnline: boolean;
  unit?: Unit;
  visitorPhone?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'Smartphone': <Smartphone size={24} />,
  'Phone': <Phone size={24} />,
  'PhoneCall': <PhoneCall size={24} />,
  'UserCheck': <UserCheck size={24} />,
  'QrCode': <QrCode size={24} />
};

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-700',
    hover: 'hover:border-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
    hover: 'hover:border-green-600'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    text: 'text-purple-700',
    hover: 'hover:border-purple-600'
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-700',
    hover: 'hover:border-orange-600'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    text: 'text-indigo-700',
    hover: 'hover:border-indigo-600'
  }
};

export default function ApprovalModeSelector({
  selectedMode,
  onModeSelect,
  isOnline,
  unit,
  visitorPhone
}: ApprovalModeSelectorProps) {
  const [calling, setCalling] = useState(false);
  const availableModes = getAvailableApprovalModes(isOnline, unit); // Pass unit for contextual logic
  const residentPhones = unit ? getResidentPhones(unit) : [];
  const hasAppInstalled = unit ? unitHasAppInstalled(unit) : false;

  // Auto-select appropriate mode when online/offline status changes or unit changes
  useEffect(() => {
    // Check if current selected mode is available
    const isCurrentModeAvailable = availableModes.some(
      config => config.mode === selectedMode
    );

    // If current mode is not available, auto-select the first available mode
    if (!isCurrentModeAvailable && availableModes.length > 0) {
      const defaultMode = availableModes[0].mode;
      const context = isOnline
        ? (hasAppInstalled ? 'ONLINE + HAS APP' : 'ONLINE + NO APP')
        : 'OFFLINE';
      console.log(`🔄 Auto-switching approval mode: ${selectedMode} → ${defaultMode} (${context})`);
      onModeSelect(defaultMode);
    }
  }, [isOnline, unit, availableModes, selectedMode, onModeSelect, hasAppInstalled]);

  const handlePhoneCall = () => {
    const phoneToCall = residentPhones[0] || visitorPhone;
    if (!phoneToCall) {
      alert('Nenhum número de telefone disponível para esta unidade.');
      return;
    }

    setCalling(true);
    initiatePhoneCall(phoneToCall);
    setTimeout(() => setCalling(false), 2000);
  };

  const handleIntercomCall = () => {
    if (!unit) {
      alert('Selecione uma unidade primeiro.');
      return;
    }

    setCalling(true);
    initiateIntercomCall(unit.number, unit.code_block);
    setTimeout(() => setCalling(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
          Modo de Aprovação
        </h3>
        {!isOnline && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
            <WifiOff size={14} />
            Modo Offline
          </div>
        )}
      </div>

      {/* Alert: Resident has NO app installed (online only) */}
      {isOnline && unit && !hasAppInstalled && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in duration-300">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 font-bold mb-1">
                Residente sem Aplicativo
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Nenhum morador desta unidade possui o app instalado. Use telefone ou interfone para aprovação.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {availableModes.map(config => {
          const isSelected = selectedMode === config.mode;
          const colors = colorMap[config.color] || colorMap.blue;
          const showCallButton = config.hasCallAction && isSelected;

          return (
            <div key={config.mode} className="relative">
              <button
                onClick={() => onModeSelect(config.mode)}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all text-left
                  flex items-start gap-4 group
                  ${isSelected
                    ? `${colors.bg} ${colors.border} shadow-md`
                    : `bg-white border-slate-200 ${colors.hover} hover:shadow-sm`
                  }
                `}
              >
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                  ${isSelected ? `${colors.bg} ${colors.text}` : 'bg-slate-100 text-slate-400'}
                  transition-colors
                `}>
                  {iconMap[config.icon]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-sm ${isSelected ? colors.text : 'text-slate-700'}`}>
                      {config.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 size={16} className={colors.text} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {config.description}
                  </p>

                  {config.requiresOnline && !isOnline && (
                    <div className="mt-2 text-xs text-orange-600 font-medium">
                      ⚠️ Requer conexão online
                    </div>
                  )}
                </div>
              </button>

              {/* Call Action Button */}
              {showCallButton && (
                <div className="mt-2 pl-16">
                  {config.mode === ApprovalMode.PHONE && (
                    <button
                      onClick={handlePhoneCall}
                      disabled={calling || (!residentPhones[0] && !visitorPhone)}
                      className={`
                        w-full py-3 px-4 rounded-lg font-bold text-sm
                        flex items-center justify-center gap-2
                        transition-all active:scale-95
                        ${calling
                          ? 'bg-green-100 text-green-600 cursor-wait'
                          : 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg'
                        }
                        disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                      `}
                    >
                      <PhoneOutgoing size={18} className={calling ? 'animate-pulse' : ''} />
                      {calling ? 'Chamando...' : `Ligar: ${residentPhones[0] || visitorPhone || 'N/A'}`}
                    </button>
                  )}

                  {config.mode === ApprovalMode.INTERCOM && (
                    <button
                      onClick={handleIntercomCall}
                      disabled={calling || !unit}
                      className={`
                        w-full py-3 px-4 rounded-lg font-bold text-sm
                        flex items-center justify-center gap-2
                        transition-all active:scale-95
                        ${calling
                          ? 'bg-purple-100 text-purple-600 cursor-wait'
                          : 'bg-purple-500 text-white hover:bg-purple-600 shadow-md hover:shadow-lg'
                        }
                        disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                      `}
                    >
                      <PhoneCall size={18} className={calling ? 'animate-pulse' : ''} />
                      {calling
                        ? 'Chamando...'
                        : unit
                          ? `Chamar ${unit.code_block || ''} ${unit.number}`
                          : 'Selecione Unidade'
                      }
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      {selectedMode === ApprovalMode.GUARD_MANUAL && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-xs text-orange-800 font-medium">
            ⚠️ <strong>Aprovação Manual:</strong> Você está assumindo total responsabilidade pela autorização desta entrada.
          </p>
        </div>
      )}

      {selectedMode === ApprovalMode.APP && isOnline && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-800 font-medium">
            📱 <strong>Notificação App:</strong> O residente receberá uma notificação push para aprovar ou negar a entrada.
          </p>
        </div>
      )}
    </div>
  );
}
