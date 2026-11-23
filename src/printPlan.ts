import type { Appointment, Patient, PlanItem, Procedure, Room } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fD = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
const WD = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];
const fDW = (s: string) => `${WD[new Date(`${s}T00:00`).getDay()]} ${s.slice(8, 10)}.${s.slice(5, 7)}`;
const FREQ: Record<string, [string, string]> = { daily: ['zilnic', 'daily'], alternate: ['la două zile', 'every other day'], weekly: ['săptămânal', 'weekly'] };

const CSS = `@media print{@page{size:A4 portrait;margin:12mm}}
body{margin:0}.pr{font:10.5pt/1.4 Arial,"Segoe UI",sans-serif;color:#000}
.pr h1{font-size:15pt;margin:0 0 4mm}.pr h2{font-size:11.5pt;margin:5mm 0 2mm}
.pr table{border-collapse:collapse;width:100%;margin:0 0 3mm}.pr th,.pr td{border:.6pt solid #444;padding:1.5mm 2mm;text-align:left;vertical-align:top}
.pr th{background:#eee}.pr .c{text-align:center}.pr .sm{font-size:9pt;color:#333}.pr .org{font-size:9.5pt;margin:0 0 2mm}
.pr .box{display:inline-block;width:3.2mm;height:3.2mm;border:.7pt solid #000;vertical-align:middle}
.pr .sign{display:flex;justify-content:space-between;margin-top:12mm}.pr .foot{margin-top:6mm;font-size:8.5pt;color:#444}
.pr tr{break-inside:avoid}
.pr .en-sub{display:block;font-style:italic;font-size:.8em;font-weight:400}
.pr .hs td,.pr .hs th{height:6.2mm}.pr .blk{break-inside:avoid;margin:0 0 5mm}.pr .blk .meta{display:flex;gap:4mm;margin:0 0 1.5mm;align-items:baseline}
.pr .blk .meta .f{flex:1;border-bottom:.6pt solid #000;min-height:5mm;padding:0 1mm}.pr .blk .meta .f.s{flex:0 0 22mm}.pr .blk .meta .f.m{flex:0 0 52mm}.pr .blk .meta .f.l{flex:3}
.pr .hdr td,.pr .hdr th{border:.6pt solid #444}.pr .cb{margin:1.5mm 0}`;

export interface PlanPrintData {
  /** true: sub textul în română se adaugă, între paranteze, traducerea în engleză. */
  en: boolean;
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
  const x = (ro: string, en: string) => (d.en ? `${ro}<span class="en-sub">(${en})</span>` : ro);
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
    return `<tr><td class="c">${i + 1}</td><td><b>${esc(p?.name ?? '?')}</b></td><td class="c">${it.sessions}</td><td>${FREQ[it.frequency] ? x(FREQ[it.frequency][0], FREQ[it.frequency][1]) : ''}</td>`
      + `<td class="c">${it.duration ?? p?.default_duration ?? 30} min</td><td>${esc(rooms || '-')}</td><td>${esc(it.notes || '')}</td></tr>`;
  }).join('') || `<tr><td colspan="7">${x('Nicio procedură.', 'No procedures.')}</td></tr>`;
  h += '</tbody></table>';
  if (days.length && procs.length) {
    h += `<h2>${x(`Evidența ședințelor: ${esc(P.code)}`, `Session log: ${esc(P.code)}`)}</h2><table><thead><tr><th>${x('Data', 'Date')}</th>${procs.map((it) => `<th class="c">${esc(d.procOf.get(it.procedure_id)?.short_name || d.procOf.get(it.procedure_id)?.name || '?')}</th>`).join('')}<th>${x('Observații', 'Notes')}</th></tr></thead><tbody>`;
    h += days.map((day) => `<tr><td class="c">${fDW(day)}</td>${procs.map((it) => {
      const a = A.find((x) => dayOf(x.starts_at) === day && x.procedure_id === it.procedure_id);
      return `<td class="c">${a ? `<span class="box"></span> ${hm(a.starts_at)}` : '<span class="sm">-</span>'}</td>`;
    }).join('')}<td style="min-width:30mm"></td></tr>`).join('');
    h += '</tbody></table>';
  }
  h += `<p><span class="box"></span> ${x('Am verificat contraindicațiile procedurilor de mai sus.', 'I have checked the contraindications of the procedures above.')}</p>`;
  h += `<div class="sign"><span>${x('Medic', 'Doctor')} ______________________</span><span>${x('Semnătura și parafa', 'Signature and stamp')} ______________________</span></div>`;
  h += `<div class="foot">${esc(P.code)}. ${x(`Generat la ${fD(dayOf(new Date().toISOString()))}.`, `Generated on ${fD(dayOf(new Date().toISOString()))}.`)}</div>`;
  return h;
}

/** Fișa de tratament în formatul spitalului (beta): câte un bloc pe procedură, cu data, ora și sala din programările făcute. */
export function hospitalSheetHtml(d: PlanPrintData): string {
  const A = live(d), P = d.patient;
  const x = (ro: string, en: string) => (d.en ? `${ro}<span class="en-sub">(${en})</span>` : ro);
  const procs = d.items.filter((i) => i.active);
  let h = (d.org ? `<p class="org"><b>${esc(d.org)}</b></p>` : '')
    + `<h1>${x('Fișa de tratament nr. ______ &nbsp; Anexă la FOG ________', 'Treatment sheet no. ______ &nbsp; Annex to the medical record ________')}</h1>`;
  h += `<table class="hdr"><tbody>`
    + `<tr><th>${x('Data întocmirii', 'Date drawn up')}</th><td>${fD(dayOf(new Date().toISOString()))}</td><th>${x('Secția', 'Ward')}</th><td></td></tr>`
    + `<tr><th>${x('Nume și prenume pacient', 'Patient name')}</th><td>${esc(P.name || '')}${P.name ? '' : ' '}<span class="sm">(${esc(P.code)} · ${esc(P.initials)})</span></td><th>${x('Vârsta', 'Age')}</th><td></td></tr>`
    + `<tr><th>${x('Diagnostic', 'Diagnosis')}</th><td colspan="3">${esc(P.diagnosis || '')}</td></tr></tbody></table>`;
  h += `<p class="cb"><span class="box"></span> ${x('La evaluarea clinică nu au fost identificate boli transmisibile, plăgi deschise, dermite sau dermatoze care să contraindice utilizarea bazinului terapeutic.', 'On clinical evaluation no communicable diseases, open wounds, dermatitis or dermatoses contraindicating the therapeutic pool were found.')}<br>`
    + `<span class="box"></span> ${x('Au fost identificate contraindicații pentru utilizarea bazinului terapeutic.', 'Contraindications to using the therapeutic pool were found.')}</p>`;
  h += `<div class="sign"><span>${x('Semnătura și parafa medicului', 'Doctor signature and stamp')} ______________________ ${esc(d.doctor || '')}</span></div><div style="height:5mm"></div>`;
  procs.forEach((it) => {
    const p = d.procOf.get(it.procedure_id);
    const mine = A.filter((a) => a.procedure_id === it.procedure_id);
    const rooms = [...new Set(mine.map((a) => d.roomOf.get(a.room_id)?.name).filter(Boolean))].join(', ');
    const dur = it.duration ?? p?.default_duration ?? 30;
    const total = Math.max(it.sessions, mine.length, 1);
    const pages = Math.ceil(total / 10);
    for (let pg = 0; pg < pages; pg++) {
      let rows = '';
      for (let i = 0; i < 10; i++) {
        const n = pg * 10 + i;
        const a = mine[n];
        rows += `<tr><td class="c">${n + 1}</td><td>${a ? fD(dayOf(a.starts_at)) : ''}</td><td class="c">${a ? hm(a.starts_at) : ''}</td><td></td><td></td></tr>`;
      }
      h += `<div class="blk"><div class="meta"><b>${x('Manoperă', 'Procedure')}</b><span class="f l">${esc(p?.name ?? '?')}</span><b>${x('Nr. sală', 'Room')}</b><span class="f m">${esc(rooms)}</span></div>`
        + `<div class="meta"><b>${x('Parametri', 'Parameters')}</b><span class="f l">${esc(it.notes || '')}</span><b>${x('Durata', 'Duration')}</b><span class="f s">${dur} min</span></div>`
        + `<table class="hs"><thead><tr><th class="c" style="width:12mm">${x('Nr. ședință', 'Session')}</th><th style="width:26mm">${x('Data', 'Date')}</th><th style="width:16mm">${x('Ora', 'Time')}</th><th>${x('Executant (nume, prenume, semnătura)', 'Performed by (name, signature)')}</th><th>${x('Observații', 'Notes')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  });
  if (!procs.length) h += `<p>${x('Nicio procedură.', 'No procedures.')}</p>`;
  h += `<div class="foot">${esc(P.code)}. ${x(`Generat la ${fD(dayOf(new Date().toISOString()))}.`, `Generated on ${fD(dayOf(new Date().toISOString()))}.`)} ${x('Data, ora și sala sunt cele programate în aplicație; restul se completează de mână.', 'Date, time and room are the ones booked in the app; the rest is filled in by hand.')}</div>`;
  return h;
}

export function timetableHtml(d: PlanPrintData): string {
  const A = live(d), P = d.patient;
  const x = (ro: string, en: string) => (d.en ? `${ro}<span class="en-sub">(${en})</span>` : ro);
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
      + `<td>${fD(ds[0]).slice(0, 5)} - ${fD(ds[ds.length - 1]).slice(0, 5)} (${g.length} ședințe)</td></tr>`;
  }).join('') || `<tr><td colspan="4">${x('Nicio programare.', 'No appointments.')}</td></tr>`;
  h += '</tbody></table>';
  h += `<div class="foot">${x(`Generat la ${fD(dayOf(new Date().toISOString()))}.`, `Generated on ${fD(dayOf(new Date().toISOString()))}.`)}</div>`;
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
