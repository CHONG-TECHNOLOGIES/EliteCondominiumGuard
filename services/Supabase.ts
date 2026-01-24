

import { supabase } from './supabaseClient';
import { Staff, Visit, VisitEvent, VisitStatus, Unit, Incident, IncidentType, IncidentStatus, VisitTypeConfig, ServiceTypeConfig, Condominium, CondominiumStats, Device, Restaurant, Sport, AuditLog, DeviceRegistrationError, Street } from '../types';

/**
 * Serviço Real de API Supabase
 * Responsável apenas pela comunicação direta com o Backend.
 * Não gere estado offline ou local storage.
 */
export const SupabaseService = {

  // --- Setup / Condomínio ---
  async getCondominium(condoId: number): Promise<Condominium | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_condominium', { p_id: condoId })
        .single();

      if (error) throw error;
      return data as Condominium;
    } catch (err: any) {
      console.error("Error getting condo:", err.message || JSON.stringify(err));
      return null;
    }
  },

  async listActiveCondominiums(): Promise<Condominium[]> {
    if (!supabase) return [];

    try {
      // Use RPC to get all condominiums, then filter in memory
      const { data, error } = await supabase
        .rpc('get_condominiums');

      if (error) throw error;

      // Filter for ACTIVE status and sort by name
      const activeCondos = (data as Condominium[] || [])
        .filter(c => c.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name));

      return activeCondos;

    } catch (err: any) {
      console.error("Error listing condos:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getStreets(condoId: number): Promise<any[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_streets', { p_condominium_id: condoId });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error("Error getting streets:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async addStreet(condoId: number, name: string): Promise<any | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('create_street', {
          p_data: { condominium_id: condoId, name }
        });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("Error adding street:", err.message || JSON.stringify(err));
      return null;
    }
  },

  async removeStreet(streetId: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('delete_street', { p_id: streetId });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Error removing street:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- Auth Segura ---
  async verifyStaffLogin(firstName: string, lastName: string, pin: string): Promise<Staff | null> {
    if (!supabase) return null;

    try {
      // Chama a RPC function que compara o PIN com o Hash na BD
      const { data, error } = await supabase.rpc('verify_staff_login', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_pin: pin
      });

      if (error) throw error;
      return data as Staff | null;

    } catch (err: any) {
      console.error('Supabase Login RPC Error:', err.message || JSON.stringify(err));
      return null;
    }
  },

  // --- Configurações ---
  async getVisitTypes(condoId: number): Promise<VisitTypeConfig[]> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('get_visit_types', { p_condominium_id: condoId });

      if (error) throw error;
      const visitTypes = (data as VisitTypeConfig[]) || [];
      return visitTypes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[SupabaseService] Error getting visit types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getServiceTypes(): Promise<ServiceTypeConfig[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_service_types');

      if (error) throw error;
      const serviceTypes = (data as ServiceTypeConfig[]) || [];
      return serviceTypes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("Error getting service types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getRestaurants(condoId: number): Promise<Restaurant[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_restaurants', { p_condominium_id: condoId });

      if (error) throw error;
      const restaurants = (data as Restaurant[]) || [];
      return restaurants
        .filter((restaurant) => restaurant.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[SupabaseService] Error getting restaurants:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getSports(condoId: number): Promise<Sport[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_sports', { p_condominium_id: condoId });

      if (error) throw error;
      const sports = (data as Sport[]) || [];
      return sports
        .filter((sport) => sport.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[SupabaseService] Error getting sports:", err.message || JSON.stringify(err));
      return [];
    }
  },

  // --- Unidades & Residentes ---
  // FIX: Added missing getStaffForSync method to fetch staff data for offline caching.
  async getStaffForSync(condoId: number): Promise<Staff[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .rpc('get_staff_by_condominium', { p_condominium_id: condoId });

      if (error) throw error;
      return (data as Staff[]) || [];
    } catch (err: any) {
      console.error("Error syncing staff:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getUnitsWithResidents(condoId: number): Promise<Unit[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_units', { p_condominium_id: condoId });

      if (error) throw error;
      return (data as Unit[]) || [];
    } catch (err: any) {
      console.error("Error fetching units:", err.message || JSON.stringify(err));
      return [];
    }
  },

  // --- Visitas ---
  async getTodaysVisits(condoId: number): Promise<Visit[]> {
    if (!supabase) return [];

    try {
      const normalizedCondoId = Number(condoId);
      if (!Number.isInteger(normalizedCondoId)) {
        console.error("Error fetching visits: invalid condominium_id", {
          condoId,
          type: typeof condoId
        });
        return [];
      }

      // Use RPC to get visits (RPC already returns joined fields)
      const { data, error } = await supabase
        .rpc('get_todays_visits', { p_condominium_id: normalizedCondoId });

      if (error) throw error;

      return (data || []).map((v: any) => ({
        ...v,
        visit_type: v.visit_type_name || 'Desconhecido',
        service_type: v.service_type_name,
        restaurant_name: v.restaurant_name,
        sport_name: v.sport_name,
        unit_block: v.unit_block,
        unit_number: v.unit_number,
        sync_status: 'SINCRONIZADO'
      }));
    } catch (err: any) {
      console.error("Error fetching visits:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async createVisit(visit: any): Promise<Visit | null> {
    if (!supabase) return null;

    // Remove display-only fields and sync_status before sending to Supabase
    const { visit_type, service_type, sync_status, id, created_at, ...payload } = visit;

    // Clean up: convert empty strings to null for optional fields
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    const normalizedPayload = { ...cleanedPayload } as Record<string, any>;
    if (normalizedPayload.restaurant_id !== null && normalizedPayload.restaurant_id !== undefined) {
      normalizedPayload.restaurant_id = String(normalizedPayload.restaurant_id);
    }
    if (normalizedPayload.sport_id !== null && normalizedPayload.sport_id !== undefined) {
      normalizedPayload.sport_id = String(normalizedPayload.sport_id);
    }

    try {
      const { data, error } = await supabase
        .rpc('create_visit', { p_data: normalizedPayload });

      if (error) throw error;
      return data as Visit;
    } catch (err: any) {
      console.error("Create Visit Error:", err.message || JSON.stringify(err));
      return null;
    }
  },

  async updateVisit(visitId: number, updates: any): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_update_visit', { p_id: visitId, p_data: updates });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Update Visit Error:", err.message || JSON.stringify(err));
      return false;
    }
  },

  async updateVisitStatus(visitId: number, status: string, checkOutAt?: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      if (checkOutAt || status === 'LEFT') {
        const { error } = await supabase
          .rpc('checkout_visit', { p_id: visitId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .rpc('update_visit_status', { p_id: visitId, p_status: status });
        if (error) throw error;
      }
      return true;
    } catch (err: any) {
      console.error("Update Visit Status Error:", err.message || JSON.stringify(err));
      return false;
    }
  },

  async createVisitEvent(event: VisitEvent): Promise<VisitEvent | null> {
    if (!supabase) return null;

    const { sync_status, id, created_at, ...payload } = event;
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    try {
      const { data, error } = await supabase
        .rpc('create_visit_event', { p_data: cleanedPayload });

      if (error) throw error;
      return data as VisitEvent;
    } catch (err: any) {
      console.error("Create Visit Event Error:", err.message || JSON.stringify(err));
      return null;
    }
  },

  async getVisitEvents(visitId: number): Promise<VisitEvent[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_visit_events', { p_visit_id: visitId });

      if (error) throw error;
      return (data as VisitEvent[]) || [];
    } catch (err: any) {
      console.error("Get Visit Events Error:", err.message || JSON.stringify(err));
      return [];
    }
  },

  // --- Logs e Outros ---
  async logAudit(entry: any) {
    if (!supabase) return;
    supabase
      .rpc('create_audit_log', { p_data: entry })
      .then(({ error }) => {
        if (error) console.error("Audit Log Error:", error.message || JSON.stringify(error));
      });
  },

  // --- Incidents ---
  async getIncidentTypes(): Promise<IncidentType[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_incident_types');

      if (error) throw error;
      const incidentTypes = (data as IncidentType[]) || [];
      return incidentTypes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch (err: any) {
      console.error("Error fetching incident types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getIncidentStatuses(): Promise<IncidentStatus[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_incident_statuses');

      if (error) throw error;
      const incidentStatuses = (data as IncidentStatus[]) || [];
      return incidentStatuses.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch (err: any) {
      console.error("Error fetching incident statuses:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getIncidents(condoId: number): Promise<Incident[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_incidents', { p_condominium_id: condoId });

      if (error) throw error;

      // Transform the data to flatten joins
      return (data || []).map((inc: any) => ({
        ...inc,
        resident: inc.residents,
        unit: inc.residents?.units,
        type_label: inc.incident_types?.label,
        status_label: inc.incident_statuses?.label
      }));
    } catch (err: any) {
      console.error("Error fetching incidents:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async acknowledgeIncident(id: number, staffId: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .rpc('acknowledge_incident', { p_id: id, p_guard_id: staffId });

      if (error) throw error;

      // Create notification for resident
      const incident = Array.isArray(data) ? data[0] : data;
      if (!incident) return false;

      await this.createIncidentReadNotification(incident);

      return true;
    } catch (err: any) {
      console.error("Error acknowledging incident:", err.message || JSON.stringify(err));
      return false;
    }
  },

  async reportIncidentAction(id: number, guardNotes: string, newStatus: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Concatenate new notes with existing notes to preserve history
      const timestamp = new Date().toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const formattedNewNote = `[${timestamp}] ${guardNotes}`;

      const { error } = await supabase
        .rpc('update_incident_status', {
          p_id: id,
          p_status: newStatus,
          p_notes: formattedNewNote
        });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Error reporting incident action:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- Device Management ---
  async registerDevice(device: Device): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('register_device', {
          p_data: {
            device_identifier: device.device_identifier,
            device_name: device.device_name,
            condominium_id: device.condominium_id,
            configured_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            status: 'ACTIVE',
            metadata: device.metadata
          }
        });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Device registration error:", err.message || JSON.stringify(err));
      return false;
    }
  },

  async updateDeviceHeartbeat(deviceIdentifier: string): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .rpc('update_device_heartbeat', { p_identifier: deviceIdentifier });

      if (error) throw error;
    } catch (err: any) {
      console.error("Heartbeat update error:", err.message || JSON.stringify(err));
    }
  },

  /**
   * Decommission current device (self-decommission)
   * Sets device status to DECOMMISSIONED and removes condominium association
   */
  async decommissionDevice(deviceIdentifier: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data: devices, error: fetchError } = await supabase
        .rpc('get_device', { p_identifier: deviceIdentifier });

      if (fetchError) throw fetchError;

      const device = Array.isArray(devices) ? devices[0] : devices;
      if (!device?.id) return false;

      const { error } = await supabase
        .rpc('update_device_status', {
          p_id: device.id,
          p_status: 'DECOMMISSIONED'
        });

      if (error) throw error;
      console.log('[Supabase] Device decommissioned:', deviceIdentifier);
      return true;
    } catch (err: any) {
      console.error("Decommission device error:", err.message || JSON.stringify(err));
      return false;
    }
  },

  async deactivateCondoDevices(condoId: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('deactivate_condo_devices', { p_condominium_id: condoId });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Deactivate devices error:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- Photo Upload ---
  /**
   * Uploads a visitor photo to Supabase Storage
   * @param photoDataUrl - Base64 data URL from camera capture (data:image/jpeg;base64,...)
   * @param condoId - Condominium ID for organizing photos
   * @param visitorName - Visitor name for filename
   * @returns Public URL of the uploaded photo, or null if upload fails
   */
  async uploadVisitorPhoto(photoDataUrl: string, condoId: number, visitorName: string): Promise<string | null> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return null;
    }

    try {
      console.log('[SupabaseService] Starting photo upload for visitor:', visitorName);

      // Convert base64 data URL to Blob
      const base64Data = photoDataUrl.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid photo data URL - missing base64 data');
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      console.log('[SupabaseService] Photo blob created:', blob.size, 'bytes');

      // Generate unique filename: condo_id/timestamp_visitorname.jpg
      const timestamp = Date.now();
      const sanitizedName = visitorName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${condoId}/${timestamp}_${sanitizedName}.jpg`;

      console.log('[SupabaseService] Uploading to path:', fileName);

      // Upload to Supabase Storage bucket 'visitor-photos'
      const { data, error } = await supabase.storage
        .from('visitor-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[SupabaseService] Upload error details:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw error;
      }

      console.log('[SupabaseService] Upload successful, getting public URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(fileName);

      console.log('[SupabaseService] Photo uploaded successfully:', publicUrl);
      return publicUrl;

    } catch (err: any) {
      console.error('[SupabaseService] Photo upload error:', {
        message: err.message,
        error: err,
        stack: err.stack
      });
      return null;
    }
  },

  /**
   * Uploads a condominium logo to Supabase Storage
   * @param file - Image file (png/jpg/jpeg)
   * @returns Public URL of the uploaded logo, or null if upload fails
   */
  async uploadCondoLogo(file: File): Promise<string | null> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return null;
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `condo-logos/${Date.now()}_${sanitizedName}`;

      const { error } = await supabase.storage
        .from('logo_condominio')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('logo_condominio')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error('[SupabaseService] Logo upload error:', err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Uploads a staff photo to Supabase Storage
   * @param photoDataUrl - Base64 data URL of the photo
   * @param staffName - Name of the staff member (for filename)
   * @param condoId - Condominium ID (for folder organization)
   * @returns Public URL of the uploaded photo, or null if upload fails
   */
  async uploadStaffPhoto(photoDataUrl: string, staffName: string, condoId?: number): Promise<string | null> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return null;
    }

    try {
      console.log('[SupabaseService] Starting photo upload for staff:', staffName);

      // Convert base64 data URL to Blob
      const base64Data = photoDataUrl.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid photo data URL - missing base64 data');
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      console.log('[SupabaseService] Staff photo blob created:', blob.size, 'bytes');

      // Generate unique filename: condo_id/timestamp_staffname.jpg or global/timestamp_staffname.jpg
      const timestamp = Date.now();
      const sanitizedName = staffName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const folder = condoId ? condoId.toString() : 'global';
      const fileName = `${folder}/${timestamp}_${sanitizedName}.jpg`;

      console.log('[SupabaseService] Uploading staff photo to path:', fileName);

      // Upload to Supabase Storage bucket 'staff-photos'
      const { data, error } = await supabase.storage
        .from('staff-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[SupabaseService] Staff photo upload error details:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw error;
      }

      console.log('[SupabaseService] Staff photo upload successful, getting public URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-photos')
        .getPublicUrl(fileName);

      console.log('[SupabaseService] Staff photo uploaded successfully:', publicUrl);
      return publicUrl;

    } catch (err: any) {
      console.error('[SupabaseService] Staff photo upload error:', {
        message: err.message,
        error: err,
        stack: err.stack
      });
      return null;
    }
  },

  async getDeviceByIdentifier(deviceIdentifier: string): Promise<Device | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_device', { p_identifier: deviceIdentifier });

      if (error) throw error;

      const device = Array.isArray(data) ? data[0] : data;
      return (device as Device) || null;
    } catch (err: any) {
      console.error("Get device error:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Check if a condominium is already assigned to any active device
   * @param condoId - Condominium ID to check
   * @param excludeDeviceIdentifier - Optional device identifier to exclude from check (for reconfiguration)
   * @returns Array of active devices assigned to this condominium
   */
  async getActiveDevicesByCondominium(condoId: number, excludeDeviceIdentifier?: string): Promise<Device[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_devices_by_condominium', { p_condominium_id: condoId });

      if (error) throw error;

      const devices = (data as Device[]) || [];
      return devices.filter((device) => {
        if (device.status !== 'ACTIVE') return false;
        if (!excludeDeviceIdentifier) return true;
        return device.device_identifier !== excludeDeviceIdentifier;
      });
    } catch (err: any) {
      console.error("Get devices by condominium error:", err.message || JSON.stringify(err));
      return [];
    }
  },

  // --- ADMIN METHODS (Cross-Condominium Access) ---

  /**
   * Admin: Get all visits across all condominiums with optional filters
   * Uses RPC function for better performance and security
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @param condominiumId - Optional condominium filter
   */
  async adminGetAllVisits(startDate?: string, endDate?: string, condominiumId?: number): Promise<Visit[]> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return [];
    }

    try {
      console.log('[SupabaseService] Calling admin_get_all_visits RPC with params:', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_condominium_id: condominiumId || null
      });

      const { data, error } = await supabase.rpc('admin_get_all_visits', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_condominium_id: condominiumId || null
      });

      if (error) {
        console.error('[SupabaseService] RPC error:', error);
        throw error;
      }

      console.log('[SupabaseService] RPC returned:', data?.length || 0, 'visits');
      if (data && data.length > 0) {
        console.log('[SupabaseService] Sample visit:', data[0]);
      }

      return (data || []) as Visit[];
    } catch (err: any) {
      console.error("[SupabaseService] Error fetching visits via RPC:", {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        fullError: err
      });
      return [];
    }
  },

  /**
   * Admin: Get all visits with full filtering (for long date ranges >= 6 months)
   * Uses RPC function with backend filtering for better performance
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @param condominiumId - Optional condominium filter
   * @param visitType - Optional visit type name filter
   * @param serviceType - Optional service type name filter
   * @param status - Optional status filter
   */
  async adminGetAllVisitsFiltered(
    startDate?: string,
    endDate?: string,
    condominiumId?: number,
    visitType?: string,
    serviceType?: string,
    status?: string
  ): Promise<Visit[]> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return [];
    }

    try {
      console.log('[SupabaseService] Calling admin_get_all_visits_filtered RPC with params:', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_condominium_id: condominiumId || null,
        p_visit_type: visitType || null,
        p_service_type: serviceType || null,
        p_status: status || null
      });

      const { data, error } = await supabase.rpc('admin_get_all_visits_filtered', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_condominium_id: condominiumId || null,
        p_visit_type: visitType || null,
        p_service_type: serviceType || null,
        p_status: status || null
      });

      if (error) {
        console.error('[SupabaseService] RPC error:', error);
        throw error;
      }

      console.log('[SupabaseService] RPC returned:', data?.length || 0, 'filtered visits');
      return (data || []) as Visit[];
    } catch (err: any) {
      console.error('[SupabaseService] Error fetching filtered visits via RPC:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      return [];
    }
  },

  /**
   * Admin: Get all incidents across all condominiums
   * Uses RPC function for better performance and security
   * @param condominiumId - Optional condominium filter
   */
  async adminGetAllIncidents(condominiumId?: number): Promise<Incident[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase.rpc('admin_get_all_incidents', {
        p_condominium_id: condominiumId || null
      });

      if (error) throw error;

      // Debug: Log first incident to see actual structure
      if (data && data.length > 0) {
        console.log('[Admin] Sample incident from RPC:', JSON.stringify(data[0], null, 2));
        console.log('[Admin] All keys:', Object.keys(data[0]));
      }

      // Try direct cast first (like adminGetAllVisits does)
      // The RPC should return the correct structure with nested objects
      return (data || []) as Incident[];
    } catch (err: any) {
      console.error("[Admin] Error fetching incidents via RPC:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Get all units across all condominiums
   * Uses RPC function for better performance and security
   * @param condominiumId - Optional condominium filter
   */
  async adminGetAllUnits(condominiumId?: number): Promise<Unit[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase.rpc('admin_get_all_units', {
        p_condominium_id: condominiumId || null
      });

      if (error) throw error;

      // RPC returns residents as JSONB, convert to array
      return (data || []).map((unit: any) => ({
        ...unit,
        residents: unit.residents || []
      })) as Unit[];
    } catch (err: any) {
      console.error("[Admin] Error fetching units via RPC:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Get all staff across all condominiums
   * Uses RPC function for better performance and security
   * @param condominiumId - Optional condominium filter
   */
  async adminGetAllStaff(condominiumId?: number): Promise<Staff[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase.rpc('admin_get_all_staff', {
        p_condominium_id: condominiumId || null
      });

      if (error) throw error;
      return (data as Staff[]) || [];
    } catch (err: any) {
      console.error("[Admin] Error fetching staff via RPC:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Get aggregated dashboard statistics
   * Uses RPC function for efficient single-query aggregation
   */
  async adminGetDashboardStats(): Promise<{
    totalCondominiums: number;
    activeCondominiums: number;
    totalDevices: number;
    activeDevices: number;
    totalStaff: number;
    totalUnits: number;
    totalResidents: number;
    todayVisits: number;
    pendingVisits: number;
    insideVisits: number;
    activeIncidents: number;
    totalIncidents: number;
    resolvedIncidents: number;
  } | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats');

      if (error) throw error;

      if (!data || data.length === 0) return null;

      const stats = data[0];
      return {
        totalCondominiums: stats.total_condominiums,
        activeCondominiums: stats.active_condominiums,
        totalDevices: stats.total_devices,
        activeDevices: stats.active_devices,
        totalStaff: stats.total_staff,
        totalUnits: stats.total_units,
        totalResidents: stats.total_residents,
        todayVisits: stats.today_visits,
        pendingVisits: stats.pending_visits,
        insideVisits: stats.inside_visits,
        activeIncidents: stats.active_incidents,
        totalIncidents: stats.total_incidents,
        resolvedIncidents: stats.resolved_incidents
      };
    } catch (err: any) {
      console.error("[Admin] Error fetching dashboard stats via RPC:", err.message || JSON.stringify(err));
      return null;
    }
  },

  // --- ADMIN CRUD OPERATIONS ---

  /**
   * Admin: Create a new condominium
   */
  async adminCreateCondominium(condo: Partial<Condominium>): Promise<Condominium | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_condominium', {
          p_data: {
            name: condo.name,
            address: condo.address,
            logo_url: condo.logo_url,
            latitude: condo.latitude,
            longitude: condo.longitude,
            gps_radius_meters: condo.gps_radius_meters,
            status: condo.status || 'ACTIVE'
          }
        });

      if (error) throw error;
      return data as Condominium;
    } catch (err: any) {
      console.error("[Admin] Error creating condominium:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing condominium
   */
  async adminUpdateCondominium(id: number, updates: Partial<Condominium>): Promise<Condominium | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_condominium', {
          p_id: id,
          p_data: updates
        });

      if (error) throw error;
      return data as Condominium;
    } catch (err: any) {
      console.error("[Admin] Error updating condominium:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Disable/Enable a condominium (soft delete)
   */
  async adminToggleCondominiumStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_update_condominium', {
          p_id: id,
          p_data: { status }
        });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error toggling condominium status:", err.message || JSON.stringify(err));
      return false;
    }
  },

  /**
   * Admin: Update a device
   */
  async adminUpdateDevice(id: string, updates: Partial<Device>): Promise<Device | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_device', {
          p_id: id,
          p_data: updates
        });

      if (error) throw error;
      return data as Device;
    } catch (err: any) {
      console.error("[Admin] Error updating device:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Decommission a device
   */
  async adminDecommissionDevice(id: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_device', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error decommissioning device:", err.message || JSON.stringify(err));
      return false;
    }
  },

  /**
   * Admin: Get all devices (cross-condominium)
   */
  async adminGetAllDevices(condominiumId?: number): Promise<Device[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_all_devices');

      if (error) throw error;
      const devices = (data as Device[]) || [];
      if (!condominiumId) return devices;
      return devices.filter((device) => device.condominium_id === condominiumId);
    } catch (err: any) {
      console.error("[Admin] Error fetching devices:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Create a new staff member
   */
  async adminCreateStaff(staff: Partial<Staff>): Promise<Staff | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_staff', {
          p_data: {
            first_name: staff.first_name,
            last_name: staff.last_name,
            condominium_id: staff.condominium_id,
            role: staff.role,
            pin_hash: staff.pin_hash
          }
        });

      if (error) throw error;
      return data as Staff;
    } catch (err: any) {
      console.error("[Admin] Error creating staff:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing staff member
   */
  async adminUpdateStaff(id: number, updates: Partial<Staff>): Promise<Staff | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_staff', { p_id: id, p_data: updates });

      if (error) throw error;
      return data as Staff;
    } catch (err: any) {
      console.error("[Admin] Error updating staff:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a staff member
   */
  async adminDeleteStaff(id: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_staff', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting staff:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- UNITS CRUD ---

  /**
   * Admin: Create a new unit
   */
  async adminCreateUnit(unit: Partial<Unit>): Promise<Unit | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_unit', {
          p_data: {
            condominium_id: unit.condominium_id,
            code_block: unit.code_block,
            number: unit.number,
            floor: unit.floor,
            building_name: unit.building_name
          }
        });

      if (error) throw error;
      return data as Unit;
    } catch (err: any) {
      console.error("[Admin] Error creating unit:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing unit
   */
  async adminUpdateUnit(id: string, updates: Partial<Unit>): Promise<Unit | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_unit', { p_id: parseInt(id), p_data: updates });

      if (error) throw error;
      return data as Unit;
    } catch (err: any) {
      console.error("[Admin] Error updating unit:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a unit
   */
  async adminDeleteUnit(id: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_unit', { p_id: parseInt(id) });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting unit:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- RESIDENTS CRUD ---

  /**
   * Admin: Get all residents (cross-condominium)
   */
  async adminGetAllResidents(condominiumId?: number): Promise<any[]> {
    if (!supabase) return [];

    try {
      if (condominiumId == null) {
        const { data: condos, error: condoError } = await supabase
          .rpc('get_condominiums');

        if (condoError) throw condoError;

        const condoList = (condos as Condominium[]) || [];
        if (condoList.length === 0) return [];

        const results = await Promise.all(
          condoList.map((condo) =>
            supabase.rpc('admin_get_residents', { p_condominium_id: condo.id })
          )
        );

        const combined: any[] = [];
        for (const result of results) {
          if (result.error) throw result.error;
          combined.push(...(result.data || []));
        }

        return combined;
      }

      const { data, error } = await supabase
        .rpc('admin_get_residents', { p_condominium_id: condominiumId });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error("[Admin] Error fetching residents:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Create a new resident
   */
  async adminCreateResident(resident: any): Promise<any | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_resident', {
          p_data: {
            name: resident.name,
            email: resident.email,
            phone: resident.phone,
            condominium_id: resident.condominium_id,
            unit_id: resident.unit_id
          }
        });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("[Admin] Error creating resident:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing resident
   */
  async adminUpdateResident(id: string, updates: any): Promise<any | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_resident', { p_id: parseInt(id), p_data: updates });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("[Admin] Error updating resident:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a resident
   */
  async adminDeleteResident(id: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_resident', { p_id: parseInt(id) });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting resident:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- RESTAURANTS CRUD ---

  /**
   * Admin: Get all restaurants (cross-condominium)
   */
  async adminGetAllRestaurants(condominiumId?: number): Promise<Restaurant[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_restaurants');

      if (error) throw error;
      const restaurants = (data as Restaurant[]) || [];
      return restaurants
        .filter((restaurant) => !condominiumId || restaurant.condominium_id === condominiumId)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[Admin] Error fetching restaurants:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Create a new restaurant
   */
  async adminCreateRestaurant(restaurant: Partial<Restaurant>): Promise<Restaurant | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_restaurant', {
          p_data: {
            name: restaurant.name,
            description: restaurant.description,
            condominium_id: restaurant.condominium_id,
            status: restaurant.status || 'ACTIVE'
          }
        });

      if (error) throw error;
      return data as Restaurant;
    } catch (err: any) {
      console.error("[Admin] Error creating restaurant:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing restaurant
   */
  async adminUpdateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_restaurant', { p_id: id, p_data: updates });

      if (error) throw error;
      return data as Restaurant;
    } catch (err: any) {
      console.error("[Admin] Error updating restaurant:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a restaurant
   */
  async adminDeleteRestaurant(id: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_restaurant', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting restaurant:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- SPORTS CRUD ---

  /**
   * Admin: Get all sports facilities (cross-condominium)
   */
  async adminGetAllSports(condominiumId?: number): Promise<Sport[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_sports');

      if (error) throw error;
      const sports = (data as Sport[]) || [];
      return sports
        .filter((sport) => !condominiumId || sport.condominium_id === condominiumId)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[Admin] Error fetching sports:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Create a new sport facility
   */
  async adminCreateSport(sport: Partial<Sport>): Promise<Sport | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_sport', {
          p_data: {
            name: sport.name,
            description: sport.description,
            condominium_id: sport.condominium_id,
            status: sport.status || 'ACTIVE'
          }
        });

      if (error) throw error;
      return data as Sport;
    } catch (err: any) {
      console.error("[Admin] Error creating sport:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing sport facility
   */
  async adminUpdateSport(id: string, updates: Partial<Sport>): Promise<Sport | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_sport', { p_id: id, p_data: updates });

      if (error) throw error;
      return data as Sport;
    } catch (err: any) {
      console.error("[Admin] Error updating sport:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a sport facility
   */
  async adminDeleteSport(id: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_sport', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting sport:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- VISIT OPERATIONS ---

  /**
   * Admin: Update visit status
   */
  async adminUpdateVisitStatus(id: number, status: VisitStatus): Promise<Visit | null> {
    if (!supabase) return null;

    try {
      let data, error;

      // If marking as LEFT, use checkout_visit RPC which handles check_out_at
      if (status === VisitStatus.LEFT) {
        // checkout_visit RPC sets status to LEFT and check_out_at to NOW()
        const result = await supabase
          .rpc('checkout_visit', { p_id: id });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .rpc('update_visit_status', { p_id: id, p_status: status });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const visit = data as Visit;

      // Create notifications based on status change
      if (status === VisitStatus.INSIDE) {
        // Visitor entered - create notification
        await this.createVisitorEnteredNotification(visit);
      } else if (status === VisitStatus.LEFT) {
        // Visitor left - create notification
        await this.createVisitorLeftNotification(visit);
      }

      return visit;
    } catch (err: any) {
      console.error("[Admin] Error updating visit status:", err.message || JSON.stringify(err));
      return null;
    }
  },

  // --- INCIDENT OPERATIONS ---

  /**
   * Admin: Acknowledge an incident
   */
  async adminAcknowledgeIncident(id: number, guardId: number, notes?: string): Promise<Incident | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('acknowledge_incident', { p_id: id, p_guard_id: guardId });

      if (error) throw error;

      if (notes) {
        const { data: updatedIncident, error: notesError } = await supabase
          .rpc('admin_update_incident', { p_id: id, p_data: { guard_notes: notes } });

        if (notesError) throw notesError;
        return updatedIncident as Incident;
      }

      return (Array.isArray(data) ? data[0] : data) as Incident;
    } catch (err: any) {
      console.error("[Admin] Error acknowledging incident:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Resolve an incident
   */
  async adminResolveIncident(id: number, guardId: number, notes?: string): Promise<Incident | null> {
    if (!supabase) return null;

    try {
      const timestamp = new Date().toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const formattedNotes = notes ? `[${timestamp}] ${notes}` : null;

      const { data, error } = await supabase
        .rpc('update_incident_status', {
          p_id: id,
          p_status: 'RESOLVED',
          p_notes: formattedNotes
        });

      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Incident;
    } catch (err: any) {
      console.error("[Admin] Error resolving incident:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update incident notes
   */
  async adminUpdateIncidentNotes(id: number, notes: string): Promise<Incident | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_incident', { p_id: id, p_data: { guard_notes: notes } });

      if (error) throw error;
      return data as Incident;
    } catch (err: any) {
      console.error("[Admin] Error updating incident notes:", err.message || JSON.stringify(err));
      return null;
    }
  },

  // --- VISIT TYPES CONFIGURATION ---

  /**
   * Admin: Get all visit types
   */
  async adminGetAllVisitTypes(): Promise<VisitTypeConfig[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_visit_types');

      if (error) throw error;
      const visitTypes = (data as VisitTypeConfig[]) || [];
      return visitTypes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[Admin] Error fetching visit types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Create a new visit type
   */
  async adminCreateVisitType(visitType: Partial<VisitTypeConfig>): Promise<VisitTypeConfig | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_visit_type', {
          p_data: {
            name: visitType.name,
            icon_key: visitType.icon_key || 'user',
            requires_service_type: visitType.requires_service_type || false,
            requires_restaurant: visitType.requires_restaurant || false,
            requires_sport: visitType.requires_sport || false
          }
        });

      if (error) throw error;
      return data as VisitTypeConfig;
    } catch (err: any) {
      console.error("[Admin] Error creating visit type:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing visit type
   */
  async adminUpdateVisitType(id: number, updates: Partial<VisitTypeConfig>): Promise<VisitTypeConfig | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_visit_type', { p_id: id, p_data: updates });

      if (error) throw error;
      return data as VisitTypeConfig;
    } catch (err: any) {
      console.error("[Admin] Error updating visit type:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a visit type
   */
  async adminDeleteVisitType(id: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_visit_type', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting visit type:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- SERVICE TYPES CONFIGURATION ---

  /**
   * Admin: Get all service types
   */
  async adminGetAllServiceTypes(): Promise<ServiceTypeConfig[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_service_types');

      if (error) throw error;
      const serviceTypes = (data as ServiceTypeConfig[]) || [];
      return serviceTypes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error("[Admin] Error fetching service types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  /**
   * Admin: Create a new service type
   */
  async adminCreateServiceType(serviceType: Partial<ServiceTypeConfig>): Promise<ServiceTypeConfig | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_service_type', {
          p_data: {
            name: serviceType.name
          }
        });

      if (error) throw error;
      return data as ServiceTypeConfig;
    } catch (err: any) {
      console.error("[Admin] Error creating service type:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Update an existing service type
   */
  async adminUpdateServiceType(id: number, updates: Partial<ServiceTypeConfig>): Promise<ServiceTypeConfig | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_service_type', { p_id: id, p_data: updates });

      if (error) throw error;
      return data as ServiceTypeConfig;
    } catch (err: any) {
      console.error("[Admin] Error updating service type:", err.message || JSON.stringify(err));
      return null;
    }
  },

  /**
   * Admin: Delete a service type
   */
  async adminDeleteServiceType(id: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_service_type', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("[Admin] Error deleting service type:", err.message || JSON.stringify(err));
      return false;
    }
  },

  /**
   * Fetch all condominiums with real-time statistics (visits today + open incidents)
   * Returns condominiums with latitude/longitude for map display
   */
  async adminGetCondominiumStats(): Promise<CondominiumStats[]> {
    if (!supabase) return [];

    try {
      // Fetch stats using single RPC call
      const { data, error } = await supabase
        .rpc('admin_get_condominiums_with_stats');

      if (error) throw error;
      return (data as CondominiumStats[]) || [];
    } catch (err: any) {
      console.error("[Admin] Error fetching condominium stats:", err.message || JSON.stringify(err));
      return [];
    }
  },

  // --- AUDIT LOGS ---

  /**
   * Admin: Get all audit logs with optional filters
   * @param filters - Optional filters for querying audit logs
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip (for pagination)
   */
  async adminGetAuditLogs(filters?: {
    startDate?: string;
    endDate?: string;
    condominiumId?: number;
    actorId?: number;
    action?: string;
    targetTable?: string;
  }, limit: number = 100, offset: number = 0): Promise<{ logs: AuditLog[], total: number }> {
    if (!supabase) return { logs: [], total: 0 };

    try {
      const { data, error } = await supabase.rpc('admin_get_audit_logs', {
        p_start_date: filters?.startDate || null,
        p_end_date: filters?.endDate || null,
        p_condominium_id: filters?.condominiumId || null,
        p_actor_id: filters?.actorId || null,
        p_action: filters?.action || null,
        p_target_table: filters?.targetTable || null,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;

      const logs: AuditLog[] = (data || []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        condominium_id: row.condominium_id,
        condominium: row.condominium_name ? {
          id: row.condominium_id,
          name: row.condominium_name
        } : undefined,
        actor_id: row.actor_id,
        actor: row.actor_first_name ? {
          id: row.actor_id,
          first_name: row.actor_first_name,
          last_name: row.actor_last_name,
          role: row.actor_role
        } : undefined,
        action: row.action,
        target_table: row.target_table,
        target_id: row.target_id,
        details: row.details
      }));

      const total = data && data.length > 0 ? data[0].total_count : 0;
      return { logs, total };
    } catch (err: any) {
      console.error("[Admin] Error fetching audit logs:", err.message || JSON.stringify(err));
      return { logs: [], total: 0 };
    }
  },

  /**
   * Admin: Get device registration errors with optional filters
   */
  async adminGetDeviceRegistrationErrors(filters?: {
    startDate?: string;
    endDate?: string;
    deviceIdentifier?: string;
  }, limit: number = 100, offset: number = 0): Promise<{ errors: DeviceRegistrationError[], total: number }> {
    if (!supabase) return { errors: [], total: 0 };

    try {
      let query = supabase
        .from('device_registration_errors')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.deviceIdentifier) {
        query = query.eq('device_identifier', filters.deviceIdentifier);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        errors: (data as DeviceRegistrationError[]) || [],
        total: count || 0
      };
    } catch (err: any) {
      console.error("[Admin] Error fetching device registration errors:", err.message || JSON.stringify(err));
      return { errors: [], total: 0 };
    }
  },

  /**
   * Admin: Get all condominiums for dropdown filters
   */
  async adminGetAllCondominiums(): Promise<Condominium[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_condominiums');

      if (error) throw error;

      const sorted = (data as Condominium[] || []).sort((a, b) => a.name.localeCompare(b.name));
      return sorted;
    } catch (err: any) {
      console.error("[Admin] Error fetching all condominiums:", err.message || JSON.stringify(err));
      return [];
    }
  },

  // --- NOTIFICATIONS ---

  /**
   * Create notification for visitor entered
   * Call this after marking visit status as INSIDE
   */
  async createVisitorEnteredNotification(visit: Visit): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Get all residents of the unit
      // Get all residents of the unit using admin_get_residents RPC and filtering
      const { data: allResidents, error: residentError } = await supabase
        .rpc('admin_get_residents', { p_condominium_id: visit.condominium_id });

      if (residentError) throw residentError;

      const residents = (allResidents || []).filter((r: any) => r.unit_id === visit.unit_id);

      if (residentError) throw residentError;
      if (!residents || residents.length === 0) return false;

      // Create notification for each resident using RPC
      for (const resident of residents) {
        await supabase.rpc('create_notification', {
          p_data: {
            resident_id: resident.id,
            condominium_id: resident.condominium_id,
            unit_id: resident.unit_id,
            title: 'Visitante chegou',
            body: `${visit.visitor_name || 'Visitante'} entrou no condom?nio`,
            type: 'visitor_entered',
            data: {
              visit_id: visit.id,
              visitor_name: visit.visitor_name,
              visitor_doc: visit.visitor_doc,
              visitor_phone: visit.visitor_phone,
              check_in_at: visit.check_in_at
            }
          }
        });
      }
      return true;
    } catch (err: any) {
      console.error('[Notifications] Error creating visitor entered notification:', err.message);
      return false;
    }
  },

  /**
   * Create notification for visitor left
   * Call this after marking visit status as LEFT
   */
  async createVisitorLeftNotification(visit: Visit): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Get all residents of the unit
      // Get all residents of the unit using admin_get_residents RPC and filtering
      const { data: allResidents, error: residentError } = await supabase
        .rpc('admin_get_residents', { p_condominium_id: visit.condominium_id });

      if (residentError) throw residentError;

      const residents = (allResidents || []).filter((r: any) => r.unit_id === visit.unit_id);

      if (residentError) throw residentError;
      if (!residents || residents.length === 0) return false;

      // Create notification for each resident using RPC
      for (const resident of residents) {
        await supabase.rpc('create_notification', {
          p_data: {
            resident_id: resident.id,
            condominium_id: resident.condominium_id,
            unit_id: resident.unit_id,
            title: 'Visitante saiu',
            body: `${visit.visitor_name || 'Visitante'} saiu do condom?nio`,
            type: 'visitor_left',
            data: {
              visit_id: visit.id,
              visitor_name: visit.visitor_name,
              check_in_at: visit.check_in_at,
              check_out_at: visit.check_out_at
            }
          }
        });
      }
      return true;
    } catch (err: any) {
      console.error('[Notifications] Error creating visitor left notification:', err.message);
      return false;
    }
  },

  /**
   * Create notification for incident read
   * Call this after acknowledging an incident
   */
  async createIncidentReadNotification(incident: Incident): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Get resident info
      const { data, error: residentError } = await supabase
        .rpc('get_resident', { p_id: incident.resident_id }); // RPC returns SETOF, so we get array

      if (residentError) throw residentError;
      const resident = data && data.length > 0 ? data[0] : null;

      if (!resident) return false;

      // Create notification using RPC
      await supabase.rpc('create_notification', {
        p_data: {
          resident_id: resident.id,
          condominium_id: resident.condominium_id,
          unit_id: resident.unit_id,
          title: 'Incidente visualizado',
          body: 'Seu incidente foi lido pela seguran?a',
          type: 'incident_read',
          data: {
            incident_id: incident.id,
            incident_type: incident.type,
            acknowledged_at: incident.acknowledged_at,
            acknowledged_by: incident.acknowledged_by
          }
        }
      });

      return true;
    } catch (err: any) {
      console.error('[Notifications] Error creating incident read notification:', err.message);
      return false;
    }
  }
};
