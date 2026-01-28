
export enum UserRole {
  ADMIN = 'ADMIN',
  GUARD = 'GUARD',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum VisitType {
  VISITOR = 'VISITANTE',
  DELIVERY = 'ENTREGA',
  SERVICE = 'SERVIÇO',
  STUDENT = 'ESTUDANTE'
}

export enum VisitStatus {
  PENDING = 'PENDENTE',
  APPROVED = 'AUTORIZADO',
  DENIED = 'NEGADO',
  INSIDE = 'NO INTERIOR',
  LEFT = 'SAIU'
}

export enum SyncStatus {
  SYNCED = 'SINCRONIZADO',
  PENDING_SYNC = 'PENDENTE_ENVIO'
}

export enum ApprovalMode {
  APP = 'APP',
  PHONE = 'TELEFONE',
  INTERCOM = 'INTERFONE',
  GUARD_MANUAL = 'MANUAL_PORTARIA',
  QR_SCAN = 'QR_CODE'
}

export interface ApprovalModeConfig {
  mode: ApprovalMode;
  label: string;
  description: string;
  requiresOnline: boolean;
  hasCallAction?: boolean; // True if mode can initiate a call (PHONE, INTERCOM)
  icon: string;
  color: string; // Tailwind color class
}

export interface Condominium {
  id: number;                // SERIAL in Supabase
  created_at?: string;
  name: string;
  address?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  gps_radius_meters?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  phone_number?: string;
}

export interface Street {
  id: number;
  condominium_id: number;
  name: string;
}

export interface Device {
  id?: string;               // UUID in Supabase
  created_at?: string;
  device_identifier: string;
  device_name?: string;
  condominium_id?: number;   // INT4 - matches Condominium.id
  configured_at?: string;
  last_seen_at?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';
  metadata?: any;
}


export interface Staff {
  id: number;                // SERIAL in Supabase
  first_name: string;
  last_name: string;
  pin_hash?: string;         // Opcional no retorno do login RPC por segurança
  condominium_id: number;    // INT4
  condominium?: Condominium; // Dados completos do condomínio (incluindo GPS)
  role: UserRole;
  photo_url?: string;        // URL da foto do staff (bucket: staff-photos)
}

export interface Resident {
  id: number;
  condominium_id: number;
  unit_id: number;
  name: string;
  phone?: string;
  email?: string;
  type?: 'OWNER' | 'TENANT';
  created_at?: string;
  // App authentication
  pin_hash?: string;                 // bcrypt hash of resident's PIN (for app login)
  // App installation tracking (integration with resident app)
  has_app_installed?: boolean;      // True if resident has logged into app at least once
  device_token?: string;             // Push notification token (if app installed)
  app_first_login_at?: string;       // First time resident logged into app
  app_last_seen_at?: string;         // Last activity in app
}

export interface Unit {
  id: number;
  condominium_id: number;
  code_block?: string;
  number: string;
  floor?: string;
  building_name?: string;
  created_at?: string;
  residents?: Resident[]; // Optional: Only populated when fetched online with residents
}

export interface VisitTypeConfig {
  id: number;                     // SERIAL in Supabase
  name: string;
  icon_key: string;
  requires_service_type: boolean;
  requires_restaurant?: boolean;  // True for restaurant visits
  requires_sport?: boolean;       // True for sport visits
}

export interface ServiceTypeConfig {
  id: number;                     // SERIAL in Supabase
  name: string;
}

export interface Restaurant {
  id: string;             // UUID in Supabase
  condominium_id: number; // INT4
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface Sport {
  id: string;             // UUID in Supabase
  condominium_id: number; // INT4
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface Visit {
  id: number;                    // SERIAL in Supabase
  created_at?: string;           // timestamptz
  condominium_id: number;        // INT4
  visitor_name: string;
  visitor_doc?: string;
  visitor_phone?: string;
  vehicle_license_plate?: string;  // Matrícula do veículo (opcional)

  // For display purposes (fetched via joins)
  visit_type?: string;           // Nome do tipo (para exibição)
  visit_type_id: number;         // INT4 NOT NULL (references visit_types)

  service_type?: string;         // Nome do serviço (para exibição)
  service_type_id?: number;      // INT4 (references service_types)

  restaurant_id?: string;        // UUID for restaurant visits
  restaurant_name?: string;      // Nome do restaurante (para exibição)

  sport_id?: string;             // UUID for sport visits
  sport_name?: string;           // Nome do desporto (para exibição)

  unit_id?: number;              // INT4 (references units) - optional for restaurant/sport visits
  unit_block?: string;           // Bloco da unidade (para exibição)
  unit_number?: string;          // Número da unidade (para exibição)
  reason?: string;
  photo_url?: string;
  qr_token?: string;
  qr_expires_at?: string;        // timestamptz
  check_in_at: string;           // timestamptz
  check_out_at?: string;         // timestamptz
  status: VisitStatus;
  approval_mode?: ApprovalMode;
  guard_id: number;              // INT4 (references staff)
  device_id?: string;            // UUID (references devices) - tracks which device registered this visit
  sync_status: SyncStatus;       // 'SINCRONIZADO' or 'PENDENTE_ENVIO'
}

export interface VisitEvent {
  id?: number;                   // SERIAL in Supabase
  created_at?: string;           // timestamptz
  visit_id: number;              // INT4 (references visits)
  status: VisitStatus;
  event_at: string;              // timestamptz
  actor_id?: number;             // INT4 (references staff)
  device_id?: string;            // UUID (references devices)
  sync_status: SyncStatus;       // 'SINCRONIZADO' or 'PENDENTE_ENVIO'
}

export interface IncidentType {
  code: string;                  // Primary key
  label: string;                 // Display name
  sort_order?: number;
}

export interface IncidentStatus {
  code: string;                  // Primary key
  label: string;                 // Display name
  sort_order?: number;
}

export interface Incident {
  id: string;                    // UUID in Supabase
  reported_at: string;           // timestamptz
  resident_id: number;           // INT4 (references residents)
  resident?: Resident;           // Populated from join
  unit?: Unit;                   // Populated from join (includes block and number)
  description: string;
  type: string;                  // text (references incident_types.code)
  type_label?: string;           // Label from incident_types (for display)
  status: string;                // text (references incident_statuses.code)
  status_label?: string;         // Label from incident_statuses (for display)
  photo_path?: string;
  acknowledged_at?: string;      // timestamptz
  acknowledged_by?: number;      // INT4 (references staff)
  guard_notes?: string;          // TEXT - Guard's action report
  resolved_at?: string;          // timestamptz - When guard closed/resolved
  sync_status?: SyncStatus;      // For offline support
}

export interface AuditLog {
  id: number;
  created_at: string;
  condominium_id: number;
  condominium?: Condominium;     // Joined condominium data
  actor_id: number | null;
  actor?: Staff;                 // Joined staff data (who performed the action)
  action: string;                // CREATE, UPDATE, DELETE, etc.
  target_table: string;          // Table name (condominiums, visits, incidents, etc.)
  target_id: number | null;      // ID of the affected record
  details: any;                  // JSON details about the change
}

export interface DeviceRegistrationError {
  id: number;
  created_at: string;
  device_identifier?: string | null;
  error_message: string;
  payload?: any;
}

export interface CondominiumStats {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  total_visits_today: number;       // Count of all visits today
  total_incidents_open: number;     // Count of open/acknowledged incidents
  status: 'ACTIVE' | 'INACTIVE';
}

export enum Theme {
  ELITE = 'ELITE',
  MIDNIGHT = 'MIDNIGHT'
}

// Photo quality levels for compression (data saving)
export enum PhotoQuality {
  HIGH = 'HIGH',       // 0.75 scale, 0.85 JPEG quality (~300KB)
  MEDIUM = 'MEDIUM',   // 0.50 scale, 0.70 JPEG quality (~150KB)
  LOW = 'LOW'          // 0.25 scale, 0.50 JPEG quality (~50KB)
}
