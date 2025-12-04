

import { supabase } from './supabaseClient';
import { Staff, Visit, VisitStatus, Unit, Incident, IncidentType, IncidentStatus, VisitTypeConfig, ServiceTypeConfig, Condominium, CondominiumStats, Device, Restaurant, Sport, AuditLog, Street } from '../types';

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
        .from('condominiums')
        .select('*')
        .eq('id', condoId)
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
      // Otimização: Filtrar diretamente na base de dados
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;

      return (data as Condominium[]) || [];

    } catch (err: any) {
      console.error("Error listing condos:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getStreets(condoId: number): Promise<any[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('streets')
        .select('*')
        .eq('condominium_id', condoId)
        .order('name');

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
        .from('streets')
        .insert({ condominium_id: condoId, name })
        .select()
        .single();

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
        .from('streets')
        .delete()
        .eq('id', streetId);

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
  async getVisitTypes(): Promise<VisitTypeConfig[]> {
    if (!supabase) {
      console.error('[SupabaseService] Supabase client not initialized');
      return [];
    }

    console.log('[SupabaseService] Fetching global visit types');
    try {
      // Visit types are global (no condominium_id column in table)
      const { data, error } = await supabase
        .from('visit_types')
        .select('*')
        .order('name');

      if (error) throw error;
      console.log('[SupabaseService] Visit types fetched successfully:', data?.length || 0, 'items');
      return (data as VisitTypeConfig[]) || [];
    } catch (err: any) {
      console.error("[SupabaseService] Error getting visit types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getServiceTypes(): Promise<ServiceTypeConfig[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*');

      if (error) throw error;
      return (data as ServiceTypeConfig[]) || [];
    } catch (err: any) {
      console.error("Error getting service types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getRestaurants(condoId: number): Promise<Restaurant[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('condominium_id', condoId)
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;
      console.log('[SupabaseService] Restaurants fetched successfully:', data?.length || 0, 'items');
      return (data as Restaurant[]) || [];
    } catch (err: any) {
      console.error("[SupabaseService] Error getting restaurants:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getSports(condoId: number): Promise<Sport[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .eq('condominium_id', condoId)
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;
      console.log('[SupabaseService] Sports fetched successfully:', data?.length || 0, 'items');
      return (data as Sport[]) || [];
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
        .from('staff')
        .select('*')
        .eq('condominium_id', condoId);

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
        .from('units')
        .select('*, residents(*)')
        .eq('condominium_id', condoId);

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

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          visit_types(name),
          service_types(name),
          restaurants(name),
          sports(name),
          units(code_block, number)
        `)
        .eq('condominium_id', condoId)
        .gte('check_in_at', `${today}T00:00:00`)
        .order('check_in_at', { ascending: false });

      if (error) throw error;

      return data.map((v: any) => ({
        ...v,
        visit_type: v.visit_types?.name || 'Desconhecido',
        service_type: v.service_types?.name,
        restaurant_name: v.restaurants?.name,
        sport_name: v.sports?.name,
        unit_block: v.units?.code_block,
        unit_number: v.units?.number,
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

    try {
      const { data, error } = await supabase
        .from('visits')
        .insert(cleanedPayload)
        .select()
        .single();

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
        .from('visits')
        .update(updates)
        .eq('id', visitId);

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
      const updates: any = { status };
      if (checkOutAt) {
        updates.check_out_at = checkOutAt;
      }

      const { error } = await supabase
        .from('visits')
        .update(updates)
        .eq('id', visitId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Update Visit Status Error:", err.message || JSON.stringify(err));
      return false;
    }
  },

  // --- Logs e Outros ---
  async logAudit(entry: any) {
    if (!supabase) return;
    supabase.from('audit_logs').insert(entry).then(({ error }) => {
      if (error) console.error("Audit Log Error:", error.message || JSON.stringify(error));
    });
  },

  // --- Incidents ---
  async getIncidentTypes(): Promise<IncidentType[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('incident_types')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return (data as IncidentType[]) || [];
    } catch (err: any) {
      console.error("Error fetching incident types:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getIncidentStatuses(): Promise<IncidentStatus[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('incident_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return (data as IncidentStatus[]) || [];
    } catch (err: any) {
      console.error("Error fetching incident statuses:", err.message || JSON.stringify(err));
      return [];
    }
  },

  async getIncidents(condoId: number): Promise<Incident[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          residents!inner (
            id,
            name,
            condominium_id,
            unit_id,
            units (
              id,
              code_block,
              number,
              floor,
              building_name
            )
          ),
          incident_types (
            label
          ),
          incident_statuses (
            label
          )
        `)
        .eq('residents.condominium_id', condoId)
        .order('reported_at', { ascending: false });

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
        .from('incidents')
        .update({
          status: 'acknowledged',
          acknowledged_by: staffId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create notification for resident
      const incident = data as Incident;
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
      // First, fetch the existing incident to get current notes
      const { data: incident, error: fetchError } = await supabase
        .from('incidents')
        .select('guard_notes')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Concatenate new notes with existing notes to preserve history
      const timestamp = new Date().toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const formattedNewNote = `[${timestamp}] ${guardNotes}`;

      let updatedNotes: string;
      if (incident?.guard_notes && incident.guard_notes.trim()) {
        updatedNotes = `${incident.guard_notes}\n---\n${formattedNewNote}`;
      } else {
        updatedNotes = formattedNewNote;
      }

      const updates: any = {
        guard_notes: updatedNotes,
        status: newStatus
      };

      // If resolving, add resolved timestamp
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id);

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
        .from('devices')
        .upsert({
          device_identifier: device.device_identifier,
          device_name: device.device_name,
          condominium_id: device.condominium_id,
          configured_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          status: 'ACTIVE',
          metadata: device.metadata
        }, {
          onConflict: 'device_identifier'
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
      await supabase
        .from('devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('device_identifier', deviceIdentifier);
    } catch (err: any) {
      console.error("Heartbeat update error:", err.message || JSON.stringify(err));
    }
  },

  async deactivateCondoDevices(condoId: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('devices')
        .update({ status: 'INACTIVE' })
        .eq('condominium_id', condoId)
        .eq('status', 'ACTIVE');

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

  async getDeviceByIdentifier(deviceIdentifier: string): Promise<{ condominium_id: number; status: string } | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('condominium_id, status')
        .eq('device_identifier', deviceIdentifier)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - device not registered
          return null;
        }
        throw error;
      }

      return data;
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
      let query = supabase
        .from('devices')
        .select('*')
        .eq('condominium_id', condoId)
        .eq('status', 'ACTIVE');

      // Exclude current device if reconfiguring
      if (excludeDeviceIdentifier) {
        query = query.neq('device_identifier', excludeDeviceIdentifier);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as Device[]) || [];
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
    if (!supabase) return [];

    try {
      const { data, error } = await supabase.rpc('admin_get_all_visits', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_condominium_id: condominiumId || null
      });

      if (error) throw error;

      return (data || []) as Visit[];
    } catch (err: any) {
      console.error("[Admin] Error fetching visits via RPC:", err.message || JSON.stringify(err));
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

      // Transform RPC result to match Incident interface
      return (data || []).map((inc: any) => ({
        id: inc.id,
        reported_at: inc.reported_at,
        resident_id: inc.resident_id,
        resident: {
          id: inc.resident_id,
          name: inc.resident_name,
          condominium_id: inc.resident_condominium_id,
          unit_id: inc.resident_unit_id
        },
        unit: inc.resident_unit_id ? {
          id: inc.resident_unit_id,
          code_block: inc.unit_code_block,
          number: inc.unit_number,
          floor: inc.unit_floor,
          building_name: inc.unit_building_name,
          condominium_id: inc.resident_condominium_id
        } : undefined,
        description: inc.description,
        type: inc.type,
        type_label: inc.type_label,
        status: inc.status,
        status_label: inc.status_label,
        photo_path: inc.photo_path,
        acknowledged_at: inc.acknowledged_at,
        acknowledged_by: inc.acknowledged_by,
        guard_notes: inc.guard_notes,
        resolved_at: inc.resolved_at
      } as Incident));
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
        .from('condominiums')
        .insert({
          name: condo.name,
          address: condo.address,
          logo_url: condo.logo_url,
          latitude: condo.latitude,
          longitude: condo.longitude,
          gps_radius_meters: condo.gps_radius_meters,
          status: condo.status || 'ACTIVE'
        })
        .select()
        .single();

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
        .from('condominiums')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('condominiums')
        .update({ status })
        .eq('id', id);

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
        .from('devices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('devices')
        .update({ status: 'DECOMMISSIONED' })
        .eq('id', id);

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
      let query = supabase
        .from('devices')
        .select('*')
        .order('last_seen_at', { ascending: false });

      if (condominiumId) {
        query = query.eq('condominium_id', condominiumId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Device[]) || [];
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
        .from('staff')
        .insert({
          first_name: staff.first_name,
          last_name: staff.last_name,
          condominium_id: staff.condominium_id,
          role: staff.role,
          pin_hash: staff.pin_hash
        })
        .select()
        .single();

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
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('staff')
        .delete()
        .eq('id', id);

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
        .from('units')
        .insert({
          condominium_id: unit.condominium_id,
          code_block: unit.code_block,
          number: unit.number,
          floor: unit.floor,
          building_name: unit.building_name
        })
        .select()
        .single();

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
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('units')
        .delete()
        .eq('id', id);

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
      let query = supabase
        .from('residents')
        .select('*, unit:units(*), condominium:condominiums(*)')
        .order('name', { ascending: true });

      if (condominiumId) {
        query = query.eq('condominium_id', condominiumId);
      }

      const { data, error } = await query;

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
        .from('residents')
        .insert({
          name: resident.name,
          email: resident.email,
          phone: resident.phone,
          condominium_id: resident.condominium_id,
          unit_id: resident.unit_id
        })
        .select()
        .single();

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
        .from('residents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('residents')
        .delete()
        .eq('id', id);

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
      let query = supabase
        .from('restaurants')
        .select('*, condominium:condominiums(*)')
        .order('name', { ascending: true });

      if (condominiumId) {
        query = query.eq('condominium_id', condominiumId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Restaurant[]) || [];
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
        .from('restaurants')
        .insert({
          name: restaurant.name,
          description: restaurant.description,
          condominium_id: restaurant.condominium_id,
          status: restaurant.status || 'ACTIVE'
        })
        .select()
        .single();

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
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('restaurants')
        .delete()
        .eq('id', id);

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
      let query = supabase
        .from('sports')
        .select('*, condominium:condominiums(*)')
        .order('name', { ascending: true });

      if (condominiumId) {
        query = query.eq('condominium_id', condominiumId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Sport[]) || [];
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
        .from('sports')
        .insert({
          name: sport.name,
          description: sport.description,
          condominium_id: sport.condominium_id,
          status: sport.status || 'ACTIVE'
        })
        .select()
        .single();

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
        .from('sports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('sports')
        .delete()
        .eq('id', id);

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
      const updates: any = { status };

      // If marking as LEFT, set check_out_at
      if (status === VisitStatus.LEFT && !updates.check_out_at) {
        updates.check_out_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('visits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
      const updates: any = {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: guardId
      };

      if (notes) {
        updates.guard_notes = notes;
      }

      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Incident;
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
      const updates: any = {
        status: 'RESOLVED',
        resolved_at: new Date().toISOString()
      };

      if (notes) {
        updates.guard_notes = notes;
      }

      // If not already acknowledged, set acknowledgment data too
      const { data: incident } = await supabase
        .from('incidents')
        .select('acknowledged_at')
        .eq('id', id)
        .single();

      if (incident && !incident.acknowledged_at) {
        updates.acknowledged_at = new Date().toISOString();
        updates.acknowledged_by = guardId;
      }

      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Incident;
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
        .from('incidents')
        .update({ guard_notes: notes })
        .eq('id', id)
        .select()
        .single();

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
        .from('visit_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as VisitTypeConfig[]) || [];
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
        .from('visit_types')
        .insert({
          name: visitType.name,
          icon_key: visitType.icon_key || 'user',
          requires_service_type: visitType.requires_service_type || false,
          requires_restaurant: visitType.requires_restaurant || false,
          requires_sport: visitType.requires_sport || false
        })
        .select()
        .single();

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
        .from('visit_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('visit_types')
        .delete()
        .eq('id', id);

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
        .from('service_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as ServiceTypeConfig[]) || [];
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
        .from('service_types')
        .insert({
          name: serviceType.name
        })
        .select()
        .single();

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
        .from('service_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
        .from('service_types')
        .delete()
        .eq('id', id);

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
      // Fetch all active condominiums
      const { data: condos, error: condoError } = await supabase
        .from('condominiums')
        .select('id, name, address, latitude, longitude, status')
        .eq('status', 'ACTIVE')
        .order('name');

      if (condoError) throw condoError;
      if (!condos) return [];

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Fetch stats for each condominium
      const stats: CondominiumStats[] = await Promise.all(
        condos.map(async (condo) => {
          // Count visits today
          const { count: visitCount, error: visitError } = await supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('condominium_id', condo.id)
            .gte('check_in_at', startOfDay)
            .lt('check_in_at', endOfDay);

          // Count open/acknowledged incidents (not resolved)
          const { count: incidentCount, error: incidentError } = await supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('condominium_id', condo.id)
            .in('status', ['PENDING', 'ACKNOWLEDGED']);

          if (visitError) console.warn(`Error counting visits for condo ${condo.id}:`, visitError);
          if (incidentError) console.warn(`Error counting incidents for condo ${condo.id}:`, incidentError);

          return {
            id: condo.id,
            name: condo.name,
            address: condo.address,
            latitude: condo.latitude,
            longitude: condo.longitude,
            total_visits_today: visitCount || 0,
            total_incidents_open: incidentCount || 0,
            status: condo.status as 'ACTIVE' | 'INACTIVE'
          };
        })
      );

      return stats;
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
      // Method 1: Use RPC function (recommended for better performance)
      // This requires the admin_get_audit_logs RPC function to be created in Supabase
      const USE_RPC = false; // Set to true after running the audit logging migration

      if (USE_RPC) {
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
      }

      // Method 2: Direct table query with joins (fallback)
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          condominium:condominiums(id, name),
          actor:staff(id, first_name, last_name, role)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.condominiumId) {
        query = query.eq('condominium_id', filters.condominiumId);
      }
      if (filters?.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.targetTable) {
        query = query.eq('target_table', filters.targetTable);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to flatten joins
      const logs: AuditLog[] = (data || []).map((log: any) => ({
        id: log.id,
        created_at: log.created_at,
        condominium_id: log.condominium_id,
        condominium: log.condominium,
        actor_id: log.actor_id,
        actor: log.actor,
        action: log.action,
        target_table: log.target_table,
        target_id: log.target_id,
        details: log.details
      }));

      return { logs, total: count || 0 };
    } catch (err: any) {
      console.error("[Admin] Error fetching audit logs:", err.message || JSON.stringify(err));
      return { logs: [], total: 0 };
    }
  },

  /**
   * Admin: Get all condominiums for dropdown filters
   */
  async adminGetAllCondominiums(): Promise<Condominium[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as Condominium[]) || [];
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
      const { data: residents, error: residentError } = await supabase
        .from('residents')
        .select('id, condominium_id, unit_id')
        .eq('unit_id', visit.unit_id)
        .eq('condominium_id', visit.condominium_id);

      if (residentError) throw residentError;
      if (!residents || residents.length === 0) return false;

      // Create notification for each resident using direct INSERT
      for (const resident of residents) {
        await supabase
          .from('notifications')
          .insert({
            resident_id: resident.id,
            condominium_id: resident.condominium_id,
            unit_id: resident.unit_id,
            title: 'Visitante chegou',
            body: `${visit.visitor_name || 'Visitante'} entrou no condomínio`,
            type: 'visitor_entered',
            data: {
              visit_id: visit.id,
              visitor_name: visit.visitor_name,
              visitor_doc: visit.visitor_doc,
              visitor_phone: visit.visitor_phone,
              check_in_at: visit.check_in_at
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
      const { data: residents, error: residentError } = await supabase
        .from('residents')
        .select('id, condominium_id, unit_id')
        .eq('unit_id', visit.unit_id)
        .eq('condominium_id', visit.condominium_id);

      if (residentError) throw residentError;
      if (!residents || residents.length === 0) return false;

      // Create notification for each resident using direct INSERT
      for (const resident of residents) {
        await supabase
          .from('notifications')
          .insert({
            resident_id: resident.id,
            condominium_id: resident.condominium_id,
            unit_id: resident.unit_id,
            title: 'Visitante saiu',
            body: `${visit.visitor_name || 'Visitante'} saiu do condomínio`,
            type: 'visitor_left',
            data: {
              visit_id: visit.id,
              visitor_name: visit.visitor_name,
              check_in_at: visit.check_in_at,
              check_out_at: visit.check_out_at
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
      const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select('id, condominium_id, unit_id')
        .eq('id', incident.resident_id)
        .single();

      if (residentError) throw residentError;
      if (!resident) return false;

      // Create notification using direct INSERT
      await supabase
        .from('notifications')
        .insert({
          resident_id: resident.id,
          condominium_id: resident.condominium_id,
          unit_id: resident.unit_id,
          title: 'Incidente visualizado',
          body: 'Seu incidente foi lido pela segurança',
          type: 'incident_read',
          data: {
            incident_id: incident.id,
            incident_type: incident.type,
            acknowledged_at: incident.acknowledged_at,
            acknowledged_by: incident.acknowledged_by
          }
        });

      return true;
    } catch (err: any) {
      console.error('[Notifications] Error creating incident read notification:', err.message);
      return false;
    }
  }
};