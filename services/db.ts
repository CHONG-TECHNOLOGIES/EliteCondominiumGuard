import Dexie, { Table } from 'dexie';
import { Visit, Unit, VisitTypeConfig, ServiceTypeConfig, Staff, Condominium, Restaurant, Sport } from '../types';

export interface AppSetting {
  key: string;
  value: any;
}

export class CondoDatabase extends Dexie {
  visits!: Table<Visit>;
  units!: Table<Unit>;
  visitTypes!: Table<VisitTypeConfig>;
  serviceTypes!: Table<ServiceTypeConfig>;
  settings!: Table<AppSetting>;
  staff!: Table<Staff>;
  condominiums!: Table<Condominium>;
  restaurants!: Table<Restaurant>;
  sports!: Table<Sport>;

  constructor() {
    super('CondoGuardDB');
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
  }

  async clearAllData() {
    await this.visits.clear();
    await this.units.clear();
    await this.visitTypes.clear();
    await this.serviceTypes.clear();
    await this.settings.clear();
    await this.staff.clear();
    await this.condominiums.clear();
    await this.restaurants.clear();
    await this.sports.clear();
  }
}

export const db = new CondoDatabase();