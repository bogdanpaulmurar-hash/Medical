import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import type { Api, AuditFilters, SearchFilters } from './api';
import { ApiError } from './api';
import type {
  AppSettings, Appointment, AppointmentInput, AuditEntry, Cabinet, DocKind, Patient, PatientDocument, PlanItem, Procedure, Profile, Room,
} from '../types';

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw toApiError(res.error);
  return res.data;
}

function toApiError(e: PostgrestError | Error): ApiError {
  const msg = e.message ?? String(e);
  const code = 'code' in e ? e.code : undefined;
  if (code === '23P01' || /exclusion constraint/i.test(msg)) {
    if (msg.includes('no_room_overlap')) return new ApiError('conflict_room', msg);
    if (msg.includes('no_attending_overlap')) return new ApiError('conflict_attending', msg);
    if (msg.includes('no_receiving_overlap')) return new ApiError('conflict_receiving', msg);
    if (msg.includes('no_patient_overlap')) return new ApiError('conflict_patient', msg);
  }
  if (/not_in_plan/.test(msg)) return new ApiError('not_in_plan', msg);
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return new ApiError('forbidden', msg);
  return new ApiError('other', msg);
}

export class SupabaseApi implements Api {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
  }

  async getSessionUserId() {
    const { data } = await this.sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async sendMagicLink(email: string, redirectTo: string) {
    // shouldCreateUser: false => doar persoanele invitate se pot autentifica.
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (error) throw toApiError(error as unknown as Error);
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  onAuthChange(cb: () => void) {
    const { data } = this.sb.auth.onAuthStateChange(() => cb());
    return () => data.subscription.unsubscribe();
  }

  async listProfiles() {
    return check(await this.sb.from('profiles').select('*').order('full_name')) as Profile[];
  }

  async updateProfile(id: string, patch: Partial<Profile>) {
    check(await this.sb.from('profiles').update(patch).eq('id', id));
  }

  async inviteUser(email: string, fullName: string, role: Profile['role']) {
    // Invitația necesită cheia service_role, deci rulează în Edge Function.
    const { error } = await this.sb.functions.invoke('invite-user', {
      body: { email, full_name: fullName, role, redirect_to: window.location.origin + window.location.pathname },
    });
    if (error) throw toApiError(error as Error);
  }

  async listCabinets() {
    return (check(await this.sb.from('cabinets').select('*').order('sort_order').order('name')) ?? []) as Cabinet[];
  }
  async saveCabinet(c: { id?: string; name: string; active?: boolean; sort_order?: number }) {
    if (c.id) check(await this.sb.from('cabinets').update(c).eq('id', c.id));
    else check(await this.sb.from('cabinets').insert(c));
  }

  async listRooms() {
    return (check(await this.sb.from('rooms').select('*').order('sort_order').order('name')) ?? []) as Room[];
  }
  async saveRoom(r: Partial<Room> & { name: string; cabinet_id: string }) {
    if (r.id) check(await this.sb.from('rooms').update(r).eq('id', r.id));
    else check(await this.sb.from('rooms').insert(r));
  }

  async listProcedures() {
    return (check(await this.sb.from('procedures').select('*').order('sort_order').order('name')) ?? []) as Procedure[];
  }
  async saveProcedure(p: Partial<Procedure> & { name: string }) {
    if (p.id) check(await this.sb.from('procedures').update(p).eq('id', p.id));
    else check(await this.sb.from('procedures').insert(p));
  }

  async listPatients() {
    return (check(await this.sb.from('patients').select('*').order('code')) ?? []) as Patient[];
  }
  async savePatient(p: Partial<Patient> & { code: string; initials: string }) {
    const q = p.id
      ? this.sb.from('patients').update(p).eq('id', p.id).select().single()
      : this.sb.from('patients').insert(p).select().single();
    return check(await q) as Patient;
  }
  async listPlan() {
    return (check(await this.sb.from('patient_plan').select('*').order('created_at')) ?? []) as PlanItem[];
  }
  async savePlanItem(i: Partial<PlanItem> & { patient_id: string; procedure_id: string }) {
    const q = i.id
      ? this.sb.from('patient_plan').update(i).eq('id', i.id).select().single()
      : this.sb.from('patient_plan').insert(i).select().single();
    return check(await q) as PlanItem;
  }
  onPatientsChange(cb: () => void) {
    const ch = this.sb
      .channel('patients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => cb())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_plan' }, () => cb())
      .subscribe();
    return () => {
      void this.sb.removeChannel(ch);
    };
  }
  async listPatientAppointments(patientId: string) {
    return check(
      await this.sb.from('appointments').select('*').eq('patient_id', patientId).order('starts_at'),
    ) as Appointment[];
  }

  async getDocument(patientId: string, kind: DocKind) {
    const r = await this.sb.from('patient_documents').select('*').eq('patient_id', patientId).eq('kind', kind).maybeSingle();
    return (check(r) ?? null) as PatientDocument | null;
  }
  async listDocuments(kind: DocKind) {
    const r = await this.sb.from('patient_documents').select('*').eq('kind', kind);
    return (check(r) ?? []) as PatientDocument[];
  }
  async saveDocument(patientId: string, kind: DocKind, data: Record<string, unknown>) {
    const r = await this.sb.from('patient_documents').upsert({ patient_id: patientId, kind, data }, { onConflict: 'patient_id,kind' }).select().single();
    return check(r) as PatientDocument;
  }
  async purgeExpiredDocuments() {
    const r = await this.sb.rpc('purge_expired_documents');
    return Number(check(r) ?? 0);
  }
  async deleteDocument(patientId: string, kind: DocKind) {
    check(await this.sb.from('patient_documents').delete().eq('patient_id', patientId).eq('kind', kind));
  }
  async getSettings() {
    return check(
      await this.sb.from('app_settings').select('clinic_name,email_enabled,sms_enabled,keep_documents,documents_retention_days').eq('id', 1).single(),
    ) as AppSettings;
  }
  async updateSettings(patch: Partial<AppSettings>) {
    check(await this.sb.from('app_settings').update(patch).eq('id', 1));
  }

  async listAppointments(fromIso: string, toIso: string) {
    return check(
      await this.sb
        .from('appointments')
        .select('*')
        .lt('starts_at', toIso)
        .gt('ends_at', fromIso)
        .order('starts_at'),
    ) as Appointment[];
  }

  async saveAppointment(id: string | null, input: AppointmentInput) {
    const q = id
      ? this.sb.from('appointments').update(input).eq('id', id).select().single()
      : this.sb.from('appointments').insert(input).select().single();
    return check(await q) as Appointment;
  }

  onAppointmentsChange(cb: () => void) {
    const ch = this.sb
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => cb())
      .subscribe();
    return () => {
      void this.sb.removeChannel(ch);
    };
  }

  async listAudit({ recordId, limit = 200, userId, action, from, to }: AuditFilters) {
    let q = this.sb.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(limit);
    if (recordId) q = q.eq('record_id', recordId);
    if (userId) q = q.eq('changed_by', userId);
    if (action) q = q.eq('action', action);
    if (from) q = q.gte('changed_at', from);
    if (to) q = q.lt('changed_at', to);
    return check(await q) as AuditEntry[];
  }

  async searchAppointments(f: SearchFilters, offset: number, limit: number) {
    let q = this.sb.from('appointments').select('*', { count: 'exact' });
    // Eliminăm caracterele speciale din sintaxa PostgREST / ilike.
    const text = (f.text ?? '').replace(/[%_,()*\\]/g, ' ').trim();
    if (text) {
      const cols = ['patient_code', 'patient_initials', 'patient_name'];
      if (f.includeNotes) cols.push('diagnosis', 'notes');
      q = q.or(cols.map((c) => `${c}.ilike.%${text}%`).join(','));
    }
    if (f.doctorId) q = q.or(`attending_id.eq.${f.doctorId},receiving_id.eq.${f.doctorId}`);
    if (f.procedureId) q = q.eq('procedure_id', f.procedureId);
    if (f.roomId) q = q.eq('room_id', f.roomId);
    if (f.status) q = q.eq('status', f.status);
    if (f.from) q = q.gte('starts_at', f.from);
    if (f.to) q = q.lt('starts_at', f.to);
    const res = await q.order('starts_at', { ascending: false }).range(offset, offset + limit - 1);
    if (res.error) throw toApiError(res.error);
    return { rows: (res.data ?? []) as Appointment[], total: res.count ?? 0 };
  }
}
