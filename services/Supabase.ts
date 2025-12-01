

import { supabase } from './supabaseClient';
import { Staff, Visit, VisitStatus, Unit, Incident, IncidentType, IncidentStatus, VisitTypeConfig, ServiceTypeConfig, Condominium, Device, Restaurant, Sport } from '../types';

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
      const { error } = await supabase
        .from('incidents')
        .update({
          status: 'acknowledged',
          acknowledged_by: staffId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
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
  }
};