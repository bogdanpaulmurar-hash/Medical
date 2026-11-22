import type { Appointment, Patient, PlanItem, Procedure, Room } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fD = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
const WD = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];
const fDW = (s: string) => `${WD[new Date(`${s}T00:00`).getDay()]} ${s.slice(8, 10)}.${s.slice(5, 7)}`;
const FREQ: Record<string, string> = { daily: 'zilnic', alternate: 'la două zile', weekly: 'săptămânal' };

const CSS = `@media print{@page{size:A4 portrait;margin:12mm}}
body{margin:0}.pr{font:10.5pt/1.4 Arial,"Segoe UI",sans-serif;color:#000}
.pr h1{font-size:15pt;margin:0 0 4mm}.pr h2{font-size:11.5pt;margin:5mm 0 2mm}
.pr table{border-collapse:collapse;width:100%;margin:0 0 3mm}.pr th,.pr td{border:.6pt solid #444;padding:1.5mm 2mm;text-align:left;vertical-align:top}
.pr th{background:#eee}.pr .c{text-align:center}.pr .sm{font-size:9pt;color:#333}.pr .org{font-size:9.5pt;margin:0 0 2mm}
.pr .box{display:inline-block;width:3.2mm;height:3.2mm;border:.7pt solid #000;vertical-align:middle}
.pr .sign{display:flex;justify-content:space-between;margin-top:12mm}.pr .foot{margin-top:6mm;font-size:8.5pt;color:#444}
.pr tr{break-inside:avoid}`;

export interface PlanPrintData {
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
  const days = [...new Set(A.map((a) => dayOf(a.starts_at)))];
  const procs = d.items.filter((i) => i.active);
  const period = A.length ? `${fD(days[0])} - ${fD(days[days.length - 1])}` : `de la ${fD(P.start_date)}`;
  let h = (d.org ? `<p class="org">${esc(d.org)}</p>` : '') + '<h1>Fișă de tratament fizioterapeutic</h1>';
  h += `<table><tbody><tr><th>Pacientul</th><td>${esc(P.code)} · ${esc(P.initials)}</td><th>Perioada</th><td>${period}</td></tr>`
    + `<tr><th>Diagnosticul</th><td colspan="3">${esc(P.diagnosis || '-')}</td></tr>`
    + `<tr><th>Medicul</th><td>${esc(d.doctor || '')}</td><th>Atenționări</th><td>${esc(P.notes || '-')}</td></tr></tbody></table>`;
  h += '<h2>Proceduri</h2><table><thead><tr><th>Nr.</th><th>Procedura</th><th>Ședințe</th><th>Frecvența</th><th>Durata</th><th>Aparat / sală</th><th>Observații</th></tr></thead><tbody>';
  h += procs.map((it, i) => {
    const p = d.procOf.get(it.procedure_id);
    const rooms = [...new Set(A.filter((a) => a.procedure_id === it.procedure_id).map((a) => d.roomOf.get(a.room_id)?.name).filter(Boolean))].join(', ');
    return `<tr><td class="c">${i + 1}</td><td><b>${esc(p?.name ?? '?')}</b></td><td class="c">${it.sessions}</td><td>${FREQ[it.frequency] ?? ''}</td>`
      + `<td class="c">${it.duration ?? p?.default_duration ?? 30} min</td><td>${esc(rooms || '-')}</td><td>${esc(it.notes || '')}</td></tr>`;
  }).join('') || '<tr><td colspan="7">Nicio procedură.</td></tr>';
  h += '</tbody></table>';
  if (days.length && procs.length) {
    h += `<h2>Evidența ședințelor: ${esc(P.code)}</h2><table><thead><tr><th>Data</th>${procs.map((it) => `<th class="c">${esc(d.procOf.get(it.procedure_id)?.short_name || d.procOf.get(it.procedure_id)?.name || '?')}</th>`).join('')}<th>Observații</th></tr></thead><tbody>`;
    h += days.map((day) => `<tr><td class="c">${fDW(day)}</td>${procs.map((it) => {
      const a = A.find((x) => dayOf(x.starts_at) === day && x.procedure_id === it.procedure_id);
      return `<td class="c">${a ? `<span class="box"></span> ${hm(a.starts_at)}` : '<span class="sm">-</span>'}</td>`;
    }).join('')}<td style="min-width:30mm"></td></tr>`).join('');
    h += '</tbody></table>';
  }
  h += '<p><span class="box"></span> Am verificat contraindicațiile procedurilor de mai sus.</p>';
  h += '<div class="sign"><span>Medic: ______________________</span><span>Semnătura și parafa: ______________________</span></div>';
  h += `<div class="foot">${esc(P.code)}. Generat la ${fD(dayOf(new Date().toISOString()))}.</div>`;
  return h;
}

export function timetableHtml(d: PlanPrintData): string {
  const A = live(d), P = d.patient;
  const groups = new Map<string, Appointment[]>();
  A.forEach((a) => { const k = `${a.procedure_id}|${hm(a.starts_at)}|${a.room_id}`; groups.set(k, [...(groups.get(k) ?? []), a]); });
  const rows = [...groups.values()].sort((x, y) => hm(x[0].starts_at).localeCompare(hm(y[0].starts_at)));
  let h = (d.org ? `<p class="org">${esc(d.org)}</p>` : '') + '<h1>Orarul procedurilor</h1>';
  h += `<table><tbody><tr><th>Pacientul</th><td>${esc(P.code)} · ${esc(P.initials)}</td><th>Perioada</th><td>${A.length ? `${fD(dayOf(A[0].starts_at))} - ${fD(dayOf(A[A.length - 1].starts_at))}` : '-'}</td></tr></tbody></table>`;
  h += '<h2>Proceduri</h2><table><thead><tr><th>Ora</th><th>Procedura</th><th>Locația</th><th>Zilele de tratament</th></tr></thead><tbody>';
  h += rows.map((g) => {
    const a = g[0], p = d.procOf.get(a.procedure_id);
    const ds = g.map((x) => dayOf(x.starts_at));
    return `<tr><td class="c">${hm(a.starts_at)}-${hm(a.ends_at)}</td><td><b>${esc(p?.name ?? '?')}</b></td><td>${esc(d.roomOf.get(a.room_id)?.name ?? '-')}</td>`
      + `<td>${fD(ds[0]).slice(0, 5)} - ${fD(ds[ds.length - 1]).slice(0, 5)} (${g.length} ședințe)</td></tr>`;
  }).join('') || '<tr><td colspan="4">Nicio programare.</td></tr>';
  h += '</tbody></table>';
  h += `<div class="foot">Generat la ${fD(dayOf(new Date().toISOString()))}.</div>`;
  return h;
}

/** Tipărește într-un cadru ascuns (nu schimbă pagina). */
export function printHtml(title: string, inner: string) {
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  const doc = fr.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><div class="pr">${inner}</div></body></html>`);
  doc.close();
  setTimeout(() => {
    try { fr.contentWindow?.focus(); fr.contentWindow?.print(); } catch { /* fără tipărire în această vizualizare */ }
    setTimeout(() => fr.remove(), 60000);
  }, 150);
}
