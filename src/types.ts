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

/** Aparat sau sală: `capacity` = câți pacienți pot fi deodată. */
export type Audience = 'all' | 'inpatient' | 'outpatient';
export const AUDIENCES: Audience[] = ['all', 'inpatient', 'outpatient'];

export interface Room {
  id: string;
  cabinet_id: string;
  name: string;
  active: boolean;
  sort_order: number;
  capacity: number;
  audience: Audience;
}

export interface Procedure {
  id: string;
  name: string;
  short_name: string;
  color: string; // #rrggbb
  room_ids: string[]; // aparatele pe care se poate face (mai multe = capacitate paralelă)
  default_duration: number;
  active: boolean;
  sort_order: number;
}

export type PatientKind = 'inpatient' | 'outpatient';
export const PATIENT_KINDS: PatientKind[] = ['inpatient', 'outpatient'];
export type Frequency = 'daily' | 'alternate' | 'weekly';
export const FREQUENCIES: Frequency[] = ['daily', 'alternate', 'weekly'];

export interface Patient {
  id: string;
  code: string;
  initials: string;
  name: string | null;
  diagnosis: string | null;
  notes: string | null;
  kind: PatientKind;
  doctor_id: string | null;
  start_date: string; // YYYY-MM-DD
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** O procedură din planul unui pacient. */
export interface PlanItem {
  id: string;
  patient_id: string;
  procedure_id: string;
  sessions: number;
  frequency: Frequency;
  duration: number | null; // null = durata procedurii
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  clinic_name: string;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string | null;
  patient_code: string;
  patient_initials: string;
  patient_name: string | null;
  diagnosis: string | null;
  notes: string | null;
  procedure_id: string;
  room_id: string;
  starts_at: string; // ISO
  ends_at: string; // ISO
  attending_id: string | null;
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
  kind: 'room' | 'attending' | 'receiving' | 'patient';
  appointment: Appointment;
}
