import type {
  AppSettings,
  Appointment,
  AppointmentInput,
  AuditEntry,
  Cabinet,
  Conflict,
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
    public code: 'conflict_room' | 'conflict_attending' | 'conflict_receiving' | 'forbidden' | 'other',
    message: string,
  ) {
    super(message);
  }
}

/** Verificare conflicte în client (aceeași regulă ca în baza de date). */
export function findConflicts(
  input: Pick<AppointmentInput, 'room_id' | 'attending_id' | 'receiving_id' | 'starts_at' | 'ends_at' | 'status'>,
  others: Appointment[],
  selfId: string | null,
): Conflict[] {
  if (NON_BLOCKING.includes(input.status)) return [];
  const s = new Date(input.starts_at).getTime();
  const e = new Date(input.ends_at).getTime();
  const out: Conflict[] = [];
  for (const a of others) {
    if (a.id === selfId || NON_BLOCKING.includes(a.status)) continue;
    const as = new Date(a.starts_at).getTime();
    const ae = new Date(a.ends_at).getTime();
    if (!(s < ae && as < e)) continue;
    if (a.room_id === input.room_id) out.push({ kind: 'room', appointment: a });
    if (a.attending_id === input.attending_id) out.push({ kind: 'attending', appointment: a });
    if (input.receiving_id && a.receiving_id === input.receiving_id) out.push({ kind: 'receiving', appointment: a });
  }
  return out;
}
