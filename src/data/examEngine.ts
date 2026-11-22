// Generat din Vademecum MFR (Examen obiectiv: calculul probabilității cu rapoarte de verosimilitate), logică copiată fără modificări.
/* eslint-disable */
// @ts-nocheck
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (((n % 100) >= 20 || (n > 0 && n % 100 === 0)) ? 'de ' : '') + many);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let EXV = {}, THR = null, EX_REF = {}, EX_QT = {}, EX_GN = {}, EX_RULE = {}, EX_THR_DEF = {t: 20, r: 70};
const EX_BY = {};
const exTests = C => C.tests;
export function exSetData(d) { EX_REF = d.EX_REF; EX_QT = d.EX_QT; EX_GN = d.EX_GN; EX_RULE = d.EX_RULE; EX_THR_DEF = d.EX_THR_DEF; d.EX_REG.forEach(R => R.c.forEach(C => { C.reg = R; EX_BY[C.id] = C; })); }
export function exSetState(v, thr) { EXV = v; THR = thr; }
const exNum = x => { if (typeof x === 'number') return isFinite(x) ? x : null; const s = String(x == null ? '' : x).trim().replace(',', '.'); if (!/^-?\d*\.?\d+$/.test(s)) return null; const n = parseFloat(s); return isFinite(n) ? n : null; };
const exF = (x, d) => (+x).toFixed(d).replace('.', ',');
function exLRf(lr) {
  if (lr == null) return '';
  if (lr >= 10) return exF(lr, 1);
  if (lr >= 1) { const s = exF(lr, 2); return s.slice(-1) === '0' ? exF(lr, 1) : s; }
  return exF(lr, 2);
}
const exPf = p => p < 1 ? 'sub 1%' : p > 99 ? 'peste 99%' : (p < 9.95 && Math.abs(p - Math.round(p)) >= .05 ? exF(p, 1) : String(Math.round(p))) + '%';
const exPc = x => { const v = x * 100; return (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : exF(v, 1)) + '%'; };
const exCi = (c, pct) => 'IC 95%: ' + (pct ? exPc(c[0]).replace('%', '') + ' la ' + exPc(c[1]) : exLRf(c[0]) + ' la ' + exLRf(c[1]));
const exY = T => T.y || (T.k === 'an' ? 'Prezent' : 'Pozitiv');
const exN = T => T.n || (T.k === 'an' ? 'Absent' : 'Negativ');
const EX_UNITW = {ani: ['an', 'ani'], 'dinți': ['dinte', 'dinți'], puncte: ['punct', 'puncte']};
function exU(x, u) {
  if (u === '°') return exF(x, Number.isInteger(x) ? 0 : 1) + '°';
  const w = EX_UNITW[u];
  if (w && Number.isInteger(x) && x >= 0) return plural(x, w[0], w[1]);
  return (Number.isInteger(x) ? String(x) : exF(x, 1)) + ' ' + u;
}
const EX_OPT = {'<': 'sub', '<=': 'cel mult', '>': 'peste', '>=': 'cel puțin'};
const exCmp = (x, op, v) => op === '<' ? x < v : op === '<=' ? x <= v : op === '>' ? x > v : x >= v;
const exQ = r => r && EX_REF[r] ? EX_QT[EX_REF[r].q] : '';


/* ---------- calcul ---------- */
const exSt = C => EXV[C.id] || {};
function exSrc(C, T) { const i = (exSt(C).s || {})[T.id] || 0; return T.v[i] || T.v[0] || null; }
function exLR(v, side) {
  if (!v) return null;
  const sec = v.sec || (side === 'p' ? v.secp : v.secn);
  if (side === 'p') {
    if (v.lrp != null) return {lr: v.lrp, ci: v.cip, sec};
    if (v.se != null && v.sp != null && v.sp < 1) return {lr: v.se / (1 - v.sp), calc: 1, sec};
  } else {
    if (v.lrn != null) return {lr: v.lrn, ci: v.cin, sec};
    if (v.se != null && v.sp != null && v.sp > 0) return {lr: (1 - v.se) / v.sp, calc: 1, sec};
  }
  return null;
}
function exOut(T, a) {
  if (a == null || a === '') return null;
  if (T.opt) { const i = parseInt(String(a).slice(1), 10), O = T.opt[i]; return O ? {o: 'o', i, txt: O.t} : null; }
  if (T.num) {
    const x = exNum(a); if (x == null) return null;
    if (T.num.b) return {o: 'b', b: T.num.b.find(b => exCmp(x, b.op, b.x)) || null, x, txt: exU(x, T.num.u)};
    const p = exCmp(x, T.num.op, T.num.x);
    return {o: p ? 'p' : 'n', x, txt: exU(x, T.num.u) + ', ' + (p ? 'pozitiv' : 'negativ')};
  }
  return a === 'p' || a === 'n' ? {o: a, txt: a === 'p' ? exY(T) : exN(T)} : null;
}
function exTLR(C, T, O) {
  const v = exSrc(C, T), r = v && v.r, os = v && v.os, u1 = v && v.u1;
  if (O.o === 'o') { const X = T.opt[O.i]; return X.lr == null ? {lr: null, r, why: 'fără LR publicat pentru această categorie'} : {lr: X.lr, ci: X.ci, r, os}; }
  if (O.o === 'b') return O.b ? {lr: O.b.lr, ci: O.b.ci, calc: O.b.calc, sec: O.b.sec, r, os, u1} : {lr: null, r, why: 'valoarea este între pragurile publicate'};
  const L = exLR(v, O.o);
  return L ? Object.assign({r, os, u1}, L) : {lr: null, r, why: T.v.length ? 'fără LR publicat pentru rezultatul ' + (O.o === 'p' ? 'pozitiv' : 'negativ') : 'nu are LR propriu, contează doar în combinație'};
}
const exKShort = K => K.t.replace(/ \(.*\)$/, '');
function exKRes(C, K, R) {
  const A = exSt(C).a || {}, m = R.m || K.m;
  let pos = 0, unk = 0;
  m.forEach(id => { const T = C.tests.find(x => x.id === id), O = T && exOut(T, A[id]); if (!O) unk++; else if (O.o === 'p') pos++; });
  const sIn = n => R.st.find(s => n >= s.a && n <= s.b) || null;
  const lo = sIn(pos), hi = sIn(pos + unk);
  return {pos, unk, n: m.length, m, st: lo && lo === hi ? lo : null};
}
function exPre(C) {
  const v = exNum(exSt(C).pre);
  if (v != null && v >= 1 && v <= 99) return {p: v, own: 1};
  if (C.pre != null) return {p: C.pre, def: 1};
  return {p: 50, neutral: 1};
}
function exCompute(C) {
  const st = exSt(C), A = st.a || {}, tests = exTests(C);
  const pre = exPre(C), terms = [], none = [], ks = [], fx = {};
  const excl = tests.find(T => T.ex && exOut(T, A[T.id]));
  const used = new Set(), block = new Map();
  (C.k || []).forEach(K => {
    const s = (st.k || {})[K.id] || {}, R = K.rules[Math.min(s.r || 0, K.rules.length - 1)];
    const on = !s.off && !excl, res = exKRes(C, K, R);
    ks.push({K, R, on, res});
    if (!on) return;
    K.m.forEach(id => used.add(id));
    /* combinația este folosită de îndată ce are un item completat; testele care se suprapun cu ea nu se mai înmulțesc */
    if (K.x && res.unk < res.n) K.x.forEach(id => { if (!block.has(id)) block.set(id, K); });
    if (res.st) terms.push({t: K.t, res: res.pos + ' din ' + res.n + ' pozitive', lr: res.st.lr, ci: res.st.ci, calc: res.st.calc, sec: res.st.sec, r: K.r});
  });
  const cand = [];
  tests.forEach(T => {
    if (T.rule) return; /* rubricile pentru pasul următor nu au LR */
    const O = exOut(T, A[T.id]); if (!O) return;
    const no = why => { none.push({t: T.t, why, id: T.id}); fx[T.id] = {why}; };
    if (excl && T !== excl) { no('nu se combină cu ' + excl.t); return; }
    if (used.has(T.id)) {
      const k = ks.find(x => x.on && x.K.m.indexOf(T.id) >= 0);
      if (k && k.res.m.indexOf(T.id) < 0) no('nu face parte din regula aleasă');
      else if (k) fx[T.id] = {k: exKShort(k.K)};
      return;
    }
    if (block.has(T.id)) { no('se suprapune cu ' + exKShort(block.get(T.id)) + '; se folosește dacă dezactivați combinația'); return; }
    const L = exTLR(C, T, O);
    if (L.lr == null) no(L.why);
    else cand.push({T, x: {id: T.id, t: T.t, res: O.txt + '', lr: L.lr, ci: L.ci, calc: L.calc, sec: L.sec, r: L.r, os: L.os, u1: L.u1, user: T.user}});
  });
  /* teste corelate (același grup): se înmulțește doar rezultatul cu efectul cel mai mare, |ln LR| */
  const best = {};
  cand.forEach(c => { const g = c.T.g; if (!g) return; const w = Math.abs(Math.log(c.x.lr)); if (!best[g] || w > best[g].w) best[g] = {c, w}; });
  cand.forEach(c => {
    const g = c.T.g;
    if (g && best[g].c !== c) { const why = 'corelat cu „' + best[g].c.T.t + '”, care are efectul mai mare; din grupul „' + (EX_GN[g] || g) + '” se înmulțește un singur rezultat'; none.push({t: c.T.t, why, id: c.T.id}); fx[c.T.id] = {why, g: 1}; }
    else { terms.push(c.x); fx[c.T.id] = {lr: c.x.lr}; }
  });
  let odds = pre.p / (100 - pre.p);
  terms.forEach(x => { odds *= x.lr; });
  return {pre, post: 100 * odds / (1 + odds), terms, none, ks, excl, block, fx};
}
const exAny = C => { const s = EXV[C.id]; return !!(s && s.a && Object.keys(s.a).length); };
function exClean(C) {
  const s = EXV[C.id]; if (!s) return;
  if (!Object.keys(s.a || {}).length && s.pre == null && !Object.keys(s.s || {}).length && !Object.keys(s.k || {}).length && !Object.keys(s.c || {}).length) delete EXV[C.id];
}

/* ---------- ce urmează: pragurile de decizie și recomandările ---------- */
const exThr = () => { const x = THR || {}; let t = exNum(x.t), r = exNum(x.r); if (!(t >= 1 && t <= 98)) t = EX_THR_DEF.t; if (!(r > t && r <= 99)) r = Math.max(t + 1, EX_THR_DEF.r); return {t, r}; };
const exP = r => r.terms.length ? r.post : r.pre.p;
function exZone(C, r) {
  if (EX_NEXTF[C.id]) return EX_NEXTF[C.id](C, r).z;
  const rid = EX_RULE[C.id];
  if (rid) { const a = ((exSt(C).a || {})[rid]); return a === 'p' ? 'rp' : a === 'n' ? 'rn' : 'r0'; }
  const th = exThr(), p = exP(r);
  return p >= th.r ? 'hi' : p < th.t ? 'lo' : 'mid';
}
function exZoneLabel(z) {
  if (EX_FZ[z]) return EX_FZ[z].l;
  const th = exThr();
  return {hi: 'Peste pragul de tratament (' + th.r + '%)', mid: 'Între pragul de testare (' + th.t + '%) și cel de tratament (' + th.r + '%)', lo: 'Sub pragul de testare (' + th.t + '%)',
    rp: 'Regula Ottawa este pozitivă', rn: 'Regula Ottawa este negativă', r0: 'Regula Ottawa nu este completată'}[z];
}
const EX_ZSHORT = {hi: 'Peste pragul de tratament', mid: 'Între praguri', lo: 'Sub pragul de testare', rp: 'Regula: pozitivă', rn: 'Regula: negativă', r0: 'Regula: necompletată'};
/* testele încă necompletate care ar schimba cel mai mult probabilitatea */
function exNextTests(C, r) {
  if (r.excl) return [];
  const A = exSt(C).a || {}, used = new Set(), out = [];
  const gDone = new Set(exTests(C).filter(T => T.g && A[T.id] != null).map(T => T.g));
  r.ks.filter(k => k.on).forEach(k => k.K.m.forEach(id => used.add(id)));
  r.ks.filter(k => k.on && !k.res.st).forEach(k => out.push({t: k.K.t, txt: 'lipsesc ' + plural(k.res.unk, 'item', 'itemi'), w: 99}));
  exTests(C).forEach(T => {
    if (A[T.id] != null || used.has(T.id) || T.ex || T.rule || (r.block && r.block.has(T.id)) || (T.g && gDone.has(T.g))) return;
    if (T.opt || (T.num && T.num.b)) {
      const L = (T.opt ? T.opt.map(o => o.lr) : T.num.b.map(b => b.lr)).filter(x => x != null);
      if (L.length) out.push({t: T.t, txt: 'LR ' + L.map(exLRf).join(' sau '), w: Math.max.apply(null, L.map(x => Math.abs(Math.log(x))))});
      return;
    }
    const v = exSrc(C, T), P = exLR(v, 'p'), N = exLR(v, 'n'); if (!P && !N) return;
    out.push({t: T.t, txt: [P ? 'LR+ ' + exLRf(P.lr) : '', N ? 'LR− ' + exLRf(N.lr) : ''].filter(Boolean).join(', '), w: Math.max(P ? Math.log(P.lr) : 0, N ? -Math.log(N.lr) : 0)});
  });
  return out.sort((a, b) => b.w - a.w).slice(0, 3);
}
/* rândurile „Kinetoterapie și proceduri fizicale” de pe pagina afecțiunii, cu id-uri proprii (pagina afecțiunii poate fi și ea în document) */
const EX_FZ = {
  fu: {l: 'Urgență oncologică: semne de compresiune medulară', s: 'Urgență oncologică'},
  fn: {l: 'Semne de compresiune medulară, fără cancer cunoscut', s: 'Compresiune medulară?'},
  f24: {l: 'Durere sugestivă de metastaze, la un pacient cu cancer', s: 'Sfat oncologic în 24 de ore'},
  fo: {l: 'Durere sugestivă de metastaze, fără cancer cunoscut', s: 'Suspiciune de cancer?'},
  fe: {l: 'Cancer actual sau în antecedente, fără semnele din caseta NICE', s: 'Educație și urmărire'},
  fl: {l: 'Fără cancer cunoscut și fără semnele din caseta NICE', s: 'Fără criteriile NICE'},
  f0: {l: 'Date incomplete pentru pasul următor', s: 'Necompletat'}
};
const EX_NEXTF = {
  malsp(C, r) {
    const A = exSt(C).a || {}, hc = A.hca, ca = hc === 'p', no = hc === 'n', pm = A.pmet, cc = A.mscc, p = exP(r);
    const pr = '<p class="ex-help">Probabilitatea calculată din semnele de alarmă (Downie 2013): ' + exPf(p) + '.</p>';
    const hi = p >= exThr().t ? '<p class="ex-msg mid">Probabilitatea calculată este ' + exPf(p) + '. NICE NG234 nu folosește semnele de alarmă din Downie 2013, iar produsul mai multor LR din studii unice poate supraestima probabilitatea. Decideți clinic dacă cereți totuși sfatul oncologului.</p>' : '';
    const ccq = cc == null ? '<p class="ex-help">Verificați și semnele de compresiune medulară: dacă apar, situația devine urgentă (1.3.2).</p>' : '';
    const hcq = '<p class="ex-help">Completați istoricul de cancer: ghidul NICE NG234 tratează diferit pacienții cu cancer actual sau în antecedente.</p>';
    if (cc === 'p') {
      if (ca) return {z: 'fu', html: '<p><b>Contactați imediat oncologul (coordonatorul pentru compresiunea medulară) și tratați situația ca urgență oncologică.</b> RMN cât mai repede, întotdeauna în cel mult 24 de ore (NICE NG234, 1.3.2 și 1.5.2).</p>' + pr};
      if (no) return {z: 'fn', html: '<p>Gândiți-vă la metastaze vertebrale sau la compresiune medulară (NICE NG234, 1.3.1). Ghidul dă termene (contact imediat, RMN în 24 de ore; 1.3.2 și 1.5.2) doar pentru pacienții cu cancer actual sau în antecedente; pentru ceilalți nu dă un termen. Dacă bănuiți cancer și pacientul are și durere cu caracter sugestiv, trimiteți-l urgent la evaluare oncologică (1.3.5).</p>' + pr};
      return {z: 'f0', html: '<p><b>Semne de compresiune medulară.</b> La un pacient cu cancer actual sau în antecedente: contact imediat cu oncologul și RMN în cel mult 24 de ore (NICE NG234, 1.3.2 și 1.5.2).</p>' + hcq + pr};
    }
    if (pm === 'p') {
      if (ca) return {z: 'f24', html: '<p><b>Cereți sfatul oncologului (coordonatorul pentru compresiunea medulară) în cel mult 24 de ore; RMN în cel mult o săptămână</b> (NICE NG234, 1.3.3 și 1.5.3).</p><p class="ex-help">RMN-ul cuprinde secvențe sagitale T1 sau STIR ale întregii coloane, secvențe sagitale T2 și secțiuni axiale prin orice anomalie (1.5.5).</p>' + ccq + pr};
      if (no) return {z: 'fo', html: '<p>Dacă bănuiți cancer: <b>trimitere urgentă la evaluare oncologică</b> (NICE NG234, 1.3.5).</p>' + ccq + pr};
      return {z: 'f0', html: '<p><b>Durere cu caracter sugestiv de metastaze.</b> La un pacient cu cancer actual sau în antecedente: sfatul oncologului în cel mult 24 de ore și RMN în cel mult o săptămână (NICE NG234, 1.3.3 și 1.5.3).</p>' + hcq + pr};
    }
    if (pm === 'n' && cc === 'n') {
      if (ca) return {z: 'fe', html: '<p>Explicați pacientului ce schimbări ale simptomelor să urmărească (caseta 1) și să revină urgent dacă simptomele se schimbă sau se agravează (NICE NG234, 1.3.6).</p>' + hi + pr};
      if (no) return {z: 'fl', html: '<p>Ghidul NICE NG234 nu cere alți pași: pacientul nu are cancer cunoscut și nici semnele din caseta 1. Reevaluați dacă apar aceste semne.</p>' + hi + pr};
    }
    const miss = [[hc, 'istoricul de cancer'], [pm, 'durerea cu caracter sugestiv de metastaze'], [cc, 'semnele de compresiune medulară']].filter(x => x[0] == null).map(x => x[1]);
    return {z: 'f0', html: '<p>Pasul următor depinde de istoricul de cancer și de semnele din caseta 1 a ghidului NICE NG234. Completați: ' + esc(miss.join(', ')) + '.</p>' + pr};
  }
};
export { exNum, exF, exLRf, exPf, exPc, exCi, exY, exN, exU, exQ, exSrc, exLR, exOut, exCompute, exThr, exP, exZone, exZoneLabel, exNextTests, EX_FZ, EX_NEXTF, EX_ZSHORT, exKShort, exKRes, exTests, exAny };
