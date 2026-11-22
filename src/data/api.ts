import type {
  AppSettings,
  Appointment,
  AppointmentInput,
  AuditEntry,
  Cabinet,
  Conflict,
  Patient,
  PatientDocument,
  DocKind,
  PatientKind,
  PlanItem,
  Procedure,
  Profile,
  Room,
  Status,
} from '../types';
import { NON_BLOCKING } from '../types';

/**
 * Stratul de date. Există două implementări:
 *  - SupabaseApi: baza de date reală (producție);
 *  - DemoApi: date fictive în localStorage, pentru încercare fără server.
 */
export interface SearchFilters {
  text?: string; // cod, inițiale sau nume
  includeNotes?: boolean; // caută și în diagnostic și note
  procedureId?: string;
  roomId?: string;
  doctorId?: string; // medic curant sau primitor
  status?: Status | '';
  from?: string; // ISO, inclusiv
  to?: string; // ISO, exclusiv
}

export interface AuditFilters {
  recordId?: string;
  limit?: number;
  userId?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  from?: string; // ISO, inclusiv
  to?: string; // ISO, exclusiv
}

export interface Api {
  readonly mode: 'supabase' | 'demo';

  // Autentificare
  getSessionUserId(): Promise<string | null>;
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  onAuthChange(cb: () => void): () => void;

  // Profiluri
  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, patch: Partial<Profile>): Promise<void>;
  inviteUser(email: string, fullName: string, role: Profile['role']): Promise<void>;

  // Nomenclatoare
  listCabinets(): Promise<Cabinet[]>;
  saveCabinet(c: Partial<Cabinet> & { name: string }): Promise<void>;
  listRooms(): Promise<Room[]>;
  saveRoom(r: Partial<Room> & { name: string; cabinet_id: string }): Promise<void>;
  listProcedures(): Promise<Procedure[]>;
  saveProcedure(p: Partial<Procedure> & { name: string }): Promise<void>;

  // Pacienți și planul lor de proceduri
  listPatients(): Promise<Patient[]>;
  savePatient(p: Partial<Patient> & { code: string; initials: string }): Promise<Patient>;
  listPlan(): Promise<PlanItem[]>;
  savePlanItem(i: Partial<PlanItem> & { patient_id: string; procedure_id: string }): Promise<PlanItem>;
  /** Pacienți sau plan modificate de oricine (timp real). */
  onPatientsChange(cb: () => void): () => void;
  /** Toate programările unui pacient (orice dată), cele mai vechi primele. */
  listPatientAppointments(patientId: string): Promise<Appointment[]>;

  // Documente medicale la pacient (doar medicii; vezi migrarea 0004)
  getDocument(patientId: string, kind: DocKind): Promise<PatientDocument | null>;
  saveDocument(patientId: string, kind: DocKind, data: Record<string, unknown>): Promise<PatientDocument>;
  deleteDocument(patientId: string, kind: DocKind): Promise<void>;
  /** Șterge documentele expirate după politica de retenție; întoarce câte au fost șterse. */
  purgeExpiredDocuments(): Promise<number>;

  // Setări
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;

  // Programări
  listAppointments(fromIso: string, toIso: string): Promise<Appointment[]>;
  saveAppointment(id: string | null, input: AppointmentInput): Promise<Appointment>;
  onAppointmentsChange(cb: () => void): () => void;

  // Istoric
  listAudit(opts: AuditFilters): Promise<AuditEntry[]>;

  // Căutare în toate programările (cele mai noi primele)
  searchAppointments(f: SearchFilters, offset: number, limit: number): Promise<{ rows: Appointment[]; total: number }>;
}

/** Eroare cu cod, ca UI-ul să poată afișa mesajul tradus. */
export class ApiError extends Error {
  constructor(
    public code:
      | 'conflict_room'
      | 'conflict_attending'
      | 'conflict_receiving'
      | 'conflict_patient'
      | 'not_in_plan'
      | 'forbidden'
      | 'other',
    message: string,
  ) {
    super(message);
  }
}

type LiveSlot = Pick<Appointment, 'id' | 'room_id' | 'starts_at' | 'ends_at' | 'status'>;

const ms = (iso: string) => new Date(iso).getTime();
const live = (a: Pick<Appointment, 'status'>) => !NON_BLOCKING.includes(a.status);

/**
 * Programările care depășesc capacitatea aparatului în intervalul [start, end).
 * Numărul maxim de ședințe simultane se atinge la ora de început a uneia
 * dintre ele (aceeași regulă ca trigger-ul din baza de date).
 */
export function roomOverload(
  roomId: string,
  capacity: number,
  startIso: string,
  endIso: string,
  others: LiveSlot[],
  selfId: string | null,
): Appointment[] {
  const s = ms(startIso);
  const e = ms(endIso);
  const same = others.filter(
    (a) => a.room_id === roomId && a.id !== selfId && live(a) && ms(a.starts_at) < e && ms(a.ends_at) > s,
  );
  const points = new Set<number>([s]);
  for (const a of same) if (ms(a.starts_at) > s) points.add(ms(a.starts_at));
  for (const t of points) {
    const active = same.filter((a) => ms(a.starts_at) <= t && ms(a.ends_at) > t);
    if (active.length + 1 > capacity) return active as Appointment[];
  }
  return [];
}

/** Aparatele (din lista procedurii) care au loc liber în interval, pentru tipul de pacient. */
export function freeRooms(
  roomIds: string[],
  rooms: Room[],
  kind: PatientKind | null,
  startIso: string,
  endIso: string,
  others: LiveSlot[],
  selfId: string | null,
): Room[] {
  return roomIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is Room => !!r && r.active)
    .filter((r) => r.audience === 'all' || !kind || r.audience === kind)
    .filter((r) => roomOverload(r.id, r.capacity, startIso, endIso, others, selfId).length === 0);
}

/** Verificare conflicte în client (aceeași regulă ca în baza de date). */
export function findConflicts(
  input: Pick<
    AppointmentInput,
    'room_id' | 'attending_id' | 'receiving_id' | 'patient_id' | 'starts_at' | 'ends_at' | 'status'
  >,
  others: Appointment[],
  selfId: string | null,
  rooms: Pick<Room, 'id' | 'capacity'>[] = [],
): Conflict[] {
  if (NON_BLOCKING.includes(input.status)) return [];
  const s = ms(input.starts_at);
  const e = ms(input.ends_at);
  const out: Conflict[] = [];
  const capacity = rooms.find((r) => r.id === input.room_id)?.capacity ?? 1;
  for (const a of roomOverload(input.room_id, capacity, input.starts_at, input.ends_at, others, selfId)) {
    out.push({ kind: 'room', appointment: a });
  }
  for (const a of others) {
    if (a.id === selfId || !live(a)) continue;
    if (!(s < ms(a.ends_at) && ms(a.starts_at) < e)) continue;
    if (input.attending_id && a.attending_id === input.attending_id) out.push({ kind: 'attending', appointment: a });
    if (input.receiving_id && a.receiving_id === input.receiving_id) out.push({ kind: 'receiving', appointment: a });
    if (input.patient_id && a.patient_id === input.patient_id) out.push({ kind: 'patient', appointment: a });
  }
  return out;
}
