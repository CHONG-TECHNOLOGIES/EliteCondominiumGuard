import { SupabaseService } from './Supabase';
import { db } from './db';
import { Visit, VisitStatus, SyncStatus, Staff, UserRole, Unit, Incident, VisitTypeConfig, ServiceTypeConfig, Condominium, Restaurant, Sport } from '../types';
import bcrypt from 'bcryptjs';
import { getDeviceIdentifier, getDeviceMetadata } from './deviceUtils';

const MOCK_FALLBACK_ID = "00000000-0000-0000-0000-000000000001";

class DataService {
  private isOnline: boolean = navigator.onLine;
  private backendHealthScore: number = 3; // Health score
  private currentCondoId: number | null = null;
  private currentCondoDetails: Condominium | null = null;

  constructor() {
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));
    this.init();
  }

  private async init() {
    const condoDetails = await this.getDeviceCondoDetails();
    if (condoDetails) {
      this.currentCondoId = condoDetails.id;
      this.currentCondoDetails = condoDetails;
    }
    this.startHealthCheck();
    this.startHeartbeat();
  }

  private setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    if (isOnline) this.backendHealthScore = 3; // Reset health on reconnect
  }

  private startHealthCheck() {
    setInterval(async () => {
      if (this.isOnline) {
        // Ping Supabase
        const success = await SupabaseService.getServiceTypes().then(res => res.length > 0);
        if (success) this.backendHealthScore = 3;
      }
    }, 60000); // Check every minute
  }

  private startHeartbeat() {
    setInterval(async () => {
      if (this.isBackendHealthy && this.currentCondoId) {
        const deviceId = getDeviceIdentifier();
        await SupabaseService.updateDeviceHeartbeat(deviceId);
      }
    }, 300000); // Every 5 minutes
  }

  private get isBackendHealthy(): boolean {
    return this.isOnline && this.backendHealthScore > 0;
  }

  // --- Device Configuration (Setup) ---

  async isDeviceConfigured(): Promise<boolean> {
    const localSetting = await db.settings.get('device_condo_details');

    // Case 1: IndexedDB has configuration
    if (localSetting) {
      console.log('[DataService] Local device configuration found for condo:', localSetting.value);

      // Save to localStorage as backup
      try {
        localStorage.setItem('device_condo_backup', JSON.stringify(localSetting.value));
      } catch (e) {
        console.warn('[DataService] Failed to save localStorage backup:', e);
      }

      // Cross-check with central database if online
      if (this.isBackendHealthy) {
        try {
          const deviceId = getDeviceIdentifier();
          const centralDevice = await SupabaseService.getDeviceByIdentifier(deviceId);

          if (!centralDevice) {
            console.warn('[DataService] Device not found in central database');
            return true; // Still allow with local config
          }

          if (centralDevice.status !== 'ACTIVE') {
            console.warn('[DataService] Device status is not ACTIVE:', centralDevice.status);
            return false; // Block if device is inactive
          }

          // Verify condominium ID matches
          const localCondoId = (localSetting.value as Condominium).id;
          if (String(centralDevice.condominium_id) !== String(localCondoId)) {
            console.warn('[DataService] Condominium ID mismatch - updating from central');
            // Update local config to match central
            const correctCondo = await SupabaseService.getCondominium(centralDevice.condominium_id);
            if (correctCondo) {
              await db.settings.put({ key: 'device_condo_details', value: correctCondo });
              localStorage.setItem('device_condo_backup', JSON.stringify(correctCondo));
              this.currentCondoDetails = correctCondo;
              this.currentCondoId = correctCondo.id;
            }
          }

          console.log('[DataService] Device configuration verified with central database');
        } catch (err) {
          console.error('[DataService] Error checking central database:', err);
        }
      }

      return true; // Local config exists, allow access
    }

    // Case 2: IndexedDB is empty - try to recover from localStorage backup
    console.log('[DataService] No IndexedDB configuration - checking localStorage backup');
    try {
      const backupData = localStorage.getItem('device_condo_backup');
      if (backupData) {
        const condoData = JSON.parse(backupData) as Condominium;
        console.log('[DataService] Restoring from localStorage backup:', condoData);
        await db.settings.put({ key: 'device_condo_details', value: condoData });
        this.currentCondoDetails = condoData;
        this.currentCondoId = condoData.id;
        return true;
      }
    } catch (e) {
      console.warn('[DataService] Failed to restore from localStorage:', e);
    }

    // Case 3: No local data - try to recover from central database if online
    console.log('[DataService] No local configuration - checking central database');

    if (this.isBackendHealthy) {
      try {
        const deviceId = getDeviceIdentifier();
        const centralDevice = await SupabaseService.getDeviceByIdentifier(deviceId);

        if (!centralDevice) {
          console.warn('[DataService] Device not found in central database');
          return false; // No device registered
        }

        if (centralDevice.status !== 'ACTIVE') {
          console.warn('[DataService] Device status is not ACTIVE:', centralDevice.status);
          return false; // Device is inactive
        }

        // Restore configuration from central database
        const correctCondo = await SupabaseService.getCondominium(centralDevice.condominium_id);
        if (correctCondo) {
          console.log('[DataService] Restored configuration from central database');
          await db.settings.put({ key: 'device_condo_details', value: correctCondo });
          localStorage.setItem('device_condo_backup', JSON.stringify(correctCondo));
          this.currentCondoDetails = correctCondo;
          this.currentCondoId = correctCondo.id;
          return true;
        }

        console.error('[DataService] Condominium not found in central database');
        return false;
      } catch (err) {
        console.error('[DataService] Error checking central database:', err);
        return false;
      }
    }

    // Case 4: Offline and no local data - device is not configured
    console.warn('[DataService] Device not configured - no local data and offline');
    return false;
  }

  async getDeviceCondoDetails(): Promise<Condominium | null> {
    if (this.currentCondoDetails) return this.currentCondoDetails;
    const setting = await db.settings.get('device_condo_details');
    if (setting) {
      this.currentCondoDetails = setting.value as Condominium;
      this.currentCondoId = this.currentCondoDetails.id;
      return this.currentCondoDetails;
    }
    return null;
  }

  async getAvailableCondominiums(): Promise<Condominium[]> {
    if (this.isBackendHealthy) {
      try {
        const list = await SupabaseService.listActiveCondominiums();
        if (list.length > 0) {
          await db.condominiums.bulkPut(list);
        }
        return list;
      } catch (e) {
        this.backendHealthScore--;
      }
    }

    // Offline Fallback: Load from local DB
    const localList = await db.condominiums.toArray();
    if (localList.length > 0) {
      return localList;
    }

    return [];
  }

  async configureDevice(condoId: number): Promise<{ success: boolean; error?: string; existingDevices?: any[] }> {
    const condo = await SupabaseService.getCondominium(condoId);
    if (!condo) {
      return { success: false, error: "Condomínio não encontrado" };
    }

    // Check if condominium is already assigned to other active devices
    const deviceId = getDeviceIdentifier();
    const existingDevices = await SupabaseService.getActiveDevicesByCondominium(condo.id, deviceId);

    if (existingDevices.length > 0) {
      console.warn(`[DataService] Condominium ${condo.name} is already assigned to ${existingDevices.length} active device(s)`);
      return {
        success: false,
        error: `Este condomínio já está associado a ${existingDevices.length} dispositivo(s) ativo(s). Cada condomínio só pode ter um tablet configurado.`,
        existingDevices
      };
    }

    // Register device with Supabase
    const deviceRegistered = await SupabaseService.registerDevice({
      device_identifier: deviceId,
      device_name: `Tablet - ${condo.name}`,
      condominium_id: condo.id,
      metadata: getDeviceMetadata()
    });

    if (!deviceRegistered) {
      console.warn("Failed to register device with Supabase, but continuing with local setup");
    }

    // Save configuration locally
    await db.settings.put({ key: 'device_condo_details', value: condo });
    await db.settings.put({ key: 'device_id', value: deviceId });

    this.currentCondoDetails = condo;
    this.currentCondoId = condo.id;
    return { success: true };
  }

  async resetDevice() {
    await db.clearAllData();
    this.currentCondoId = null;
    this.currentCondoDetails = null;
    window.location.hash = '/setup';
  }

  // --- Auth & Staff ---
  private async syncStaff(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const staffList = await SupabaseService.getStaffForSync(condoId);
      await db.staff.bulkPut(staffList);
      console.log(`${staffList.length} staff members synced.`);
    } catch (e) {
      console.error("Staff sync failed", e);
      this.backendHealthScore--;
    }
  }

  async login(firstName: string, lastName: string, pin: string): Promise<Staff | null> {
    const deviceCondoId = (await this.getDeviceCondoDetails())?.id;
    if (!deviceCondoId) throw new Error("Dispositivo não configurado");

    if (this.isBackendHealthy) {
      try {
        const staff = await SupabaseService.verifyStaffLogin(firstName, lastName, pin);
        if (staff) {
          if (String(staff.condominium_id) !== String(deviceCondoId)) {
            throw new Error(`Acesso Negado: Utilizador pertence ao condomínio ${staff.condominium_id}, mas o tablet está no ${deviceCondoId}.`);
          }
          await this.syncStaff(deviceCondoId); // Sync all staff after a successful login
          await this.refreshConfigs(deviceCondoId);
          return staff;
        }
      } catch (e) {
        console.error("Login online falhou, tentando offline:", e);
        this.backendHealthScore--;
      }
    }

    // --- OFFLINE FALLBACK ---
    const localStaff = await db.staff.where({ first_name: firstName, last_name: lastName }).first();
    if (localStaff?.pin_hash) {
      const isValid = await bcrypt.compare(pin, localStaff.pin_hash);
      if (isValid) {
        console.warn("Login OFFLINE bem-sucedido.");
        return localStaff;
      }
    }

    throw new Error("Credenciais inválidas ou sem acesso offline.");
  }

  // --- Configurações (Cache-then-Network) ---
  private async refreshConfigs(condoId: number) {
    if (!this.isBackendHealthy) return;
    console.log('[DataService] refreshConfigs called for condo:', condoId);
    try {
      // Visit types are global (no condo filter needed)
      const vt = await SupabaseService.getVisitTypes();
      console.log('[DataService] Received visit types from Supabase:', vt.length, 'items', vt);
      if (vt.length) {
        await db.visitTypes.bulkPut(vt);
        console.log('[DataService] Visit types saved to IndexedDB');
      }

      const st = await SupabaseService.getServiceTypes();
      console.log('[DataService] Received service types from Supabase:', st.length, 'items');
      if (st.length) await db.serviceTypes.bulkPut(st);
    } catch (e) {
      console.error("[DataService] Config sync failed", e);
      this.backendHealthScore--;
    }
  }

  async getVisitTypes(): Promise<VisitTypeConfig[]> {
    const local = await db.visitTypes.toArray();
    console.log('[DataService] getVisitTypes - Local cache:', local.length, 'items');

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      console.log('[DataService] Returning cached visit types');
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshConfigs(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      console.log('[DataService] Fetching visit types from backend for condo:', this.currentCondoId);
      await this.refreshConfigs(this.currentCondoId);
      const synced = await db.visitTypes.toArray();
      console.log('[DataService] Synced visit types:', synced.length, 'items');
      if (synced.length > 0) return synced;
    } else {
      console.warn('[DataService] Backend unhealthy or no condo ID. Health:', this.isBackendHealthy, 'CondoID:', this.currentCondoId);
    }

    // Fallback to hardcoded defaults
    console.warn('[DataService] Using hardcoded fallback visit types');
    return [
      { id: 'vt1', name: 'Visitante', icon_key: 'USER', requires_service_type: false },
      { id: 'vt4', name: 'Serviço', icon_key: 'WRENCH', requires_service_type: true },
    ];
  }

  async getServiceTypes(): Promise<ServiceTypeConfig[]> {
    const local = await db.serviceTypes.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshConfigs(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshConfigs(this.currentCondoId);
      const synced = await db.serviceTypes.toArray();
      if (synced.length > 0) return synced;
    }

    // Fallback to hardcoded default
    return [{ id: 'st1', name: 'Obras' }];
  }

  // --- Restaurants ---
  async getRestaurants(): Promise<Restaurant[]> {
    const local = await db.restaurants.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshRestaurantsAndSports(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshRestaurantsAndSports(this.currentCondoId);
      const synced = await db.restaurants.toArray();
      if (synced.length > 0) return synced;
    }

    return [];
  }

  // --- Sports ---
  async getSports(): Promise<Sport[]> {
    const local = await db.sports.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshRestaurantsAndSports(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshRestaurantsAndSports(this.currentCondoId);
      const synced = await db.sports.toArray();
      if (synced.length > 0) return synced;
    }

    return [];
  }

  private async refreshRestaurantsAndSports(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const restaurants = await SupabaseService.getRestaurants(condoId);
      if (restaurants.length) await db.restaurants.bulkPut(restaurants);

      const sports = await SupabaseService.getSports(condoId);
      if (sports.length) await db.sports.bulkPut(sports);
    } catch (e) {
      console.error("[DataService] Restaurants/Sports sync failed", e);
      this.backendHealthScore--;
    }
  }

  // --- Units ---
  async getUnits(): Promise<Unit[]> {
    const local = await db.units.toArray();

    // If we have local data, return it and sync in background
    if (local.length > 0) {
      if (this.isBackendHealthy && this.currentCondoId) {
        this.refreshUnits(this.currentCondoId); // Fire-and-forget
      }
      return local;
    }

    // If local DB is empty, wait for sync to complete
    if (this.isBackendHealthy && this.currentCondoId) {
      await this.refreshUnits(this.currentCondoId);
      const synced = await db.units.toArray();
      if (synced.length > 0) return synced;
    }

    return [];
  }

  // Fetch units with residents (online only)
  async getUnitsWithResidents(): Promise<Unit[]> {
    if (!this.isBackendHealthy || !this.currentCondoId) {
      // Offline: Return units without residents
      return await this.getUnits();
    }

    try {
      const unitsWithResidents = await SupabaseService.getUnitsWithResidents(this.currentCondoId);

      // Cache units (without residents to save space)
      const unitsOnly = unitsWithResidents.map(u => {
        const { residents, ...unitWithoutResidents } = u;
        return unitWithoutResidents;
      });
      if (unitsOnly.length) await db.units.bulkPut(unitsOnly);

      return unitsWithResidents;
    } catch (e) {
      console.error("[DataService] Failed to fetch units with residents", e);
      this.backendHealthScore--;
      // Fallback to cached units without residents
      return await this.getUnits();
    }
  }

  private async refreshUnits(condoId: number) {
    if (!this.isBackendHealthy) return;
    try {
      const units = await SupabaseService.getUnitsWithResidents(condoId);
      // Save only unit data (without residents) to local DB
      const unitsOnly = units.map(u => {
        const { residents, ...unitWithoutResidents } = u;
        return unitWithoutResidents;
      });
      if (unitsOnly.length) await db.units.bulkPut(unitsOnly);
    } catch (e) {
      console.error("[DataService] Units sync failed", e);
      this.backendHealthScore--;
    }
  }

  // --- Visits ---
  async getTodaysVisits(): Promise<Visit[]> {
    const today = new Date().toISOString().split('T')[0];

    // Get local visits for today
    const localVisits = await db.visits
      .where('check_in_at')
      .between(`${today}T00:00:00`, `${today}T23:59:59`, true, true)
      .toArray();

    // If online, sync and merge with backend
    if (this.isBackendHealthy && this.currentCondoId) {
      try {
        const backendVisits = await SupabaseService.getTodaysVisits(this.currentCondoId);

        // Merge: backend visits take precedence (they're the source of truth)
        const mergedMap = new Map<string, Visit>();

        // Add local visits first
        localVisits.forEach(v => mergedMap.set(v.id, v));

        // Overwrite with backend visits (synced data)
        backendVisits.forEach(v => mergedMap.set(v.id, v));

        // Cache backend visits locally
        if (backendVisits.length > 0) {
          await db.visits.bulkPut(backendVisits);
        }

        return Array.from(mergedMap.values()).sort((a, b) =>
          new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
        );
      } catch (e) {
        console.error("[DataService] Failed to sync today's visits", e);
        this.backendHealthScore--;
      }
    }

    // Offline: return only local visits
    return localVisits.sort((a, b) =>
      new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
    );
  }

  async createVisit(visitData: Partial<Visit> & { photo_data_url?: string }): Promise<Visit> {
    if (!visitData.visit_type_id) {
      throw new Error("visit_type_id is required");
    }

    // Validate based on visit type:
    // - Restaurant visits: require restaurant_id (unit_id optional)
    // - Sport visits: require sport_id (unit_id optional)
    // - Regular visits: require unit_id
    const isRestaurantVisit = !!visitData.restaurant_id;
    const isSportVisit = !!visitData.sport_id;
    const isRegularVisit = !isRestaurantVisit && !isSportVisit;

    if (isRegularVisit && !visitData.unit_id) {
      throw new Error("unit_id is required for regular visits");
    }

    if (!visitData.guard_id) {
      throw new Error("guard_id is required");
    }

    const visitPayload: Partial<Visit> = {
      condominium_id: this.currentCondoId || 0,
      visitor_name: visitData.visitor_name || '',
      visitor_doc: visitData.visitor_doc,
      visitor_phone: visitData.visitor_phone,
      visit_type_id: visitData.visit_type_id,
      service_type_id: visitData.service_type_id,
      restaurant_id: visitData.restaurant_id,
      sport_id: visitData.sport_id,
      unit_id: visitData.unit_id,
      reason: visitData.reason,
      photo_url: visitData.photo_url,
      qr_token: visitData.qr_token,
      check_in_at: new Date().toISOString(),
      status: visitData.status || VisitStatus.PENDING,
      approval_mode: visitData.approval_mode,
      guard_id: visitData.guard_id,
      sync_status: SyncStatus.PENDING_SYNC
    };

    // Check if we have internet connection
    if (this.isBackendHealthy) {
      // ONLINE: Upload photo first (if exists), then save visit to Supabase
      try {
        // Upload photo to Supabase Storage if provided
        if (visitData.photo_data_url && this.currentCondoId) {
          console.log("[DataService] Uploading visitor photo to Supabase Storage...");
          const photoUrl = await SupabaseService.uploadVisitorPhoto(
            visitData.photo_data_url,
            this.currentCondoId,
            visitData.visitor_name || 'visitor'
          );

          if (photoUrl) {
            visitPayload.photo_url = photoUrl;
            console.log("[DataService] Photo uploaded successfully:", photoUrl);
          } else {
            console.warn("[DataService] Photo upload failed, saving visit without photo URL");
          }
        }

        const createdVisit = await SupabaseService.createVisit(visitPayload);
        if (createdVisit) {
          createdVisit.sync_status = SyncStatus.SYNCED;
          await db.visits.put(createdVisit);
          console.log("[DataService] Visit saved to Supabase and cached locally:", createdVisit.id);
          return createdVisit;
        } else {
          throw new Error("Failed to save to Supabase");
        }
      } catch (e) {
        console.error("[DataService] Failed to save to Supabase, falling back to local:", e);
        this.backendHealthScore--;
        // Fallback to local save with temporary negative ID
        const tempVisit: Visit & { photo_data_url?: string } = {
          id: -Date.now(), // Temporary negative ID (will be replaced when synced)
          created_at: new Date().toISOString(),
          ...visitPayload,
          visit_type_id: visitPayload.visit_type_id!,
          unit_id: visitPayload.unit_id!,
          guard_id: visitPayload.guard_id!,
          condominium_id: visitPayload.condominium_id!,
          visitor_name: visitPayload.visitor_name!,
          check_in_at: visitPayload.check_in_at!,
          status: visitPayload.status!,
          sync_status: SyncStatus.PENDING_SYNC,
          photo_data_url: visitData.photo_data_url // Store base64 for later upload
        };
        await db.visits.put(tempVisit);
        console.warn("[DataService] Visit saved locally with temp ID, will sync later");
        return tempVisit;
      }
    } else {
      // OFFLINE: Save locally with temporary negative ID and base64 photo data
      const tempVisit: Visit & { photo_data_url?: string } = {
        id: -Date.now(), // Temporary negative ID
        created_at: new Date().toISOString(),
        ...visitPayload,
        visit_type_id: visitPayload.visit_type_id!,
        unit_id: visitPayload.unit_id!,
        guard_id: visitPayload.guard_id!,
        condominium_id: visitPayload.condominium_id!,
        visitor_name: visitPayload.visitor_name!,
        check_in_at: visitPayload.check_in_at!,
        status: visitPayload.status!,
        sync_status: SyncStatus.PENDING_SYNC,
        photo_data_url: visitData.photo_data_url // Store base64 for later upload
      };
      await db.visits.put(tempVisit);
      console.warn("[DataService] Offline: Visit saved locally with temp ID, will sync when online");
      return tempVisit;
    }
  }

  async updateVisitStatus(visitId: number, status: VisitStatus): Promise<void> {
    const visit = await db.visits.get(visitId);
    if (!visit) throw new Error("Visit not found");

    visit.status = status;

    // Set check_out time when status changes to LEFT
    if (status === VisitStatus.LEFT && !visit.check_out_at) {
      visit.check_out_at = new Date().toISOString();
    }

    // Mark as pending sync
    visit.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.visits.put(visit);

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        await SupabaseService.updateVisitStatus(visitId, status, visit.check_out_at);
        visit.sync_status = SyncStatus.SYNCED;
        await db.visits.put(visit);
      } catch (e) {
        console.warn("[DataService] Visit status updated locally, will sync later");
        this.backendHealthScore--;
      }
    }
  }

  async syncPendingItems(): Promise<number> {
    if (!this.isBackendHealthy) return 0;
    if (!this.currentCondoId) {
      console.warn("[DataService] Cannot sync: no condominium ID set");
      return 0;
    }

    let totalSynced = 0;

    // Sync pending visits
    const pendingVisits = await db.visits
      .where('sync_status')
      .equals(SyncStatus.PENDING_SYNC)
      .toArray();

    for (const visit of pendingVisits) {
      try {
        // Check if visit has offline photo data that needs to be uploaded
        const visitWithPhoto = visit as Visit & { photo_data_url?: string };

        if (visitWithPhoto.photo_data_url && !visitWithPhoto.photo_url) {
          console.log("[DataService] Uploading offline photo for visit:", visit.id);
          const photoUrl = await SupabaseService.uploadVisitorPhoto(
            visitWithPhoto.photo_data_url,
            this.currentCondoId,
            visit.visitor_name
          );

          if (photoUrl) {
            visit.photo_url = photoUrl;
            console.log("[DataService] Offline photo uploaded successfully:", photoUrl);
          } else {
            console.warn("[DataService] Failed to upload offline photo, syncing visit without photo");
          }

          // Remove photo_data_url before syncing to Supabase (not a DB column)
          delete visitWithPhoto.photo_data_url;
        }

        const createdVisit = await SupabaseService.createVisit(visit);
        if (createdVisit) {
          // Replace local temp visit with server version (has real ID)
          await db.visits.delete(visit.id); // Delete temp ID
          createdVisit.sync_status = SyncStatus.SYNCED;
          await db.visits.put(createdVisit); // Add server version
          totalSynced++;
          console.log("[DataService] Synced pending visit:", visit.id, "-> new ID:", createdVisit.id);
        }
      } catch (e) {
        console.error("[DataService] Failed to sync visit:", visit.id, e);
        this.backendHealthScore--;
        break; // Stop on first failure
      }
    }

    // Sync pending incidents
    const incidentsSynced = await this.syncPendingIncidents();
    totalSynced += incidentsSynced;

    console.log(`[DataService] Sync complete: ${totalSynced} items synced (visits + incidents)`);
    return totalSynced;
  }

  // --- Incidents ---
  private async refreshIncidentConfigs() {
    if (!this.isBackendHealthy) return;
    try {
      const types = await SupabaseService.getIncidentTypes();
      if (types.length) await db.incidentTypes.bulkPut(types);

      const statuses = await SupabaseService.getIncidentStatuses();
      if (statuses.length) await db.incidentStatuses.bulkPut(statuses);

      console.log('[DataService] Incident types and statuses synced');
    } catch (e) {
      console.error("[DataService] Failed to sync incident configs", e);
      this.backendHealthScore--;
    }
  }

  async getIncidents(): Promise<Incident[]> {
    // Sync incident types and statuses if needed (fire-and-forget)
    if (this.isBackendHealthy) {
      this.refreshIncidentConfigs();
    }

    // If online, fetch from backend and replace local cache (proper bidirectional sync)
    if (this.isBackendHealthy && this.currentCondoId) {
      try {
        console.log('[DataService] Syncing incidents from backend...');

        // Fetch ALL incidents from backend (including acknowledged, resolved, etc.)
        const backendIncidents = await SupabaseService.getIncidents(this.currentCondoId);

        // Get local incidents that have pending changes (sync_status = PENDING_SYNC)
        const pendingLocalIncidents = await db.incidents
          .where('sync_status')
          .equals(SyncStatus.PENDING_SYNC)
          .toArray();

        // Clear ALL local incidents for this condominium to ensure deleted ones are removed
        const allLocalIncidents = await db.incidents.toArray();
        const incidentsToDelete = allLocalIncidents.filter(inc => {
          // Delete if belongs to this condominium
          if (inc.resident && inc.resident.condominium_id === this.currentCondoId) {
            // Keep if has pending sync status (local changes not yet synced)
            return inc.sync_status !== SyncStatus.PENDING_SYNC;
          }
          return false;
        });

        // Delete old incidents for this condo (excluding pending ones)
        if (incidentsToDelete.length > 0) {
          const idsToDelete = incidentsToDelete.map(inc => inc.id);
          await db.incidents.bulkDelete(idsToDelete);
          console.log(`[DataService] Cleared ${idsToDelete.length} old incidents from local cache`);
        }

        // Insert fresh backend data
        if (backendIncidents.length > 0) {
          await db.incidents.bulkPut(backendIncidents);
          console.log(`[DataService] Synced ${backendIncidents.length} incidents from backend`);
        }

        // Merge backend incidents with pending local changes
        const mergedIncidents = [...backendIncidents];

        // Add back any pending local incidents that weren't in backend response
        pendingLocalIncidents.forEach(localInc => {
          if (!backendIncidents.find(backendInc => backendInc.id === localInc.id)) {
            mergedIncidents.push(localInc);
          }
        });

        // Sort by reported_at descending
        return mergedIncidents.sort((a, b) =>
          new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
        );
      } catch (e) {
        console.error("[DataService] Failed to sync incidents from backend, using local cache", e);
        this.backendHealthScore--;
      }
    }

    // Offline: return only local cached incidents for this condominium
    const localIncidents = await db.incidents
      .orderBy('reported_at')
      .reverse()
      .toArray();

    return localIncidents.filter(inc => {
      // If resident info is cached and condominium_id matches, include it
      if (inc.resident && inc.resident.condominium_id === this.currentCondoId) {
        return true;
      }
      // If no resident info, include it (will show all cached incidents)
      return !inc.resident;
    });
  }

  async acknowledgeIncident(id: number, staffId: number): Promise<void> {
    const incident = await db.incidents.get(id);
    if (!incident) throw new Error("Incident not found");

    // Update incident status to "acknowledged"
    incident.status = 'acknowledged';
    incident.acknowledged_by = staffId;
    incident.acknowledged_at = new Date().toISOString();
    incident.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.incidents.put(incident);

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        const success = await SupabaseService.acknowledgeIncident(id, staffId);
        if (success) {
          incident.sync_status = SyncStatus.SYNCED;
          await db.incidents.put(incident);
        }
      } catch (e) {
        console.warn("[DataService] Incident acknowledged locally, will sync later");
        this.backendHealthScore--;
      }
    }
  }

  async reportIncidentAction(id: number, guardNotes: string, newStatus: string): Promise<void> {
    const incident = await db.incidents.get(id);
    if (!incident) throw new Error("Incident not found");

    // Concatenate new notes with existing notes to preserve history
    const timestamp = new Date().toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedNewNote = `[${timestamp}] ${guardNotes}`;

    if (incident.guard_notes && incident.guard_notes.trim()) {
      incident.guard_notes = `${incident.guard_notes}\n---\n${formattedNewNote}`;
    } else {
      incident.guard_notes = formattedNewNote;
    }

    incident.status = newStatus;

    // Add resolved timestamp if resolving
    if (newStatus === 'resolved') {
      incident.resolved_at = new Date().toISOString();
    }

    incident.sync_status = SyncStatus.PENDING_SYNC;

    // Update locally
    await db.incidents.put(incident);

    // Try to sync if online
    if (this.isBackendHealthy) {
      try {
        const success = await SupabaseService.reportIncidentAction(id, guardNotes, newStatus);
        if (success) {
          incident.sync_status = SyncStatus.SYNCED;
          await db.incidents.put(incident);
        }
      } catch (e) {
        console.warn("[DataService] Incident action reported locally, will sync later");
        this.backendHealthScore--;
      }
    }
  }

  async syncPendingIncidents(): Promise<number> {
    if (!this.isBackendHealthy) return 0;

    const pendingIncidents = await db.incidents
      .where('sync_status')
      .equals(SyncStatus.PENDING_SYNC)
      .toArray();

    let synced = 0;
    for (const incident of pendingIncidents) {
      try {
        // Determine what kind of update needs to be synced
        if (incident.status === 'acknowledged' && incident.acknowledged_at) {
          // Sync acknowledgment
          const success = await SupabaseService.acknowledgeIncident(
            incident.id,
            incident.acknowledged_by!
          );

          if (success) {
            incident.sync_status = SyncStatus.SYNCED;
            await db.incidents.put(incident);
            synced++;
            console.log("[DataService] Synced incident acknowledgment:", incident.id);
          }
        } else if ((incident.status === 'inprogress' || incident.status === 'resolved') && incident.guard_notes) {
          // Sync action report
          // Extract the last note (most recent) to avoid re-sending all history
          const lastNote = incident.guard_notes.split('\n---\n').pop() || incident.guard_notes;

          const success = await SupabaseService.reportIncidentAction(
            incident.id,
            lastNote,
            incident.status
          );

          if (success) {
            incident.sync_status = SyncStatus.SYNCED;
            await db.incidents.put(incident);
            synced++;
            console.log("[DataService] Synced incident action:", incident.id);
          }
        }
      } catch (e) {
        console.error("[DataService] Failed to sync incident:", incident.id, e);
        this.backendHealthScore--;
        break; // Stop on first failure
      }
    }

    return synced;
  }

  checkOnline(): boolean { return this.isOnline; }
}

export const api = new DataService();
