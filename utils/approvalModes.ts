import { ApprovalMode, ApprovalModeConfig } from '../types';

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
 * - ONLINE + Resident HAS App: Show only APP
 * - ONLINE + Resident NO App: Show only PHONE, INTERCOM, GUARD_MANUAL
 * - OFFLINE: Show only PHONE, INTERCOM, GUARD_MANUAL
 */
export function getAvailableApprovalModes(isOnline: boolean, unit?: any): ApprovalModeConfig[] {
  // Check if any resident in the unit has the app installed
  const hasAppInstalled = unit?.residents?.some(
    (r: any) => r.has_app_installed === true || r.device_token
  ) || false;

  if (isOnline) {
    if (hasAppInstalled) {
      // ONLINE + Resident HAS App: Show ONLY Aplicativo
      return APPROVAL_MODE_CONFIGS.filter(config =>
        config.mode === ApprovalMode.APP
      );
    } else {
      // ONLINE + Resident NO App: Show only local methods
      // (APP wouldn't work anyway, so don't show it)
      return APPROVAL_MODE_CONFIGS.filter(config =>
        config.mode === ApprovalMode.PHONE ||
        config.mode === ApprovalMode.INTERCOM ||
        config.mode === ApprovalMode.GUARD_MANUAL
      );
    }
  } else {
    // OFFLINE: Show only local methods
    return APPROVAL_MODE_CONFIGS.filter(config =>
      config.mode === ApprovalMode.PHONE ||
      config.mode === ApprovalMode.INTERCOM ||
      config.mode === ApprovalMode.GUARD_MANUAL
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

  // Clean phone number (remove spaces, dashes, etc.)
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');

  // Use a temporary <a> element — most reliable way to trigger
  // tel: protocol on Android tablets and PWAs
  const link = document.createElement('a');
  link.href = `tel:${cleanNumber}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
