import { ApprovalMode, ApprovalModeConfig, Condominium } from '../types';

export const APPROVAL_MODE_CONFIGS: ApprovalModeConfig[] = [
  {
    mode: ApprovalMode.APP,
    label: 'Aplicativo',
    description: 'Notificação push para o residente',
    requiresOnline: true,
    icon: 'Smartphone',
    color: 'blue'
  },
  {
    mode: ApprovalMode.PHONE,
    label: 'Telefone',
    description: 'Chamada telefônica para o residente',
    requiresOnline: false,
    hasCallAction: true,
    icon: 'Phone',
    color: 'green'
  },
  {
    mode: ApprovalMode.INTERCOM,
    label: 'Interfone',
    description: 'Chamada via interfone da portaria',
    requiresOnline: false,
    hasCallAction: true,
    icon: 'PhoneCall',
    color: 'purple'
  },
  {
    mode: ApprovalMode.GUARD_MANUAL,
    label: 'Aprovação Manual',
    description: 'Autorização direta pelo guarda',
    requiresOnline: false,
    icon: 'UserCheck',
    color: 'orange'
  },
  {
    mode: ApprovalMode.QR_SCAN,
    label: 'QR Code',
    description: 'Escaneamento de código pré-autorizado',
    requiresOnline: true,
    icon: 'QrCode',
    color: 'indigo'
  }
];

/**
 * Returns approval modes available based on online/offline status and unit context
 *
 * CONTEXTUAL LOGIC:
 * - ONLINE + Resident HAS App: Show APP plus enabled fallback methods
 * - ONLINE + Resident NO App: Show PHONE plus enabled local methods
 * - OFFLINE: Show PHONE plus enabled local methods
 */
export function getAvailableApprovalModes(
  isOnline: boolean,
  unit?: any,
  condominium?: Pick<Condominium, 'intercom_approval_enabled' | 'guard_manual_approval_enabled'> | null
): ApprovalModeConfig[] {
  // Check if any resident in the unit has the app installed
  const hasAppInstalled = unit?.residents?.some(
    (r: any) => r.has_app_installed === true || r.device_token
  ) || false;
  const intercomApprovalEnabled = condominium?.intercom_approval_enabled ?? true;
  const guardManualApprovalEnabled = condominium?.guard_manual_approval_enabled ?? true;

  const isEnabledLocalMode = (mode: ApprovalMode) => {
    if (mode === ApprovalMode.PHONE) return true;
    if (mode === ApprovalMode.INTERCOM) return intercomApprovalEnabled;
    if (mode === ApprovalMode.GUARD_MANUAL) return guardManualApprovalEnabled;
    return false;
  };

  if (isOnline) {
    if (hasAppInstalled) {
      // ONLINE + Resident HAS App: Show app first, then enabled local fallbacks.
      return APPROVAL_MODE_CONFIGS.filter(config => {
        if (config.mode === ApprovalMode.APP) return true;
        if (config.mode === ApprovalMode.INTERCOM) return isEnabledLocalMode(config.mode);
        if (config.mode === ApprovalMode.GUARD_MANUAL) return isEnabledLocalMode(config.mode);
        return false;
      });
    } else {
      // ONLINE + Resident NO App: Show only allowed local methods
      // (APP wouldn't work anyway, so don't show it)
      return APPROVAL_MODE_CONFIGS.filter(config =>
        isEnabledLocalMode(config.mode)
      );
    }
  } else {
    // OFFLINE: Show only allowed local methods
    return APPROVAL_MODE_CONFIGS.filter(config =>
      isEnabledLocalMode(config.mode)
    );
  }
}

/**
 * Check if unit has any resident with app installed
 */
export function unitHasAppInstalled(unit: any): boolean {
  if (!unit || !unit.residents) return false;
  return unit.residents.some(
    (r: any) => r.has_app_installed === true || r.device_token
  );
}

/**
 * Get config for a specific approval mode
 */
export function getApprovalModeConfig(mode: ApprovalMode): ApprovalModeConfig | undefined {
  return APPROVAL_MODE_CONFIGS.find(config => config.mode === mode);
}

/**
 * Initiates a phone call to the given number
 * Works on tablets/phones with dialer capability
 */
export function initiatePhoneCall(phoneNumber: string): void {
  if (!phoneNumber) {
    alert('Número de telefone não disponível');
    return;
  }

  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const telUrl = `tel:${cleanNumber}`;

  // Try multiple methods to trigger the phone dialer
  // Method 1: Temporary <a> element click
  try {
    const link = document.createElement('a');
    link.href = telUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e1) {
    // Method 2: window.open
    try {
      window.open(telUrl, '_self');
    } catch (e2) {
      // Method 3: window.location
      try {
        window.location.href = telUrl;
      } catch (e3) {
        alert(
          `Não foi possível iniciar a chamada.\n\n` +
          `Número: ${cleanNumber}\n\n` +
          `Erro: ${e1 instanceof Error ? e1.message : String(e1)}\n` +
          `Método 2: ${e2 instanceof Error ? e2.message : String(e2)}\n` +
          `Método 3: ${e3 instanceof Error ? e3.message : String(e3)}`
        );
      }
    }
  }

  // After a short delay, check if the page is still visible
  // (if the dialer opened, the page would lose focus)
  setTimeout(() => {
    if (document.hasFocus()) {
      alert(
        `O discador não abriu. O tablet pode não suportar chamadas tel:.\n\n` +
        `Número para ligar manualmente: ${cleanNumber}\n\n` +
        `URL tentada: ${telUrl}\n` +
        `UserAgent: ${navigator.userAgent}`
      );
    }
  }, 2000);
}

/**
 * Initiates intercom call
 * This is a placeholder for future SIP/VoIP integration
 *
 * For now, it can:
 * - Option A: Open a dedicated intercom app via deep link
 * - Option B: Use WebRTC for SIP calling (requires implementation)
 * - Option C: Just show a visual indicator that call is being made
 */
export function initiateIntercomCall(unitNumber: string, unitBlock?: string): void {
  const unitIdentifier = unitBlock ? `${unitBlock}-${unitNumber}` : unitNumber;

  // TODO: Implement actual intercom integration
  // Options:
  // 1. SIP Call via WebRTC: sip:unit-123@intercom.condo.local
  // 2. Deep link to intercom app: intercom://call?unit=123
  // 3. HTTP request to intercom system API

  // For now, show confirmation that intercom is being activated
  alert(`🔔 Chamando interfone da unidade ${unitIdentifier}\n\nAguarde conexão...`);

  // Example: If using SIP protocol
  // window.location.href = `sip:unit-${unitNumber}@intercom.local`;

  // Example: If using custom intercom app
  // window.location.href = `intercom://call?unit=${unitNumber}&block=${unitBlock}`;
}

/**
 * Get resident phone numbers from a unit
 */
export function getResidentPhones(unit: any): string[] {
  if (!unit || !unit.residents) return [];
  return unit.residents
    .map((r: any) => r.phone)
    .filter((phone: string) => phone && phone.trim() !== '');
}
