import Dexie, { Table } from 'dexie';
import { Visit, VisitEvent, Unit, VisitTypeConfig, ServiceTypeConfig, Staff, Condominium, Restaurant, Sport, Incident, IncidentType, IncidentStatus, Device } from '../types';

export interface AppSetting {
  key: string;
  value: any;
}

export class CondoDatabase extends Dexie {
  visits!: Table<Visit>;
  visitEvents!: Table<VisitEvent>;
  units!: Table<Unit>;
  visitTypes!: Table<VisitTypeConfig>;
  serviceTypes!: Table<ServiceTypeConfig>;
  settings!: Table<AppSetting>;
  staff!: Table<Staff>;
  condominiums!: Table<Condominium>;
  restaurants!: Table<Restaurant>;
  sports!: Table<Sport>;
  incidents!: Table<Incident>;
  incidentTypes!: Table<IncidentType>;
  incidentStatuses!: Table<IncidentStatus>;
  devices!: Table<Device>;

  constructor() {
    super('AccesControlDB');
    // FIX: Cast `this` to Dexie to resolve a potential TypeScript type inference error where `version` is not found on the subclass type.
    (this as Dexie).version(1).stores({
      visits: 'id, condominium_id, status, sync_status, check_in_at',
      units: 'id, condominium_id, code_block, number',
      visitTypes: 'id',
      serviceTypes: 'id',
      settings: 'key',
      staff: 'id, condominium_id'
    });

    (this as Dexie).version(2).stores({
      condominiums: 'id, status'
    });

    (this as Dexie).version(3).stores({
      restaurants: 'id, condominium_id, status',
      sports: 'id, condominium_id, status'
    });

    // Version 4: Add compound index for staff login (first_name + last_name)
    (this as Dexie).version(4).stores({
      staff: 'id, condominium_id, [first_name+last_name]'
    });

    // Version 5: Add incidents table
    (this as Dexie).version(5).stores({
      incidents: 'id, resident_id, status, sync_status, reported_at'
    });

    // Version 6: Add incident types and statuses lookup tables
    (this as Dexie).version(6).stores({
      incidentTypes: 'code, sort_order',
      incidentStatuses: 'code, sort_order'
    });

    // Version 7: Add devices table (synced with central database)
    (this as Dexie).version(7).stores({
      devices: 'id, device_identifier, condominium_id, status'
    });

    // Version 8: Add device_id index to visits for device tracking
    (this as Dexie).version(8).stores({
      visits: 'id, condominium_id, status, sync_status, check_in_at, device_id'
    });

    // Version 9: Add visit events table for visit status tracking
    (this as Dexie).version(9).stores({
      visitEvents: 'id, visit_id, status, sync_status, event_at'
    });

    // Version 10: Auto-increment visitEvents primary key for local inserts
    (this as Dexie).version(10).stores({
      visitEvents: '++id, visit_id, status, sync_status, event_at'
    });
  }

  async clearAllData() {
    await this.visits.clear();
    await this.visitEvents.clear();
    await this.units.clear();
    await this.visitTypes.clear();
    await this.serviceTypes.clear();
    await this.settings.clear();
    await this.staff.clear();
    await this.condominiums.clear();
    await this.restaurants.clear();
    await this.sports.clear();
    await this.incidents.clear();
    await this.incidentTypes.clear();
    await this.incidentStatuses.clear();
    await this.devices.clear();
  }
}

export const db = new CondoDatabase();
