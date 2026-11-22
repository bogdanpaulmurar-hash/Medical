import type { Api, AuditFilters, SearchFilters } from './api';
import { ApiError, findConflicts, freeRooms } from './api';
import type {
  AppSettings,
  Appointment,
  AppointmentInput,
  AuditEntry,
  Cabinet,
  DocKind,
  Patient,
  PatientDocument,
  PlanItem,
  Procedure,
  Profile,
  Room,
} from '../types';
import { CATALOG_CATEGORIES, CATALOG_PROCEDURES, CATALOG_ROOMS } from './catalog';

/**
 * MOD DEMO: totul rămâne în localStorage-ul acestui browser.
 * Toate datele sunt FICTIVE. Folosit doar pentru încercarea interfeței.
 */
const KEY = 'medsched-demo-v4';
const SESSION_KEY = 'medsched-demo-session';

interface DB {
  profiles: Profile[];
  cabinets: Cabinet[];
  rooms: Room[];
  procedures: Procedure[];
  patients: Patient[];
  plan: PlanItem[];
  settings: AppSettings;
  documents?: PatientDocument[];
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
  // Catalogul secției: cabinet = categorie, salon = aparat / sală, procedură cu aparatele ei.
  const cabinets: Cabinet[] = CATALOG_CATEGORIES.map((c) => ({
    id: `cab-${c.key}`, name: c.name, active: true, sort_order: c.sort,
  }));
  const rooms: Room[] = CATALOG_ROOMS.map((r) => ({
    id: `room-${r.key}`, cabinet_id: `cab-${r.category}`, name: r.name, active: true, sort_order: r.sort,
    capacity: r.capacity, audience: r.audience,
  }));
  const procedures: Procedure[] = CATALOG_PROCEDURES.map((c) => ({
    id: `proc-${c.key}`, name: c.name, short_name: c.short, color: c.color, default_duration: c.duration,
    room_ids: c.rooms.map((k) => `room-${k}`), active: true, sort_order: c.sort,
  }));
  const procOf = new Map(procedures.map((x) => [x.id, x]));

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
  const notesPool = ['Implant metalic genunchi drept', 'Pacient anxios', 'Pacemaker', 'Se deplasează cu cadru', 'Control după 2 săptămâni'];
  const dxPool = ['Gonartroză', 'Lombalgie', 'AVC, hemipareză', 'Cervicalgie', 'Postoperator șold', 'Omartroză', 'Fasciită plantară'];
  const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isWork = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;
  const nextWork = (d: Date) => {
    const x = new Date(d);
    while (!isWork(x)) x.setDate(x.getDate() + 1);
    return x;
  };

  // Pacienți fictivi, fiecare cu planul lui.
  const patients: Patient[] = [];
  const plan: PlanItem[] = [];
  const doctors = ['u-att1', 'u-att2', 'u-att3'];
  const inpatientSets = [['tens', 'ultra', 'kineto'], ['tecar', 'kineto', 'masaj'], ['hil', 'parafina', 'kineto'], ['sis', 'do', 'masaj'], ['swt', 'tens', 'kineto'], ['lokomat', 'stiimp', 'kineto'], ['dsub', 'hidro', 'if']];
  const outpatientSets = [['rswt', 'ultra'], ['laser2000', 'tens', 'kineto'], ['tecar', 'masaj'], ['if', 'parafina'], ['sis', 'ultra']];
  for (let i = 0; i < 26; i++) {
    const kind = i < 16 ? 'inpatient' : 'outpatient';
    const start = nextWork(new Date(day.getTime() + (Math.floor(rnd() * 44) - 30) * 86400_000));
    const created = new Date(Math.min(nowMs, start.getTime() - 86400_000)).toISOString();
    const pt: Patient = {
      id: uid(), code: `P-${2001 + i}`, initials: initials(), name: null,
      diagnosis: rnd() < 0.7 ? pick(dxPool) : null, notes: rnd() < 0.2 ? pick(notesPool) : null,
      kind, doctor_id: pick(doctors), start_date: isoDay(start), active: true,
      created_by: 'u-att1', created_at: created, updated_at: created,
    };
    patients.push(pt);
    for (const key of pick(kind === 'inpatient' ? inpatientSets : outpatientSets)) {
      const proc = procOf.get(`proc-${key}`);
      if (!proc) continue;
      plan.push({
        id: uid(), patient_id: pt.id, procedure_id: proc.id, sessions: pick([5, 6, 8, 10, 10]),
        frequency: 'daily', duration: null, notes: null, active: true, created_at: created, updated_at: created,
      });
    }
  }

  // Programările: câte una pe zi lucrătoare pentru fiecare procedură din plan,
  // la prima oră liberă (aparat cu loc, pacient liber).
  const appointments: Appointment[] = [];
  const statusFor = (startMs: number, endMs: number): Appointment['status'] => {
    const r = rnd();
    if (endMs <= nowMs) return r < 0.86 ? 'done' : r < 0.93 ? 'no_show' : 'cancelled';
    if (startMs <= nowMs) return 'in_progress';
    const soon = startMs - nowMs < 3 * 86400_000;
    if (r < 0.04) return 'cancelled';
    return r < (soon ? 0.7 : 0.35) ? 'confirmed' : 'planned';
  };
  const lo = day.getTime() - 49 * 86400_000;
  const hi = day.getTime() + 35 * 86400_000;
  patients.forEach((pt, pi) => {
    const items = plan.filter((x) => x.patient_id === pt.id);
    let minute = 7 * 60 + 30 + (pi % 13) * 30; // ora preferată a pacientului
    for (const it of items) {
      const proc = procOf.get(it.procedure_id)!;
      const dur = it.duration ?? proc.default_duration;
      const d = new Date(`${pt.start_date}T00:00:00`);
      for (let n = 0; n < it.sessions && d.getTime() < hi; ) {
        if (isWork(d) && d.getTime() >= lo) {
          // Prima oră (din 15 în 15 minute) la care procedura încape.
          for (let m = minute; m <= 14 * 60 + 30; m += 15) {
            const s0 = new Date(d);
            s0.setHours(Math.floor(m / 60), m % 60, 0, 0);
            const e0 = new Date(s0.getTime() + dur * 60_000);
            const room = freeRooms(proc.room_ids, rooms, pt.kind, s0.toISOString(), e0.toISOString(), appointments, null)[0];
            if (!room) continue;
            const status = statusFor(s0.getTime(), e0.getTime());
            const input = {
              room_id: room.id, attending_id: null, receiving_id: null, patient_id: pt.id,
              starts_at: s0.toISOString(), ends_at: e0.toISOString(), status,
            };
            if (findConflicts(input, appointments, null, rooms).length) continue;
            const created = new Date(Math.min(nowMs, new Date(`${pt.start_date}T00:00:00`).getTime() - 86400_000)).toISOString();
            appointments.push({
              id: uid(), patient_id: pt.id, patient_code: pt.code, patient_initials: pt.initials,
              patient_name: null, diagnosis: pt.diagnosis, notes: null,
              procedure_id: proc.id, room_id: room.id, starts_at: input.starts_at, ends_at: input.ends_at,
              attending_id: null, receiving_id: null, status,
              created_by: 'u-sch', updated_by: 'u-sch', created_at: created, updated_at: created,
            });
            break;
          }
          n++;
        }
        d.setDate(d.getDate() + 1);
      }
      minute += 60;
    }
  });
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
      const by = ap.status === 'confirmed' ? 'u-sch' : (patients.find((x) => x.id === ap.patient_id)?.doctor_id ?? 'u-sch');
      audit.push(entry(audit.length + 1, ap, 'UPDATE', by, emailOf[by] ?? 'programari@exemplu.test', at, created));
      ap.updated_at = at;
      ap.updated_by = by;
    }
  }
  // Istoric: pacienții și planurile lor, create de medici.
  for (const pt of patients) {
    audit.push({
      id: 0, table_name: 'patients', record_id: pt.id, action: 'INSERT', changed_by: pt.doctor_id,
      changed_by_email: emailOf[pt.doctor_id ?? ''] ?? null, changed_at: pt.created_at, old_data: null,
      new_data: pt as unknown as Record<string, unknown>,
    });
  }
  audit.sort((x, y) => x.changed_at.localeCompare(y.changed_at));
  audit.forEach((e, i) => (e.id = i + 1));
  audit.reverse(); // cele mai noi primele
  return {
    profiles, cabinets, rooms, procedures, patients, plan, appointments, audit,
    settings: { clinic_name: 'Clinica Demo', email_enabled: true, sms_enabled: false, keep_documents: true, documents_retention_days: null },
  };
}

export class DemoApi implements Api {
  readonly mode = 'demo' as const;
  private db: DB;
  private authListeners = new Set<() => void>();
  private apptListeners = new Set<() => void>();
  private patientListeners = new Set<() => void>();

  constructor() {
    let db: DB | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) db = JSON.parse(raw) as DB;
      if (db && !db.patients) db = null; // date vechi, fără pacienți: refacem demo
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
    this.upsert('rooms', this.db.rooms, r, {
      name: r.name, cabinet_id: r.cabinet_id, active: true, sort_order: 0, capacity: 1, audience: 'all',
    });
  }
  async listProcedures() {
    return [...this.db.procedures].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  async saveProcedure(p: Partial<Procedure> & { name: string }) {
    this.upsert('procedures', this.db.procedures, p, {
      name: p.name, short_name: '', color: '#0f766e', room_ids: [], default_duration: 30, active: true, sort_order: 0,
    });
  }

  async listPatients() {
    return [...this.db.patients].sort((a, b) => a.code.localeCompare(b.code));
  }
  async savePatient(p: Partial<Patient> & { code: string; initials: string }) {
    const clash = this.db.patients.find((x) => x.code.toLowerCase() === p.code.toLowerCase() && x.id !== p.id);
    if (clash) throw new ApiError('other', 'duplicate patient code');
    const now = new Date().toISOString();
    let result: Patient;
    if (p.id) {
      const i = this.db.patients.findIndex((x) => x.id === p.id);
      const old = this.db.patients[i];
      result = { ...old, ...p, updated_at: now };
      this.db.patients[i] = result;
      this.audit('patients', old.id, 'UPDATE', old, result);
    } else {
      result = {
        name: null, diagnosis: null, notes: null, kind: 'inpatient', doctor_id: null,
        start_date: new Date().toISOString().slice(0, 10), active: true, ...p,
        id: uid(), created_by: this.me(), created_at: now, updated_at: now,
      };
      this.db.patients.push(result);
      this.audit('patients', result.id, 'INSERT', null, result);
    }
    this.persist();
    this.patientListeners.forEach((cb) => cb());
    return result;
  }
  async listPlan() {
    return [...this.db.plan];
  }
  async savePlanItem(i: Partial<PlanItem> & { patient_id: string; procedure_id: string }) {
    const now = new Date().toISOString();
    const same = this.db.plan.find((x) => x.patient_id === i.patient_id && x.procedure_id === i.procedure_id);
    const id = i.id ?? same?.id;
    let result: PlanItem;
    if (id) {
      const k = this.db.plan.findIndex((x) => x.id === id);
      const old = this.db.plan[k];
      result = { ...old, ...i, id, updated_at: now };
      this.db.plan[k] = result;
      this.audit('patient_plan', id, 'UPDATE', old, result);
    } else {
      result = {
        sessions: 10, frequency: 'daily', duration: null, notes: null, active: true, ...i,
        id: uid(), created_at: now, updated_at: now,
      };
      this.db.plan.push(result);
      this.audit('patient_plan', result.id, 'INSERT', null, result);
    }
    this.persist();
    this.patientListeners.forEach((cb) => cb());
    return result;
  }
  onPatientsChange(cb: () => void) {
    this.patientListeners.add(cb);
    return () => this.patientListeners.delete(cb);
  }
  async listPatientAppointments(patientId: string) {
    return this.db.appointments.filter((a) => a.patient_id === patientId).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  private requireDoctor() {
    const me = this.db.profiles.find((p) => p.id === this.me());
    if (!me || me.role === 'scheduler') throw new ApiError('forbidden', 'doctors only');
  }
  async getDocument(patientId: string, kind: DocKind) {
    this.requireDoctor();
    return (this.db.documents ?? []).find((d) => d.patient_id === patientId && d.kind === kind) ?? null;
  }
  async saveDocument(patientId: string, kind: DocKind, data: Record<string, unknown>) {
    this.requireDoctor();
    const now = new Date().toISOString();
    const list = (this.db.documents ??= []);
    const i = list.findIndex((d) => d.patient_id === patientId && d.kind === kind);
    const doc: PatientDocument = { id: i >= 0 ? list[i].id : uid(), patient_id: patientId, kind, data, updated_at: now };
    const meta = { id: doc.id, patient_id: patientId, kind };
    if (i >= 0) list[i] = doc; else list.push(doc);
    this.audit('patient_documents', doc.id, i >= 0 ? 'UPDATE' : 'INSERT', i >= 0 ? meta : null, meta);
    this.persist();
    return doc;
  }
  async purgeExpiredDocuments() {
    this.requireDoctor();
    const days = this.db.settings.documents_retention_days;
    if (!days || !this.db.documents) return 0;
    const limit = Date.now() - days * 86400_000;
    const keep = this.db.documents.filter((d) => new Date(d.updated_at).getTime() > limit);
    const n = this.db.documents.length - keep.length;
    if (n) {
      this.db.documents.filter((d) => !keep.includes(d)).forEach((d) =>
        this.audit('patient_documents', d.id, 'DELETE', { id: d.id, patient_id: d.patient_id, kind: d.kind }, null));
      this.db.documents = keep;
      this.persist();
    }
    return n;
  }
  async deleteDocument(patientId: string, kind: DocKind) {
    this.requireDoctor();
    const list = this.db.documents ?? [];
    const i = list.findIndex((d) => d.patient_id === patientId && d.kind === kind);
    if (i < 0) return;
    const meta = { id: list[i].id, patient_id: patientId, kind };
    list.splice(i, 1);
    this.audit('patient_documents', meta.id, 'DELETE', meta, null);
    this.persist();
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
    if (
      input.patient_id &&
      !this.db.plan.some((x) => x.patient_id === input.patient_id && x.procedure_id === input.procedure_id && x.active)
    ) {
      throw new ApiError('not_in_plan', 'not in plan');
    }
    const conflicts = findConflicts(input, this.db.appointments, id, this.db.rooms);
    if (conflicts.length) {
      const k = conflicts[0].kind;
      throw new ApiError(
        k === 'room' ? 'conflict_room' : k === 'attending' ? 'conflict_attending' : k === 'patient' ? 'conflict_patient' : 'conflict_receiving',
        k,
      );
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
