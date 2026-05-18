import { db } from '../services/db';
import { SupabaseService } from '../services/Supabase';
import { Resident, Visit } from '../types';

function residentHasApp(resident?: Resident | null): boolean {
  return Boolean(resident && (resident.has_app_installed === true || resident.device_token));
}

function pickResidentWithApp(residents: Resident[]): Resident | null {
  return residents.find(residentHasApp) ?? null;
}

function pickResidentWithPhone(residents: Resident[]): Resident | null {
  return residents.find(resident => Boolean(resident.phone)) ?? null;
}

async function getCachedResidentsByUnitId(unitId: number): Promise<Resident[]> {
  return db.residents.where('unit_id').equals(unitId).toArray();
}

async function getCachedResidentById(residentId: number): Promise<Resident | null> {
  return db.residents.get(residentId) ?? null;
}

async function cacheResident(resident: Resident): Promise<void> {
  await db.residents.put(resident);
}

async function syncResidentsByUnitId(unitId: number): Promise<Resident[]> {
  const residents = await SupabaseService.getResidentsByUnitId(unitId);
  if (residents.length) {
    await db.residents.bulkPut(residents);
  }
  return residents;
}

async function resolveQrResidentId(visit: Visit, isOnline: boolean): Promise<number | null> {
  if (visit.resident_id) {
    return visit.resident_id;
  }

  if (!visit.qr_token || !isOnline) {
    return null;
  }

  const qrValidation = await SupabaseService.validateQrCode(visit.qr_token);
  return qrValidation?.resident_id ?? null;
}

async function getOnlineResidentsByVisit(visit: Visit): Promise<Resident[]> {
  const qrResidentId = await resolveQrResidentId(visit, true);
  if (qrResidentId) {
    const resident = await SupabaseService.getResidentById(qrResidentId);
    if (!resident) {
      return [];
    }
    await cacheResident(resident);
    return [resident];
  }

  if (!visit.unit_id) {
    return [];
  }

  return syncResidentsByUnitId(visit.unit_id);
}

async function getOfflineResidentsByVisit(visit: Visit): Promise<Resident[]> {
  const qrResidentId = await resolveQrResidentId(visit, false);
  if (qrResidentId) {
    const resident = await getCachedResidentById(qrResidentId);
    return resident ? [resident] : [];
  }

  if (!visit.unit_id) {
    return [];
  }

  return getCachedResidentsByUnitId(visit.unit_id);
}

export async function findResidentForPhone(visit: Visit, isOnline: boolean): Promise<Resident | null> {
  const residents = isOnline
    ? await getOnlineResidentsByVisit(visit)
    : await getOfflineResidentsByVisit(visit);

  return pickResidentWithPhone(residents);
}

export async function findResidentForVideoCall(visit: Visit, isOnline: boolean): Promise<Resident | null> {
  const residents = isOnline
    ? await getOnlineResidentsByVisit(visit)
    : await getOfflineResidentsByVisit(visit);

  return pickResidentWithApp(residents);
}

export async function visitHasResidentWithApp(visit: Visit, isOnline: boolean): Promise<boolean> {
  const resident = await findResidentForVideoCall(visit, isOnline);
  return Boolean(resident);
}
