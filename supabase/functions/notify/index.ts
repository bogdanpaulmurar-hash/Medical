// Edge Function „notify”: apelată de un Database Webhook la INSERT/UPDATE
// pe tabela appointments. Trimite email (și opțional SMS) medicului curant
// și medicului primitor.
//
// Minimizare date: mesajul conține DOAR cod pacient, inițiale, procedură,
// dată/oră, cabinet/salon și status. Niciodată nume sau diagnostic.
//
// Variabile (supabase secrets set ...):
//   WEBHOOK_SECRET     – același secret pus în headerul webhook-ului
//   RESEND_API_KEY     – cheie Resend (sau înlocuiți sendEmail cu SMTP)
//   MAIL_FROM          – ex. "Vademecum MFR <programari@clinica.ro>"
//   APP_URL            – adresa aplicației, pentru link
//   SMS_PROVIDER       – "stub" (implicit) sau "twilio"
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSmsProvider } from '../_shared/sms.ts';

type Row = Record<string, unknown> & {
  id: string; patient_code: string; patient_initials: string; procedure_id: string; room_id: string;
  starts_at: string; ends_at: string; attending_id: string; receiving_id: string | null; status: string;
};

const STATUS_RO: Record<string, string> = {
  planned: 'Programat', confirmed: 'Confirmat', in_progress: 'În desfășurare', done: 'Efectuat',
  cancelled: 'Anulat', no_show: 'Neprezentat',
};

async function sendEmail(to: string, subject: string, text: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.log('[email] RESEND_API_KEY lipsă, email nesimulat');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM'), to: [to], subject, text }),
  });
  if (!res.ok) console.error('[email] failed', res.status);
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const payload = await req.json() as { type: 'INSERT' | 'UPDATE'; record: Row; old_record: Row | null };
  const r = payload.record;
  const o = payload.old_record;

  // La UPDATE, notificăm doar dacă s-a schimbat ceva relevant.
  const relevant = ['starts_at', 'ends_at', 'room_id', 'procedure_id', 'attending_id', 'receiving_id', 'status'];
  if (payload.type === 'UPDATE' && o && relevant.every((k) => o[k] === r[k])) {
    return new Response('no-op');
  }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const [{ data: settings }, { data: proc }, { data: room }] = await Promise.all([
    sb.from('app_settings').select('*').eq('id', 1).single(),
    sb.from('procedures').select('name').eq('id', r.procedure_id).single(),
    sb.from('rooms').select('name, cabinets(name)').eq('id', r.room_id).single(),
  ]);

  const ids = [r.attending_id, r.receiving_id, o?.attending_id, o?.receiving_id].filter(Boolean) as string[];
  const { data: people } = await sb.from('profiles').select('*').in('id', [...new Set(ids)]).eq('active', true);

  const when = new Date(r.starts_at).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' });
  const cab = (room as { cabinets?: { name: string } } | null)?.cabinets?.name ?? '';
  const what = payload.type === 'INSERT' ? 'Programare nouă / New appointment' : 'Programare modificată / Appointment changed';
  const text = [
    `${what}`,
    `${r.patient_code} · ${r.patient_initials}`,
    `${proc?.name ?? ''} — ${when}`,
    `${cab} / ${room?.name ?? ''}`,
    `Status: ${STATUS_RO[r.status] ?? r.status}`,
    Deno.env.get('APP_URL') ?? '',
  ].join('\n');

  const sms = getSmsProvider();
  for (const p of people ?? []) {
    if (settings?.email_enabled && p.notify_email) await sendEmail(p.email, `[Vademecum MFR] ${what}`, text);
    if (settings?.sms_enabled && p.notify_sms && p.phone) {
      await sms.send(p.phone, `Vademecum MFR: ${r.patient_code} ${r.patient_initials}, ${proc?.name ?? ''}, ${when}, ${room?.name ?? ''}`);
    }
  }
  return new Response('ok');
});
