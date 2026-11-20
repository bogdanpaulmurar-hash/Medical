import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import type { Api } from './api';
import { ApiError } from './api';
import type { AppSettings, Appointment, AppointmentInput, AuditEntry, Cabinet, Procedure, Profile, Room } from '../types';

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
  }
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
  async saveRoom(r: { id?: string; name: string; cabinet_id: string; active?: boolean }) {
    if (r.id) check(await this.sb.from('rooms').update(r).eq('id', r.id));
    else check(await this.sb.from('rooms').insert(r));
  }

  async listProcedures() {
    return (check(await this.sb.from('procedures').select('*').order('sort_order').order('name')) ?? []) as Procedure[];
  }
  async saveProcedure(p: { id?: string; name: string; default_duration?: number; active?: boolean }) {
    if (p.id) check(await this.sb.from('procedures').update(p).eq('id', p.id));
    else check(await this.sb.from('procedures').insert(p));
  }

  async getSettings() {
    return check(
      await this.sb.from('app_settings').select('clinic_name,email_enabled,sms_enabled').eq('id', 1).single(),
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

  async listAudit({ recordId, limit = 200 }: { recordId?: string; limit?: number }) {
    let q = this.sb.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(limit);
    if (recordId) q = q.eq('record_id', recordId);
    return check(await q) as AuditEntry[];
  }
}
