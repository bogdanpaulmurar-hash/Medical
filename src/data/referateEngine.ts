// @ts-nocheck
/* Fila „Referate”, preluată din Vademecum MFR 3.0 (formularele, foaia tipărită și textele sunt cele ale medicului, neschimbate).
   Generat din fișierul medicului; nu se editează de mână. Legătura cu aplicația (pacienți, salvare, ferestre) este în `host`.
   Lista medicilor secției nu este inclusă: aplicația este publică, iar numele și parafele se trec din formular. */
export interface RefHost {
  root: HTMLElement;
  state: any;
  data: { dx999: string[]; a38: any[] };
  scales: any[];
  scCompute: (sc: any, v: any) => any;
  persist: () => void;
  goTab: (tab: string) => void;
}

export function createReferate(host: RefHost) {
  const state = host.state, root = host.root;
  const DX999 = host.data.dx999, A38 = host.data.a38;
  const SCALES = host.scales, SC_BY = {};
  SCALES.forEach((s) => { SC_BY[s.id] = s; });
  const scCompute = (sc) => host.scCompute(sc, {});
  const scAny = () => false;
  const __ls = [];
  const mk = (tgt) => ({ addEventListener: (t, f, o) => { tgt.addEventListener(t, f, o); __ls.push([tgt, t, f, o]); } });
  const __doc = mk(document), __win = mk(window);
  const $ = (s) => root.querySelector(s);
  const ACT = {};
  const getP = (id) => state.patients.find((p) => p.id === id);
  const persist = () => host.persist();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseISO = (s) => { const a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoOf(d); };
  const today = () => isoOf(new Date());
  const validISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && isoOf(parseISO(s)) === s;
  const fD = (s) => (s ? s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4) : '');
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (((n % 100) >= 20 || (n > 0 && n % 100 === 0)) ? 'de ' : '') + many);
  const posInt = (v) => { const n = parseInt(v, 10); return n > 0 ? n : ''; };
  const setTab = (t) => host.goTab(t);
  /* planul pacientului, ca în aplicația medicului: p = {id, dev (denumirea), n (ședințe), freq}; zilele lucrătoare de la început */
  const devOf = (id) => ({ name: id });
  const regionTxt = () => '';
  const sessions = (p, P) => {
    const out = []; let d = P.start; const step = p.freq === 'weekly' ? 5 : p.freq === 'alternate' ? 2 : 1; let k = 0;
    while (out.length < p.n && k < 800) { const w = parseISO(d).getDay(); if (w !== 0 && w !== 6) { if (k % step === 0) out.push(d); k++; } d = addDays(d, 1); }
    return out;
  };
  const pEnd = (P) => { let e = P.start; (P.procs || []).forEach((p) => { const s = sessions(p, P); if (s.length && s[s.length - 1] > e) e = s[s.length - 1]; }); return e; };
  const dxMatchStr = (P) => (P && P.dx) || '';
  /* ferestre, mesaje, copiere, tipărire */
  let ASK = null, TT = null, LASTFOCUS = null;
  const mroot = () => $('#modal-root');
  function toast(msg) {
    const el = $('#toast'); if (!el) return;
    el.innerHTML = '<span>' + esc(msg) + '</span>'; el.classList.add('show');
    clearTimeout(TT); TT = setTimeout(() => el.classList.remove('show'), 4500);
  }
  function openModal(html, wide) {
    const r = mroot(), fresh = !r.innerHTML;
    if (fresh) LASTFOCUS = document.activeElement;
    r.innerHTML = '<div class="mback" data-act="mbg"><div class="rfm' + (wide === true ? ' wide' : (wide ? ' ' + wide : '')) + '" role="dialog" aria-modal="true" aria-labelledby="m-title">' + html + '</div></div>';
    const t = r.querySelector(".rfm h2");
    if (t) { t.id = 'm-title'; t.tabIndex = -1; if (fresh) t.focus({ preventScroll: true }); }
  }
  function closeModal() {
    const had = !!mroot().innerHTML;
    mroot().innerHTML = '';
    if (ASK) { const a = ASK; ASK = null; a(false); }
    const f = LASTFOCUS; LASTFOCUS = null;
    if (had && f && f.isConnected && typeof f.focus === 'function') f.focus({ preventScroll: true });
  }
  function ask(msg, okLabel, danger, noLabel) {
    return new Promise((res) => {
      if (ASK) { const a = ASK; ASK = null; a(false); }
      openModal('<h2>Confirmare</h2><p>' + esc(msg) + '</p><div class="mfoot"><button type="button" class="btn" data-act="askNo">' + esc(noLabel || 'Renunță') + '</button><button type="button" class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="askYes">' + esc(okLabel || 'Confirmă') + '</button></div>');
      ASK = res;
    });
  }
  ACT.mbg = (el, e) => { if (e.target === el) closeModal(); };
  ACT.closeModal = () => closeModal();
  ACT.askYes = () => { const a = ASK; ASK = null; LASTFOCUS = null; mroot().innerHTML = ''; if (a) a(true); };
  ACT.askNo = () => closeModal();
  ACT.tab = (el) => setTab(el.dataset.tab);
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* metoda veche */ }
    try {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  function doPrint(title, inner, text, css) {
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    const d = fr.contentDocument;
    d.open(); d.write('<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{margin:0}' + (css || '') + '</style></head><body><div class="pr">' + inner + '</div></body></html>'); d.close();
    setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('Tipărirea nu a pornit în această vizualizare.'); } setTimeout(() => fr.remove(), 60000); }, 150);
  }
  root.addEventListener('click', (e) => {
    const el = e.target.closest ? e.target.closest('[data-act]') : null; if (!el) return;
    const f = ACT[el.dataset.act]; if (f) f(el, e);
  });

/* ---------- Fila „Referate”: referate medicale pentru pensia de invaliditate și pentru încadrarea în grad de handicap (18.11.2026) ----------
   Patru formulare, cu rubricile modelelor publicate:
   a16: Referat medical pentru expertiza capacității de muncă: Anexa nr. 16 la Ordinul președintelui CNPP nr. 1.104/2024 (MO nr. 934 din 17.09.2024).
   a5:  Referat medical pentru avizul medicului expert (concediu medical după a 90-a zi, timp de muncă redus, pensionare de invaliditate):
        Anexa nr. 5 la Normele de aplicare a OUG nr. 158/2005 (Ordinul MS/CNAS nr. 15/2018/1.311/2017, art. 18 alin. (4)), forma publicată de CJP Cluj.
   hc:  Referat privind situația medicală prezentă, pentru evaluarea complexă (handicap, adulți). Nu există model național (Metodologia aprobată prin
        HG nr. 430/2008 cere doar „referat privind situația medicală prezentă, întocmit de medicul specialist”); rubricile urmează lista DGASPC Cluj
        și criteriile din Ordinul MMFTSS/MS nr. 2.300/1.457/2025 (SCOR ADL din capitolul 7, cu itemii și pragurile tipărite acolo).
   a39b: Prescripție medicală - recomandare pentru dispozitive medicale: Anexa 39 B la Normele aprobate prin Ordinul MS/CNAS nr. 1.857/441/2023,
        modelul valabil cu 01.07.2024 (fișierul primit de la secție). Dispozitivul se alege din Anexa 38 (A38, guide/a38.js), codul de boală
        din lista CIM-10 cu 999 de coduri (DX999, guide/dx999.js); cele două liste lipsesc din Programări MFR.
   Datele: P.ref (câmpuri text; diagnosticul, examenul, investigațiile, tratamentele, prognosticul și bilanțul funcțional sunt comune celor 3 formulare)
   sau state.refDraft (fără pacient din listă; nu intră în export). Numele, CNP-ul și adresa nu se păstrează: pe foaie rămân rubrici punctate. */
const RF_DOCS = {
  a16: {t: 'Pensie de invaliditate', st: 'Expertiza capacității de muncă', pt: 'Referat medical, Anexa nr. 16',
    src: 'Modelul din Anexa nr. 16 la Ordinul președintelui Casei Naționale de Pensii Publice nr. 1.104/2024 pentru aprobarea formularelor-tip utilizate în activitatea de expertiză medicală a capacității de muncă (Monitorul Oficial nr. 934 din 17.09.2024).',
    use: 'Însoțește cererea de expertizare a capacității de muncă, depusă la cabinetul de expertiză medicală de care ține domiciliul pacientului, pentru încadrarea într-un grad de invaliditate (Legea nr. 360/2023 și normele ei, HG nr. 181/2024). Nota de pe formular: datele din rubricile cu *) trebuie să susțină diagnosticul clinic și stadiul evolutiv; la bolnavii netransportabili, referatul justifică medical imposibilitatea deplasării.'},
  a5: {t: 'Concediu medical prelungit', st: 'Avizul medicului expert', pt: 'Referat medical, Anexa 5',
    src: 'Modelul din Anexa nr. 5 la Normele de aplicare a OUG nr. 158/2005, aprobate prin Ordinul ministrului sănătății și al președintelui CNAS nr. 15/2018/1.311/2017 (art. 18 alin. (4)), în forma publicată de Casa Județeană de Pensii Cluj.',
    use: 'Începând cu a 91-a zi, concediul medical se poate prelungi până la 183 de zile cu aprobarea medicului expert al asigurărilor sociale (OUG nr. 158/2005, art. 13 alin. (2)). Medicul curant întocmește acest referat și îl trimite la cabinetul de expertiză în a cărui rază are domiciliul asiguratul. Pe referat propuneți: prelungirea concediului, reducerea timpului de muncă cu o pătrime sau pensionarea de invaliditate.'},
  hc: {t: 'Grad de handicap', st: 'Adulți, situația medicală prezentă', pt: 'Referat medical pentru încadrarea în grad de handicap',
    src: 'Nu există un model național pentru referatul medicului specialist. Metodologia aprobată prin HG nr. 430/2008 cere „referat privind situația medicală prezentă, întocmit de medicul specialist”. Criteriile de încadrare: Ordinul MMFTSS/MS nr. 2.300/1.457/2025 (Monitorul Oficial nr. 1027 din 06.11.2025).',
    use: 'Pentru dosarul de evaluare complexă la DGASPC. DGASPC Cluj cere scrisoare, referat sau certificat de la medicul specialist, din ultimele 6 luni, cu diagnosticul, stadiul bolii, starea prezentă de sănătate și, după caz, data debutului. Pentru afecțiunile osteoarticulare congenitale sau cu debut precoce, criteriile cer documente care arată debutul, evoluția și tratamentele de recuperare efectuate.'},
  a39b: {t: 'Dispozitive medicale', st: 'Anexa 39 B, prescripție-recomandare', pt: 'Prescripție medicală - recomandare dispozitive medicale, Anexa 39 B',
    src: 'Modelul din Anexa 39 B (valabil cu 01.07.2024) la Normele metodologice aprobate prin Ordinul ministrului sănătății și al președintelui CNAS nr. 1.857/441/2023. Dispozitivele: Anexa nr. 38 la același ordin, pachetul de bază (lista publicată de CNAS în noiembrie 2024 și forma consolidată a normelor din aprilie 2025); verificați la casa de asigurări dacă lista s-a schimbat de atunci. Codurile de boală: lista CIM-10 cu 999 de coduri, cu denumirile din anexa publicată (fără diacritice).',
    use: 'Pentru dispozitivele din Anexa 38: orteze, proteze, încălțăminte ortopedică, dispozitive de mers și fotolii rulante, dispozitive compresive și celelalte. Notele de pe formular: recomandarea se eliberează în 2 exemplare și numai dacă deficiența organică sau funcțională nu este urmarea unei boli profesionale sau a unui accident de muncă ori sportiv. Numărul de sus este cel din registrul de consultații sau din foaia de observație.'}};
const RF_ORDER = ['a16', 'a5', 'hc', 'a39b'];
const RF_ORG = () => (state.settings.header || '').trim() || 'Spitalul Clinic de Recuperare Cluj-Napoca';
/* datele medicului și ale unității: se țin minte în Setări (state.settings.refMed) și se precompletează la referatele noi */
const RF_MED = ['med', 'grad', 'spec', 'parafa', 'org', 'loc', 'jud', 'conv', 'cas', 'adr', 'cui', 'ctr', 'ctrCas', 'tel', 'mail', 'rxU'];
/* medicii secției (lista dată de secție, 18.11.2026): titlul, numele, gradul, codul de parafă; toți au specialitatea medicină fizică și de reabilitare */
const MEDICI = [];
const MED_SPEC = 'medicină fizică și de reabilitare';
const medFull = m => m[0] + ' ' + m[1];
/* medicul secției scris la pacient (după numele de familie, fără diacritice); nimic dacă nu se potrivește exact unul */
function medOf(t) {
  const w = rfNorm(t).split(/[^a-z]+/).filter(Boolean); if (!w.length) return null;
  const hit = MEDICI.filter(m => { const n = rfNorm(m[1]).split(/[^a-z]+/); return w.indexOf(n[n.length - 1]) >= 0; });
  return hit.length === 1 ? hit[0] : null;
}
/* Scorul ADL din criteriile de handicap (Ordinul 2.300/1.457/2025, cap. 7): itemii și descrierile din tabel; variantele în ordinea 2, 1, 0 puncte */
const RF_ADL = [
  ['adl1', 'Igienă corporală', ['Autonomie', 'Ajutat parțial', 'Dependent']],
  ['adl2', 'Îmbrăcare', ['Autonomie', 'Autonomie pentru îmbrăcare, dar ajutor pentru încălțare', 'Dependent']],
  ['adl3', 'Mersul la toaletă', ['Autonomie', 'Ajutat', 'Ajutat la pat']],
  ['adl4', 'Continență sfincteriană', ['Continent', 'Incontinență ocazională', 'Incontinent']],
  ['adl5', 'Alimentația', ['Mănâncă singur', 'Ajutat pentru tăiat cu cuțitul', 'Dependent']]];
/* pragurile, așa cum sunt tipărite (intervalele se suprapun la 3 și la 8) */
const RF_ADL_ST = [['st. I', 10, 10, 'autonomie'], ['st. II', 8, 10, 'cvasiindependent'], ['st. III', 3, 8, 'independență asistată'], ['st. IV', 0, 3, 'dependență totală, necesită asistent personal']];
const RF_FMS = [['Sd', 'Membrul superior drept'], ['Ss', 'Membrul superior stâng'], ['Id', 'Membrul inferior drept'], ['Is', 'Membrul inferior stâng']];
const RF_MERS = [['ind', 'independent, fără sprijin'], ['dif', 'independent, cu dificultate'], ['uni', 'cu sprijin unilateral'], ['bil', 'cu sprijin bilateral'], ['imp', 'imposibil; se deplasează în fotoliu rulant'], ['pat', 'imposibil; imobilizat la pat']];
const RF_AIDS = [['baston', 'baston'], ['carja', 'cârjă'], ['carje', 'cârje'], ['cadru', 'cadru de mers'], ['orteza', 'orteză'], ['proteza', 'proteză'], ['fotoliu', 'fotoliu rulant']];
/* Ce cere DGASPC Cluj în plus, pe grupe de afecțiuni („Acte necesare încadrării în grad de handicap”, după Ordinul 2.300/1.457/2025); potrivire după diagnostic */
const RF_DG = [
  [/avc|accident vascular|hemipar|hemipleg|monopar|monopleg|parapar|parapleg|tetrapar|tetrapleg|pareză|pareza|plegie/i, 'Pareze și plegii', 'referat de neurologie despre starea prezentă și mobilitate, cu FMS, Barthel, Rankin, ADL și IADL în tabel; imagistică (CT, IRM; EEG, EMG după caz); bilet de ieșire de la neurologie; la AVC, examen de recuperare medicală (diagnosticul, starea prezentă, Barthel, ADL și IADL, când se cer).'],
  [/parkinson/i, 'Boala Parkinson', 'referat de neurologie cu stadiul Hoehn și Yahr, starea prezentă și scorul Webster sau UPDRS; CT sau IRM cerebral.'],
  [/scleroz[aă] multipl|scleroz[aă] [îi]n pl[aă]ci/i, 'Scleroza multiplă', 'referat de neurologie cu EDSS, FMS, ADL și IADL; IRM cerebral; referat oftalmologic (acuitate și câmp vizual).'],
  [/spondilit|spondilartrit|spondiloartrit|bechterew/i, 'Spondilartrite', 'spondilita anchilozantă: referat de reumatologie cu stadiul, clasa funcțională, starea prezentă, BASFI, BASDAI și ADL; spirometrie interpretată de pneumolog; radiografie de coloană lombosacrată și bazin, interpretată de radiolog. Spondilartrita psoriazică: starea prezentă, clasa funcțională, DAPSA și ADL; radiografie sau IRM de coloană.'],
  [/poliartrit|artrit[aă] reumatoid/i, 'Poliartrita reumatoidă', 'referat de reumatologie cu clasa Steinbrocker, starea prezentă, DAS28, HAQ, ADL și IADL; radiografii ale articulațiilor afectate, interpretate.'],
  [/amputa/i, 'Amputații', 'referat de ortopedie sau de chirurgie vasculară cu tabelul ADL; după 12 luni de la amputație: diagnosticul, stadiul Leriche-Fontaine, starea bontului, mobilitatea, protezarea și membrul opus (indicele gleznă-braț la arteriopatie).'],
  [/limfedem/i, 'Limfedem după cancer', 'examen neurologic recent cu FMS, Barthel, Rankin și ADL în tabel.'],
  [/artroz|fractur|endoprot|scolioz|cifoz|ortoped|luxați|luxati|displazi/i, 'Afecțiuni ortopedice', 'referat de ortopedie sau de chirurgie despre starea prezentă și deficitul funcțional, cu tabelul ADL; radiografie, CT sau IRM interpretate; bilet de ieșire, după caz. Debut până la 26 de ani: dovada vârstei de debut. Cifoscolioză: unghiul Cobb, ADL și IADL.']];

let RF_PT = null, RF_VT = null, RF_AUTO = {};
/* ---------- date ---------- */
function rfKey() {
  const v = state.ui.refP;
  if (v === '_') return '_';
  if (v && getP(v)) return v;
  if (state.ui.sel && getP(state.ui.sel)) return state.ui.sel;
  return '_';
}
function rfInit(R, P) {
  if (R.init) return false;
  R.init = '1';
  if (P && P.dx && !R.dx) R.dx = P.dx;
  const m = state.settings.refMed || {};
  RF_MED.forEach(k => { if (!R[k] && m[k]) R[k] = m[k]; });
  /* medicul pacientului, dacă este unul dintre medicii secției, are întâietate față de ultimul medic folosit */
  const md = P && medOf(P.doctor);
  if (md) { R.med = md[1]; R.grad = md[2]; R.spec = MED_SPEC; R.parafa = md[3]; }
  if (!R.med && P && P.doctor) R.med = P.doctor;
  if (!R.spec) R.spec = 'medicină fizică și de reabilitare';
  if (!R.org) R.org = RF_ORG();
  if (!R.loc && /cluj/i.test(R.org)) R.loc = 'Cluj-Napoca';
  if (!R.jud && /cluj/i.test(R.org)) R.jud = 'Cluj';
  return true;
}
/* datele spitalului pentru Anexa 39 B, date de secție (18.11.2026): se folosesc la Spitalul Clinic de Recuperare Cluj-Napoca, cât timp în Setări nu sunt altele.
   Telefonul are prefixul de țară, cum cere formularul; casa de asigurări: Cluj (unitatea are contract cu casa județului). */
const RF_HOSP39 = {adr: 'Str. Viilor 46-50, 400066 Cluj-Napoca', cui: '4288063', ctr: '6', ctrCas: 'Cluj', tel: '+40 264 207 021', mail: 'secretariat@recuperarecluj.ro'};
const RF_K39 = ['adr', 'cui', 'ctr', 'ctrCas', 'tel', 'mail', 'rxU'];
function rfInit39(R) {
  if (R.init39) return false;
  R.init39 = '1';
  const m = state.settings.refMed || {}, own = /recuperare cluj/i.test(R.org || '');
  RF_K39.forEach(k => { if (!R[k]) { const v = m[k] || (own ? RF_HOSP39[k] || '' : ''); if (v) R[k] = v; } });
  return true;
}
function rfStore(k) {
  let R;
  if (k === '_') { if (!state.refDraft || typeof state.refDraft !== 'object' || Array.isArray(state.refDraft)) state.refDraft = {}; R = state.refDraft; }
  else { const P = getP(k); if (!P) return {}; if (!P.ref || typeof P.ref !== 'object' || Array.isArray(P.ref)) P.ref = {}; R = P.ref; }
  if (rfInit(R, k === '_' ? null : getP(k))) persist();
  return R;
}
const rfDoc = () => RF_DOCS[state.ui.refD] ? state.ui.refD : 'a16';
const rfDate = v => v && validISO(v) ? fD(v) : '';
const rfDay = R => rfDate(R.data) || fD(today());
const rfE = s => esc(String(s == null ? '' : s).trim());
const rfML = s => rfE(s).replace(/\n/g, '<br>');
/* bilanțul funcțional, ca text (rubrica de examen din Anexa 16 și Anexa 5, textul copiat) */
function rfAdl(R) {
  const v = RF_ADL.map(a => R[a[0]]), n = v.filter(x => x === '0' || x === '1' || x === '2').length;
  return {n, tot: v.reduce((s, x) => s + (x === '0' || x === '1' || x === '2' ? +x : 0), 0), parts: RF_ADL.map((a, i) => v[i] ? a[1].toLowerCase() + ' ' + v[i] : '').filter(Boolean)};
}
const rfAdlSt = t => RF_ADL_ST.filter(s => t >= s[1] && t <= s[2]);
const rfMrsTxt = v => { const sc = SC_BY.mrs, o = sc && sc.items[0].o.find(x => String(x[0]) === String(v)); return o ? o[1].split(/[:;]/)[0].replace(/,.*$/, '').toLowerCase() : ''; };
const rfAids = R => (R.aids || '').split(',').map(k => (RF_AIDS.find(a => a[0] === k) || [])[1]).filter(Boolean);
const rfMers = R => (RF_MERS.find(m => m[0] === R.mers) || [])[1] || '';
function rfFmsRows(R) {
  return RF_FMS.map(f => [f[1], R['fms' + f[0] + 'P'] || '', R['fms' + f[0] + 'D'] || '']).filter(r => r[1] || r[2]);
}
function rfScaleRows(R) {
  const rows = [], a = rfAdl(R);
  if (a.n === 5) rows.push(['SCOR ADL (5 itemi, 0-10)', a.tot + '/10 (' + a.parts.join(', ') + ')']);
  else if (a.n) rows.push(['SCOR ADL (5 itemi, 0-10)', 'incomplet: ' + a.parts.join(', ')]);
  if (R.iadl) rows.push(['IADL', R.iadl]);
  if (R.barthel) rows.push(['Indicele Barthel', R.barthel + '/100']);
  if (R.mrs) rows.push(['Scala Rankin modificată', R.mrs + (rfMrsTxt(R.mrs) ? ' (' + rfMrsTxt(R.mrs) + ')' : '')]);
  (R.scx || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(l => { const i = l.indexOf(':'); rows.push(i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, '']); });
  return rows;
}
function rfFuncTxt(R) {
  const L = [], fm = rfFmsRows(R);
  if (fm.length) L.push('Forța musculară segmentară (0-5): ' + fm.map(r => r[0].replace('Membrul ', 'membrul ') + ' ' + [r[1] ? r[1] + ' proximal' : '', r[2] ? r[2] + ' distal' : ''].filter(Boolean).join(', ')).join('; ') + '.' + (R.fmsN ? ' ' + R.fmsN.trim() : ''));
  else if (R.fmsN) L.push('Forța musculară: ' + R.fmsN.trim());
  const ms = rfMers(R), ai = rfAids(R);
  if (ms || ai.length) L.push('Mersul: ' + [ms, ai.length ? 'mijloace ajutătoare: ' + ai.join(', ') : ''].filter(Boolean).join('; ') + '.');
  const sr = rfScaleRows(R);
  if (sr.length) L.push(sr.map(r => r[0] + (r[1] ? ': ' + r[1] : '')).join('. ') + '.');
  return L.join('\n');
}
/* textele luate din plan */
function rfProcTxt(P, mode) {
  if (!P || !P.procs.length) return '';
  const td = today(); let part = false;
  const rows = P.procs.map(p => {
    const D = devOf(p.dev), ss = sessions(p, P), n = ss.length, done = ss.filter(d => d <= td).length;
    const lab = D.name + (regionTxt(p) ? ', ' + regionTxt(p) : '');   /* la kinetoterapie, fără afecțiunea din aplicație (nu e program presetat) */
    let c = '';
    if (n) { if (mode === 'plan' || done >= n) c = plural(n, 'ședință', 'ședințe'); else if (!done) c = plural(n, 'ședință planificată', 'ședințe planificate'); else { c = done + ' din ' + plural(n, 'ședință', 'ședințe'); part = true; } }
    return lab + (c ? ': ' + c : '');
  });
  return (mode === 'plan' ? 'Program de recuperare medicală' : 'Tratament de recuperare medicală') + (P.type === 'amb' ? ' în ambulatoriu' : ', internat') + ', ' + fD(P.start) + ' - ' + fD(pEnd(P))
    + (part ? ' (ședințele efectuate până la ' + fD(td) + ')' : '') + ': ' + rows.join('; ') + '.';
}
const rfInternTxt = P => P && P.type !== 'amb' ? (P.dx ? P.dx + ' ' : '') + '(' + RF_ORG() + ', ' + fD(P.start) + ' - ' + fD(pEnd(P)) + ')' : '';
function rfScLine(sc) {
  const r = scCompute(sc); if (!r || !r.ok) return '';
  const val = r.big ? r.big : r.val + (r.unit ? (r.unit === '%' ? '%' : ' ' + r.unit) : '') + (r.max ? '/' + r.max : '');
  return sc.t + ': ' + String(val).replace(/(\d)\.(\d)/g, '$1,$2') + (r.band ? ' (' + r.band.t + ')' : '');
}
const rfScAvail = () => SCALES.filter(s => !s.info && !s.sec && s.cat !== 'adr' && s.cat !== 'crit' && s.id !== 'barthel' && s.id !== 'mrs' && scAny(s)).map(s => [s, rfScLine(s)]).filter(x => x[1]);
/* rubricile necompletate */
const RF_REQ = {
  a16: [['dx', 'diagnostic clinic'], ['simpt', 'simptomatologie'], ['exam', 'examen obiectiv'], ['hi', 'Î'], ['gw', 'G'], ['ta', 'TA'], ['av', 'AV'], ['inv', 'investigații'], ['trat', 'tratamente urmate'], ['prog', 'prognostic recuperator'], ['depl', 'deplasabilă da/nu']],
  a5: [['org', 'unitatea sanitară'], ['loc', 'localitatea'], ['jud', 'județul/sectorul unității'], ['conv', 'nr. convenției'], ['cas', 'CAS'], ['med', 'numele medicului'], ['grad', 'primar/specialist'], ['spec', 'specialitatea'], ['parafa', 'cod parafă'], ['prof', 'profesia'], ['ang', 'locul de muncă'], ['evid', 'în evidență de la'], ['dx0', 'diagnosticul la luarea în evidență'], ['dx', 'diagnosticul actual'], ['exam', 'examen obiectiv'], ['intern', 'internări'], ['inv', 'investigații'], ['trat', 'tratamente urmate'], ['plan', 'plan de recuperare'], ['prog', 'prognostic recuperator'], ['itm', 'incapacitate de la data'], ['itmN', 'număr de zile'], ['itmLa', 'la data de'], ['pr', 'propunerea a, b sau c'], ['nr', 'nr. referatului']],
  hc: [['dx', 'diagnostic clinic'], ['stadiu', 'stadiul bolii'], ['exam', 'starea prezentă'], ['trat', 'tratamente urmate'], ['med', 'numele medicului']],
  a39b: [['rxNr', 'nr. din registrul de consultații/FO'], ['org', 'unitatea medicală'], ['rxU', 'MF/ambulatoriu/spital'], ['adr', 'adresa unității'], ['cui', 'CUI'], ['ctr', 'nr. contractului cu CAS'], ['ctrCas', 'casa de asigurări de sănătate'],
    ['med', 'numele medicului'], ['parafa', 'cod parafă'], ['spec', 'specialitatea'], ['tel', 'telefon/fax'], ['mail', 'e-mail'], ['onco', 'afecțiune oncologică da/nu'], ['dx', 'diagnosticul'],
    ['nbp', 'punctul 6 (boală profesională)'], ['nam', 'punctul 6 (accident de muncă ori sportiv)'], ['disp', 'dispozitivul (punctul 12)']]};
/* punctele 7-10 și 13 din Anexa 39 B cerute de dispozitivul ales din Anexa 38 */
const rfPts = R => (R.dispPt || '').split(',').filter(Boolean);
function rfMissing(d, R) {
  const fn = rfFuncTxt(R), out = RF_REQ[d].filter(x => !(R[x[0]] || (x[0] === 'exam' && fn && d !== 'hc' && d !== 'a39b'))).map(x => x[1]);
  if (d === 'a39b') {
    const pt = rfPts(R);
    if (pt.indexOf('7') >= 0 && !R.st7) out.push('punctul 7: permanentă/temporară');
    if (R.st7 === 'temp' && !R.st7z) out.push('punctul 7: numărul de zile');
    if (pt.indexOf('8') >= 0 && !R.ox) out.push('punctul 8: certificatul de handicap');
    if (R.ox && R.ox !== 'def' && !R.oxZ) out.push('punctul 8: zilele sau lunile recomandate');
    if (pt.indexOf('9') >= 0 && !R.fr) out.push('punctul 9: perioada');
    if (R.fr === 'det' && !R.frZ) out.push('punctul 9: numărul de zile');
    if (pt.indexOf('10') >= 0 && !R.pmi) out.push('punctul 10: proteză provizorie/definitivă');
  }
  if (d === 'a5' && R.pr === 'a' && !(R.aN && R.aFrom && R.aTo)) out.push('zilele și perioada de la propunerea a');
  if (d === 'a5' && R.pr === 'b' && !(R.bN && R.bFrom && R.bTo)) out.push('zilele și perioada de la propunerea b');
  if (d === 'a16' && R.depl === 'nu' && !R.obs) out.push('la „Observații”, datele care justifică medical imposibilitatea deplasării');
  return out;
}

/* ---------- foaia tipărită ---------- */
const rfDot = mm => '<span class="rf-d" style="width:' + mm + 'mm"></span>';
const rfIn = (v, mm) => v ? '<span class="rf-iv">' + rfE(v) + '</span>' : rfDot(mm);
const rfBox = on => '<span class="rf-bx">' + (on ? 'X' : '') + '</span>';
function rfF(label, v, n, extra) {
  /* textul scurt, pe un rând, continuă după etichetă, ca pe formular; textul lung sau pe mai multe rânduri începe sub etichetă */
  const sh = v && String(v).trim().length <= 110 && String(v).indexOf('\n') < 0;
  if (v || extra) return '<div class="rf-ll"><span class="rf-lb">' + label + '</span> ' + (v ? '<span class="rf-tx' + (sh ? ' in' : '') + '">' + rfML(v) + '</span>' : '') + (extra || '') + '</div>';
  return '<div class="rf-ll e"><p><span class="rf-lb">' + label + '</span><span class="rf-fill"></span></p>' + '<span class="rf-ln"></span>'.repeat(Math.max(0, (n || 1) - 1)) + '</div>';
}
const rfFuncHtml = R => { const t = rfFuncTxt(R); return t ? '<span class="rf-tx rf-fn2">' + rfML(t) + '</span>' : ''; };
function rfA16Html(R) {
  let h = '<div class="rf rf-a16"><p class="rf-anx">Anexa nr. 16</p>'
    + '<p class="rf-hl">Unitatea sanitară ' + rfIn(R.org, 95) + '</p>'
    + '<p class="rf-hl">Nr. ' + rfIn(R.nr, 22) + ' / ' + rfIn(rfDay(R), 26) + '</p>'
    + '<p class="rf-title">REFERAT MEDICAL</p>'
    + '<p class="rf-id">privind pe domnul/doamna ' + rfDot(80) + ', CNP ' + rfDot(52) + ', cu domiciliul în localitatea ' + rfDot(50) + ', str. ' + rfDot(56) + ' nr. ' + rfDot(12) + ', bl. ' + rfDot(12) + ', sc. ' + rfDot(9) + ', et. ' + rfDot(9) + ', ap. ' + rfDot(9) + ', județul/sectorul ' + rfDot(42) + '</p>';
  h += rfF('Diagnostic clinic:', R.dx, 2);
  h += rfF('Simptomatologie*):', R.simpt, 3);
  const vit = '<span class="rf-vit">Î = ' + rfIn(R.hi, 14) + ' cm; G = ' + rfIn(R.gw, 14) + ' kg; TA = ' + rfIn(R.ta, 22) + ' mmHg; AV = ' + rfIn(R.av, 14) + ' b/min.</span>';
  const fn = rfFuncHtml(R);
  h += '<div class="rf-ll"><span class="rf-lb">Examen obiectiv detaliat*):</span>' + vit + (R.exam ? '<span class="rf-tx">' + rfML(R.exam) + '</span>' : '') + fn + (R.exam || fn ? '' : '<span class="rf-ln"></span>'.repeat(4)) + '</div>';
  h += rfF('Investigații clinice, paraclinice*):', R.inv, 3);
  h += rfF('Tratamente urmate', R.trat, 3);
  h += rfF('Prognostic recuperator:', R.prog, 2);
  h += '<div class="rf-keep"><p class="rf-dep">Persoana este deplasabilă da ' + rfBox(R.depl === 'da') + ' nu ' + rfBox(R.depl === 'nu') + '</p>';
  h += rfF('Observații:', R.obs, 2);
  h += '<div class="rf-sig"><div>Medic de specialitate,<span class="rf-sp"></span><span class="rf-sm">(semnătura, parafa, ștampila)</span></div></div></div>';
  h += '<p class="rf-note">*) Datele înscrise trebuie să susțină diagnosticul clinic și stadiul evolutiv al afecțiunilor prezentate. Pentru bolnavii netransportabili, referatul medical trebuie să conțină date care să justifice din punct de vedere medical imposibilitatea deplasării.</p>';
  return h + '</div>';
}
function rfA5Html(R) {
  const g = R.grad === 'primar' ? 'medic primar' : R.grad === 'specialist' ? 'medic specialist' : 'medic primar/specialist';
  const on = x => R.pr === x;
  let h = '<div class="rf rf-a5"><p class="rf-anx">Anexa 5</p><div class="rf-hd">'
    + '<p class="rf-hl">Unitatea sanitară ' + rfIn(R.org, 90) + '</p>'
    + '<p class="rf-hl">Localitatea ' + rfIn(R.loc, 55) + '</p>'
    + '<p class="rf-hl">Județul/sectorul ' + rfIn(R.jud, 50) + '</p>'
    + '<p class="rf-hl">Nr. convenției ' + rfIn(R.conv, 30) + ' cu CAS ' + rfIn(R.cas, 45) + '</p></div>'
    + '<p class="rf-title">REFERAT MEDICAL*)</p>'
    + '<p class="rf-id">Subsemnatul dr. ' + rfIn(R.med, 62) + ', ' + g + ', specialitatea ' + rfIn(R.spec, 55) + ', cod parafă ' + rfIn(R.parafa, 22) + ', propun expertiza capacității de muncă a domnului/doamnei ' + rfDot(80) + ', CNP ' + rfDot(52) + ', cu domiciliul în ' + rfDot(55) + ', str. ' + rfDot(56) + ' nr. ' + rfDot(12) + ', județul/sectorul ' + rfDot(42) + ', de profesie ' + rfIn(R.prof, 55) + ', angajat/angajată la ' + rfIn(R.ang, 65) + '.</p>';
  h += '<p class="rf-hl">Este în evidență de la data de ' + rfIn(rfDate(R.evid), 30) + '</p>';
  h += rfF('Diagnosticul clinic la data luării în evidență', R.dx0, 2);
  h += rfF('Diagnosticul clinic actual', R.dx, 2);
  const fn = rfFuncHtml(R);
  h += rfF('Examen obiectiv', R.exam, 3, fn);
  h += rfF('A fost internat/internată în spital**) cu diagnosticul/diagnosticele', R.intern, 2);
  h += rfF('Investigații clinice, paraclinice**)', R.inv, 3);
  h += rfF('Tratamente urmate', R.trat, 3);
  h += rfF('Plan de recuperare', R.plan, 3);
  h += rfF('Prognostic recuperator', R.prog, 2);
  h += '<p class="rf-p">Se află în incapacitate temporară de muncă de la data de ' + rfIn(rfDate(R.itm), 26) + ' și a totalizat un număr de ' + rfIn(R.itmN, 14) + ' zile concediu medical la data de ' + rfIn(rfDate(R.itmLa), 26) + '.</p>';
  h += '<div class="rf-keep"><p class="rf-p rf-lb">Propunem:</p>'
    + '<p class="rf-pr">' + rfBox(on('a')) + '<span>a) prelungirea concediului medical, considerând că bolnavul este recuperabil, cu ' + rfIn(on('a') ? R.aN : '', 12) + ' zile, de la ' + rfIn(on('a') ? rfDate(R.aFrom) : '', 24) + ' până la ' + rfIn(on('a') ? rfDate(R.aTo) : '', 24) + ';</span></p>'
    + '<p class="rf-pr">' + rfBox(on('b')) + '<span>b) reducerea temporară a timpului de muncă cu o pătrime din durata normală, pentru ' + rfIn(on('b') ? R.bN : '', 12) + ' zile, de la ' + rfIn(on('b') ? rfDate(R.bFrom) : '', 24) + ' până la ' + rfIn(on('b') ? rfDate(R.bTo) : '', 24) + ';</span></p>'
    + '<p class="rf-pr">' + rfBox(on('c')) + '<span>c) bolnavul nu este recuperabil în limitele duratei concediului medical prevăzut de lege și propunem pensionarea de invaliditate temporară.</span></p>';
  h += '<div class="rf-sig2"><div>Nr. ' + rfIn(R.nr, 22) + ' din data ' + rfIn(rfDay(R), 26) + '</div><div class="rf-sgr">Medic curant,<span class="rf-nm">' + (R.med ? rfE(R.med) : rfDot(55)) + '</span><span class="rf-sp"></span><span class="rf-sm">(parafa și ștampila unității sanitare)</span></div></div></div>';
  h += '<p class="rf-note">*) Necompletarea tuturor rubricilor determină invalidarea referatului medical.<br>**) Se vor anexa rezultatele, biletele de externare din spital.</p>';
  return h + '</div>';
}
function rfHcHtml(R) {
  const g = R.grad === 'primar' ? 'Medic primar' : R.grad === 'specialist' ? 'Medic specialist' : 'Medic';
  let h = '<div class="rf rf-hc"><div class="rf-hd"><p class="rf-hl">Unitatea sanitară ' + rfIn(R.org, 95) + '</p><p class="rf-hl">Nr. ' + rfIn(R.nr, 22) + ' din data ' + rfIn(rfDay(R), 26) + '</p></div>'
    + '<p class="rf-title">REFERAT MEDICAL</p><p class="rf-sub">privind situația medicală prezentă, pentru evaluarea complexă în vederea încadrării în grad de handicap</p>'
    + '<p class="rf-id">Numele și prenumele ' + rfDot(88) + ', CNP ' + rfDot(52) + ', domiciliul ' + rfDot(120) + '</p>';
  h += rfF('Diagnostic clinic:', R.dx, 2);
  h += '<p class="rf-p">Data debutului bolii: ' + rfIn(R.debut, 40) + '; stadiul bolii: ' + rfIn(R.stadiu, 70) + '</p>';
  h += rfF('Istoric și evoluție:', R.ist, 3);
  h += rfF('Starea prezentă de sănătate (examen clinic):', R.exam, 4);
  const fm = rfFmsRows(R), ms = rfMers(R), ai = rfAids(R), sr = rfScaleRows(R);
  if (fm.length || R.fmsN) h += '<div class="rf-ll"><span class="rf-lb">Forța musculară segmentară (FMS, 0-5):</span>' + (fm.length ? '<table class="rf-tb"><thead><tr><th></th><th class="c">Proximal</th><th class="c">Distal</th></tr></thead><tbody>' + fm.map(r => '<tr><td>' + rfE(r[0]) + '</td><td class="c">' + rfE(r[1]) + '</td><td class="c">' + rfE(r[2]) + '</td></tr>').join('') + '</tbody></table>' : '') + (R.fmsN ? '<span class="rf-tx">' + rfML(R.fmsN) + '</span>' : '') + '</div>';
  if (ms || ai.length) h += '<p class="rf-p"><span class="rf-lb">Mersul:</span> ' + rfE(ms || '-') + (ai.length ? '; mijloace ajutătoare: ' + rfE(ai.join(', ')) : '') + '.</p>';
  if (sr.length) h += '<div class="rf-ll"><span class="rf-lb">Scale de evaluare funcțională:</span><table class="rf-tb rf-sct"><thead><tr><th>Scala</th><th>Rezultatul</th></tr></thead><tbody>' + sr.map(r => '<tr><td>' + rfE(r[0]) + '</td><td>' + rfE(r[1]) + '</td></tr>').join('') + '</tbody></table></div>';
  h += rfF('Investigații paraclinice:', R.inv, 2);
  h += rfF('Tratamente urmate, inclusiv tratamentul de recuperare:', R.trat, 3);
  h += '<div class="rf-keep">' + rfF('Prognostic:', R.prog, 2);
  h += rfF('Recomandări:', R.rec, 2);
  h += '<div class="rf-sig"><div>' + g + ',' + (R.spec ? '<span class="rf-nm">specialitatea ' + rfE(R.spec) + '</span>' : '') + '<span class="rf-nm">' + (R.med ? rfE(R.med) : rfDot(55)) + '</span><span class="rf-sp"></span><span class="rf-sm">(semnătura și parafa)</span></div></div></div>';
  return h + '</div>';
}
/* Anexa 39 B: rubricile și textele modelului valabil cu 01.07.2024, în ordinea lui; căsuțele bifate cu X */
const rfHas = (R, k, v) => (',' + (R[k] || '') + ',').indexOf(',' + v + ',') >= 0;
const rfRxDay = R => rfDate(R.rxData) || fD(today());
function rfA39Html(R) {
  const bx = rfBox;
  let h = '<div class="rf rf-a39"><p class="rf-anx"><b>ANEXA 39 B</b> - model (valabil cu 01.07.2024)</p>'
    + '<p class="rf-t39">PRESCRIPȚIE MEDICALĂ - RECOMANDARE PRIVIND ACORDAREA DISPOZITIVELOR MEDICALE DESTINATE RECUPERĂRII UNOR DEFICIENȚE ORGANICE SAU FUNCȚIONALE</p>'
    + '<p class="rf-nr39">Nr. ' + (R.rxNr ? '<span class="rf-iv">' + rfE(R.rxNr) + '</span>' : rfDot(16) + '/' + rfDot(20)) + '*)</p>'
    + '<div class="rf-u39"><div class="l"><p>Unitatea medicală ' + rfIn(R.org, 92) + '</p><p>Adresa ' + rfIn(R.adr, 100) + '</p><p>Stat membru: ROMÂNIA<span class="rf-gap"></span>CUI ' + rfIn(R.cui, 34) + '</p></div>'
    + '<div class="r"><p>' + bx(R.rxU === 'mf') + 'MF</p><p>' + bx(R.rxU === 'amb') + 'Ambulatoriu</p><p>' + bx(R.rxU === 'sp') + 'Spital</p></div></div>'
    + '<p>Nr. contract ' + rfIn(R.ctr, 24) + ' încheiat cu Casa de Asigurări de Sănătate ' + rfIn(R.ctrCas, 52) + ' <span class="rf-sm">(pentru medicul care întocmește prescripția medicală - recomandarea)</span></p>'
    + '<p>Nr. contract ' + rfDot(24) + ' încheiat cu Casa de Asigurări de Sănătate ' + rfDot(36) + ' <span class="rf-sm">se completează cu datele medicului de specialitate, care a transmis scrisoarea medicală/biletul de ieșire din spital (numai pentru situațiile în care medicul de familie pe lista căruia se află înscris asiguratul, întocmește prescripție medicală - recomandare)</span></p>'
    + '<p>Nume, prenume medic ' + rfIn(R.med, 62) + ' Cod parafă medic ' + rfIn(R.parafa, 26) + '</p>'
    + '<p>Specialitatea medicului prescriptor ' + rfIn(R.spec, 58) + ' Date contact medic prescriptor:</p>'
    + '<p class="rf-ind">- telefon/fax medic prescriptor ' + rfIn(R.tel, 40) + ' <span class="rf-sm">(se va completa inclusiv prefixul de țară)</span></p>'
    + '<p class="rf-ind">- e-mail medic prescriptor ' + rfIn(R.mail, 58) + '</p>'
    + '<p class="rf-id39">1. Numele și prenumele asiguratului ' + rfDot(82) + ' <span class="rf-sm">(se va completa în întregime numele și prenumele asiguratului)</span> 2. Data nașterii ' + rfDot(30) + ' 3. Domiciliul ' + rfDot(112) + ' 4. Codul numeric personal/cod unic de asigurare al asiguratului ' + rfDot(58) + '</p>'
    + '<p>5. Pacient diagnosticat cu afecțiune oncologică DA ' + bx(R.onco === 'da') + '/ NU ' + bx(R.onco === 'nu') + '</p>';
  h += rfF('Diagnosticul medical și diagnostic boli asociate:', R.dx, 2);
  h += '<p>6. Deficiența organică sau funcțională</p>'
    + '<p class="rf-ind">- nu este ca urmare a unei boli profesionale ' + bx(!!R.nbp) + ' <span class="rf-sm">(se bifează căsuța)</span></p>'
    + '<p class="rf-ind">- nu este ca urmare a unui accident de muncă ori sportiv ' + bx(!!R.nam) + ' <span class="rf-sm">(se bifează căsuța)</span></p>';
  h += '<p>7. Pentru stomii și retenție sau/și incontinență urinară se bifează una dintre căsuțele:</p>'
    + '<div class="rf-p7"><p class="rf-ind">' + bx(R.st7 === 'perm') + 'permanentă<span class="rf-gap"></span>' + bx(!!R.st7set) + 'set modificat<span class="rf-gap"></span>' + bx(R.st7 === 'temp') + 'temporară</p>'
    + '<p class="rf-agr">Sunt de acord cu modificarea setului<br>Semnătură asigurat <span class="rf-d" style="width:40mm"></span></p></div>'
    + '<p>Se recomandă ' + rfIn(R.st7 === 'temp' ? R.st7z : '', 22) + ' zile (maximum 90/91/92 zile) - se completează numai în cazul dispozitivelor recomandate pentru o perioadă temporară.</p>';
  h += '<p>8. Pentru echipamentele pentru oxigenoterapie, ventilație noninvazivă, suport de presiune pozitivă continuă CPAP/BPAP și dispozitive de asistare a tusei se bifează una dintre căsuțele:</p>'
    + '<p class="rf-ind">- cu certificat de încadrare în grad de handicap ' + bx(R.ox === 'def') + 'grav sau accentuat, definitiv</p>'
    + '<p class="rf-ind">- cu certificat de încadrare în grad de handicap ' + bx(R.ox === 'cert') + 'grav sau accentuat</p>'
    + '<p class="rf-ind">- fără certificat de încadrare în grad de handicap ' + bx(R.ox === 'fara') + 'grav sau accentuat</p>'
    + '<p>Se recomandă ' + rfIn(R.ox && R.ox !== 'def' ? R.oxZ : '', 22) + ' zile/luni (maximum 90/91/92 zile sau 12 luni) - se completează numai în cazul dispozitivelor recomandate pentru persoanele care nu sunt încadrate în grad de handicap grav sau accentuat definitiv.</p>';
  h += '<p>9. Pentru fotolii rulante se bifează una dintre căsuțele:</p>'
    + '<p class="rf-ind">' + bx(R.fr === 'nedet') + 'perioadă nedeterminată</p>'
    + '<p class="rf-ind">' + bx(R.fr === 'det') + 'perioadă determinată; se recomandă ' + rfIn(R.fr === 'det' ? R.frZ : '', 22) + ' zile (maximum 90/91/92 zile)</p>';
  h += '<p>10. Pentru protezele de membru inferior se bifează una dintre căsuțele: ' + bx(rfHas(R, 'pmi', 'prov')) + 'proteză provizorie ' + bx(rfHas(R, 'pmi', 'def')) + 'proteză definitivă <span class="rf-sm">numai în cazul protezării membrului inferior, după o intervenție chirurgicală, situație în care un asigurat poate beneficia înaintea protezării definitive, de o proteză provizorie la recomandarea medicului. În situații speciale, pentru același segment anatomic medicul specialist poate prescrie o protezare care să cuprindă atât proteză provizorie cât și proteză definitivă.</span></p>';
  h += '<p>11. Dispozitive medicale ce se pot acorda pereche: ' + bx(rfHas(R, 'side', 'd')) + 'dreapta ' + bx(rfHas(R, 'side', 's')) + 'stânga</p>';
  h += rfF('12. Denumirea și tipul dispozitivului medical recomandat: (din anexa nr. 38 la ordin**)', R.disp, 2);
  h += '<div class="rf-s13"><p>13. Numărul și data înregistrării atestatului în Managementul general, clinic și terapeutic al tulburărilor respiratorii din timpul somnului - Somnologie ' + rfIn(R.at1, 34) + ' <span class="rf-sm">(se va completa de către medicii care recomandă suport de presiune pozitivă continuă CPAP/BPAP, aparate de ventilație noninvazivă, aparate de administrare continuă cu oxigen acordate pentru Sindromul de apnee în somn obstructiv),</span></p>'
    + '<p>Numărul și data înregistrării atestatului în Managementul general, clinic și terapeutic al tulburărilor respiratorii din timpul somnului - Somnologie poligrafie, polisomnografie și titrare CPAP/BPAP ' + rfIn(R.at2, 34) + ' <span class="rf-sm">(se va completa de către medicii care recomandă suport de presiune pozitivă continuă CPAP/BPAP, aparate de ventilație noninvazivă, aparate de administrare continuă cu oxigen acordate pentru Sindromul de apnee în somn obstructiv),</span></p>'
    + '<p>Numărul și data înregistrării atestatului în Managementul general, clinic și terapeutic al tulburărilor respiratorii - Ventilație non-invazivă ' + rfIn(R.at3, 34) + ' <span class="rf-sm">(se va completa de către medicii care recomandă aparate de ventilație noninvazivă și dispozitive de asistare a tusei)</span></p></div>';
  h += '<div class="rf-keep"><div class="rf-sig39"><p>Data emiterii prescripției ' + rfIn(rfRxDay(R), 26) + '</p><div class="r">Semnătura (olografă sau electronică, după caz) și parafa medicului<span class="rf-sp"></span></div></div>'
    + '<p class="rf-note">*) Se va completa cu numărul din registrul de consultații/foaie de observație<br>**) Ordinului ministrului sănătății și al președintelui Casei Naționale de Asigurări de Sănătate nr. 1857/441/2023 pentru aprobarea Normelor metodologice de aplicare a Hotărârii Guvernului nr. 521/2023 pentru aprobarea pachetelor de servicii medicale și a contractului-cadru care reglementează condițiile acordării asistenței medicale, a medicamentelor și a dispozitivelor medicale, în cadrul sistemului de asigurări sociale de sănătate.<br>'
    + 'Notă: Recomandarea se eliberează în 2 exemplare. Recomandarea se eliberează numai dacă deficiența organică sau funcțională nu este ca urmare a unei boli profesionale sau a unui accident de muncă ori sportiv.</p></div>';
  return h + '</div>';
}
function rfPrintHtml(d, R) { return d === 'a5' ? rfA5Html(R) : d === 'hc' ? rfHcHtml(R) : d === 'a39b' ? rfA39Html(R) : rfA16Html(R); }
/* varianta text, pentru copiat în foaia de observație sau în alt document */
function refText(d, R) {
  const L = [], add = (l, v) => L.push(l + ' ' + (v ? String(v).trim() : '...'));
  const fn = rfFuncTxt(R);
  if (d === 'a16') {
    L.push('Anexa nr. 16', 'Unitatea sanitară: ' + (R.org || '...'), 'Nr. ' + (R.nr || '...') + ' / ' + rfDay(R), 'REFERAT MEDICAL', 'privind pe domnul/doamna ..., CNP ..., cu domiciliul în ...');
    add('Diagnostic clinic:', R.dx); add('Simptomatologie*):', R.simpt);
    L.push('Examen obiectiv detaliat*): Î = ' + (R.hi || '...') + ' cm; G = ' + (R.gw || '...') + ' kg; TA = ' + (R.ta || '...') + ' mmHg; AV = ' + (R.av || '...') + ' b/min.' + (R.exam ? '\n' + R.exam.trim() : '') + (fn ? '\n' + fn : ''));
    add('Investigații clinice, paraclinice*):', R.inv); add('Tratamente urmate', R.trat); add('Prognostic recuperator:', R.prog);
    L.push('Persoana este deplasabilă: ' + (R.depl || '...')); add('Observații:', R.obs);
    L.push('Medic de specialitate, (semnătura, parafa, ștampila)');
  } else if (d === 'a5') {
    const g = R.grad === 'primar' ? 'medic primar' : R.grad === 'specialist' ? 'medic specialist' : 'medic primar/specialist';
    L.push('Anexa 5', 'Unitatea sanitară: ' + (R.org || '...') + '; localitatea: ' + (R.loc || '...') + '; județul/sectorul: ' + (R.jud || '...') + '; nr. convenției ' + (R.conv || '...') + ' cu CAS ' + (R.cas || '...'), 'REFERAT MEDICAL');
    L.push('Subsemnatul dr. ' + (R.med || '...') + ', ' + g + ', specialitatea ' + (R.spec || '...') + ', cod parafă ' + (R.parafa || '...') + ', propun expertiza capacității de muncă a domnului/doamnei ..., CNP ..., cu domiciliul în ..., de profesie ' + (R.prof || '...') + ', angajat/angajată la ' + (R.ang || '...') + '.');
    add('Este în evidență de la data de', rfDate(R.evid)); add('Diagnosticul clinic la data luării în evidență:', R.dx0); add('Diagnosticul clinic actual:', R.dx);
    add('Examen obiectiv:', [R.exam, fn].filter(Boolean).join('\n')); add('A fost internat/internată în spital cu diagnosticul/diagnosticele:', R.intern);
    add('Investigații clinice, paraclinice:', R.inv); add('Tratamente urmate:', R.trat); add('Plan de recuperare:', R.plan); add('Prognostic recuperator:', R.prog);
    L.push('Se află în incapacitate temporară de muncă de la data de ' + (rfDate(R.itm) || '...') + ' și a totalizat un număr de ' + (R.itmN || '...') + ' zile concediu medical la data de ' + (rfDate(R.itmLa) || '...') + '.');
    L.push('Propunem: ' + (R.pr === 'a' ? 'a) prelungirea concediului medical, considerând că bolnavul este recuperabil, cu ' + (R.aN || '...') + ' zile, de la ' + (rfDate(R.aFrom) || '...') + ' până la ' + (rfDate(R.aTo) || '...') + '.'
      : R.pr === 'b' ? 'b) reducerea temporară a timpului de muncă cu o pătrime din durata normală, pentru ' + (R.bN || '...') + ' zile, de la ' + (rfDate(R.bFrom) || '...') + ' până la ' + (rfDate(R.bTo) || '...') + '.'
      : R.pr === 'c' ? 'c) bolnavul nu este recuperabil în limitele duratei concediului medical prevăzut de lege și propunem pensionarea de invaliditate temporară.' : '...'));
    L.push('Nr. ' + (R.nr || '...') + ' din data ' + rfDay(R), 'Medic curant, ' + (R.med || '...') + ' (parafa și ștampila unității sanitare)');
  } else if (d === 'a39b') {
    const x = on => on ? '[X]' : '[ ]', side = [rfHas(R, 'side', 'd') ? 'dreapta' : '', rfHas(R, 'side', 's') ? 'stânga' : ''].filter(Boolean);
    L.push('ANEXA 39 B - model (valabil cu 01.07.2024)', 'PRESCRIPȚIE MEDICALĂ - RECOMANDARE PRIVIND ACORDAREA DISPOZITIVELOR MEDICALE DESTINATE RECUPERĂRII UNOR DEFICIENȚE ORGANICE SAU FUNCȚIONALE', 'Nr. ' + (R.rxNr || '...'));
    L.push('Unitatea medicală: ' + (R.org || '...') + '; ' + x(R.rxU === 'mf') + ' MF ' + x(R.rxU === 'amb') + ' Ambulatoriu ' + x(R.rxU === 'sp') + ' Spital', 'Adresa: ' + (R.adr || '...') + '; Stat membru: ROMÂNIA; CUI: ' + (R.cui || '...'),
      'Nr. contract ' + (R.ctr || '...') + ' încheiat cu Casa de Asigurări de Sănătate ' + (R.ctrCas || '...'),
      'Nume, prenume medic: ' + (R.med || '...') + '; cod parafă medic: ' + (R.parafa || '...') + '; specialitatea medicului prescriptor: ' + (R.spec || '...') + '; telefon/fax: ' + (R.tel || '...') + '; e-mail: ' + (R.mail || '...'),
      '1. Numele și prenumele asiguratului: ...; 2. Data nașterii: ...; 3. Domiciliul: ...; 4. Codul numeric personal/cod unic de asigurare: ...',
      '5. Pacient diagnosticat cu afecțiune oncologică: ' + (R.onco === 'da' ? 'DA' : R.onco === 'nu' ? 'NU' : '...'));
    add('Diagnosticul medical și diagnostic boli asociate:', R.dx);
    L.push('6. Deficiența organică sau funcțională: nu este ca urmare a unei boli profesionale ' + x(R.nbp) + '; nu este ca urmare a unui accident de muncă ori sportiv ' + x(R.nam));
    if (R.st7 || R.st7set) L.push('7. Stomii, retenție sau/și incontinență urinară: ' + [R.st7 === 'perm' ? 'permanentă' : R.st7 === 'temp' ? 'temporară' + (R.st7z ? ', se recomandă ' + R.st7z + ' zile' : '') : '', R.st7set ? 'set modificat' : ''].filter(Boolean).join('; '));
    if (R.ox) L.push('8. ' + (R.ox === 'def' ? 'Cu certificat de încadrare în grad de handicap grav sau accentuat, definitiv' : (R.ox === 'cert' ? 'Cu certificat de încadrare în grad de handicap grav sau accentuat' : 'Fără certificat de încadrare în grad de handicap grav sau accentuat') + (R.oxZ ? '; se recomandă ' + R.oxZ : '')));
    if (R.fr) L.push('9. Fotoliu rulant: ' + (R.fr === 'nedet' ? 'perioadă nedeterminată' : 'perioadă determinată' + (R.frZ ? '; se recomandă ' + R.frZ + ' zile' : '')));
    if (R.pmi) L.push('10. Proteză de membru inferior: ' + [rfHas(R, 'pmi', 'prov') ? 'proteză provizorie' : '', rfHas(R, 'pmi', 'def') ? 'proteză definitivă' : ''].filter(Boolean).join(', '));
    if (side.length) L.push('11. Pereche: ' + side.join(', '));
    add('12. Denumirea și tipul dispozitivului medical recomandat (din anexa nr. 38 la ordin):', R.disp);
    [['at1', 'Somnologie'], ['at2', 'Somnologie poligrafie, polisomnografie și titrare CPAP/BPAP'], ['at3', 'Ventilație non-invazivă']].forEach(a => { if (R[a[0]]) L.push('13. Atestatul ' + a[1] + ': ' + R[a[0]]); });
    L.push('Data emiterii prescripției: ' + rfRxDay(R), 'Semnătura (olografă sau electronică, după caz) și parafa medicului');
  } else {
    L.push('Unitatea sanitară: ' + (R.org || '...'), 'Nr. ' + (R.nr || '...') + ' din data ' + rfDay(R), 'REFERAT MEDICAL privind situația medicală prezentă, pentru evaluarea complexă în vederea încadrării în grad de handicap', 'Numele și prenumele ..., CNP ..., domiciliul ...');
    add('Diagnostic clinic:', R.dx); L.push('Data debutului bolii: ' + (R.debut || '...') + '; stadiul bolii: ' + (R.stadiu || '...'));
    add('Istoric și evoluție:', R.ist); add('Starea prezentă de sănătate (examen clinic):', R.exam);
    if (fn) L.push(fn);
    add('Investigații paraclinice:', R.inv); add('Tratamente urmate, inclusiv tratamentul de recuperare:', R.trat); add('Prognostic:', R.prog); add('Recomandări:', R.rec);
    L.push((R.grad === 'primar' ? 'Medic primar' : R.grad === 'specialist' ? 'Medic specialist' : 'Medic') + (R.spec ? ', specialitatea ' + R.spec : '') + ', ' + (R.med || '...') + ' (semnătura și parafa)');
  }
  return L.join('\n');
}

/* ---------- formularul din filă ---------- */
const rfId = k => 'rf-' + k;
function rfTa(R, k, label, o) {
  o = o || {};
  return '<div class="rf-f' + (o.cls ? ' ' + o.cls : '') + '"><label for="' + rfId(k) + '">' + label + '</label>'
    + '<textarea id="' + rfId(k) + '" data-rk="' + k + '" rows="' + (o.rows || 2) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(R[k] || '') + '</textarea>'
    + (o.hint ? '<p class="rf-hint">' + o.hint + '</p>' : '') + (o.btns ? '<div class="rf-fb">' + o.btns + '</div>' : '') + '</div>';
}
function rfIn1(R, k, label, o) {
  o = o || {};
  const t = o.t || 'text', val = t === 'date' ? (R[k] || o.def || '') : (R[k] || '');
  return '<div class="rf-f' + (o.cls ? ' ' + o.cls : '') + '"><label for="' + rfId(k) + '">' + label + '</label>'
    + '<input id="' + rfId(k) + '" data-rk="' + k + '" type="' + t + '"' + (o.im ? ' inputmode="' + o.im + '"' : '') + (o.attrs || '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' value="' + esc(val) + '">'
    + (o.hint ? '<p class="rf-hint">' + o.hint + '</p>' : '') + (o.btns ? '<div class="rf-fb">' + o.btns + '</div>' : '') + '</div>';
}
function rfRadio(R, k, legend, opts, o) {
  o = o || {};
  return '<fieldset class="rf-rg' + (o.cls ? ' ' + o.cls : '') + '"><legend>' + legend + '</legend>' + opts.map(x => '<label><input type="radio" name="' + rfId(k) + '" data-rk="' + k + '" value="' + x[0] + '"' + (R[k] === x[0] ? ' checked' : '') + '> <span>' + x[1] + '</span></label>').join('') + (o.after || '') + '</fieldset>';
}
const rfBtn = (act, label, extra) => '<button type="button" class="btn sm" data-act="' + act + '"' + (extra || '') + '>' + label + '</button>';
const rfSec = (t, body, o) => '<section class="rf-sec' + (o && o.cls ? ' ' + o.cls : '') + '"><h3>' + t + '</h3>' + body + '</section>';
const RF_HAND = '<p class="rf-hand">Numele, CNP-ul și adresa nu se păstrează în aplicație: pe foaie rămân rubrici punctate, de completat de mână.</p>';
const RF_HAND39 = '<p class="rf-hand">Numele, data nașterii, domiciliul și CNP-ul (punctele 1-4) nu se păstrează în aplicație: pe foaie rămân rubrici punctate, de completat de mână.</p>';
/* căsuțe de bifat; valorile bifate se păstrează ca listă („d,s”), o singură căsuță ca „1” */
function rfChkG(R, k, legend, opts, o) {
  o = o || {};
  return '<fieldset class="rf-rg' + (o.cls ? ' ' + o.cls : '') + '" data-rkg="' + k + '">' + (legend ? '<legend>' + legend + '</legend>' : '')
    + opts.map(x => '<label><input type="checkbox" id="' + rfId(k + '-' + x[0]) + '" data-rk="' + k + '" data-v="' + x[0] + '"' + (rfHas(R, k, x[0]) ? ' checked' : '') + '> <span>' + x[1] + '</span></label>').join('') + '</fieldset>';
}
const rfDispHint = R => R.dispInfo ? '<b>Din Anexa 38:</b> ' + esc(R.dispInfo) + '.' : 'Alegeți din listă sau scrieți denumirea și tipul, ca în Anexa 38.';
const RF_SPEC = ['st7', 'st7set', 'st7z', 'ox', 'oxZ', 'fr', 'frZ', 'pmi', 'at1', 'at2', 'at3'];
function rfSpecHtml(R) {
  const pt = rfPts(R), on = n => pt.indexOf(n) >= 0, open = pt.length || RF_SPEC.some(k => R[k]);
  const blk = (n, t, body) => '<div class="rf-pt' + (on(n) ? ' on' : '') + '" data-pt="' + n + '"><p class="rf-pth"><b>' + n + '.</b> ' + t + (on(n) ? ' <span class="rf-ptb">de completat pentru dispozitivul ales</span>' : '') + '</p>' + body + '</div>';
  const zile = (k, label) => '<div class="rf-row">' + rfIn1(R, k, label, {t: 'number', im: 'numeric', attrs: ' min="1" max="92"', cls: 's2', hint: 'maximum 90/91/92 zile'}) + '</div>';
  return '<details class="rf-spec" id="rf-pts"' + (open ? ' open' : '') + '><summary>Punctele 7-10 și 13 (numai pentru anumite dispozitive)</summary>'
    + (pt.length ? '' : '<p class="rf-hint">Când alegeți dispozitivul din Anexa 38, punctul care trebuie completat se marchează aici.</p>')
    + blk('7', 'Stomii și retenție sau/și incontinență urinară', rfRadio(R, 'st7', 'Se bifează una dintre căsuțe', [['perm', 'permanentă'], ['temp', 'temporară']])
      + rfChkG(R, 'st7set', '', [['1', 'set modificat (pe foaie, asiguratul semnează că este de acord cu modificarea setului)']]) + zile('st7z', 'Se recomandă (zile), doar pentru perioadă temporară'))
    + blk('8', 'Oxigenoterapie, ventilație noninvazivă, CPAP/BPAP și dispozitive de asistare a tusei', rfRadio(R, 'ox', 'Certificatul de încadrare în grad de handicap', [['def', 'cu certificat, grav sau accentuat, definitiv'], ['cert', 'cu certificat, grav sau accentuat'], ['fara', 'fără certificat de handicap grav sau accentuat']], {cls: 'rf-col'})
      + '<div class="rf-row">' + rfIn1(R, 'oxZ', 'Se recomandă (zile/luni)', {cls: 's2', ph: 'ex.: 12 luni', hint: 'maximum 90/91/92 zile sau 12 luni; nu se completează la certificatul definitiv'}) + '</div>')
    + blk('9', 'Fotolii rulante', rfRadio(R, 'fr', 'Perioada', [['nedet', 'perioadă nedeterminată'], ['det', 'perioadă determinată']]) + zile('frZ', 'Se recomandă (zile), la perioadă determinată'))
    + blk('10', 'Proteze de membru inferior', rfChkG(R, 'pmi', 'Se bifează una dintre căsuțe', [['prov', 'proteză provizorie'], ['def', 'proteză definitivă']])
      + '<p class="rf-hint">Proteza provizorie: numai după o intervenție chirurgicală, înaintea protezării definitive; în situații speciale, pentru același segment, se pot prescrie amândouă (textul formularului).</p>')
    + blk('13', 'Atestatele de somnologie și de ventilație non-invazivă', rfIn1(R, 'at1', 'Atestatul Somnologie: numărul și data înregistrării')
      + rfIn1(R, 'at2', 'Atestatul Somnologie poligrafie, polisomnografie și titrare CPAP/BPAP: numărul și data') + rfIn1(R, 'at3', 'Atestatul Ventilație non-invazivă: numărul și data')
      + '<p class="rf-hint">Primele două, pentru CPAP/BPAP, ventilație noninvazivă și oxigen în sindromul de apnee în somn obstructiv; al treilea, pentru ventilație noninvazivă și asistarea tusei.</p>')
    + '</details>';
}
function rfMedPick(R) {
  const cur = MEDICI.find(m => m[1] === R.med);
  return '<div class="rf-f rf-medsel"><label for="rf-medsel">Medicul secției</label><select id="rf-medsel"><option value="">alegeți din listă</option>'
    + MEDICI.map((m, i) => '<option value="' + i + '"' + (cur === m ? ' selected' : '') + '>' + esc(medFull(m)) + ', medic ' + m[2] + ', parafa ' + m[3] + '</option>').join('')
    + '</select><p class="rf-hint">Completează numele, gradul, specialitatea și codul de parafă; pentru alt medic, scrieți în rubrici.</p></div>';
}
function rfSetMed(md) {
  const R = rfStore(rfKey()), m = state.settings.refMed || (state.settings.refMed = {});
  R.med = md[1]; R.grad = md[2]; R.spec = MED_SPEC; R.parafa = md[3];
  ['med', 'grad', 'spec', 'parafa'].forEach(k => { m[k] = R[k]; });
  rfFlush(); persist(); renderRefs();
  const s = $('#rf-medsel'); if (s) s.focus({preventScroll: true});
  toast('Datele medicului ' + medFull(md) + ' au fost trecute în formular.');
}
function rfMedHtml(R, nameLabel) {
  return '<div class="rf-row">' + rfIn1(R, 'med', nameLabel || 'Medicul (numele)') + '<div class="rf-f s2"><label for="rf-grad">Gradul</label><select id="rf-grad" data-rk="grad"><option value="">primar/specialist</option><option value="primar"' + (R.grad === 'primar' ? ' selected' : '') + '>medic primar</option><option value="specialist"' + (R.grad === 'specialist' ? ' selected' : '') + '>medic specialist</option></select></div>'
    + rfIn1(R, 'spec', 'Specialitatea') + '</div>';
}
function rfFuncForm(R) {
  const a = rfAdl(R);
  let h = '<div class="rf-f rf-fms"><span class="rf-lab" id="rf-fms-l">Forța musculară segmentară (FMS, 0-5)</span><table aria-labelledby="rf-fms-l"><thead><tr><th></th><th scope="col">Proximal</th><th scope="col">Distal</th></tr></thead><tbody>'
    + RF_FMS.map(f => '<tr><th scope="row">' + f[1] + '</th>' + ['P', 'D'].map(x => { const k = 'fms' + f[0] + x; return '<td><input id="' + rfId(k) + '" data-rk="' + k + '" maxlength="3" inputmode="numeric" aria-label="' + f[1] + ', ' + (x === 'P' ? 'proximal' : 'distal') + '" value="' + esc(R[k] || '') + '"></td>'; }).join('') + '</tr>').join('')
    + '</tbody></table><p class="rf-hint">0-5; se poate scrie 4+ sau 4-. Rândurile goale nu apar pe foaie.</p></div>';
  h += rfTa(R, 'fmsN', 'Alte date despre forța musculară, tonus, sensibilitate', {rows: 2, ph: 'ex.: flexorii dorsali ai piciorului drept 2/5; spasticitate Ashworth 2 la flexorii cotului'});
  h += '<div class="rf-row"><div class="rf-f"><label for="rf-mers">Mersul</label><select id="rf-mers" data-rk="mers"><option value="">nespecificat</option>' + RF_MERS.map(m => '<option value="' + m[0] + '"' + (R.mers === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select></div>'
    + '<fieldset class="rf-rg rf-aids" data-rkg="aids"><legend>Mijloace ajutătoare</legend>' + RF_AIDS.map(x => '<label><input type="checkbox" data-rk="aids" data-v="' + x[0] + '"' + ((',' + (R.aids || '') + ',').indexOf(',' + x[0] + ',') >= 0 ? ' checked' : '') + '> <span>' + x[1] + '</span></label>').join('') + '</fieldset></div>';
  h += '<div class="rf-f rf-adl"><span class="rf-lab">SCOR ADL, după criteriile de handicap (Ordinul nr. 2.300/1.457/2025, capitolul 7)</span>'
    + RF_ADL.map(x => '<fieldset class="rf-rg"><legend>' + x[1] + '</legend>' + x[2].map((t, i) => '<label><input type="radio" name="' + rfId(x[0]) + '" data-rk="' + x[0] + '" value="' + (2 - i) + '"' + (R[x[0]] === String(2 - i) ? ' checked' : '') + '> <span><b>' + (2 - i) + '</b> ' + t + '</span></label>').join('') + '</fieldset>').join('')
    + '<p class="rf-adl-tot" id="rf-adl-tot" aria-live="polite">' + rfAdlTotHtml(a) + '</p></div>';
  const bar = SC_BY.barthel ? scCompute(SC_BY.barthel) : null, mrsR = SC_BY.mrs ? scCompute(SC_BY.mrs) : null;
  h += '<div class="rf-row">' + rfIn1(R, 'iadl', 'IADL (rezultat)', {ph: 'ex.: 5/8 (Lawton)', cls: 's'})
    + rfIn1(R, 'barthel', 'Indicele Barthel (0-100)', {t: 'number', im: 'numeric', attrs: ' min="0" max="100" step="5"', cls: 's', btns: bar && bar.ok && bar.val !== R.barthel ? rfBtn('refSc', 'Din fila Scale: ' + bar.val, ' data-k="barthel" data-v="' + esc(bar.val) + '"') : ''})
    + '<div class="rf-f"><label for="rf-mrs">Scala Rankin modificată</label><select id="rf-mrs" data-rk="mrs"><option value="">nespecificat</option>' + (SC_BY.mrs ? SC_BY.mrs.items[0].o.filter(o => o[0] < 6).map(o => '<option value="' + o[0] + '"' + (R.mrs === String(o[0]) ? ' selected' : '') + '>' + o[0] + ': ' + esc(rfMrsTxt(o[0])) + '</option>').join('') : '') + '</select>'
    + (mrsR && mrsR.ok && mrsR.val !== R.mrs && +mrsR.val < 6 ? '<div class="rf-fb">' + rfBtn('refSc', 'Din fila Scale: ' + mrsR.val, ' data-k="mrs" data-v="' + esc(mrsR.val) + '"') + '</div>' : '') + '</div></div>';
  const av = rfScAvail();
  h += rfTa(R, 'scx', 'Alte scale și scoruri (câte unul pe rând, „Scala: rezultatul”)', {rows: 2, ph: 'ex.: EDSS: 4,5', btns: av.map(x => rfBtn('refScx', 'Adaugă ' + esc(x[1]), ' data-sc="' + x[0].id + '"')).join('')
    + (av.length ? '' : '<span class="rf-hint">Scalele calculate în fila Scale (Berg, TUG, SPPB, NIHSS și altele) apar aici, ca butoane. <button type="button" class="linkbtn" data-act="tab" data-tab="scale">Deschide fila Scale</button></span>')});
  return h;
}
function rfAdlTotHtml(a) {
  if (!a.n) return 'Bifați cei 5 itemi; totalul apare aici.';
  if (a.n < 5) return 'Total parțial: ' + a.tot + ' (' + plural(5 - a.n, 'item necompletat', 'itemi necompletați') + ').';
  const st = rfAdlSt(a.tot);
  return '<b>' + a.tot + '/10.</b> Pragurile tipărite în ordin: ' + st.map(s => s[0] + ' (' + (s[1] === s[2] ? s[1] : s[1] + '-' + s[2]) + ', ' + s[3] + ')').join(' și ') + '.' + (st.length > 1 ? ' Intervalele din ordin se suprapun la 3 și la 8; stadiul îl stabilește comisia.' : '');
}
function rfFormHtml(d, R, P) {
  const plan = !!(P && P.procs.length);
  const dxBtn = P && P.dx && P.dx !== R.dx ? rfBtn('refPlan', 'Diagnosticul din plan', ' data-k="dx"') : '';
  const tratBtn = plan ? rfBtn('refPlan', 'Adaugă tratamentul de recuperare din plan', ' data-k="trat"') : '';
  const fn = '<details class="rf-func"' + (d === 'hc' || rfFuncTxt(R) ? ' open' : '') + '><summary>Bilanț funcțional (comun referatelor)</summary>' + rfFuncForm(R) + '</details>';
  const c9 = k => rfBtn('rfDxPick', 'Cod din lista 999', ' data-k="' + k + '"');
  let h = '';
  if (d === 'a16') {
    h += rfSec('Antetul', '<div class="rf-row">' + rfIn1(R, 'org', 'Unitatea sanitară') + rfIn1(R, 'nr', 'Nr. de înregistrare', {cls: 's'}) + rfIn1(R, 'data', 'Data', {t: 'date', def: today(), cls: 's2'}) + '</div>' + RF_HAND);
    h += rfSec('Date clinice', rfTa(R, 'dx', 'Diagnostic clinic', {btns: dxBtn + c9('dx')})
      + rfTa(R, 'simpt', 'Simptomatologie*)', {rows: 3})
      + '<div class="rf-row rf-vit">' + rfIn1(R, 'hi', 'Î (cm)', {im: 'numeric', max: 3, cls: 'xs'}) + rfIn1(R, 'gw', 'G (kg)', {im: 'decimal', max: 5, cls: 'xs'}) + rfIn1(R, 'ta', 'TA (mmHg)', {ph: '130/80', max: 7, cls: 'xs'}) + rfIn1(R, 'av', 'AV (b/min)', {im: 'numeric', max: 3, cls: 'xs'}) + '</div>'
      + rfTa(R, 'exam', 'Examen obiectiv detaliat*)', {rows: 4, hint: 'Bilanțul funcțional de mai jos se adaugă automat la această rubrică, pe foaie.'}) + fn
      + rfTa(R, 'inv', 'Investigații clinice, paraclinice*)', {rows: 3})
      + rfTa(R, 'trat', 'Tratamente urmate', {rows: 3, btns: tratBtn})
      + rfTa(R, 'prog', 'Prognostic recuperator', {rows: 2}));
    h += rfSec('Deplasarea', rfRadio(R, 'depl', 'Persoana este deplasabilă', [['da', 'da'], ['nu', 'nu']])
      + rfTa(R, 'obs', 'Observații', {rows: 2, hint: R.depl === 'nu' ? '<b>Pacient netransportabil:</b> scrieți aici datele care justifică medical imposibilitatea deplasării (nota *) de pe formular).' : ''}));
  } else if (d === 'a5') {
    h += rfSec('Unitatea sanitară', '<div class="rf-row">' + rfIn1(R, 'org', 'Unitatea sanitară') + rfIn1(R, 'loc', 'Localitatea', {cls: 's2', ph: 'Cluj-Napoca'}) + rfIn1(R, 'jud', 'Județul/sectorul', {cls: 's2', ph: 'Cluj'}) + '</div>'
      + '<div class="rf-row">' + rfIn1(R, 'conv', 'Nr. convenției', {cls: 's2'}) + rfIn1(R, 'cas', 'cu CAS', {cls: 's2', ph: 'CAS Cluj'}) + rfIn1(R, 'nr', 'Nr. referatului', {cls: 's'}) + rfIn1(R, 'data', 'Data', {t: 'date', def: today(), cls: 's2'}) + '</div>');
    h += rfSec('Medicul curant', rfMedPick(R) + rfMedHtml(R, 'Subsemnatul dr.') + '<div class="rf-row">' + rfIn1(R, 'parafa', 'Cod parafă', {cls: 's2'}) + '</div>');
    h += rfSec('Pacientul', RF_HAND + '<div class="rf-row">' + rfIn1(R, 'prof', 'de profesie') + rfIn1(R, 'ang', 'angajat/angajată la') + '</div>');
    h += rfSec('Date clinice', '<div class="rf-row">' + rfIn1(R, 'evid', 'Este în evidență de la data de', {t: 'date', cls: 's2'}) + '</div>'
      + rfTa(R, 'dx0', 'Diagnosticul clinic la data luării în evidență', {btns: c9('dx0')})
      + rfTa(R, 'dx', 'Diagnosticul clinic actual', {btns: dxBtn + c9('dx')})
      + rfTa(R, 'exam', 'Examen obiectiv', {rows: 4, hint: 'Bilanțul funcțional de mai jos se adaugă automat la această rubrică, pe foaie.'}) + fn
      + rfTa(R, 'intern', 'A fost internat/internată în spital**) cu diagnosticul/diagnosticele', {btns: P && P.type !== 'amb' ? rfBtn('refPlan', 'Internarea din plan', ' data-k="intern"') : ''})
      + rfTa(R, 'inv', 'Investigații clinice, paraclinice**)', {rows: 3, hint: '**) Se vor anexa rezultatele, biletele de externare din spital.'})
      + rfTa(R, 'trat', 'Tratamente urmate', {rows: 3, btns: tratBtn})
      + rfTa(R, 'plan', 'Plan de recuperare', {rows: 3, btns: plan ? rfBtn('refPlan', 'Adaugă programul din plan', ' data-k="plan"') : ''})
      + rfTa(R, 'prog', 'Prognostic recuperator', {rows: 2}));
    h += rfSec('Incapacitatea temporară de muncă', '<div class="rf-row">' + rfIn1(R, 'itm', 'de la data de', {t: 'date', cls: 's2'}) + rfIn1(R, 'itmN', 'număr de zile de concediu medical', {t: 'number', im: 'numeric', attrs: ' min="1" max="999"', cls: 's'}) + rfIn1(R, 'itmLa', 'la data de', {t: 'date', cls: 's2'}) + '</div>');
    const ab = x => '<div class="rf-row rf-abx' + (R.pr === x ? '' : ' off') + '">' + rfIn1(R, x + 'N', 'zile', {t: 'number', im: 'numeric', attrs: ' min="1" max="365"', cls: 'xs'}) + rfIn1(R, x + 'From', 'de la', {t: 'date', cls: 's2'}) + rfIn1(R, x + 'To', 'până la', {t: 'date', cls: 's2', hint: 'se calculează din zile și data de început; se poate schimba'}) + '</div>';
    h += rfSec('Propunerea', '<fieldset class="rf-rg rf-prop"><legend>Propunem</legend>'
      + '<label><input type="radio" name="rf-pr" data-rk="pr" value="a"' + (R.pr === 'a' ? ' checked' : '') + '> <span>a) prelungirea concediului medical, considerând că bolnavul este recuperabil</span></label>' + ab('a')
      + '<label><input type="radio" name="rf-pr" data-rk="pr" value="b"' + (R.pr === 'b' ? ' checked' : '') + '> <span>b) reducerea temporară a timpului de muncă cu o pătrime din durata normală</span></label>' + ab('b')
      + '<label><input type="radio" name="rf-pr" data-rk="pr" value="c"' + (R.pr === 'c' ? ' checked' : '') + '> <span>c) bolnavul nu este recuperabil în limitele duratei concediului medical prevăzut de lege și propunem pensionarea de invaliditate temporară</span></label></fieldset>');
  } else if (d === 'a39b') {
    h += rfSec('Antetul', '<div class="rf-row">' + rfIn1(R, 'rxNr', 'Nr.*) din registrul de consultații sau din foaia de observație', {ph: 'ex.: 1254/18.11.2026'}) + rfIn1(R, 'rxData', 'Data emiterii prescripției', {t: 'date', def: today(), cls: 's2'}) + '</div>');
    h += rfSec('Unitatea medicală', '<div class="rf-row">' + rfIn1(R, 'org', 'Unitatea medicală') + '</div>'
      + rfRadio(R, 'rxU', 'Tipul unității', [['mf', 'MF'], ['amb', 'Ambulatoriu'], ['sp', 'Spital']])
      + '<div class="rf-row">' + rfIn1(R, 'adr', 'Adresa') + rfIn1(R, 'cui', 'CUI', {cls: 's2'}) + '</div>'
      + '<div class="rf-row">' + rfIn1(R, 'ctr', 'Nr. contract', {cls: 's2'}) + rfIn1(R, 'ctrCas', 'încheiat cu Casa de Asigurări de Sănătate', {ph: 'ex.: Cluj'}) + '</div>'
      + '<p class="rf-hint">Al doilea rând „Nr. contract” de pe formular este pentru medicul de familie care prescrie după scrisoarea medicală a specialistului; pe foaie rămâne punctat.</p>');
    h += rfSec('Medicul prescriptor', rfMedPick(R) + '<div class="rf-row">' + rfIn1(R, 'med', 'Nume, prenume medic') + rfIn1(R, 'parafa', 'Cod parafă medic', {cls: 's2'}) + '</div>'
      + '<div class="rf-row">' + rfIn1(R, 'spec', 'Specialitatea medicului prescriptor') + rfIn1(R, 'tel', 'Telefon/fax', {cls: 's2', im: 'tel', ph: '+40 264 ...', hint: 'cu prefixul de țară'}) + rfIn1(R, 'mail', 'E-mail', {t: 'email', cls: 's2'}) + '</div>'
      + '<p class="rf-hint">Datele unității și ale medicului se țin minte în acest browser, pentru prescripțiile următoare.</p>');
    h += rfSec('Asiguratul', RF_HAND39 + rfRadio(R, 'onco', '5. Pacient diagnosticat cu afecțiune oncologică', [['da', 'DA'], ['nu', 'NU']])
      + rfTa(R, 'dx', 'Diagnosticul medical și diagnostic boli asociate', {btns: dxBtn + c9('dx')}));
    h += rfSec('6. Deficiența organică sau funcțională', rfChkG(R, 'nbp', '', [['1', 'nu este ca urmare a unei boli profesionale']]) + rfChkG(R, 'nam', '', [['1', 'nu este ca urmare a unui accident de muncă ori sportiv']])
      + '<p class="rf-hint">Pe formular: recomandarea se eliberează numai dacă deficiența nu este urmarea unei boli profesionale sau a unui accident de muncă ori sportiv.</p>');
    h += rfSec('Dispozitivul medical', rfTa(R, 'disp', '12. Denumirea și tipul dispozitivului medical recomandat (din anexa nr. 38)', {rows: 2, btns: rfBtn('rfDevPick', 'Alege din Anexa 38'), hint: rfDispHint(R)})
      + rfChkG(R, 'side', '11. Dispozitive medicale ce se pot acorda pereche', [['d', 'dreapta'], ['s', 'stânga']]) + rfSpecHtml(R));
  } else {
    const dg = rfDgHtml(R, P);
    h += rfSec('Antetul', '<div class="rf-row">' + rfIn1(R, 'org', 'Unitatea sanitară') + rfIn1(R, 'nr', 'Nr. de înregistrare', {cls: 's'}) + rfIn1(R, 'data', 'Data', {t: 'date', def: today(), cls: 's2'}) + '</div>' + RF_HAND);
    h += rfSec('Diagnosticul și boala', rfTa(R, 'dx', 'Diagnostic clinic', {btns: dxBtn + c9('dx'), hint: 'Cu codul ICD-10, dacă îl folosiți; și bolile asociate care contează pentru încadrare.'})
      + '<div class="rf-row">' + rfIn1(R, 'debut', 'Data debutului bolii', {cls: 's2', ph: 'ex.: martie 2019', hint: 'după caz'}) + rfIn1(R, 'stadiu', 'Stadiul bolii', {ph: 'ex.: sechele de AVC ischemic, stadiu cronic'}) + '</div>'
      + '<div id="rf-dg">' + dg + '</div>'
      + rfTa(R, 'ist', 'Istoric și evoluție', {rows: 3, ph: 'debutul, internările, intervențiile chirurgicale, evoluția sub tratament'}));
    h += rfSec('Starea prezentă', rfTa(R, 'exam', 'Starea prezentă de sănătate (examen clinic)', {rows: 4}) + fn);
    h += rfSec('Investigații și tratament', rfTa(R, 'inv', 'Investigații paraclinice', {rows: 2, hint: 'Imagistica interpretată, explorările cerute pentru afecțiune.'})
      + rfTa(R, 'trat', 'Tratamente urmate, inclusiv tratamentul de recuperare', {rows: 3, btns: tratBtn})
      + rfTa(R, 'prog', 'Prognostic', {rows: 2}) + rfTa(R, 'rec', 'Recomandări', {rows: 2}));
    h += rfSec('Medicul', rfMedPick(R) + rfMedHtml(R));
  }
  return h;
}
function rfDgHtml(R, P) {
  const dx = (R.dx || '') + ' ' + (P ? dxMatchStr(P) : ''), hit = RF_DG.filter(g => g[0].test(dx));
  return '<div class="rf-dgbox"><p><b>Ce cere DGASPC Cluj pentru dosar:</b> scrisoare, referat sau certificat de la medicul specialist, din ultimele 6 luni, cu diagnosticul, stadiul bolii, starea prezentă de sănătate și, după caz, data debutului.</p>'
    + hit.map(g => '<p><b>' + g[1] + ':</b> ' + g[2] + '</p>').join('')
    + '<p class="rf-hint">După lista „Acte necesare încadrării în grad de handicap” a DGASPC Cluj (Ordinul nr. 2.300/1.457/2025). Verificați lista la depunere.</p></div>';
}
function rfMissHtml(d, R) {
  const m = rfMissing(d, R);
  return (m.length ? '<p><b>Necompletate:</b> ' + esc(m.join(', ')) + '. Pe foaie rămân rânduri punctate, de completat de mână.</p>' : '<p><b>Toate rubricile din aplicație sunt completate.</b></p>')
    + (d === 'a5' ? '<p class="rf-hint">Pe formular: „Necompletarea tuturor rubricilor determină invalidarea referatului medical.”</p>' : '');
}
function renderRefs() {
  const el = $('#view-referate'); if (!el) return;
  const k = rfKey(), P = k === '_' ? null : getP(k), R = rfStore(k), d = rfDoc(), D = RF_DOCS[d], td = today();
  if (d === 'a39b' && rfInit39(R)) persist();
  const pats = state.patients.slice().sort((a, b) => (pEnd(b) >= td) - (pEnd(a) >= td) || a.code.localeCompare(b.code, 'ro'));
  const wide = window.innerWidth >= 1180;
  el.innerHTML = '<div class="rf-wrap"><div class="rf-head"><h2>Referate medicale</h2>'
    + '<p class="rf-lead">Referatele pentru pensia de invaliditate și pentru încadrarea în grad de handicap și prescripția-recomandare pentru dispozitive medicale, după modelele publicate. Rubricile se completează aici și se păstrează la pacient; diagnosticul, datele medicului și datele clinice sunt comune formularelor.</p>'
    + '<div class="rf-pick"><div class="f rf-pat"><label for="rf-pat">Pacientul</label><select id="rf-pat"><option value="_"' + (k === '_' ? ' selected' : '') + '>Fără pacient din listă (ciornă)</option>'
    + pats.map(x => '<option value="' + esc(x.id) + '"' + (x.id === k ? ' selected' : '') + '>' + esc(x.code) + (x.dx ? ', ' + esc(x.dx) : '') + (pEnd(x) < td ? ' (încheiat)' : '') + '</option>').join('') + '</select></div>'
    + '<div class="rf-docs" role="group" aria-label="Referatul">' + RF_ORDER.map(id => '<button type="button" class="rf-doc" data-act="refDoc" data-d="' + id + '" aria-pressed="' + (id === d) + '"><b>' + RF_DOCS[id].t + '</b><span>' + RF_DOCS[id].st + '</span></button>').join('') + '</div></div>'
    + (k === '_' ? '<p class="rf-hint">Ciorna rămâne doar în acest browser și nu intră în export. Pentru un pacient din plan, alegeți-l din listă.</p>' : '') + '</div>'
    + '<div class="rf-cols"><div class="rf-form" data-doc="' + d + '">'
    + '<details class="rf-about"><summary>Când se folosește și pe ce se bazează</summary><p>' + esc(D.use) + '</p><p class="rf-hint">' + esc(D.src) + '</p></details>'
    + rfFormHtml(d, R, P)
    + '<div class="rf-miss" id="rf-miss" aria-live="polite">' + rfMissHtml(d, R) + '</div>'
    + '<p class="rf-clr"><button type="button" class="btn sm danger" data-act="refClear">Șterge referatele ' + (P ? 'pacientului' : 'din ciornă') + '</button></p>'
    + '<div class="rf-bar"><button type="button" class="btn primary" data-act="refPrint">' + (d === 'a39b' ? 'Tipărește prescripția' : 'Tipărește referatul') + '</button><button type="button" class="btn" data-act="refCopy">Copiază textul</button></div></div>'
    + '<details class="rf-prev"' + (wide ? ' open' : '') + '><summary>Foaia tipărită</summary><div class="rf-pvw" id="rf-pvw"><div class="rf-paper' + (d === 'a39b' ? ' a39' : '') + '" id="rf-pp"><div class="pr">' + rfPrintHtml(d, R) + '</div></div></div></details></div></div>';
  el.querySelectorAll('.rf-form textarea').forEach(rfGrow);
  requestAnimationFrame(rfScalePv);
}
function rfGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 640) + 'px'; }
function rfScalePv() {
  const w = $('#rf-pvw'), pp = $('#rf-pp'); if (!w || !pp || !w.clientWidth) return;
  const s = Math.min(1, (w.clientWidth - 16) / pp.offsetWidth);
  pp.style.transform = 'scale(' + s + ')'; w.style.height = Math.ceil(pp.offsetHeight * s + 16) + 'px';
}
function rfPreview() {
  const pp = $('#rf-pp .pr'); if (!pp) return;
  const R = rfStore(rfKey()), d = rfDoc();
  pp.innerHTML = rfPrintHtml(d, R); rfScalePv();
  const m = $('#rf-miss'); if (m) m.innerHTML = rfMissHtml(d, R);
}
function rfFlush() { if (RF_PT) { clearTimeout(RF_PT); RF_PT = null; persist(); } }
function rfAfter() {
  clearTimeout(RF_PT); RF_PT = setTimeout(() => { RF_PT = null; persist(); }, 400);
  clearTimeout(RF_VT); RF_VT = setTimeout(rfPreview, 160);
}
/* data de sfârșit a propunerii a/b: din numărul de zile și data de început, cât timp nu a fost scrisă de mână */
function rfAutoEnd(R, x) {
  const n = posInt(R[x + 'N']), f = R[x + 'From'], key = x + 'To', inp = $('#' + rfId(key));
  if (!(n && validISO(f))) return;
  const val = addDays(f, n - 1);
  if (!R[key] || R[key] === RF_AUTO[key]) { R[key] = val; RF_AUTO[key] = val; if (inp) inp.value = val; }
}
function rfSet(t) {
  const k = t.dataset.rk, R = rfStore(rfKey());
  if (t.type === 'checkbox') {
    const box = t.closest('[data-rkg]'), v = box ? Array.from(box.querySelectorAll('input[type=checkbox]:checked')).map(x => x.dataset.v) : [];
    if (v.length) R[k] = v.join(','); else delete R[k];
  } else if (t.type === 'radio') { if (!t.checked) return; R[k] = t.value; }
  else { const v = String(t.value || ''); if (!v.trim()) delete R[k]; else R[k] = v.slice(0, 6000); }
  if (RF_MED.indexOf(k) >= 0) { const m = state.settings.refMed || (state.settings.refMed = {}); if (R[k]) m[k] = R[k]; else delete m[k]; }
  if (/^[ab](N|From)$/.test(k)) rfAutoEnd(R, k[0]);
  if (/^adl\d$/.test(k)) { const e = $('#rf-adl-tot'); if (e) e.innerHTML = rfAdlTotHtml(rfAdl(R)); }
  if (k === 'pr') document.querySelectorAll('.rf-prop .rf-abx').forEach((x, i) => x.classList.toggle('off', R.pr !== ['a', 'b'][i]));
  if (k === 'depl') { const o = $('#rf-obs'); if (o) { const f = o.closest('.rf-f'); let h = f.querySelector('.rf-hint'); if (R.depl === 'nu') { if (!h) { h = document.createElement('p'); h.className = 'rf-hint'; o.after(h); } h.innerHTML = '<b>Pacient netransportabil:</b> scrieți aici datele care justifică medical imposibilitatea deplasării (nota *) de pe formular).'; } else if (h) h.remove(); } }
  if (k === 'dx') { const g = $('#rf-dg'); if (g) g.innerHTML = rfDgHtml(R, rfKey() === '_' ? null : getP(rfKey())); }
  /* textul ales din Anexa 38, schimbat de mână: nota din anexă și punctele marcate nu mai sunt sigure */
  if (k === 'disp' && R.dispPick && (R.disp || '').indexOf(R.dispPick) !== 0) {
    delete R.dispPick; delete R.dispInfo; delete R.dispPt;
    const f = t.closest('.rf-f'), hn = f && f.querySelector('.rf-hint'); if (hn) hn.innerHTML = rfDispHint(R);
    document.querySelectorAll('#rf-pts .rf-pt.on').forEach(x => { x.classList.remove('on'); const b = x.querySelector('.rf-ptb'); if (b) b.remove(); });
  }
  rfAfter();
}
__doc.addEventListener('input', e => {
  const t = e.target; if (!t.closest || !t.closest('#view-referate .rf-form') || !t.dataset.rk) return;
  if (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT') return;
  if (t.tagName === 'TEXTAREA') rfGrow(t);
  rfSet(t);
});
__doc.addEventListener('change', e => {
  const t = e.target; if (!t.closest) return;
  if (t.id === 'rf-pat') { rfFlush(); state.ui.refP = t.value; persist(); renderRefs(); return; }
  if (t.id === 'rf-medsel') { const md = t.value === '' ? null : MEDICI[+t.value]; if (md) rfSetMed(md); return; }
  if (!t.closest('#view-referate .rf-form') || !t.dataset.rk) return;
  if (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT') rfSet(t);
});
__doc.addEventListener('toggle', e => { if (e.target && e.target.classList && e.target.classList.contains('rf-prev') && e.target.open) rfScalePv(); }, true);
__win.addEventListener('resize', () => { if (state.ui.tab === 'referate') rfScalePv(); });
__win.addEventListener('pagehide', rfFlush);

/* ---------- acțiuni ---------- */
ACT.refDoc = el => { rfFlush(); state.ui.refD = el.dataset.d; persist(); renderRefs(); const b = $('#view-referate .rf-doc[aria-pressed="true"]'); if (b) b.focus({preventScroll: true}); };
ACT.refOpen = () => { rfFlush(); state.ui.refP = state.ui.sel || ''; setTab('referate'); window.scrollTo(0, 0); };
ACT.refPlan = async el => {
  const k = el.dataset.k, P = getP(rfKey()), R = rfStore(rfKey()); if (!P) return;
  let v = '';
  if (k === 'dx') {
    if (R.dx && R.dx !== P.dx && !(await ask('Înlocuiți diagnosticul scris aici cu cel din plan („' + P.dx + '”)?', 'Înlocuiește'))) return;
    R.dx = P.dx;
  } else {
    v = k === 'intern' ? rfInternTxt(P) : rfProcTxt(P, k === 'plan' ? 'plan' : 'done');
    if (!v) { toast('Planul pacientului nu are proceduri.'); return; }
    R[k] = R[k] && R[k].trim() ? R[k].trim() + '\n' + v : v;
  }
  rfFlush(); persist(); renderRefs();
  const t = $('#' + rfId(k)); if (t) { t.focus({preventScroll: true}); t.scrollIntoView({block: 'center'}); }
};
ACT.refSc = el => {
  const k = el.dataset.k, R = rfStore(rfKey()); R[k] = el.dataset.v; persist(); renderRefs();
  const t = $('#' + rfId(k)); if (t) t.focus({preventScroll: true});
  toast('Rezultatul din fila Scale a fost trecut în referat.');
};
ACT.refScx = el => {
  const sc = SC_BY[el.dataset.sc], R = rfStore(rfKey()); if (!sc) return;
  const l = rfScLine(sc); if (!l) return;
  const rows = (R.scx || '').split('\n').map(x => x.trim()).filter(Boolean).filter(x => x.indexOf(sc.t + ':') !== 0);
  rows.push(l); R.scx = rows.join('\n'); persist(); renderRefs();
  toast('„' + sc.t + '” a fost adăugată la scale.');
};
ACT.refPrint = () => {
  rfFlush();
  const k = rfKey(), P = k === '_' ? null : getP(k), R = rfStore(k), d = rfDoc();
  doPrint(RF_DOCS[d].pt + (P ? ', ' + P.code : ''), rfPrintHtml(d, R), refText(d, R), REF_CSS + (d === 'a39b' ? REF_PAGE39 : REF_PAGE_CSS));
};
ACT.refCopy = async () => {
  rfFlush();
  const R = rfStore(rfKey()), d = rfDoc(), ok = await copyText(refText(d, R));
  toast(ok ? 'Textul a fost copiat. Datele de identitate ale pacientului apar ca „...”.' : 'Copierea nu a reușit în această vizualizare.');
};
ACT.refClear = async () => {
  rfFlush();
  const k = rfKey(), P = k === '_' ? null : getP(k);
  if (!(await ask(P ? 'Ștergeți datele tuturor referatelor pacientului ' + P.code + '? Planul pacientului rămâne.' : 'Ștergeți ciorna (datele tuturor formularelor)?', 'Șterge', true))) return;
  const old = JSON.stringify(P ? P.ref || {} : state.refDraft || {});
  if (P) P.ref = {}; else state.refDraft = {};
  persist(); renderRefs();
  toast('Datele referatelor au fost șterse.', {action: {label: 'Anulează modificarea', fn: () => { const o = JSON.parse(old); if (P) { const Q = getP(P.id); if (Q) Q.ref = o; } else state.refDraft = o; persist(); renderRefs(); toast('Datele referatelor au fost restaurate.'); }}});
};

/* ---------- listele de ales: codurile de boală (lista 999) și dispozitivele medicale (Anexa 38) ---------- */
let RF_PICK = null, DX9N = null;
const rfNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/* codurile 919-928 și 929-938 au aceleași denumiri; în listă stau sub titlurile „Leziuni traumatice S40-S69 ale membrului superior” și
   „S70-S99 ale membrului inferior”: regiunea se arată în paranteză, iar regiunile din aceste blocuri CIM-10 ajută la căutare */
const dx9Reg = c => c >= 919 && c <= 928 ? 'membrul superior' : c >= 929 && c <= 938 ? 'membrul inferior' : '';
const DX9_ALIAS = {'membrul superior': 'umar brat humerus cot antebrat radius ulna pumn mana deget', 'membrul inferior': 'sold coapsa femur genunchi gamba tibie peroneu glezna picior'};
const dx9Name = c => DX999[c - 1] + (dx9Reg(c) ? ' (' + dx9Reg(c) + ')' : '');
const dx9N = () => DX9N || (DX9N = DX999.map((x, i) => { const r = dx9Reg(i + 1); return rfNorm(x + (r ? ' ' + r + ' ' + DX9_ALIAS[r] : '')); }));
const dx9Line = c => 'Cod ' + c + ' - ' + dx9Name(c);
/* căutarea: codul (sau începutul lui) ori cuvinte din denumire, fără diacritice; toate cuvintele trebuie să apară */
function dx9Hits(q, max) {
  const n = dx9N(), s = rfNorm(q).trim(), lim = max || 60, out = [];
  if (!s) return out;
  if (/^\d{1,3}$/.test(s)) {
    const c = +s; if (c >= 1 && c <= n.length) out.push(c);
    for (let i = 1; i <= n.length && out.length < lim; i++) if (i !== c && String(i).indexOf(s) === 0) out.push(i);
    return out;
  }
  const w = s.split(/[^a-z0-9]+/).filter(Boolean); if (!w.length) return out;
  const re = new RegExp('(^|[^a-z0-9])' + w[0]), hit = [];
  n.forEach((x, i) => { if (w.every(t => x.indexOf(t) >= 0)) hit.push([x.indexOf(w[0]) === 0 ? 0 : re.test(x) ? 1 : 2, i + 1]); });
  hit.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return hit.slice(0, lim).map(h => h[1]);
}
/* potrivirile cu diagnosticul scris: cuvintele de cel puțin 5 litere, după primele 5 litere (gonartroză: „gonar”) */
const RF_STOP = ['dreapta', 'stanga', 'bilateral', 'bilaterala', 'stadiul', 'stadiu', 'cronic', 'cronica', 'acuta', 'dupa', 'status', 'operat', 'operata', 'gradul', 'nespecificat', 'nespecificata', 'neprecizat', 'neprecizata', 'membrul', 'stadiului'];
function dx9Suggest(text, max) {
  const n = dx9N(), st = Array.from(new Set(rfNorm(text).split(/[^a-z]+/).filter(w => w.length >= 5 && RF_STOP.indexOf(w) < 0).map(w => w.slice(0, 5))));
  if (!st.length) return [];
  const sc = [];
  n.forEach((x, i) => { const wd = x.split(/[^a-z]+/), k = st.filter(s => wd.some(y => y.indexOf(s) === 0)).length; if (k) sc.push([k, i + 1]); });
  sc.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return sc.slice(0, max || 8).map(x => x[1]);
}
function dx9ResHtml(q, ctx) {
  const it = c => '<button type="button" class="pk-it" data-act="rfDxAdd" data-c="' + c + '"><b class="pk-c">' + c + '</b><span class="pk-n">' + esc(dx9Name(c)) + '</span></button>';
  if (rfNorm(q).trim()) {
    const h = dx9Hits(q, 80);
    return h.length ? h.map(it).join('') + (h.length >= 80 ? '<p class="pk-none">Primele 80 de rezultate; scrieți mai precis.</p>' : '') : '<p class="pk-none">Niciun cod nu se potrivește. Încercați alt cuvânt sau doar începutul lui (ex.: „fractur”).</p>';
  }
  const s = dx9Suggest(ctx, 10);
  return s.length ? '<p class="pk-h">Potriviri cu diagnosticul scris:</p>' + s.map(it).join('') : '<p class="pk-none">Scrieți codul sau un cuvânt din denumire.</p>';
}
const a38Label = it => it[0] + (it[1] ? ', tip ' + it[1] : '');
const a38Pts = (g, it) => g === '2' || g === '3' ? '7' : g === '4' ? '10' : g === '9' ? '8,13' : g === '11' && it[0] === 'Fotoliu rulant' ? '9' : '';
function a38ResHtml(q) {
  const w = rfNorm(q).split(/[^a-z0-9]+/).filter(Boolean);
  let h = '', n = 0;
  A38.forEach(G => {
    const items = G[3].map((it, i) => [it, i]).filter(x => !w.length || w.every(t => rfNorm(G[1] + ' ' + x[0][0] + ' ' + x[0][1]).indexOf(t) >= 0));
    if (!items.length) return;
    n += items.length;
    h += '<section class="pk-g"><h3>' + G[0] + '. ' + esc(G[1]) + '</h3>' + (G[2] ? '<p class="pk-gn">' + esc(G[2]) + '</p>' : '')
      + items.map(x => '<button type="button" class="pk-it pk-dv" data-act="rfDevAdd" data-g="' + G[0] + '" data-i="' + x[1] + '"><span class="pk-n">' + esc(x[0][0]) + (x[0][1] ? ', <i>' + esc(x[0][1]) + '</i>' : '') + '</span>'
        + (x[0][2] ? '<span class="pk-t">înlocuire: ' + esc(x[0][2]) + '</span>' : '') + (x[0][3] ? '<span class="pk-nt">' + esc(x[0][3]) + '</span>' : '') + '</button>').join('') + '</section>';
  });
  return n ? h : '<p class="pk-none">Niciun dispozitiv nu se potrivește. Încercați alt cuvânt (ex.: „genunchi”, „cârjă”, „fotoliu”).</p>';
}
ACT.rfDxPick = el => {
  rfFlush();
  const k = el.dataset.k || 'dx', key = rfKey(), R = rfStore(key), P = key === '_' ? null : getP(key);
  RF_PICK = {k, ctx: [R[k], P && dxMatchStr(P)].filter(Boolean).join(' ')};
  openModal('<h2>Coduri de boală, lista CIM-10 cu 999 de coduri</h2><p class="hint">Scrieți codul sau cuvinte din denumire, cu sau fără diacritice. Codul ales se adaugă pe un rând nou, la „' + (k === 'dx0' ? 'Diagnosticul clinic la data luării în evidență' : 'diagnostic') + '”.</p>'
    + '<label class="f" for="dx9-q">Căutare<input id="dx9-q" type="search" autocomplete="off" spellcheck="false" placeholder="ex.: gonartroza sau 634"></label>'
    + '<div class="pk-res" id="dx9-res" aria-live="polite">' + dx9ResHtml('', RF_PICK.ctx) + '</div>'
    + '<p class="hint">Denumirile sunt cele din anexa publicată, fără diacritice.</p>'
    + '<div class="mfoot"><span class="sp"></span><button type="button" class="btn" data-act="closeModal">Închide</button></div>', 'wide pk');
  const q = $('#dx9-q'); if (q) q.focus({preventScroll: true});
};
ACT.rfDxAdd = el => {
  const c = +el.dataset.c, k = (RF_PICK && RF_PICK.k) || 'dx', R = rfStore(rfKey());
  if (!(c >= 1 && c <= DX999.length)) return;
  const line = dx9Line(c), cur = (R[k] || '').trim();
  closeModal();
  if (cur.split('\n').some(l => l.trim() === line)) { toast('Codul ' + c + ' este deja trecut.'); return; }
  R[k] = cur ? cur + '\n' + line : line;
  persist(); renderRefs();
  const t = $('#' + rfId(k)); if (t) { t.focus({preventScroll: true}); t.scrollIntoView({block: 'center'}); }
  toast('Codul ' + c + ' a fost adăugat.');
};
ACT.rfDevPick = () => {
  rfFlush();
  openModal('<h2>Dispozitive medicale, Anexa 38</h2><p class="hint">Pachetul de bază: denumirea, tipul și termenul de înlocuire. Alegerea se trece la punctul 12; în formular se marchează și punctele 7-10 sau 13, când dispozitivul le cere.</p>'
    + '<label class="f" for="a38-q">Căutare<input id="a38-q" type="search" autocomplete="off" spellcheck="false" placeholder="ex.: genunchi, cârjă, fotoliu, lombostat"></label>'
    + '<div class="pk-res" id="a38-res">' + a38ResHtml('') + '</div>'
    + '<p class="hint">Anexa 38 la Normele aprobate prin Ordinul MS/CNAS nr. 1.857/441/2023, după lista CNAS din noiembrie 2024 și forma consolidată din aprilie 2025.</p>'
    + '<div class="mfoot"><span class="sp"></span><button type="button" class="btn" data-act="closeModal">Închide</button></div>', 'wide pk');
  const q = $('#a38-q'); if (q) q.focus({preventScroll: true});
};
ACT.rfDevAdd = async el => {
  const G = A38.find(g => g[0] === el.dataset.g), it = G && G[3][+el.dataset.i]; if (!it) return;
  const R = rfStore(rfKey()), lab = a38Label(it), cur = (R.disp || '').trim();
  if (cur && cur !== lab && !(await ask('Înlocuiți dispozitivul de la punctul 12 („' + cur.slice(0, 120) + '”) cu „' + lab + '”?', 'Înlocuiește'))) return;
  closeModal();
  R.disp = lab; R.dispPick = lab;
  R.dispInfo = 'pct. ' + G[0] + ', ' + G[1] + (it[2] ? '; termen de înlocuire ' + it[2] : '') + (it[3] ? '; ' + it[3] : '') + (G[2] ? '; ' + G[2] : '');
  const pt = a38Pts(G[0], it); if (pt) R.dispPt = pt; else delete R.dispPt;
  persist(); renderRefs();
  const t = $('#rf-disp'); if (t) { t.focus({preventScroll: true}); t.scrollIntoView({block: 'center'}); }
  toast('Dispozitivul a fost trecut la punctul 12.' + (pt ? ' Completați și punctul ' + pt.split(',').join(' și ') + '.' : ''));
};
__doc.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'dx9-q') { const r = $('#dx9-res'); if (r) r.innerHTML = dx9ResHtml(t.value, RF_PICK ? RF_PICK.ctx : ''); }
  else if (t.id === 'a38-q') { const r = $('#a38-res'); if (r) r.innerHTML = a38ResHtml(t.value); }
});

/* ---------- stilul foii tipărite (A4 vertical) ---------- */
const REF_PAGE_CSS = '@media print{@page{size:A4 portrait;margin:13mm 15mm 13mm 17mm}html,body{background:#fff !important}}';
/* Anexa 39 B are mult text: margini mai mici, ca să încapă pe o pagină */
const REF_PAGE39 = '@media print{@page{size:A4 portrait;margin:9mm 12mm 9mm 14mm}html,body{background:#fff !important}}';
const REF_CSS = `.pr .rf{font:10.5pt/1.38 Arial,"Segoe UI",sans-serif;color:#000}
.pr .rf p{margin:0 0 1.6mm}
.pr .rf-anx{text-align:right;font-size:9.5pt;margin:0 0 2mm}
.pr .rf-hd{margin:0 0 1mm}
.pr .rf-hl{margin:0 0 1.2mm}
.pr .rf-title{font-size:13pt;font-weight:700;text-align:center;letter-spacing:.06em;margin:5mm 0 1.5mm !important}
.pr .rf-sub{text-align:center;margin:0 0 4mm !important;font-size:10pt}
.pr .rf-id{margin:2.5mm 0 2.5mm !important;line-height:1.85}
.pr .rf-d{display:inline-block;border-bottom:1pt dotted #000;height:.95em;vertical-align:baseline;margin:0 .5mm;max-width:100%}
.pr .rf-iv{font-weight:600;padding:0 .6mm;border-bottom:.5pt dotted #777}
.pr .rf-ll{margin:0 0 1.8mm;break-inside:avoid;page-break-inside:avoid}
.pr .rf-ll p{display:flex;align-items:baseline;gap:1.5mm;margin:0}
.pr .rf-lb{font-weight:700}
.pr .rf-ll.e .rf-lb{flex:0 0 auto}
.pr .rf-fill{flex:1 1 auto;border-bottom:1pt dotted #000;min-width:20mm;height:.95em}
.pr .rf-ln{display:block;border-bottom:1pt dotted #000;height:6.2mm}
.pr .rf-tx{white-space:normal}
.pr .rf-ll>.rf-tx,.pr .rf-vit,.pr .rf-fn2{display:block;margin-top:.6mm}
.pr .rf-ll>.rf-tx.in{display:inline;margin:0}
.pr .rf-bx{display:inline-block;width:3.6mm;height:3.6mm;border:.8pt solid #000;vertical-align:-.6mm;text-align:center;line-height:3.5mm;font-size:8.5pt;font-weight:700;margin:0 1mm}
.pr .rf-pr{display:flex;gap:1mm;align-items:flex-start;margin:0 0 1.6mm 2mm}
.pr .rf-pr .rf-bx{flex:0 0 auto;margin:.6mm 1.5mm 0 0}
.pr .rf-dep{margin:2mm 0 2.4mm !important}
.pr .rf-tb{width:auto;min-width:60%;border-collapse:collapse;margin:1mm 0 .5mm;font-size:9.5pt}
.pr .rf-tb th,.pr .rf-tb td{border:.6pt solid #000;padding:.7mm 2.2mm;text-align:left;vertical-align:top}
.pr .rf-tb td.c,.pr .rf-tb th.c{text-align:center}
.pr .rf-sct td:first-child{white-space:nowrap}
.pr .rf-keep{break-inside:avoid;page-break-inside:avoid}
.pr .rf-sig{display:flex;justify-content:flex-end;margin-top:6mm;break-inside:avoid;page-break-inside:avoid}
.pr .rf-sig>div,.pr .rf-sgr{text-align:center;min-width:72mm}
.pr .rf-sig2{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;margin-top:6mm;break-inside:avoid;page-break-inside:avoid}
.pr .rf-nm{display:block;margin-top:1mm}
.pr .rf-sp{display:block;height:15mm}
.pr .rf-sm{font-size:9pt}
.pr .rf-note{margin-top:6mm !important;padding-top:1.5mm;border-top:.6pt solid #000;font-size:8.8pt}
/* Anexa 39 B: mult text pe o pagină A4 */
.pr .rf-a39{font-size:8.7pt;line-height:1.21}
.pr .rf-a39 p{margin:0 0 .6mm}
.pr .rf-a39 .rf-anx{text-align:right;font-size:8.7pt;margin:0 0 1.2mm}
.pr .rf-t39{font-weight:700;text-align:center;font-size:9.8pt;margin:0 0 1.6mm !important}
.pr .rf-nr39{text-align:center;margin:0 0 1.8mm !important}
.pr .rf-u39{display:flex;justify-content:space-between;align-items:flex-start;gap:6mm}
.pr .rf-u39 .l{flex:1 1 auto;min-width:0}
.pr .rf-u39 .r{flex:0 0 30mm}
.pr .rf-u39 .r .rf-bx,.pr .rf-ind>.rf-bx:first-child,.pr .rf-p7 .rf-bx:first-child{margin-left:0}
.pr .rf-ind{padding-left:5mm}
.pr .rf-id39{line-height:1.5;margin:.6mm 0 !important}
.pr .rf-a39 .rf-sm{font-size:7.9pt}
.pr .rf-a39 .rf-ll{margin:0 0 .8mm}
.pr .rf-a39 .rf-ln{height:5mm}
.pr .rf-gap{display:inline-block;width:9mm}
.pr .rf-p7{display:flex;justify-content:space-between;align-items:flex-end;gap:6mm}
.pr .rf-agr{text-align:right;font-size:8pt;margin:0 0 .6mm !important}
.pr .rf-s13 p{font-size:7.8pt;margin:0 0 .4mm}
.pr .rf-sig39{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;margin-top:1.6mm}
.pr .rf-sig39 .r{text-align:center;min-width:78mm}
.pr .rf-a39 .rf-sp{height:8.5mm}
.pr .rf-a39 .rf-note{margin-top:1.4mm !important;font-size:7.3pt;line-height:1.2}`;

  const REF_CSS_ALL = REF_CSS;
  let styleEl = document.getElementById('rf-ref-css');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'rf-ref-css'; styleEl.textContent = REF_CSS; document.head.appendChild(styleEl); }
  function destroy() { if (styleEl) styleEl.remove(); __ls.forEach(([t, ev, f, o]) => t.removeEventListener(ev, f, o)); clearTimeout(RF_PT); clearTimeout(RF_VT); }
  function rfCurrentKey() { return rfKey(); }
  return { renderRefs, destroy, rfFlush, rfKey: rfCurrentKey, REF_CSS: REF_CSS_ALL };
}
