
import { supabase } from './supabaseClient';
import { SupabaseService } from './Supabase';
import { Visit, VisitStatus, SyncStatus, Staff, UserRole, Unit, Incident, VisitTypeConfig, ServiceTypeConfig } from '../types';

// Fallback Mock Data (Usado se não houver Supabase configurado)
const MOCK_CONDO_ID = "00000000-0000-0000-0000-000000000001";
const STORAGE_KEYS = { VISITS: 'condoguard_visits', AUDIT: 'condoguard_audit', CONFIG_VISIT_TYPES: 'condoguard_vt', CONFIG_SERVICE_TYPES: 'condoguard_st' };

class DataService {
  private isOnline: boolean = navigator.onLine;
  private useRealBackend: boolean = !!supabase;
  private currentCondoId: string | null = null;

  constructor() {
    window.addEventListener('online', () => { this.isOnline = true; });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  // --- Auth ---
  async login(firstName: string, lastName: string, pin: string): Promise<Staff | null> {
    if (this.useRealBackend && this.isOnline) {
      try {
        // Usa o serviço real com verificação de HASH
        const staff = await SupabaseService.verifyStaffLogin(firstName, lastName, pin);
        
        if (staff) {
          this.currentCondoId = staff.condominium_id;
          
          // Cachear Configurações Dinâmicas ao Logar
          await this.refreshConfigs(staff.condominium_id);
          
          // Log Audit Remoto
          this.logAudit(staff.id, 'LOGIN', 'staff', staff.id, { method: 'app_kiosk' });
          return staff;
        }
        return null;
      } catch (e) {
        console.error("Login Error:", e);
        return null;
      }
    } else {
      // MOCK FALLBACK (Para testes sem backend)
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        id: 'bypass_guard_mock',
        first_name: firstName || 'Guarda',
        last_name: lastName || 'Local',
        pin_hash: '****',
        condominium_id: MOCK_CONDO_ID,
        role: UserRole.GUARD
      };
    }
  }

  // --- Configurações (Cache Local) ---
  private async refreshConfigs(condoId: string) {
    if (!this.useRealBackend) return;
    
    const vt = await SupabaseService.getVisitTypes(condoId);
    if (vt.length) localStorage.setItem(STORAGE_KEYS.CONFIG_VISIT_TYPES, JSON.stringify(vt));

    const st = await SupabaseService.getServiceTypes();
    if (st.length) localStorage.setItem(STORAGE_KEYS.CONFIG_SERVICE_TYPES, JSON.stringify(st));
  }

  async getVisitTypes(condoId: string): Promise<VisitTypeConfig[]> {
    const cached = localStorage.getItem(STORAGE_KEYS.CONFIG_VISIT_TYPES);
    // Se online, tenta atualizar em background, mas retorna cache para velocidade
    if (this.isOnline && this.useRealBackend) {
        SupabaseService.getVisitTypes(condoId).then(vt => {
            if(vt.length) localStorage.setItem(STORAGE_KEYS.CONFIG_VISIT_TYPES, JSON.stringify(vt));
        });
    }

    if (cached) return JSON.parse(cached);
    
    // Default Mock
    return [
      { id: 'vt1', name: 'Visitante', icon_key: 'USER', requires_service_type: false },
      { id: 'vt2', name: 'Entrega', icon_key: 'TRUCK', requires_service_type: false },
      { id: 'vt3', name: 'Estudante', icon_key: 'GRADUATION', requires_service_type: false },
      { id: 'vt4', name: 'Serviço', icon_key: 'WRENCH', requires_service_type: true },
    ];
  }

  async getServiceTypes(condoId: string): Promise<ServiceTypeConfig[]> {
    const cached = localStorage.getItem(STORAGE_KEYS.CONFIG_SERVICE_TYPES);
    if (cached) return JSON.parse(cached);

    // Default Mock
    return [
      { id: 'st1', name: 'Obras / Construção' }, 
      { id: 'st2', name: 'Internet / TV' },
      { id: 'st3', name: 'Canalização' },
      { id: 'st4', name: 'Eletricidade' },
      { id: 'st5', name: 'Limpeza' }
    ];
  }

  // --- Units & Residents ---
  async getUnits(): Promise<Unit[]> {
    // Tenta ir buscar online se possível
    if (this.useRealBackend && this.isOnline && this.currentCondoId) {
      const units = await SupabaseService.getUnitsWithResidents(this.currentCondoId);
      if (units.length > 0) return units;
    }

    // Mock Data Fallback (updated to match new schema)
    return [
      { id: 1, condominium_id: 1, code_block: 'A', number: '101', residents: [{id: 1, condominium_id: 1, unit_id: 1, name:'Alice Mock', phone:'911'}] },
      { id: 2, condominium_id: 1, code_block: 'A', number: '102', residents: [] },
      { id: 3, condominium_id: 1, code_block: 'B', number: '201', residents: [] },
    ];
  }

  // --- Visits (Offline First) ---
  private getLocalVisits(): Visit[] {
    const data = localStorage.getItem(STORAGE_KEYS.VISITS);
    return data ? JSON.parse(data) : [];
  }

  private saveLocalVisits(visits: Visit[]) {
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
  }

  async getTodaysVisits(): Promise<Visit[]> {
    const localVisits = this.getLocalVisits();
    
    if (this.useRealBackend && this.isOnline && this.currentCondoId) {
      const backendVisits = await SupabaseService.getTodaysVisits(this.currentCondoId);
      
      if (backendVisits.length > 0) {
        // Merge: Backend é a verdade, mas mantemos os nossos pendentes locais
        const localPending = localVisits.filter(v => v.sync_status === SyncStatus.PENDING_SYNC);
        
        // Remove duplicados (se o localPending já estiver no backend)
        const uniquePending = localPending.filter(lp => !backendVisits.some(bv => bv.id === lp.id));
        
        return [...uniquePending, ...backendVisits];
      }
    }

    return localVisits;
  }

  async createVisit(visitData: Partial<Visit>): Promise<Visit> {
    const newVisit: Visit = {
      ...visitData as Visit,
      id: this.useRealBackend ? crypto.randomUUID() : `v_${Date.now()}`,
      check_in_at: new Date().toISOString(),
      status: visitData.qr_token === 'VALID_RESIDENT_QR' ? VisitStatus.APPROVED : VisitStatus.PENDING,
      sync_status: SyncStatus.PENDING_SYNC,
      visit_type: visitData.visit_type || 'Visita', 
    };

    // 1. Guardar Localmente (Optimistic)
    const currentVisits = this.getLocalVisits();
    this.saveLocalVisits([newVisit, ...currentVisits]);

    // 2. Tentar Enviar para o Backend
    if (this.useRealBackend && this.isOnline) {
      const success = await this.pushVisitToSupabase(newVisit);
      if (success) {
        // Atualizar status local para SINCRONIZADO
        const updated = this.getLocalVisits().map(v => 
          v.id === newVisit.id ? { ...v, sync_status: SyncStatus.SYNCED } : v
        );
        this.saveLocalVisits(updated);
        // Atualizar ID temporário se necessário, mas como usamos UUID v4 gerado no cliente, deve bater certo.
      }
    }

    return newVisit;
  }

  async updateVisitStatus(visitId: string, status: VisitStatus): Promise<void> {
    const visits = this.getLocalVisits();
    const index = visits.findIndex(v => v.id === visitId);
    
    if (index !== -1) {
      visits[index].status = status;
      if (status === VisitStatus.LEFT) visits[index].check_out_at = new Date().toISOString();
      visits[index].sync_status = SyncStatus.PENDING_SYNC;
      
      this.saveLocalVisits(visits);

      // Tentar sync imediato
      if (this.useRealBackend && this.isOnline) {
        const updates: any = { status: status };
        if (visits[index].check_out_at) updates.check_out_at = visits[index].check_out_at;
        
        await SupabaseService.updateVisit(visitId, updates);
      }
    }
  }

  // --- Sync Engine ---
  private async pushVisitToSupabase(visit: Visit): Promise<boolean> {
    // Prepara o payload removendo campos de UI
    const payload = {
      id: visit.id,
      condominium_id: visit.condominium_id,
      visitor_name: visit.visitor_name,
      visitor_doc: visit.visitor_doc,
      visitor_phone: visit.visitor_phone,
      unit_id: visit.unit_id,
      reason: visit.reason,
      photo_url: visit.photo_url,
      qr_token: visit.qr_token,
      status: visit.status,
      check_in_at: visit.check_in_at,
      guard_id: visit.guard_id,
      visit_type_id: visit.visit_type_id,
      service_type_id: visit.service_type_id
    };

    return await SupabaseService.createVisit(payload);
  }

  async syncPendingItems(): Promise<number> {
    if (!this.useRealBackend || !this.isOnline) return 0;

    const visits = this.getLocalVisits();
    const pending = visits.filter(v => v.sync_status === SyncStatus.PENDING_SYNC);
    let syncedCount = 0;

    for (const visit of pending) {
      let success = false;
      
      // Lógica simplificada: Tenta Insert. Se falhar (chave duplicada), tenta Update.
      success = await this.pushVisitToSupabase(visit);
      
      if (!success) {
         // Tentar update (talvez seja um checkout)
         const updates: any = { status: visit.status };
         if (visit.check_out_at) updates.check_out_at = visit.check_out_at;
         success = await SupabaseService.updateVisit(visit.id, updates);
      }

      if (success) {
        visit.sync_status = SyncStatus.SYNCED;
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      this.saveLocalVisits(visits);
    }
    
    return syncedCount;
  }

  // --- Audit & Utils ---
  private logAudit(actorId: string, action: string, table: string, targetId: string | null, details: any) {
    if (this.useRealBackend && this.isOnline && this.currentCondoId) {
      SupabaseService.logAudit({
        condominium_id: this.currentCondoId,
        actor_id: actorId,
        action,
        target_table: table,
        target_id: targetId,
        details
      });
    }
  }

  async getIncidents(): Promise<Incident[]> {
    if (this.useRealBackend && this.isOnline && this.currentCondoId) {
      return await SupabaseService.getIncidents(this.currentCondoId);
    }
    return [];
  }

  async acknowledgeIncident(id: string, staffName: string) {
    // Precisamos do ID do staff logado, mas aqui simplificamos.
    // Em produção, passaríamos o ID real do utilizador logado no contexto.
    if (this.useRealBackend && this.isOnline) {
       // Assumindo que o backend resolve o staffId pelo token ou contexto, 
       // mas como estamos em kiosk anonimo, passamos null ou um ID guardado.
       // Para este exemplo, não passamos o ID correto, o que é uma limitação da arquitetura atual.
       await SupabaseService.acknowledgeIncident(id, 'staff_kiosk_action'); 
    }
  }

  checkOnline(): boolean { return this.isOnline; }
}

export const api = new DataService();
