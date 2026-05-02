

import { supabase } from './supabaseClient';
import { Staff, Visit, VisitEvent, VisitStatus, Unit, Incident, IncidentType, IncidentStatus, VisitTypeConfig, ServiceTypeConfig, Condominium, CondoSetupSettings, CondominiumStats, Device, Restaurant, Sport, AuditLog, DeviceRegistrationError, Street, Resident, ResidentQrCode, QrValidationResult, CondominiumNews, NewsCategory, CondominiumEvent, CondominiumEventCategory, CondominiumEventInput, AppPricingRule, CondominiumSubscription, SubscriptionPayment, VideoCallNotificationPayload, VideoCallSession, VideoCallStatus } from '../types';
import { buildIncidentActionHistoryIndex } from '../utils/incidentHistory';
import { logger, ErrorCategory } from '@/services/logger';
import { formatTimestampLabel } from '@/utils/datetime';

logger.setContext({ service: 'Supabase' });

const VISIT_STATUS_ALIASES: Record<string, VisitStatus> = {
  PENDING: VisitStatus.PENDING,
  APPROVED: VisitStatus.APPROVED,
  DENIED: VisitStatus.DENIED,
  INSIDE: VisitStatus.INSIDE,
  LEFT: VisitStatus.LEFT,
  [VisitStatus.PENDING]: VisitStatus.PENDING,
  [VisitStatus.APPROVED]: VisitStatus.APPROVED,
  [VisitStatus.DENIED]: VisitStatus.DENIED,
  [VisitStatus.INSIDE]: VisitStatus.INSIDE,
  [VisitStatus.LEFT]: VisitStatus.LEFT
};

const normalizeVisitStatus = (status: unknown): VisitStatus => {
  if (typeof status !== 'string') {
    return VisitStatus.PENDING;
  }

  return VISIT_STATUS_ALIASES[status] ?? VisitStatus.PENDING;
};

const normalizeVisit = (visit: Visit): Visit => ({
  ...visit,
  status: normalizeVisitStatus(visit.status)
});

const normalizeVisitEvent = (event: VisitEvent): VisitEvent => ({
  ...event,
  status: normalizeVisitStatus(event.status)
});

const getStoragePathFromPublicUrl = (publicUrl: string, bucket: string): string | null => {
  if (!publicUrl) return null;

  const normalizePath = (path: string): string | null => {
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    const signedPrefix = `/storage/v1/object/sign/${bucket}/`;
    const bucketPrefix = `/${bucket}/`;

    if (path.includes(publicPrefix)) {
      return decodeURIComponent(path.slice(path.indexOf(publicPrefix) + publicPrefix.length));
    }
    if (path.includes(signedPrefix)) {
      return decodeURIComponent(path.slice(path.indexOf(signedPrefix) + signedPrefix.length));
    }
    if (path.startsWith(bucketPrefix)) {
      return decodeURIComponent(path.slice(bucketPrefix.length));
    }
    if (path.startsWith(`${bucket}/`)) {
      return decodeURIComponent(path.slice(bucket.length + 1));
    }

    const cleaned = path.startsWith('/') ? path.slice(1) : path;
    return cleaned ? decodeURIComponent(cleaned) : null;
  };

  const trimmed = publicUrl.trim();

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      return normalizePath(url.pathname);
    }
  } catch {
    // Fall through to raw path parsing below.
  }

  return normalizePath(trimmed);
};

const mapAuditLogRows = (rows: any[]): AuditLog[] => (
  rows || []
).map((row: any) => ({
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

interface VideoCallPushFunctionResponse {
  success?: boolean;
  error?: string;
  delivered_count?: number;
  failed_count?: number;
  invalid_token_count?: number;
  invalid_tokens?: string[];
  ticket_ids?: string[];
  details?: unknown;
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const bodyText = await response.text();
  if (!bodyText) return null;

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
};

/**
 * Serviço Real de API Supabase
 * Responsável apenas pela comunicação direta com o Backend.
 * Não gere estado offline ou local storage.
 */
type AdminDeleteStaffResult =
  | { success: true }
  | {
    success: false;
    error?: {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
  };

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
      logger.error('Error getting condo', err, ErrorCategory.NETWORK);
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
      logger.error('Error listing condos', err, ErrorCategory.NETWORK);
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
      logger.error('Error getting streets', err, ErrorCategory.NETWORK);
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
      logger.error('Error adding street', err, ErrorCategory.NETWORK);
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
      logger.error('Error removing street', err, ErrorCategory.NETWORK);
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
      logger.error('Login RPC error', err, ErrorCategory.AUTH);
      return null;
    }
  },

  // --- QR Code Validation ---
  async validateQrCode(qrCode: string): Promise<QrValidationResult | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('validate_qr_code', { p_qr_code: qrCode })
        .single();

      if (error) throw error;
      return data as QrValidationResult;
    } catch (err: any) {
      logger.error('QR validation error', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async markQrCodeUsed(qrCode: string): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase.rpc('mark_qr_code_used', { p_qr_code: qrCode });
      if (error) throw error;
    } catch (err: any) {
      logger.error('Mark QR used error', err, ErrorCategory.NETWORK);
    }
  },

  // --- Configurações ---
  async getVisitTypes(condoId: number): Promise<VisitTypeConfig[]> {
    if (!supabase) {
      logger.error('Supabase client not initialized', null, ErrorCategory.NETWORK);
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('get_visit_types', { p_condominium_id: condoId });

      if (error) throw error;
      const visitTypes = (data as VisitTypeConfig[]) || [];
      return visitTypes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      logger.error('Error getting visit types', err, ErrorCategory.NETWORK);
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
      logger.error('Error getting service types', err, ErrorCategory.NETWORK);
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
      logger.error('Error getting restaurants', err, ErrorCategory.NETWORK);
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
      logger.error('Error getting sports', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  // --- Condominium Events ---
  async adminGetAllCondominiumEvents(
    condominiumId?: number,
    limit?: number | null,
    search?: string | null,
    category?: CondominiumEventCategory | null,
    dateFrom?: string | null,
    dateTo?: string | null,
    includeInactive: boolean = false
  ): Promise<CondominiumEvent[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_all_condominium_events', {
          p_condominium_id: condominiumId ?? null,
          p_limit: limit ?? null,
          p_search: search ?? null,
          p_category: category ?? null,
          p_date_from: dateFrom ?? null,
          p_date_to: dateTo ?? null,
          p_include_inactive: includeInactive
        });

      if (error) throw error;
      return (data as CondominiumEvent[]) || [];
    } catch (err: any) {
      logger.error('Error getting condominium events', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async adminCreateCondominiumEvent(event: CondominiumEventInput): Promise<CondominiumEvent | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_condominium_event', {
          p_data: {
            condominium_id: event.condominium_id,
            title: event.title,
            description: event.description,
            location: event.location,
            category: event.category,
            start_at: event.start_at,
            end_at: event.end_at ?? null,
            is_all_day: event.is_all_day ?? false,
            requires_rsvp: event.requires_rsvp ?? false,
            max_attendees: event.max_attendees ?? null,
            created_by: event.created_by ?? null,
            is_active: event.is_active ?? true
          }
        });

      if (error) throw error;
      return data as CondominiumEvent;
    } catch (err: any) {
      logger.error('Error creating condominium event', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async adminUpdateCondominiumEvent(id: number, event: CondominiumEventInput): Promise<CondominiumEvent | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_condominium_event', {
          p_id: id,
          p_data: {
            title: event.title,
            description: event.description,
            location: event.location,
            category: event.category,
            start_at: event.start_at,
            end_at: event.end_at ?? null,
            is_all_day: event.is_all_day,
            requires_rsvp: event.requires_rsvp,
            max_attendees: event.max_attendees ?? null,
            is_active: event.is_active
          }
        });

      if (error) throw error;
      return data as CondominiumEvent;
    } catch (err: any) {
      logger.error('Error updating condominium event', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async adminDeleteCondominiumEvent(id: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .rpc('admin_delete_condominium_event', { p_id: id });

      if (error) throw error;
      return data === true;
    } catch (err: any) {
      logger.error('Error deleting condominium event', err, ErrorCategory.NETWORK);
      return false;
    }
  },

  // --- News ---
  async getNews(condoId: number, days: number = 7): Promise<CondominiumNews[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_news', { p_condominium_id: condoId, p_days: days });

      if (error) throw error;
      return (data as CondominiumNews[]) || [];
    } catch (err: any) {
      logger.error('Error getting news', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async adminGetAllNews(
    condominiumId?: number,
    limit?: number | null,
    search?: string | null,
    categoryId?: number | null,
    dateFrom?: string | null,
    dateTo?: string | null,
    afterCreatedAt?: string | null,
    afterId?: number | null
  ): Promise<CondominiumNews[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_all_news', {
          p_condominium_id: condominiumId ?? null,
          p_limit: limit ?? null,
          p_search: search ?? null,
          p_category_id: categoryId ?? null,
          p_date_from: dateFrom ?? null,
          p_date_to: dateTo ?? null,
          p_after_created_at: afterCreatedAt ?? null,
          p_after_id: afterId ?? null
        });

      if (error) throw error;
      return (data as CondominiumNews[]) || [];
    } catch (err: any) {
      logger.error('Error getting all news', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async adminCreateNews(news: Partial<CondominiumNews>): Promise<CondominiumNews | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_news', {
          p_data: {
            condominium_id: news.condominium_id,
            title: news.title,
            description: news.description,
            content: news.content,
            image_url: news.image_url,
            category_id: news.category_id
          }
        });

      if (error) throw error;
      return data as CondominiumNews;
    } catch (err: any) {
      logger.error('Error creating news', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async adminUpdateNews(id: number, news: Partial<CondominiumNews>): Promise<CondominiumNews | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_news', {
          p_id: id,
          p_data: {
            title: news.title,
            description: news.description,
            content: news.content,
            image_url: news.image_url,
            category_id: news.category_id
          }
        });

      if (error) throw error;
      return data as CondominiumNews;
    } catch (err: any) {
      logger.error('Error updating news', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async adminDeleteNews(id: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_news', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('Error deleting news', err, ErrorCategory.NETWORK);
      return false;
    }
  },

  // --- News Categories ---
  async getNewsCategories(): Promise<NewsCategory[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_news_categories');

      if (error) throw error;
      return (data as NewsCategory[]) || [];
    } catch (err: any) {
      logger.error('Error getting news categories', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async adminCreateNewsCategory(category: Partial<NewsCategory>): Promise<NewsCategory | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_news_category', {
          p_data: {
            name: category.name,
            label: category.label
          }
        });

      if (error) throw error;
      return data as NewsCategory;
    } catch (err: any) {
      logger.error('Error creating news category', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async adminUpdateNewsCategory(id: number, category: Partial<NewsCategory>): Promise<NewsCategory | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_news_category', {
          p_id: id,
          p_data: {
            name: category.name,
            label: category.label
          }
        });

      if (error) throw error;
      return data as NewsCategory;
    } catch (err: any) {
      logger.error('Error updating news category', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async adminDeleteNewsCategory(id: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .rpc('admin_delete_news_category', { p_id: id });

      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('Error deleting news category', err, ErrorCategory.NETWORK);
      return false;
    }
  },

  // --- News Image Upload ---
  async uploadNewsImage(file: File, condominiumId: number, newsId: number): Promise<string | null> {
    if (!supabase) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${condominiumId}/${newsId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('news')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('news')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      logger.error('Error uploading news image', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async deleteNewsImage(imageUrl: string): Promise<boolean> {
    if (!supabase || !imageUrl) return false;

    try {
      const storagePath = getStoragePathFromPublicUrl(imageUrl, 'news');
      if (!storagePath) return false;

      const { error } = await supabase.storage
        .from('news')
        .remove([storagePath]);

      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('Error deleting news image', err, ErrorCategory.NETWORK);
      return false;
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
      logger.error('Error syncing staff', err, ErrorCategory.SYNC);
      return [];
    }
  },

  async adminGetResidents(condoId: number): Promise<Resident[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_residents', { p_condominium_id: condoId });

      if (error) throw error;

      const residents = (data as Resident[]) || [];

      // Process photos: generate public URLs if needed
      return residents.map(resident => {
        if (resident.photo_url && !resident.photo_url.startsWith('http')) {
          const { data: { publicUrl } } = supabase!.storage
            .from('resident-photos')
            .getPublicUrl(resident.photo_url);
          return { ...resident, photo_url: publicUrl };
        }
        return resident;
      });

    } catch (err: any) {
      logger.error('Error fetching residents (admin)', err, ErrorCategory.NETWORK);
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
      logger.error('Error fetching units', err, ErrorCategory.NETWORK);
      // RETHROW error so callers can handle fallback
      throw err;
    }
  },

  async getResidentsByUnitId(unitId: number): Promise<Resident[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .rpc('get_residents_by_unit_id', { p_unit_id: unitId });
      if (error || !data) return [];
      return data as Resident[];
    } catch (err: any) {
      logger.error('Error fetching residents by unit_id', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async getResidentById(residentId: number): Promise<Resident | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .rpc('get_resident', { p_id: residentId });
      if (error || !data?.length) return null;
      return data[0] as Resident;
    } catch (err: any) {
      logger.error('Error fetching resident by id', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  // --- Visitas ---
  async getTodaysVisits(condoId: number): Promise<Visit[]> {
    if (!supabase) return [];

    try {
      const normalizedCondoId = Number(condoId);
      if (!Number.isInteger(normalizedCondoId)) {
        logger.error('Error fetching visits: invalid condominium_id', null, ErrorCategory.NETWORK, { condoId, type: typeof condoId });
        return [];
      }

      // Use RPC to get visits (RPC already returns joined fields)
      const { data, error } = await supabase
        .rpc('get_todays_visits', { p_condominium_id: normalizedCondoId });

      if (error) throw error;

      return (data || []).map((v: any) => normalizeVisit({
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
      logger.error('Error fetching visits', err, ErrorCategory.NETWORK);
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
      logger.error('Create Visit Error', err, ErrorCategory.NETWORK);
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
      logger.error('Update Visit Error', err, ErrorCategory.NETWORK);
      return false;
    }
  },

  async updateVisitStatus(visitId: number, status: VisitStatus | string, checkOutAt?: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      if (checkOutAt || status === VisitStatus.LEFT || status === 'LEFT') {
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
      logger.error('Update Visit Status Error', err, ErrorCategory.NETWORK);
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
      logger.error('Create Visit Event Error', err, ErrorCategory.NETWORK);
      return null;
    }
  },

  async getVisitEvents(visitId: number): Promise<VisitEvent[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_visit_events', { p_visit_id: visitId });

      if (error) throw error;
      return ((data as VisitEvent[]) || []).map(normalizeVisitEvent);
    } catch (err: any) {
      logger.error('Get Visit Events Error', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  // --- Logs e Outros ---
  async logAudit(entry: any) {
    if (!supabase) return;
    supabase
      .rpc('create_audit_log', { p_data: entry })
      .then(({ error }) => {
        if (error) logger.error('Audit Log Error', error, ErrorCategory.NETWORK);
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
      logger.error('Error fetching incident types', err, ErrorCategory.NETWORK);
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
      logger.error('Error fetching incident statuses', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async getIncidents(condoId: number): Promise<Incident[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_incidents', { p_condominium_id: condoId });

      if (error) throw error;

      const incidents = (data || []).map((inc: any) => ({
        ...inc,
        resident: inc.residents,
        unit: inc.residents?.units,
        type_label: inc.incident_types?.label,
        status_label: inc.incident_statuses?.label
      }));

      if (incidents.length === 0) {
        return incidents;
      }

      const logs = await this.getIncidentAuditLogs(condoId, incidents.map(incident => incident.id));
      const historyByIncident = buildIncidentActionHistoryIndex(logs);

      return incidents.map(incident => ({
        ...incident,
        action_history: historyByIncident[incident.id] || incident.action_history
      }));
    } catch (err: any) {
      logger.error('Error fetching incidents', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async getIncidentAuditLogs(condominiumId: number | null, incidentIds: string[]): Promise<AuditLog[]> {
    if (!supabase || incidentIds.length === 0) return [];

    try {
      const { data, error } = await supabase.rpc('get_incident_audit_logs', {
        p_condominium_id: condominiumId,
        p_incident_ids: incidentIds
      });

      if (error) throw error;

      return mapAuditLogRows(data || []);
    } catch (err: any) {
      logger.error('Error fetching incident audit logs', err, ErrorCategory.NETWORK);
      return [];
    }
  },

  async acknowledgeIncident(id: string | number, staffId: number): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .rpc('acknowledge_incident', { p_id: id, p_guard_id: staffId });

      if (error) throw error;

      // Create notification for resident (best-effort, doesn't affect success)
      const incident = Array.isArray(data) ? data[0] : data;
      if (incident) {
        await this.createIncidentReadNotification(incident);
      }

      return true;
    } catch (err: any) {
      logger.error('Error acknowledging incident', err, ErrorCategory.NETWORK);
      return false;
    }
  },

  async reportIncidentAction(id: string | number, guardNotes: string, newStatus: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Concatenate new notes with existing notes to preserve history
      const timestamp = formatTimestampLabel();

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
      logger.error('Error reporting incident action', err, ErrorCategory.NETWORK);
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
      logger.error('Device registration error', err, ErrorCategory.DEVICE);
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
      logger.error('Heartbeat update error', err, ErrorCategory.DEVICE);
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
      logger.info('Device decommissioned', { data: deviceIdentifier });
      return true;
    } catch (err: any) {
      logger.error('Decommission device error', err, ErrorCategory.DEVICE);
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
      logger.error('Deactivate devices error', err, ErrorCategory.DEVICE);
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
      logger.error('Supabase client not initialized', null, ErrorCategory.NETWORK);
      return null;
    }

    try {
      logger.info('Starting photo upload for visitor', { data: visitorName });

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

      logger.debug('Photo blob created', { sizeBytes: blob.size });

      // Generate unique filename: condo_id/timestamp_visitorname.jpg
      const timestamp = Date.now();
      const sanitizedName = visitorName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${condoId}/${timestamp}_${sanitizedName}.jpg`;

      logger.info('Uploading to path', { data: fileName });

      // Upload to Supabase Storage bucket 'visitor-photos'
      const { data, error } = await supabase.storage
        .from('visitor-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logger.error('Upload error details:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw error;
      }

      logger.info('Upload successful, getting public URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(fileName);

      logger.info('Photo uploaded successfully', { data: publicUrl });
      return publicUrl;

    } catch (err: any) {
      logger.error('Photo upload error:', {
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
  async uploadCondoLogo(file: File, condoName?: string): Promise<string | null> {
    if (!supabase) {
      logger.error('Supabase client not initialized', null, ErrorCategory.NETWORK);
      return null;
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeFileName = sanitizedName || 'logo';
      const rawCondoName = condoName?.trim() || '';
      const condoSlug = rawCondoName
        ? rawCondoName
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .toLowerCase()
        : 'condominio';
      const safeCondoSlug = condoSlug || 'condominio';
      const bucketName = 'logo_condominio';
      const fileName = `${safeCondoSlug}/${Date.now()}_${safeFileName}`;

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      logger.error('Logo upload error', err, ErrorCategory.NETWORK);
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
      logger.error('Supabase client not initialized', null, ErrorCategory.NETWORK);
      return null;
    }

    try {
      logger.info('Starting photo upload for staff', { data: staffName });

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

      logger.debug('Staff photo blob created', { sizeBytes: blob.size });

      // Generate unique filename: condo_id/timestamp_staffname.jpg or global/timestamp_staffname.jpg
      const timestamp = Date.now();
      const sanitizedName = staffName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const folder = condoId ? condoId.toString() : 'global';
      const fileName = `${folder}/${timestamp}_${sanitizedName}.jpg`;

      logger.info('Uploading staff photo to path', { data: fileName });

      // Upload to Supabase Storage bucket 'staff-photos'
      const { data, error } = await supabase.storage
        .from('staff-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logger.error('Staff photo upload error details:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        });
        throw error;
      }

      logger.info('Staff photo upload successful, getting public URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-photos')
        .getPublicUrl(fileName);

      logger.info('Staff photo uploaded successfully', { data: publicUrl });
      return publicUrl;

    } catch (err: any) {
      logger.error('Staff photo upload error:', {
        message: err.message,
        error: err,
        stack: err.stack
      });
      return null;
    }
  },

  /**
   * Resolve a staff photo URL or path into a public URL for the staff-photos bucket.
   */
  getStaffPhotoPublicUrl(photoUrl?: string | null): string | null {
    if (!supabase || !photoUrl) return null;

    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    const storagePath = getStoragePathFromPublicUrl(photoUrl, 'staff-photos');
    if (!storagePath) return null;

    const { data: { publicUrl } } = supabase.storage
      .from('staff-photos')
      .getPublicUrl(storagePath);

    return publicUrl || null;
  },

  /**
   * Deletes a staff photo from Supabase Storage using the public URL
   * @param photoUrl - Public URL of the staff photo
   */
  async deleteStaffPhotoByUrl(photoUrl: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const storagePath = getStoragePathFromPublicUrl(photoUrl, 'staff-photos');
      if (!storagePath) {
        logger.error('Unable to resolve staff photo path from URL', null, ErrorCategory.NETWORK);
        return false;
      }

      const { error } = await supabase.storage
        .from('staff-photos')
        .remove([storagePath]);

      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('Staff photo delete error', err, ErrorCategory.NETWORK);
      return false;
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
      logger.error('Get device error', err, ErrorCategory.DEVICE);
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
      logger.error('Get devices by condominium error', err, ErrorCategory.DEVICE);
      return [];
    }
  },

  /**
   * Get all active devices with condominium names (for device recovery)
   * Returns devices with status='ACTIVE' enriched with condominium info
   */
  async getAllActiveDevicesWithCondoInfo(): Promise<(Device & { condominium_name?: string })[]> {
    if (!supabase) return [];

    try {
      // Fetch all devices using existing RPC
      const { data: devicesData, error: devicesError } = await supabase
        .rpc('admin_get_all_devices');

      if (devicesError) throw devicesError;

      const allDevices = (devicesData as Device[]) || [];
      const activeDevices = allDevices.filter(d => d.status === 'ACTIVE');

      if (activeDevices.length === 0) return [];

      // Fetch all condominiums to enrich device data
      const { data: condosData, error: condosError } = await supabase
        .rpc('get_condominiums');

      if (condosError) throw condosError;

      const condos = (condosData as Condominium[]) || [];
      const condoMap = new Map(condos.map(c => [c.id, c.name]));

      // Enrich devices with condominium names
      return activeDevices.map(device => ({
        ...device,
        condominium_name: device.condominium_id ? condoMap.get(device.condominium_id) : undefined
      }));
    } catch (err: any) {
      logger.error('Get all active devices error', err, ErrorCategory.DEVICE);
      return [];
    }
  },

  /**
   * Subscribe to device changes for realtime dashboards.
   * @param condominiumId - Optional condominium filter for scoped admins
   * @param onChange - Callback fired when device status changes
   * @returns Unsubscribe function
   */
  subscribeToDeviceChanges(condominiumId: number | null, onChange: () => void): () => void {
    if (!supabase) return () => { };

    const filter = condominiumId ? `condominium_id=eq.${condominiumId}` : undefined;
    const channel = supabase
      .channel(`devices-changes-${condominiumId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          ...(filter ? { filter } : {})
        },
        (payload: any) => {
          if (payload?.eventType === 'UPDATE') {
            const previousStatus = (payload.old as any)?.status;
            const nextStatus = (payload.new as any)?.status;
            const previousSeen = (payload.old as any)?.last_seen_at;
            const nextSeen = (payload.new as any)?.last_seen_at;
            if (
              previousStatus === nextStatus &&
              previousSeen === nextSeen
            ) {
              return;
            }
          }
          onChange();
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
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
      logger.error('Supabase client not initialized', null, ErrorCategory.NETWORK);
      return [];
    }

    try {
      logger.info('Calling admin_get_all_visits RPC with params:', {
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
        logger.error('RPC error', error, ErrorCategory.NETWORK);
        throw error;
      }

      logger.info('RPC returned visits', { count: data?.length || 0 });
      if (data && data.length > 0) {
        logger.info('Sample visit', { detail: String(data[0]) });
      }

      return ((data || []) as Visit[]).map(normalizeVisit);
    } catch (err: any) {
      logger.error("Error fetching visits via RPC:", {
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
      logger.error('Supabase client not initialized', null, ErrorCategory.NETWORK);
      return [];
    }

    try {
      logger.info('Calling admin_get_all_visits_filtered RPC with params:', {
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
        logger.error('RPC error', error, ErrorCategory.NETWORK);
        throw error;
      }

      logger.info('RPC returned filtered visits', { count: data?.length || 0 });
      return ((data || []) as Visit[]).map(normalizeVisit);
    } catch (err: any) {
      logger.error('Error fetching filtered visits via RPC:', {
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
        logger.debug('Sample incident from RPC', { sample: JSON.stringify(data[0], null, 2) });
        logger.debug('All keys', { keys: Object.keys(data[0]) });
      }

      const incidents = (data || []) as Incident[];
      if (incidents.length === 0) {
        return incidents;
      }

      const logs = await this.getIncidentAuditLogs(condominiumId ?? null, incidents.map(incident => incident.id));
      const historyByIncident = buildIncidentActionHistoryIndex(logs);

      return incidents.map(incident => ({
        ...incident,
        action_history: historyByIncident[incident.id] || incident.action_history
      }));
    } catch (err: any) {
      logger.error('Error fetching incidents via RPC', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching units via RPC', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching staff via RPC', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching dashboard stats via RPC', err, ErrorCategory.ADMIN);
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
            status: condo.status || 'ACTIVE',
            phone_number: condo.phone_number,
            contact_person: condo.contact_person,
            contact_email: condo.contact_email,
            manager_name: condo.manager_name,
            visitor_photo_enabled: condo.visitor_photo_enabled ?? true,
            intercom_approval_enabled: condo.intercom_approval_enabled ?? true,
            guard_manual_approval_enabled: condo.guard_manual_approval_enabled ?? true
          }
        });

      if (error) throw error;
      return data as Condominium;
    } catch (err: any) {
      logger.error('Error creating condominium', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating condominium', err, ErrorCategory.ADMIN);
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
      logger.error('Error toggling condominium status', err, ErrorCategory.ADMIN);
      return false;
    }
  },

  /**
   * Set setup-controlled entry permissions for a condominium.
   * Uses a SECURITY DEFINER RPC so it can be called during device setup
   * before any staff authentication has taken place.
   */
  async setCondoSetupSettings(condoId: number, settings: CondoSetupSettings): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('set_condo_setup_settings', {
        p_condo_id: condoId,
        p_visitor_photo_enabled: settings.visitor_photo_enabled,
        p_intercom_approval_enabled: settings.intercom_approval_enabled,
        p_guard_manual_approval_enabled: settings.guard_manual_approval_enabled,
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('Error setting condominium setup settings', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating device', err, ErrorCategory.ADMIN);
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
      logger.error('Error decommissioning device', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching devices', err, ErrorCategory.ADMIN);
      return [];
    }
  },

  /**
   * Admin: Create a new staff member (LEGACY - use adminCreateStaffWithPin instead)
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
            pin_hash: staff.pin_hash,
            photo_url: staff.photo_url
          }
        });

      if (error) throw error;
      return data as Staff;
    } catch (err: any) {
      logger.error('Error creating staff', err, ErrorCategory.ADMIN);
      return null;
    }
  },

  /**
   * Admin: Create a new staff member with server-side PIN hashing
   * @param staff - Staff data with plain text PIN
   * @param plainPin - Plain text PIN (will be hashed server-side)
   */
  async adminCreateStaffWithPin(
    first_name: string,
    last_name: string,
    condominium_id: number | null,
    role: string,
    plainPin: string,
    photo_url?: string
  ): Promise<Staff | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_staff_with_pin', {
          p_first_name: first_name,
          p_last_name: last_name,
          p_condominium_id: condominium_id,
          p_role: role,
          p_pin_cleartext: plainPin,
          p_photo_url: photo_url || null
        });

      if (error) throw error;
      return data as Staff;
    } catch (err: any) {
      logger.error('Error creating staff', err, ErrorCategory.ADMIN);
      return null;
    }
  },

  /**
   * Admin: Update staff PIN with server-side hashing
   * @param staffId - Staff ID
   * @param plainPin - Plain text PIN (will be hashed server-side)
   */
  async adminUpdateStaffPin(staffId: number, plainPin: string): Promise<Staff | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .rpc('admin_update_staff_pin', {
          p_staff_id: staffId,
          p_pin_cleartext: plainPin
        });

      if (error) throw error;
      return data as Staff;
    } catch (err: any) {
      logger.error('Error updating staff PIN', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating staff', err, ErrorCategory.ADMIN);
      return null;
    }
  },

  /**
   * Admin: Delete a staff member
   */
  async adminDeleteStaff(id: number): Promise<AdminDeleteStaffResult> {
    if (!supabase) return { success: false, error: { message: 'Supabase client not initialized' } };

    try {
      const { error } = await supabase
        .rpc('admin_delete_staff', { p_id: id });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        };
      }
      return { success: true };
    } catch (err: any) {
      logger.error('Error deleting staff', err, ErrorCategory.ADMIN);
      return {
        success: false,
        error: {
          message: err?.message ?? 'Unknown error'
        }
      };
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
      logger.error('Error creating unit', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating unit', err, ErrorCategory.ADMIN);
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
      logger.error('Error deleting unit', err, ErrorCategory.ADMIN);
      return false;
    }
  },

  // --- RESIDENTS CRUD ---

  /**
   * Admin: Get all residents (cross-condominium)
   */
  async adminGetAllResidents(
    condominiumId?: number,
    limit?: number | null,
    search?: string | null,
    afterName?: string | null,
    afterId?: number | null
  ): Promise<any[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('admin_get_residents', {
          p_condominium_id: condominiumId ?? null,
          p_limit: limit ?? null,
          p_search: search ?? null,
          p_after_name: afterName ?? null,
          p_after_id: afterId ?? null
        });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      logger.error('Error fetching residents', err, ErrorCategory.ADMIN);
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
      logger.error('Error creating resident', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating resident', err, ErrorCategory.ADMIN);
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
      logger.error('Error deleting resident', err, ErrorCategory.ADMIN);
      return false;
    }
  },

  /**
   * Admin: Get all QR codes for a resident
   * Uses existing RPC function get_active_qr_codes
   */
  async adminGetResidentQrCodes(residentId: number): Promise<ResidentQrCode[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_active_qr_codes', { p_resident_id: residentId });

      if (error) throw error;
      return (data as ResidentQrCode[]) || [];
    } catch (err: any) {
      logger.error('Error fetching resident QR codes', err, ErrorCategory.ADMIN);
      return [];
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
      logger.error('Error fetching restaurants', err, ErrorCategory.ADMIN);
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
      logger.error('Error creating restaurant', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating restaurant', err, ErrorCategory.ADMIN);
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
      logger.error('Error deleting restaurant', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching sports', err, ErrorCategory.ADMIN);
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
      logger.error('Error creating sport', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating sport', err, ErrorCategory.ADMIN);
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
      logger.error('Error deleting sport', err, ErrorCategory.ADMIN);
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

      const visit = normalizeVisit(data as Visit);

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
      logger.error('Error updating visit status', err, ErrorCategory.ADMIN);
      return null;
    }
  },

  // --- INCIDENT OPERATIONS ---

  /**
   * Admin: Acknowledge an incident
   */
  async adminAcknowledgeIncident(id: string, guardId: number, notes?: string): Promise<Incident | null> {
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
      logger.error('Error acknowledging incident', err, ErrorCategory.ADMIN);
      return null;
    }
  },

  /**
   * Admin: Resolve an incident
   */
  async adminResolveIncident(id: string, guardId: number, notes?: string): Promise<Incident | null> {
    if (!supabase) return null;

    try {
      const timestamp = formatTimestampLabel();

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
      logger.error('Error resolving incident', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating incident notes', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching visit types', err, ErrorCategory.ADMIN);
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
      logger.error('Error creating visit type', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating visit type', err, ErrorCategory.ADMIN);
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
      logger.error('Error deleting visit type', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching service types', err, ErrorCategory.ADMIN);
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
      logger.error('Error creating service type', err, ErrorCategory.ADMIN);
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
      logger.error('Error updating service type', err, ErrorCategory.ADMIN);
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
      logger.error('Error deleting service type', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching condominium stats', err, ErrorCategory.ADMIN);
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

      const logs = mapAuditLogRows(data || []);

      const total = data && data.length > 0 ? data[0].total_count : 0;
      return { logs, total };
    } catch (err: any) {
      logger.error('Error fetching audit logs', err, ErrorCategory.ADMIN);
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
      logger.error('Error fetching device registration errors', err, ErrorCategory.ADMIN);
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

      let condos = data as Condominium[] || [];

      const promises = condos.map(async (condo) => {
        const residents = await this.adminGetAllResidents(condo.id);
        
        return {
          ...condo,
          total_residents: residents.length || 0
        };
      });

      condos = await Promise.all(promises);

      const sorted = condos.sort((a, b) => a.name.localeCompare(b.name));
      return sorted;
    } catch (err: any) {
      logger.error('Error fetching all condominiums', err, ErrorCategory.ADMIN);
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
      const { data: residents, error: residentError } = await supabase
        .rpc('get_residents_by_unit_id', { p_unit_id: visit.unit_id });

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
      logger.error('Error creating visitor entered notification:', err.message);
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
      const { data: residents, error: residentError } = await supabase
        .rpc('get_residents_by_unit_id', { p_unit_id: visit.unit_id });

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
      logger.error('Error creating visitor left notification:', err.message);
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
      logger.error('Error creating incident read notification:', err.message);
      return false;
    }
  },

  // --- Subscriptions & Pricing ---
  async getAppPricingRules(): Promise<AppPricingRule[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.rpc('admin_get_app_pricing_rules');
      if (error) throw error;
      return (data as AppPricingRule[]) || [];
    } catch (err: any) {
      logger.error('Error fetching pricing rules', err.message);
      return [];
    }
  },

  async adminCreatePricingRule(rule: Partial<AppPricingRule>): Promise<AppPricingRule | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('admin_create_app_pricing_rule', {
        p_min_residents: rule.min_residents,
        p_max_residents: rule.max_residents ?? null,
        p_price_per_resident: rule.price_per_resident,
        p_currency: rule.currency || 'AOA'
      });
      if (error) throw error;
      return data as AppPricingRule;
    } catch (err: any) {
      logger.error('Error creating pricing rule', err.message);
      return null;
    }
  },

  async adminUpdatePricingRule(id: number, rule: Partial<AppPricingRule>): Promise<AppPricingRule | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('admin_update_app_pricing_rule', {
        p_id: id,
        p_min_residents: rule.min_residents ?? null,
        p_max_residents: rule.max_residents ?? null,
        p_price_per_resident: rule.price_per_resident ?? null,
        p_currency: rule.currency ?? null
      });
      if (error) throw error;
      return data as AppPricingRule;
    } catch (err: any) {
      logger.error('Error updating pricing rule', err.message);
      return null;
    }
  },

  async adminDeletePricingRule(id: number): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('admin_delete_app_pricing_rule', { p_id: id });
      if (error) throw error;
      return data === true;
    } catch (err: any) {
      logger.error('Error deleting pricing rule', err.message);
      return false;
    }
  },

  async adminGetCondominiumSubscriptions(filters?: { year?: number, month?: number }): Promise<CondominiumSubscription[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.rpc('admin_get_condominium_subscriptions', {
        p_year: filters?.year ?? null,
        p_month: filters?.month ?? null
      });
      if (error) throw error;
      return (data as CondominiumSubscription[]) || [];
    } catch (err: any) {
      logger.error('Error fetching enhanced subscriptions', err.message);
      return [];
    }
  },

  async adminUpdateSubscriptionStatus(id: number, condominium_id: number, status: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('admin_update_subscription_status', {
        p_id: id,
        p_condominium_id: condominium_id,
        p_status: status
      });
      if (error) throw error;
      return data === true;
    } catch (err: any) {
      logger.error('Error updating subscription status', err.message);
      return false;
    }
  },

  async adminUpdateSubscriptionDetails(
    id: number, 
    condominium_id: number, 
    updates: { status?: 'ACTIVE' | 'INACTIVE' | 'TRIAL', custom_price_per_resident?: number | null, discount_percentage?: number }
  ): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('admin_update_subscription_details', {
        p_id: id,
        p_condominium_id: condominium_id,
        p_status: updates.status ?? null,
        p_custom_price_per_resident: updates.custom_price_per_resident ?? null,
        p_discount_percentage: updates.discount_percentage ?? null
      });
      if (error) throw error;
      return data === true;
    } catch (err: any) {
      logger.error('Error updating subscription details', err.message);
      return false;
    }
  },

  async adminGetSubscriptionPayments(filters?: { condominium_id?: number, year?: number, month?: number }): Promise<SubscriptionPayment[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.rpc('admin_get_subscription_payments', {
        p_condominium_id: filters?.condominium_id ?? null,
        p_year: filters?.year ?? null,
        p_month: filters?.month ?? null
      });
      if (error) throw error;
      return (data as SubscriptionPayment[]) || [];
    } catch (err: any) {
      logger.error('Error fetching subscription payments', err.message);
      return [];
    }
  },

  async adminCreateSubscriptionPayment(payment: Partial<SubscriptionPayment>): Promise<SubscriptionPayment | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('admin_create_subscription_payment', {
        p_condominium_id: payment.condominium_id,
        p_amount: payment.amount,
        p_currency: payment.currency || 'AOA',
        p_payment_date: payment.payment_date,
        p_reference_period: payment.reference_period ?? null,
        p_status: payment.status || 'PAID',
        p_notes: payment.notes ?? null
      });
      if (error) throw error;
      return data as SubscriptionPayment;
    } catch (err: any) {
      logger.error('Error creating subscription payment', err.message);
      return null;
    }
  },

  async adminSendSubscriptionAlert(condominiumId: number, staffId: number): Promise<{ success: boolean; message: string; total_alerts?: number; blocked?: boolean }> {
    if (!supabase) return { success: false, message: 'Sem conexão com banco de dados' };
    try {
      const { data, error } = await supabase.rpc('admin_send_subscription_alert', {
        p_condominium_id: condominiumId,
        p_staff_id: staffId
      });
      if (error) throw error;
      return data as { success: boolean; message: string; total_alerts?: number; blocked?: boolean };
    } catch (err: any) {
      logger.error('Error sending subscription alert', err.message);
      return { success: false, message: err.message || 'Erro ao enviar alerta' };
    }
  },

  // ─── Video Call ─────────────────────────────────────────────────────────────

  async createVideoCallSession(params: {
    visit_id: number;
    guard_id: number;
    resident_id?: number;
    unit_id?: number;
    condominium_id: number;
    device_id?: string;
  }): Promise<VideoCallSession | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('create_video_call_session', {
        p_data: {
          visit_id: params.visit_id,
          guard_id: params.guard_id,
          resident_id: params.resident_id ?? null,
          unit_id: params.unit_id ?? null,
          condominium_id: params.condominium_id,
          device_id: params.device_id ?? null
        }
      });
      if (error) throw error;
      return data as VideoCallSession;
    } catch (err) {
      logger.error('Error creating video call session', err, ErrorCategory.NETWORK, {
        condominiumId: params.condominium_id,
        deviceId: params.device_id ?? null,
        guardId: params.guard_id,
        residentId: params.resident_id ?? null,
        rpc: 'create_video_call_session',
        unitId: params.unit_id ?? null,
        visitId: params.visit_id
      });
      return null;
    }
  },

  async updateVideoCallSessionStatus(
    sessionId: string,
    status: VideoCallStatus,
    rejectionReason?: string
  ): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc('update_video_call_session_status', {
        p_session_id: sessionId,
        p_status: status,
        p_rejection_reason: rejectionReason ?? null
      });
      if (error) throw error;
    } catch (err) {
      logger.error('Error updating video call session status', err, ErrorCategory.NETWORK, {
        rejectionReason: rejectionReason ?? null,
        rpc: 'update_video_call_session_status',
        sessionId,
        status
      });
    }
  },

  async updateVideoCallSessionOffer(sessionId: string, offerSdp: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc('update_video_call_session_offer', {
        p_session_id: sessionId,
        p_offer_sdp: offerSdp
      });
      if (error) throw error;
    } catch (err) {
      logger.error('Error saving video call offer SDP', err, ErrorCategory.NETWORK, {
        offerSdpLength: offerSdp.length,
        rpc: 'update_video_call_session_offer',
        sessionId
      });
    }
  },

  async getVideoCallSessionOffer(sessionId: string): Promise<string | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.rpc('get_video_call_session_offer', {
        p_session_id: sessionId
      });
      if (error) throw error;
      return typeof data === 'string' && data.trim() ? data : null;
    } catch (err) {
      logger.error('Error fetching video call offer SDP', err, ErrorCategory.NETWORK, {
        rpc: 'get_video_call_session_offer',
        sessionId
      });
      return null;
    }
  },

  async createVideoCallNotification(params: {
    resident_id: number;
    condominium_id: number;
    unit_id?: number;
    session_id: string;
    visit_id: number;
    visitor_name: string;
    visitor_photo_url?: string;
    guard_name: string;
    unit_number?: string;
    unit_block?: string;
  }): Promise<{ notificationCreated: boolean; pushSent: boolean; message?: string; deliveredCount?: number }> {
    if (!supabase) {
      return {
        notificationCreated: false,
        pushSent: false,
        message: 'Cliente Supabase indisponível.'
      };
    }

    try {
      const body = params.unit_block && params.unit_number
        ? `${params.visitor_name} aguarda na portaria. Guarda ${params.guard_name} quer mostrar o visitante. (${params.unit_block} ${params.unit_number})`
        : `${params.visitor_name} aguarda na portaria. Guarda ${params.guard_name} quer mostrar o visitante.`;
      const notificationPayload: VideoCallNotificationPayload = {
        session_id: params.session_id,
        visit_id: params.visit_id,
        visitor_name: params.visitor_name,
        visitor_photo_url: params.visitor_photo_url ?? null,
        guard_name: params.guard_name,
        unit_number: params.unit_number ?? null,
        unit_block: params.unit_block ?? null
      };

      const { error } = await supabase.rpc('create_notification', {
        p_resident_id: params.resident_id,
        p_condominium_id: params.condominium_id,
        p_unit_id: params.unit_id ?? null,
        p_title: 'Chamada de vídeo',
        p_body: body,
        p_type: 'VIDEO_CALL_REQUEST',
        p_data: notificationPayload
      });
      if (error) throw error;

      // Push is triggered server-side via pg_net inside create_notification — no browser fetch needed
      return {
        notificationCreated: true,
        pushSent: true
      };
    } catch (err) {
      logger.error('Error creating video call notification', err, ErrorCategory.NETWORK, {
        residentId: params.resident_id,
        rpc: 'create_notification',
        sessionId: params.session_id,
        visitId: params.visit_id
      });
      return {
        notificationCreated: false,
        pushSent: false,
        message: 'Não foi possível notificar o morador para a chamada de vídeo.'
      };
    }
  }
};
