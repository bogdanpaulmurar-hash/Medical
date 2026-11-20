export type Role = 'admin' | 'attending' | 'scheduler' | 'receiving';

export type Status = 'planned' | 'confirmed' | 'in_progress' | 'done' | 'cancelled' | 'no_show';

export const STATUSES: Status[] = ['planned', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show'];
export const ROLES: Role[] = ['admin', 'attending', 'scheduler', 'receiving'];

/** Statusuri care nu ocupă salonul / medicul. */
export const NON_BLOCKING: Status[] = ['cancelled', 'no_show'];

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
}

export interface Cabinet {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface Room {
  id: string;
  cabinet_id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface Procedure {
  id: string;
  name: string;
  default_duration: number;
  active: boolean;
  sort_order: number;
}

export interface AppSettings {
  clinic_name: string;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export interface Appointment {
  id: string;
  patient_code: string;
  patient_initials: string;
  patient_name: string | null;
  diagnosis: string | null;
  notes: string | null;
  procedure_id: string;
  room_id: string;
  starts_at: string; // ISO
  ends_at: string; // ISO
  attending_id: string;
  receiving_id: string | null;
  status: Status;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AppointmentInput = Omit<
  Appointment,
  'id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

export interface AuditEntry {
  id: number;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export interface Conflict {
  kind: 'room' | 'attending' | 'receiving';
  appointment: Appointment;
}
