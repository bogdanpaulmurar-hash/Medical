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
const KEY = 'medsched-demo-v3';
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
    p('u-att3', 'curant3@exemplu.test', 'Dr. Vlad Curant', 'attending'),
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
  const nowMs = Date.now();
  // Generator pseudo-aleator cu sămânță fixă: aceleași date la fiecare resetare.
  let seedN = 20261122;
  const rnd = () => {
    seedN = (seedN * 1664525 + 1013904223) % 4294967296;
    return seedN / 4294967296;
  };
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const letters = 'ABCDEFGHIJKLMNOPRSTUVZ';
  const initials = () => `${pick([...letters])}.${pick([...letters])}.`;
  const roomDoctor: Record<string, string> = { r1: 'u-att1', r2: 'u-att2', r3: 'u-att3' };
  const durations: Record<string, number> = { p1: 30, p2: 20, p3: 60 };
  const notesPool = ['Control după 2 săptămâni', 'Pacient anxios', 'Aduce analizele', 'Prima vizită', 'Necesită interpret'];

  const appointments: Appointment[] = [];
  const statusFor = (startMs: number, endMs: number): Appointment['status'] => {
    const r = rnd();
    if (endMs <= nowMs) return r < 0.82 ? 'done' : r < 0.91 ? 'no_show' : 'cancelled';
    if (startMs <= nowMs) return 'in_progress';
    const soon = startMs - nowMs < 3 * 86400_000;
    if (r < 0.05) return 'cancelled';
    return r < (soon ? 0.7 : 0.35) ? 'confirmed' : 'planned';
  };
  // De la acum ~7 săptămâni până peste ~5 săptămâni.
  for (let off = -49; off <= 35; off++) {
    const d = new Date(day);
    d.setDate(d.getDate() + off);
    const dow = d.getDay();
    // Ziua de azi și zilele apropiate sunt mai pline; cele îndepărtate, mai rare.
    const density = off === 0 ? 1 : dow === 0 ? 0.1 : dow === 6 ? 0.25 : off < 0 ? 0.8 : Math.max(0.35, 0.9 - off * 0.02);
    for (const room of ['r1', 'r2', 'r3']) {
      let minutes = 8 * 60 + Math.floor(rnd() * 4) * 15;
      while (minutes < 17 * 60) {
        const proc = pick(['p1', 'p1', 'p2', 'p3']);
        const len = durations[proc];
        if (rnd() < density) {
          const s0 = new Date(d);
          s0.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
          const e0 = new Date(s0.getTime() + len * 60_000);
          const rec = proc === 'p3' && rnd() < 0.6 ? 'u-rec' : null;
          const status = statusFor(s0.getTime(), e0.getTime());
          const input = {
            room_id: room, attending_id: roomDoctor[room], receiving_id: rec, starts_at: s0.toISOString(),
            ends_at: e0.toISOString(), status,
          };
          if (findConflicts(input, appointments, null).length === 0) {
            const created = new Date(Math.min(nowMs, s0.getTime() - (1 + Math.floor(rnd() * 5)) * 86400_000)).toISOString();
            appointments.push({
              id: uid(), patient_code: `D-${1001 + appointments.length}`, patient_initials: initials(),
              patient_name: null, diagnosis: null, notes: rnd() < 0.12 ? pick(notesPool) : null,
              procedure_id: proc, room_id: room, starts_at: input.starts_at, ends_at: input.ends_at,
              attending_id: roomDoctor[room], receiving_id: rec, status,
              created_by: 'u-sch', updated_by: 'u-sch', created_at: created, updated_at: created,
            });
          }
        }
        minutes += len + Math.floor(rnd() * 4) * 15; // pauză 0–45 min
      }
    }
  }
  appointments.sort((x, y) => x.starts_at.localeCompare(y.starts_at));

  const entry = (id: number, ap: Appointment, action: AuditEntry['action'], by: string, email: string, at: string, oldD: Appointment | null): AuditEntry => ({
    id, table_name: 'appointments', record_id: ap.id, action, changed_by: by, changed_by_email: email,
    changed_at: at, old_data: oldD as unknown as Record<string, unknown> | null,
    new_data: ap as unknown as Record<string, unknown>,
  });
  const audit: AuditEntry[] = [];
  const emailOf: Record<string, string> = {
    'u-att1': 'curant1@exemplu.test', 'u-att2': 'curant2@exemplu.test', 'u-att3': 'curant3@exemplu.test',
  };
  // Istoric: creare, iar pentru cele care nu sunt „programat” și o schimbare de status.
  for (const ap of appointments) {
    const created = { ...ap, status: 'planned' as const };
    audit.push(entry(audit.length + 1, created, 'INSERT', 'u-sch', 'programari@exemplu.test', ap.created_at, null));
    if (ap.status !== 'planned') {
      const at = ap.status === 'confirmed' || new Date(ap.starts_at).getTime() > nowMs
        ? new Date(Math.min(nowMs, new Date(ap.created_at).getTime() + 3600_000)).toISOString()
        : ap.ends_at;
      const by = ap.status === 'confirmed' ? 'u-sch' : ap.attending_id;
      audit.push(entry(audit.length + 1, ap, 'UPDATE', by, emailOf[by] ?? 'programari@exemplu.test', at, created));
      ap.updated_at = at;
      ap.updated_by = by;
    }
  }
  audit.sort((x, y) => x.changed_at.localeCompare(y.changed_at));
  audit.forEach((e, i) => (e.id = i + 1));
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
