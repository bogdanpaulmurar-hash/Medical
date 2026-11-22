import type { Appointment, Patient, PlanItem, Procedure, Room } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fD = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
const WD = { ro: ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'], en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] };
const fDW = (s: string, l: 'ro' | 'en') => `${WD[l][new Date(`${s}T00:00`).getDay()]} ${s.slice(8, 10)}.${s.slice(5, 7)}`;
const FREQ = { ro: { daily: 'zilnic', alternate: 'la două zile', weekly: 'săptămânal' }, en: { daily: 'daily', alternate: 'every other day', weekly: 'weekly' } } as Record<'ro' | 'en', Record<string, string>>;

const CSS = `@media print{@page{size:A4 portrait;margin:12mm}}
body{margin:0}.pr{font:10.5pt/1.4 Arial,"Segoe UI",sans-serif;color:#000}
.pr h1{font-size:15pt;margin:0 0 4mm}.pr h2{font-size:11.5pt;margin:5mm 0 2mm}
.pr table{border-collapse:collapse;width:100%;margin:0 0 3mm}.pr th,.pr td{border:.6pt solid #444;padding:1.5mm 2mm;text-align:left;vertical-align:top}
.pr th{background:#eee}.pr .c{text-align:center}.pr .sm{font-size:9pt;color:#333}.pr .org{font-size:9.5pt;margin:0 0 2mm}
.pr .box{display:inline-block;width:3.2mm;height:3.2mm;border:.7pt solid #000;vertical-align:middle}
.pr .sign{display:flex;justify-content:space-between;margin-top:12mm}.pr .foot{margin-top:6mm;font-size:8.5pt;color:#444}
.pr tr{break-inside:avoid}`;

export interface PlanPrintData {
  lang: 'ro' | 'en';
  org: string;
  patient: Patient;
  doctor: string;
  items: PlanItem[];
  procOf: Map<string, Procedure>;
  roomOf: Map<string, Room>;
  appts: Appointment[];
}

function live(d: PlanPrintData) {
  return d.appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function sheetHtml(d: PlanPrintData): string {
  const A = live(d), P = d.patient;
  const L = d.lang, x = (ro: string, en: string) => (L === 'en' ? en : ro);
  const days = [...new Set(A.map((a) => dayOf(a.starts_at)))];
  const procs = d.items.filter((i) => i.active);
  const period = A.length ? `${fD(days[0])} - ${fD(days[days.length - 1])}` : x(`de la ${fD(P.start_date)}`, `from ${fD(P.start_date)}`);
  let h = (d.org ? `<p class="org">${esc(d.org)}</p>` : '') + `<h1>${x('Fișă de tratament fizioterapeutic', 'Physiotherapy treatment sheet')}</h1>`;
  h += `<table><tbody><tr><th>${x('Pacientul', 'Patient')}</th><td>${esc(P.code)} · ${esc(P.initials)}</td><th>${x('Perioada', 'Period')}</th><td>${period}</td></tr>`
    + `<tr><th>${x('Diagnosticul', 'Diagnosis')}</th><td colspan="3">${esc(P.diagnosis || '-')}</td></tr>`
    + `<tr><th>${x('Medicul', 'Doctor')}</th><td>${esc(d.doctor || '')}</td><th>${x('Atenționări', 'Warnings')}</th><td>${esc(P.notes || '-')}</td></tr></tbody></table>`;
  h += `<h2>${x('Proceduri', 'Procedures')}</h2><table><thead><tr><th>${x('Nr.', 'No.')}</th><th>${x('Procedura', 'Procedure')}</th><th>${x('Ședințe', 'Sessions')}</th><th>${x('Frecvența', 'Frequency')}</th><th>${x('Durata', 'Duration')}</th><th>${x('Aparat / sală', 'Device / room')}</th><th>${x('Observații', 'Notes')}</th></tr></thead><tbody>`;
  h += procs.map((it, i) => {
    const p = d.procOf.get(it.procedure_id);
    const rooms = [...new Set(A.filter((a) => a.procedure_id === it.procedure_id).map((a) => d.roomOf.get(a.room_id)?.name).filter(Boolean))].join(', ');
    return `<tr><td class="c">${i + 1}</td><td><b>${esc(p?.name ?? '?')}</b></td><td class="c">${it.sessions}</td><td>${FREQ[L][it.frequency] ?? ''}</td>`
      + `<td class="c">${it.duration ?? p?.default_duration ?? 30} min</td><td>${esc(rooms || '-')}</td><td>${esc(it.notes || '')}</td></tr>`;
  }).join('') || `<tr><td colspan="7">${x('Nicio procedură.', 'No procedures.')}</td></tr>`;
  h += '</tbody></table>';
  if (days.length && procs.length) {
    h += `<h2>${x('Evidența ședințelor', 'Session log')}: ${esc(P.code)}</h2><table><thead><tr><th>${x('Data', 'Date')}</th>${procs.map((it) => `<th class="c">${esc(d.procOf.get(it.procedure_id)?.short_name || d.procOf.get(it.procedure_id)?.name || '?')}</th>`).join('')}<th>${x('Observații', 'Notes')}</th></tr></thead><tbody>`;
    h += days.map((day) => `<tr><td class="c">${fDW(day, L)}</td>${procs.map((it) => {
      const a = A.find((x) => dayOf(x.starts_at) === day && x.procedure_id === it.procedure_id);
      return `<td class="c">${a ? `<span class="box"></span> ${hm(a.starts_at)}` : '<span class="sm">-</span>'}</td>`;
    }).join('')}<td style="min-width:30mm"></td></tr>`).join('');
    h += '</tbody></table>';
  }
  h += `<p><span class="box"></span> ${x('Am verificat contraindicațiile procedurilor de mai sus.', 'I have checked the contraindications of the procedures above.')}</p>`;
  h += `<div class="sign"><span>${x('Medic', 'Doctor')}: ______________________</span><span>${x('Semnătura și parafa', 'Signature and stamp')}: ______________________</span></div>`;
  h += `<div class="foot">${esc(P.code)}. ${x('Generat la', 'Generated on')} ${fD(dayOf(new Date().toISOString()))}.</div>`;
  return h;
}

export function timetableHtml(d: PlanPrintData): string {
  const A = live(d), P = d.patient;
  const L = d.lang, x = (ro: string, en: string) => (L === 'en' ? en : ro);
  const groups = new Map<string, Appointment[]>();
  A.forEach((a) => { const k = `${a.procedure_id}|${hm(a.starts_at)}|${a.room_id}`; groups.set(k, [...(groups.get(k) ?? []), a]); });
  const rows = [...groups.values()].sort((x, y) => hm(x[0].starts_at).localeCompare(hm(y[0].starts_at)));
  let h = (d.org ? `<p class="org">${esc(d.org)}</p>` : '') + `<h1>${x('Orarul procedurilor', 'Procedure timetable')}</h1>`;
  h += `<table><tbody><tr><th>${x('Pacientul', 'Patient')}</th><td>${esc(P.code)} · ${esc(P.initials)}</td><th>${x('Perioada', 'Period')}</th><td>${A.length ? `${fD(dayOf(A[0].starts_at))} - ${fD(dayOf(A[A.length - 1].starts_at))}` : '-'}</td></tr></tbody></table>`;
  h += `<h2>${x('Proceduri', 'Procedures')}</h2><table><thead><tr><th>${x('Ora', 'Time')}</th><th>${x('Procedura', 'Procedure')}</th><th>${x('Locația', 'Location')}</th><th>${x('Zilele de tratament', 'Treatment days')}</th></tr></thead><tbody>`;
  h += rows.map((g) => {
    const a = g[0], p = d.procOf.get(a.procedure_id);
    const ds = g.map((x) => dayOf(x.starts_at));
    return `<tr><td class="c">${hm(a.starts_at)}-${hm(a.ends_at)}</td><td><b>${esc(p?.name ?? '?')}</b></td><td>${esc(d.roomOf.get(a.room_id)?.name ?? '-')}</td>`
      + `<td>${fD(ds[0]).slice(0, 5)} - ${fD(ds[ds.length - 1]).slice(0, 5)} (${g.length} ${x('ședințe', 'sessions')})</td></tr>`;
  }).join('') || `<tr><td colspan="4">${x('Nicio programare.', 'No appointments.')}</td></tr>`;
  h += '</tbody></table>';
  h += `<div class="foot">${x('Generat la', 'Generated on')} ${fD(dayOf(new Date().toISOString()))}.</div>`;
  return h;
}

/** Tipărește într-un cadru ascuns (nu schimbă pagina). */
export function printHtml(title: string, inner: string, lang: 'ro' | 'en' = 'ro') {
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  const doc = fr.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><div class="pr">${inner}</div></body></html>`);
  doc.close();
  setTimeout(() => {
    try { fr.contentWindow?.focus(); fr.contentWindow?.print(); } catch { /* fără tipărire în această vizualizare */ }
    setTimeout(() => fr.remove(), 60000);
  }, 150);
}
