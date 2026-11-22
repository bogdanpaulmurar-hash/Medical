import type { Api, AuditFilters, SearchFilters } from './api';
import { ApiError, findConflicts } from './api';
import type {
  AppSettings,
  Appointment,
  AppointmentInput,
  AuditEntry,
  Cabinet,
  Procedure,
  Profile,
  Room,
} from '../types';

/**
 * MOD DEMO: totul rămâne în localStorage-ul acestui browser.
 * Toate datele sunt FICTIVE. Folosit doar pentru încercarea interfeței.
 */
const KEY = 'medsched-demo-v2';
const SESSION_KEY = 'medsched-demo-session';

interface DB {
  profiles: Profile[];
  cabinets: Cabinet[];
  rooms: Room[];
  procedures: Procedure[];
  settings: AppSettings;
  appointments: Appointment[];
  audit: AuditEntry[];
}

const uid = () => crypto.randomUUID();

function seed(): DB {
  const p = (id: string, email: string, full_name: string, role: Profile['role']): Profile => ({
    id, email, full_name, role, active: true, phone: null, notify_email: true, notify_sms: false,
  });
  const profiles = [
    p('u-admin', 'admin@exemplu.test', 'Dr. Ana Demo (admin)', 'admin'),
    p('u-att1', 'curant1@exemplu.test', 'Dr. Mihai Curant', 'attending'),
    p('u-att2', 'curant2@exemplu.test', 'Dr. Ioana Curant', 'attending'),
    p('u-sch', 'programari@exemplu.test', 'Elena Programări', 'scheduler'),
    p('u-rec', 'primitor@exemplu.test', 'Dr. Radu Primitor', 'receiving'),
  ];
  const cabinets: Cabinet[] = [
    { id: 'c1', name: 'Cabinet 1', active: true, sort_order: 1 },
    { id: 'c2', name: 'Cabinet 2', active: true, sort_order: 2 },
  ];
  const rooms: Room[] = [
    { id: 'r1', cabinet_id: 'c1', name: 'Salon A', active: true, sort_order: 1 },
    { id: 'r2', cabinet_id: 'c1', name: 'Salon B', active: true, sort_order: 2 },
    { id: 'r3', cabinet_id: 'c2', name: 'Salon C', active: true, sort_order: 1 },
  ];
  const procedures: Procedure[] = [
    { id: 'p1', name: 'Consult', default_duration: 30, active: true, sort_order: 1 },
    { id: 'p2', name: 'Ecografie', default_duration: 20, active: true, sort_order: 2 },
    { id: 'p3', name: 'Procedură minoră', default_duration: 60, active: true, sort_order: 3 },
  ];
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const at = (h: number, m: number, dayOffset = 0) => {
    const d = new Date(day);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m);
    return d.toISOString();
  };
  const now = new Date().toISOString();
  const a = (
    code: string, ini: string, proc: string, room: string, s: string, e: string, att: string,
    rec: string | null, status: Appointment['status'],
  ): Appointment => ({
    id: uid(), patient_code: code, patient_initials: ini, patient_name: null, diagnosis: null, notes: null,
    procedure_id: proc, room_id: room, starts_at: s, ends_at: e, attending_id: att, receiving_id: rec, status,
    created_by: 'u-sch', updated_by: 'u-sch', created_at: now, updated_at: now,
  });
  const appointments = [
    a('D-1001', 'A.B.', 'p1', 'r1', at(9, 0), at(9, 30), 'u-att1', null, 'confirmed'),
    a('D-1002', 'C.D.', 'p3', 'r2', at(10, 0), at(11, 0), 'u-att1', 'u-rec', 'planned'),
    a('D-1003', 'E.F.', 'p2', 'r3', at(10, 30), at(10, 50), 'u-att2', null, 'planned'),
    a('D-1004', 'G.H.', 'p1', 'r1', at(12, 0), at(12, 30), 'u-att2', null, 'cancelled'),
    a('D-1005', 'I.J.', 'p3', 'r1', at(9, 0, 1), at(10, 0, 1), 'u-att1', 'u-rec', 'planned'),
    a('D-1006', 'K.L.', 'p2', 'r2', at(9, 15), at(9, 35), 'u-att2', null, 'in_progress'),
    a('D-1007', 'M.N.', 'p1', 'r3', at(11, 30), at(12, 0), 'u-att1', null, 'planned'),
    a('D-1008', 'O.P.', 'p3', 'r1', at(13, 0), at(14, 0), 'u-att2', 'u-rec', 'confirmed'),
    a('D-1009', 'Q.R.', 'p1', 'r2', at(14, 30), at(15, 0), 'u-att1', null, 'planned'),
    a('D-1010', 'S.T.', 'p2', 'r3', at(9, 0, 2), at(9, 20, 2), 'u-att2', null, 'planned'),
  ];
  appointments[0].notes = 'Control după 2 săptămâni';
  const entry = (id: number, ap: Appointment, action: AuditEntry['action'], by: string, email: string, at: string, oldD: Appointment | null): AuditEntry => ({
    id, table_name: 'appointments', record_id: ap.id, action, changed_by: by, changed_by_email: email,
    changed_at: at, old_data: oldD as unknown as Record<string, unknown> | null,
    new_data: ap as unknown as Record<string, unknown>,
  });
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const audit: AuditEntry[] = appointments.map((ap, i) =>
    entry(i + 1, ap, 'INSERT', 'u-sch', 'programari@exemplu.test', hoursAgo(30 - i), null),
  );
  // Exemplu de istoric cu mai multe modificări pentru prima programare.
  const first = appointments[0];
  const v0 = { ...first, status: 'planned' as const, notes: null, updated_at: hoursAgo(30) };
  const v1 = { ...first, status: 'confirmed' as const, notes: null, updated_at: hoursAgo(5) };
  audit.push(entry(audit.length + 1, v1, 'UPDATE', 'u-att1', 'curant1@exemplu.test', hoursAgo(5), v0));
  audit.push(entry(audit.length + 1, first, 'UPDATE', 'u-sch', 'programari@exemplu.test', hoursAgo(1), v1));
  first.status = 'confirmed';
  first.updated_by = 'u-sch';
  first.updated_at = hoursAgo(1);
  audit.reverse(); // cele mai noi primele
  return {
    profiles, cabinets, rooms, procedures, appointments, audit,
    settings: { clinic_name: 'Clinica Demo', email_enabled: true, sms_enabled: false },
  };
}

export class DemoApi implements Api {
  readonly mode = 'demo' as const;
  private db: DB;
  private authListeners = new Set<() => void>();
  private apptListeners = new Set<() => void>();

  constructor() {
    let db: DB | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) db = JSON.parse(raw) as DB;
    } catch {
      /* ignore */
    }
    this.db = db ?? seed();
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.db));
    } catch {
      /* ignore */
    }
  }

  private me(): string | null {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  private audit(table: string, id: string | null, action: AuditEntry['action'], oldD: unknown, newD: unknown) {
    const me = this.db.profiles.find((p) => p.id === this.me());
    this.db.audit.unshift({
      id: (this.db.audit[0]?.id ?? 0) + 1,
      table_name: table,
      record_id: id,
      action,
      changed_by: me?.id ?? null,
      changed_by_email: me?.email ?? null,
      changed_at: new Date().toISOString(),
      old_data: (oldD as Record<string, unknown>) ?? null,
      new_data: (newD as Record<string, unknown>) ?? null,
    });
  }

  private requireAdmin() {
    const me = this.db.profiles.find((p) => p.id === this.me());
    if (me?.role !== 'admin') throw new ApiError('forbidden', 'admin only');
  }

  /** Generic upsert pentru nomenclatoare, cu istoric. */
  private upsert<T extends { id: string }>(table: string, list: T[], item: Partial<T>, defaults: Omit<T, 'id'>) {
    if (item.id) {
      const i = list.findIndex((x) => x.id === item.id);
      const old = list[i];
      list[i] = { ...old, ...item };
      this.audit(table, old.id, 'UPDATE', old, list[i]);
    } else {
      const created = { ...defaults, ...item, id: uid() } as T;
      list.push(created);
      this.audit(table, created.id, 'INSERT', null, created);
    }
    this.persist();
  }

  // --- auth (demo: alegi utilizatorul din listă; „emailul” e doar simulat)
  async getSessionUserId() {
    return this.me();
  }
  async sendMagicLink(email: string) {
    const user = this.db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase() && p.active);
    if (!user) throw new ApiError('other', 'unknown user');
    localStorage.setItem(SESSION_KEY, user.id);
    this.authListeners.forEach((cb) => cb());
  }
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    this.authListeners.forEach((cb) => cb());
  }
  onAuthChange(cb: () => void) {
    this.authListeners.add(cb);
    return () => this.authListeners.delete(cb);
  }

  async listProfiles() {
    return [...this.db.profiles].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }
  async updateProfile(id: string, patch: Partial<Profile>) {
    if (patch.role !== undefined || patch.active !== undefined || patch.email !== undefined) this.requireAdmin();
    this.upsert('profiles', this.db.profiles, { ...patch, id }, {} as Omit<Profile, 'id'>);
  }
  async inviteUser(email: string, full_name: string, role: Profile['role']) {
    this.requireAdmin();
    this.upsert('profiles', this.db.profiles, { email, full_name, role }, {
      email, full_name, role, active: true, phone: null, notify_email: true, notify_sms: false,
    });
  }

  async listCabinets() {
    return [...this.db.cabinets].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  async saveCabinet(c: Partial<Cabinet> & { name: string }) {
    this.upsert('cabinets', this.db.cabinets, c, { name: c.name, active: true, sort_order: 0 });
  }
  async listRooms() {
    return [...this.db.rooms].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  async saveRoom(r: Partial<Room> & { name: string; cabinet_id: string }) {
    this.upsert('rooms', this.db.rooms, r, { name: r.name, cabinet_id: r.cabinet_id, active: true, sort_order: 0 });
  }
  async listProcedures() {
    return [...this.db.procedures].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  async saveProcedure(p: Partial<Procedure> & { name: string }) {
    this.upsert('procedures', this.db.procedures, p, {
      name: p.name, default_duration: 30, active: true, sort_order: 0,
    });
  }

  async getSettings() {
    return { ...this.db.settings };
  }
  async updateSettings(patch: Partial<AppSettings>) {
    this.requireAdmin();
    const old = this.db.settings;
    this.db.settings = { ...old, ...patch };
    this.audit('app_settings', null, 'UPDATE', old, this.db.settings);
    this.persist();
  }

  async listAppointments(fromIso: string, toIso: string) {
    const f = new Date(fromIso).getTime();
    const t = new Date(toIso).getTime();
    return this.db.appointments
      .filter((a) => new Date(a.starts_at).getTime() < t && new Date(a.ends_at).getTime() > f)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  async saveAppointment(id: string | null, input: AppointmentInput) {
    const conflicts = findConflicts(input, this.db.appointments, id);
    if (conflicts.length) {
      const k = conflicts[0].kind;
      throw new ApiError(k === 'room' ? 'conflict_room' : k === 'attending' ? 'conflict_attending' : 'conflict_receiving', k);
    }
    const now = new Date().toISOString();
    let result: Appointment;
    if (id) {
      const i = this.db.appointments.findIndex((a) => a.id === id);
      const old = this.db.appointments[i];
      result = { ...old, ...input, updated_at: now, updated_by: this.me() };
      this.db.appointments[i] = result;
      this.audit('appointments', id, 'UPDATE', old, result);
    } else {
      result = { ...input, id: uid(), created_at: now, updated_at: now, created_by: this.me(), updated_by: this.me() };
      this.db.appointments.push(result);
      this.audit('appointments', result.id, 'INSERT', null, result);
    }
    this.persist();
    this.apptListeners.forEach((cb) => cb());
    return result;
  }

  onAppointmentsChange(cb: () => void) {
    this.apptListeners.add(cb);
    return () => this.apptListeners.delete(cb);
  }

  async listAudit({ recordId, limit = 200, userId, action, from, to }: AuditFilters) {
    return this.db.audit
      .filter(
        (e) =>
          (!recordId || e.record_id === recordId) &&
          (!userId || e.changed_by === userId) &&
          (!action || e.action === action) &&
          (!from || e.changed_at >= from) &&
          (!to || e.changed_at < to),
      )
      .slice(0, limit);
  }

  async searchAppointments(f: SearchFilters, offset: number, limit: number) {
    const t = (f.text ?? '').trim().toLowerCase();
    const hit = (v: string | null) => !!v && v.toLowerCase().includes(t);
    const all = this.db.appointments
      .filter(
        (a) =>
          (!t ||
            hit(a.patient_code) || hit(a.patient_initials) || hit(a.patient_name) ||
            (!!f.includeNotes && (hit(a.diagnosis) || hit(a.notes)))) &&
          (!f.doctorId || a.attending_id === f.doctorId || a.receiving_id === f.doctorId) &&
          (!f.procedureId || a.procedure_id === f.procedureId) &&
          (!f.roomId || a.room_id === f.roomId) &&
          (!f.status || a.status === f.status) &&
          (!f.from || a.starts_at >= f.from) &&
          (!f.to || a.starts_at < f.to),
      )
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    return { rows: all.slice(offset, offset + limit), total: all.length };
  }

  /** Doar în demo: resetează datele fictive. */
  reset() {
    this.db = seed();
    this.persist();
  }
}
