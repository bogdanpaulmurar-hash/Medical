// Generat din Vademecum MFR (calculele scalelor), copiat fără modificări de logică.
/* eslint-disable */
// @ts-nocheck
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (((n % 100) >= 20 || (n > 0 && n % 100 === 0)) ? 'de ' : '') + many);
const scFold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const scOpts = it => it.n != null ? Array.from({length: it.n + 1}, (x, k) => ({v: String(k), t: String(k), p: k}))
  : (it.o || []).map(o => o.length === 3 ? {v: String(o[0]), t: o[1], p: o[2]} : {v: String(o[0]), t: o[1], p: typeof o[0] === 'number' ? o[0] : 0});
const scItems = sc => (sc.items || []).filter(it => !it.g);
const scVal = (sc, id) => (SCV[sc.id] || {})[id];
const scHas = x => x != null && x !== '';
const scBand = (bands, x) => (bands || []).find(b => x >= b[0] && x <= b[1]);
const scN = (x, d) => { const r = Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0); return String(r).replace('.', ','); };
const QF_O = {
  pain: ['n-am avut dureri', 'slabă', 'potrivită', 'puternică', 'de nesuportat'],
  adl: ['nici o dificultate', 'puțină dificultate', 'dificultate medie', 'pot avea nevoie de puțin ajutor', 'imposibil, fără ajutor'],
  jobs: ['fără dificultate', 'cu puțină dificultate', 'cu dificultate medie', 'cu mare dificultate', 'imposibil'],
  help: ['fără dificultate', 'cu puțină dificultate', 'cu dificultate medie', 'cu mare dificultate', 'numai cu ajutor'],
  ease: ['cu ușurință', 'destul de ușor', 'cu dificultate medie', 'cu mare dificultate', 'imposibil'],
  yes3: ['da', 'da, cu restricții', 'deloc'],
  visits: ['o dată pe săptămână sau mai des', 'o dată sau de două ori pe lună', 'mai puțin de o dată pe lună', 'niciodată'],
  rate: ['excelentă', 'bună', 'satisfăcătoare', 'acceptabilă', 'proastă'],
  days: ['aproape în fiecare zi', '3-5 zile pe săptămână', '1-2 zile pe săptămână', 'din când în când', 'aproape niciodată'],
  often: ['nu, niciodată', 'rareori', 'câteodată', 'destul de des', 'totdeauna']
};
const QF_ITEMS = [null,
  {t: 'Frecvența durerii de spate, ultima săptămână', o: ['n-am avut dureri', '1 zi pe săptămână sau mai puțin', '2-3 zile pe săptămână', '4-6 zile pe săptămână', 'în fiecare zi']},
  {t: 'Durata durerii în cursul zilei', o: ['n-am avut dureri', '1-2 ore', '3-5 ore', '6-10 ore', 'toată ziua']},
  {t: 'Durerea, când a durut cel mai tare', o: QF_O.pain},
  {t: 'Durerea de spate alteori', o: QF_O.pain},
  {t: 'Somn deranjat de durere, ultima săptămână', o: ['mai puțin de o dată pe săptămână', 'o dată pe săptămână', 'de două ori pe săptămână', 'o dată la două nopți', 'în fiecare noapte']},
  {t: 'Îmbrăcatul', o: QF_O.adl},
  {t: 'Baie sau duș', o: QF_O.adl},
  {t: 'Mersul la toaletă, trasul apei', o: QF_O.adl},
  {t: 'Calitatea somnului', o: ['somn neîntrerupt', 'mă trezesc câteodată', 'mă trezesc adeseori', 'câteodată stau trează ore în șir', 'câteodată nu dorm toată noaptea']},
  {t: 'Curățenia', o: QF_O.jobs},
  {t: 'Pregătirea mesei', o: QF_O.jobs},
  {t: 'Spălatul vaselor', o: QF_O.jobs},
  {t: 'Cumpărăturile zilnice', o: QF_O.jobs},
  {t: 'Ridicat și cărat 10 kg, cel puțin 10 m', o: QF_O.jobs},
  {t: 'Ridicatul de pe scaun', o: QF_O.help},
  {t: 'Aplecatul', o: QF_O.ease},
  {t: 'Îngenuncheatul', o: QF_O.ease},
  {t: 'Urcatul unui etaj pe scări', o: ['fără dificultate', 'cu puțină dificultate', 'cu cel puțin o oprire', 'numai cu ajutor', 'imposibil']},
  {t: 'Mersul pe jos, aproximativ 100 m', o: ['repede, fără să mă opresc', 'încet, fără să mă opresc', 'încet, cu cel puțin o oprire', 'numai cu ajutor', 'imposibil']},
  {t: 'Ieșit din casă, ultima săptămână', o: ['în fiecare zi', '5-6 zile pe săptămână', '3-4 zile pe săptămână', '1-2 zile pe săptămână', 'mai puțin de o dată pe săptămână']},
  {t: 'Transportul în comun', o: QF_O.help},
  {t: 'Deranjată de schimbările înfățișării', o: ['deloc', 'puțin', 'potrivit', 'destul de mult', 'foarte mult']},
  {t: 'Sport, în prezent', o: QF_O.yes3},
  {t: 'Grija de grădină', o: QF_O.yes3.concat(['nu e cazul']), na: 4},
  {t: 'Activitate din plăcere, în timpul liber', o: QF_O.yes3},
  {t: 'Cinema, teatru etc.', o: QF_O.yes3.concat(['nu există cinematograf sau teatru aproape']), na: 4},
  {t: 'Vizite la prieteni sau rude, ultimele 3 luni', o: QF_O.visits},
  {t: 'Activități sociale, ultimele 3 luni', o: QF_O.visits},
  {t: 'Deranjată în viața intimă', o: ['deloc', 'puțin', 'potrivit', 'foarte mult', 'întrebarea nu mă privește'], na: 5},
  {t: 'Sănătatea, pentru vârsta sa', o: QF_O.rate},
  {t: 'Calitatea vieții, ultima săptămână', o: QF_O.rate},
  {t: 'Calitatea vieții față de acum 10 ani', o: ['mult mai bună acum', 'puțin mai bună acum', 'neschimbată', 'puțin mai proastă acum', 'mult mai proastă acum']},
  {t: 'Se simte obosită', o: ['da, dimineața', 'da, după-amiaza', 'da, numai seara', 'da, după o activitate extenuantă', 'nu, aproape niciodată'], rev: true},
  {t: 'Se simte abătută', o: QF_O.days, rev: true},
  {t: 'Se simte singură', o: QF_O.days, rev: true},
  {t: 'Se simte plină de energie', o: QF_O.days},
  {t: 'Încrezătoare în viitor', o: QF_O.often, rev: true},
  {t: 'Se necăjește din lucruri mărunte', o: QF_O.often},
  {t: 'Comunică ușor cu oamenii', o: QF_O.often, rev: true},
  {t: 'Bine dispusă cea mai mare parte a zilei', o: QF_O.often, rev: true},
  {t: 'Se teme că va deveni total dependentă', o: QF_O.often}
];
const QF_SEC = [['A', 'Durere', 1, 5], ['B', 'Activități de zi cu zi', 6, 9], ['C', 'Treburi casnice', 10, 14], ['D', 'Mobilitate', 15, 22],
  ['E', 'Activități în timpul liber și activități sociale', 23, 29], ['F', 'Aprecierea stării de sănătate în ansamblu', 30, 32], ['G', 'Funcția mentală', 33, 41]];
/* domeniile din algoritmul IOF; k = numele coloanei în rândul pentru Excel */
const QF_DOM = [['Durere', 1, 5, 'Pain'], ['Funcția fizică', 6, 22, 'Physical_function'], ['Funcția socială', 23, 29, 'Social_function'],
  ['Aprecierea sănătății în ansamblu', 30, 32, 'General_health'], ['Funcția mentală', 33, 41, 'Mental_function']];
const QF_SUB = [['Activități de zi cu zi', 6, 9, 'ADL'], ['Treburi casnice', 10, 14, 'Jobs_house'], ['Mobilitate', 15, 22, 'Mobility']];
const QF_REV = QF_ITEMS.map((it, q) => it && it.rev ? q : 0).filter(Boolean);
const qfOpts = q => QF_ITEMS[q].o.length;
const qfNA = q => QF_ITEMS[q].na || 0;
/* scorul itemului: 1 = cea mai bună calitate a vieții, 5 = cea mai proastă; „nu se aplică” și căsuțele inexistente = lipsă */
function qfScore(q, a) {
  if (!scHas(a)) return null;
  const it = QF_ITEMS[q], box = +a;
  if (it.na && box === it.na) return null;
  const k = it.na ? it.o.length - 1 : it.o.length;
  if (!(box >= 1 && box <= k)) return null;
  const pos = it.rev ? k + 1 - box : box;
  return k === 5 ? pos : k === 4 ? [1, 2.3, 3.6, 5][pos - 1] : k === 3 ? [1, 3, 5][pos - 1] : null;
}
function scDefault(sc, v) {
  let tot = 0, max = 0, miss = 0;
  scItems(sc).forEach(it => {
    const os = scOpts(it); max += Math.max.apply(null, os.map(o => o.p));
    const a = v[it.id]; if (!scHas(a)) { miss++; return; }
    const o = os.find(x => x.v === a); if (o) tot += o.p;
  });
  const ok = !miss, b = ok ? scBand(sc.bands, tot) : null;
  return {val: String(tot), max: String(max), ok, miss, band: b ? {t: b[2], c: b[3]} : null};
}
const SC_CALC = {
  moca(sc, v) {
    const ids = ['vis', 'name', 'att', 'lang', 'abs', 'rec', 'ori']; let raw = 0, miss = 0;
    const parts = ids.map(id => { const it = sc.items.find(x => x.id === id); if (!scHas(v[id])) { miss++; return [it.t, '?/' + it.n]; } raw += +v[id]; return [it.t, v[id] + '/' + it.n]; });
    if (!scHas(v.edu)) miss++;
    const add = v.edu === '1' && raw < 30 ? 1 : 0, tot = raw + add, ok = !miss, notes = [];
    if (add) notes.push('Include 1 punct pentru cel mult 12 ani de școală (scor brut ' + raw + ').');
    let band = null;
    if (ok) {
      band = tot >= 26 ? {t: 'Normal (prag 26)', c: 'ok'} : {t: 'Sub pragul de 26: posibilă tulburare cognitivă', c: 'mid'};
      if (tot >= 23 && tot < 26) notes.push('Între 23 și 25: normal la pragul de 23 propus de Carson 2018.');
    }
    return {val: String(tot), max: '30', ok, miss, band, parts, notes, bandSrc: 'Nasreddine 2005'};
  },
  tug(sc, v) {
    const t = scHas(v.tug) ? +v.tug : NaN;
    if (!(t > 0)) return {val: '', ok: false, miss: 1};
    const b = t < 10 ? ['Mobilitate normală', 'ok'] : t < 20 ? ['Mobilitate funcțională independentă', 'ok'] : t < 30 ? ['Mobilitate variabilă', 'mid'] : ['Mobilitate redusă: dependent la transferuri', 'bad'];
    const notes = [];
    if (t >= 12) { notes.push('12 secunde sau peste: risc crescut de cădere (CDC STEADI).'); if (b[1] === 'ok') b[1] = 'mid'; }
    if (t > 13.5) notes.push('Peste 13,5 secunde: risc crescut de cădere la vârstnicii din comunitate (Shumway-Cook 2000).');
    if (v.aid === '1') notes.push('Cu dispozitiv de mers.');
    return {val: scN(t, 1), unit: 's', ok: true, miss: 0, band: {t: b[0], c: b[1]}, notes, bandSrc: 'Podsiadlo 1991'};
  },
  sppb(sc, v) {
    const p1 = scHas(v.bal1) ? +v.bal1 : null, p2 = p1 === 0 ? 0 : scHas(v.bal2) ? +v.bal2 : null, p3 = p1 === 0 || p2 === 0 ? 0 : scHas(v.bal3) ? +v.bal3 : null;
    const bal = p1 == null || p2 == null || p3 == null ? null : p1 + p2 + p3, gt = v.gait, ct = v.chair;
    const gp = !scHas(gt) ? null : gt === 'x' ? 0 : (t => t < 4.82 ? 4 : t <= 6.2 ? 3 : t <= 8.7 ? 2 : 1)(+gt);
    const cp = !scHas(ct) ? null : ct === 'x' ? 0 : (t => t <= 11.19 ? 4 : t <= 13.69 ? 3 : t <= 16.69 ? 2 : t <= 60 ? 1 : 0)(+ct);
    const miss = [bal, gp, cp].filter(x => x == null).length, tot = (bal || 0) + (gp || 0) + (cp || 0), ok = !miss, notes = [];
    const parts = [['Echilibru', bal == null ? '?' : bal + '/4'],
      ['Mers 4 m', gp == null ? '?' : gp + '/4' + (scHas(gt) && gt !== 'x' ? ' (' + scN(4 / +gt, 2) + ' m/s)' : '')],
      ['Ridicări de pe scaun', cp == null ? '?' : cp + '/4' + (scHas(ct) && ct !== 'x' ? ' (' + scN(+ct, 1) + ' s)' : '')]];
    if (scHas(gt) && (gt === 'x' || 4 / +gt <= 0.8)) notes.push('Viteza de mers 0,8 m/s sau sub: performanță fizică scăzută (EWGSOP2).');
    if (scHas(ct) && (ct === 'x' || +ct > 15)) notes.push('Peste 15 secunde la 5 ridicări, sau nu poate: forță scăzută (EWGSOP2).');
    const band = ok ? (tot <= 8 ? {t: 'Performanță fizică scăzută (8 sau sub)', c: 'mid'} : {t: 'Peste pragul de performanță scăzută', c: 'ok'}) : null;
    return {val: String(tot), max: '12', ok, miss, band, parts, notes, bandSrc: 'EWGSOP2, Cruz-Jentoft 2019'};
  },
  womac(sc, v) {
    const sub = (ids, mx) => {
      const a = ids.filter(id => scHas(v[id])).map(id => +v[id]), m = ids.length - a.length;
      if (m > mx) return {ok: false, m};
      const s = a.reduce((x, y) => x + y, 0); return {ok: true, m, raw: s + m * (a.length ? s / a.length : 0)};
    };
    const rng = (p, n) => Array.from({length: n}, (x, k) => p + (k + 1));
    const P = sub(rng('p', 5), 1), S = sub(rng('s', 2), 1), F = sub(rng('f', 17), 3), miss = P.m + S.m + F.m;
    const show = (x, max) => x.ok ? scN(x.raw, 1) + '/' + max + ' (' + scN(x.raw / max * 100, 0) + ' din 100)' : 'nu se calculează (' + x.m + ' lipsă)';
    const ok = P.ok && S.ok && F.ok, tot = ok ? P.raw + S.raw + F.raw : null, notes = [];
    if (ok && miss) notes.push('Valorile lipsă au fost înlocuite cu media subscalei (ghidul WOMAC 3.1).');
    if (ok) notes.push('Pe scala 0-100: ' + scN(tot / 96 * 100, 0) + '.');
    return {val: ok ? scN(tot, 1) : '', max: '96', ok: ok, miss, parts: [['Durere', show(P, 20)], ['Redoare', show(S, 8)], ['Funcție fizică', show(F, 68)]], notes, sub: 'Scorul mai mare înseamnă stare mai proastă.'};
  },
  odi(sc, v) {
    let sum = 0, n = 0, na = 0, miss = 0;
    scItems(sc).forEach(it => { const a = v[it.id]; if (!scHas(a)) miss++; else if (a === 'na') na++; else { sum += +a; n++; } });
    if (!n) return {val: '', ok: false, miss};
    const pct = Math.round(sum / (5 * n) * 100), b = !miss ? scBand(sc.bands, pct) : null, notes = [];
    if (na) notes.push('Calculat din ' + n + ' secțiuni: numitorul este 5 × ' + n + '.');
    return {val: String(pct), unit: '%', ok: !miss, miss, band: b ? {t: b[2], c: b[3]} : null, parts: [['Suma', sum + '/' + 5 * n]], notes};
  },
  qdash(sc, v) {
    const a = scItems(sc).filter(it => scHas(v[it.id])).map(it => +v[it.id]), n = a.length, miss = 11 - n;
    if (n < 10) return {val: '', ok: false, miss, notes: n ? ['Se calculează doar cu cel puțin 10 răspunsuri din 11.'] : []};
    return {val: scN((a.reduce((x, y) => x + y, 0) / n - 1) * 25, 1), max: '100', ok: true, miss, notes: miss ? ['Calculat din 10 răspunsuri (regula oficială: cel puțin 10 din 11).'] : [], sub: '0 = fără dizabilitate, 100 = dizabilitate maximă.'};
  },
  qualeffo(sc, v) {
    let miss = 0; for (let q = 1; q <= 41; q++) if (!scHas(v['q' + q])) miss++;
    const dom = (a, b) => { const xs = []; let m = 0; for (let q = a; q <= b; q++) { const x = qfScore(q, v['q' + q]); if (x == null) m++; else xs.push(x); } return {xs, m, n: b - a + 1}; };
    const s100 = xs => xs.length ? (xs.reduce((x, y) => x + y, 0) / xs.length - 1) / 4 * 100 : null;
    const fmt = d => { const s = s100(d.xs); return s == null ? '?' : scN(s, 1) + (d.m / d.n >= 0.3 ? ' (nesigur: ' + d.m + ' lipsă)' : ''); };
    const parts = [];
    QF_DOM.forEach(([t, a, b]) => {
      parts.push([t, fmt(dom(a, b))]);
      if (a === 6) QF_SUB.forEach(([t2, a2, b2]) => parts.push(['  ' + t2, fmt(dom(a2, b2))]));
    });
    const T = dom(1, 41), tot = s100(T.xs), notes = [];
    const na = []; for (let q = 1; q <= 41; q++) if (qfNA(q) && v['q' + q] === String(qfNA(q))) na.push(q);
    if (T.xs.length) notes.push('Itemi scorați: ' + T.xs.length + ' din 41' + (na.length ? '; „nu se aplică” la ' + (na.length === 1 ? 'întrebarea ' : 'întrebările ') + na.join(', ') + ' (contează ca lipsă)' : '') + '.');
    if (T.xs.length && T.m / 41 >= 0.3) notes.push('30% sau mai multe valori lipsă: scorul total este nesigur.');
    return {val: tot == null ? '' : scN(tot, 1), max: '100', ok: !miss && tot != null, miss, parts, notes, sub: '0 = cea mai bună, 100 = cea mai proastă calitate a vieții.'};
  },
  dn4(sc, v) {
    const r = scDefault(sc, v), pos = scItems(sc).filter(it => v[it.id] === '1').map(it => it.t.toLowerCase());
    const cnt = ids => ids.filter(id => v[id] === '1').length;
    r.parts = [['Interogatoriu', cnt(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7']) + '/7'], ['Examinare', cnt(['d8', 'd9', 'd10']) + '/3']];
    if (pos.length) r.parts.push(['Prezente', pos.join(', ')]);
    return r;
  },
  hartwig(sc, v) {
    if (!scHas(v.lvl)) return {val: '', ok: false, miss: 1};
    const o = scOpts(sc.items[0]).find(x => x.v === v.lvl), p = o ? o.p : 0;
    return {big: 'Nivel ' + v.lvl, ok: true, miss: 0, band: p <= 2 ? {t: 'Reacție ușoară', c: 'ok'} : p <= 4 ? {t: 'Reacție moderată', c: 'mid'} : {t: 'Reacție severă', c: 'bad'}, bandSrc: 'Hartwig 1992'};
  },
  schumock(sc, v) {
    const A = ['a1', 'a2', 'a3', 'a4', 'a5'], B = ['b1', 'b2', 'b3', 'b4'], yes = ids => ids.some(id => v[id] === '1');
    const miss = A.concat(B).filter(id => !scHas(v[id])).length;
    if (yes(A)) return {big: 'Sigur prevenibilă', ok: true, miss: 0, band: {t: 'Cel puțin un „Da” în secțiunea A', c: 'bad'}};
    if (A.every(id => scHas(v[id])) && yes(B)) return {big: 'Probabil prevenibilă', ok: true, miss: 0, band: {t: 'Doar „Nu” în A, cel puțin un „Da” în B', c: 'mid'}};
    if (!miss) return {big: 'Neprevenibilă', ok: true, miss: 0, band: {t: 'Toate răspunsurile sunt „Nu”', c: 'ok'}};
    return {val: '', ok: false, miss};
  },
  /* ---------- criterii de diagnostic: logică cu 3 valori (true, false, null = încă necunoscut) ---------- */
  niceoa(sc, v) {
    const k = ['a45', 'act', 'st30'], miss = k.filter(x => !scHas(v[x])).length;
    if (k.some(x => v[x] === '0')) return {big: 'Criteriile NICE nu sunt îndeplinite', ok: true, miss: 0, band: {t: 'Regula NICE de diagnostic fără imagistică nu se aplică', c: 'info'}, bandSrc: 'NICE NG226'};
    if (miss) return {val: '', ok: false, miss};
    return {big: 'Artroză, diagnostic clinic', ok: true, miss: 0, band: {t: 'Imagistica nu este necesară, în lipsa semnelor atipice', c: 'info'}, bandSrc: 'NICE NG226'};
  },
  acrhip(sc, v) {
    const yn = k => v[k] === '1' ? true : v[k] === '0' ? false : null;
    const num = k => scHas(v[k]) && v[k] !== 'x' && isFinite(+v[k]) ? +v[k] : null;
    const and = a => a.some(x => x === false) ? false : a.every(x => x === true) ? true : null;
    const or = a => a.some(x => x === true) ? true : a.every(x => x === false) ? false : null;
    const ri = num('ri'), age = num('age'), esr = num('esr'), fl = num('flex');
    const riLow = ri == null ? null : ri < 15;
    const esrOk = esr != null ? esr <= 45 : v.esr === 'x' ? (fl == null ? null : fl <= 115) : null;
    const b1 = and([riLow, esrOk]), b2 = and([riLow == null ? null : !riLow, yn('ripain'), yn('stiff'), age == null ? null : age > 50]);
    const pain = yn('pain'), clin = and([pain, or([b1, b2])]);
    const noRx = v.osteo === 'x' && v.jsn === 'x';
    const c3 = [esr != null ? esr < 20 : v.esr === 'x' ? false : null, v.osteo === 'x' ? false : yn('osteo'), v.jsn === 'x' ? false : yn('jsn')];
    const pos = c3.filter(x => x === true).length, unk = c3.filter(x => x == null).length;
    const rx = noRx ? 'na' : and([pain, pos >= 2 ? true : pos + unk < 2 ? false : null]);
    const txt = x => x === true ? 'îndeplinite' : x === false ? 'neîndeplinite' : x === 'na' ? 'nu se aplică fără radiografie' : 'încă incomplete';
    const parts = [['Criteriile clinice', txt(clin)], ['Criteriile cu radiografie', txt(rx)]];
    const notes = ['Clinice: sensibilitate 86%, specificitate 75%. Cu radiografie: 89% și 91%. Sunt criterii de clasificare, nu un test diagnostic.'];
    const need = [];
    if (pain == null) need.push('durerea');
    if (clin == null && pain !== false) {
      if (ri == null) need.push('rotația internă');
      else if (riLow) { if (esr == null && v.esr !== 'x') need.push('VSH'); else if (esr == null && fl == null) need.push('flexia'); }
      else { if (yn('ripain') == null) need.push('durerea la rotația internă'); if (yn('stiff') == null) need.push('redoarea'); if (age == null) need.push('vârsta'); }
    }
    if (rx == null && pain !== false) { if (esr == null && v.esr !== 'x' && need.indexOf('VSH') < 0) need.push('VSH'); if (!scHas(v.osteo)) need.push('osteofitele'); if (!scHas(v.jsn)) need.push('îngustarea spațiului articular'); }
    if (need.length) notes.unshift('De completat: ' + need.join(', ') + '.');
    const met = [clin === true ? 'criteriile clinice' : '', rx === true ? 'criteriile cu radiografie' : ''].filter(Boolean);
    if (met.length) return {big: 'Clasificat ca artroză de șold', ok: true, miss: 0, parts, notes, band: {t: 'Îndeplinite: ' + met.join(' și '), c: 'info'}, bandSrc: 'Altman 1991'};
    if (clin === false && (rx === false || rx === 'na')) return {big: 'Criteriile ACR nu sunt îndeplinite', ok: true, miss: 0, parts, notes, band: {t: 'Niciun set de criterii nu este îndeplinit', c: 'info'}, bandSrc: 'Altman 1991'};
    const any = Object.keys(v).length;
    return any ? {big: 'Încă nedecis', ok: false, miss: need.length, parts, notes} : {val: '', ok: false, miss: need.length};
  },
  warwick(sc, v) {
    const k = ['sym', 'sign', 'img'], miss = k.filter(x => !scHas(v[x])).length, lab = {sym: 'simptomele', sign: 'semnele clinice', img: 'imagistica'};
    const no = k.filter(x => v[x] === '0');
    if (no.length) return {big: 'Criteriile nu sunt îndeplinite', ok: true, miss: 0, band: {t: 'Lipsesc: ' + no.map(x => lab[x]).join(', '), c: 'info'}, bandSrc: 'acordul Warwick'};
    if (miss) return {val: '', ok: false, miss};
    return {big: 'Sindrom de impingement femuroacetabular', ok: true, miss: 0, band: {t: 'Toate cele 3 componente sunt prezente', c: 'info'}, bandSrc: 'acordul Warwick'};
  },
  hmicrit(sc, v) {
    const its = scItems(sc), cnt = {h: 0, e: 0, i: 0}, pot = {h: 0, e: 0, i: 0};
    let maj = 0, pmaj = 0, miss = 0;
    its.forEach(it => { const a = v[it.id]; if (a === '1') { cnt[it.col]++; if (it.maj) maj++; } if (a !== '0') { pot[it.col]++; if (it.maj) pmaj++; } if (!scHas(a)) miss++; });
    const tot = cnt.h + cnt.e + cnt.i, met = maj >= 6 && cnt.h >= 4 && cnt.e >= 4 && cnt.i >= 4, could = pmaj >= 6 && pot.h >= 4 && pot.e >= 4 && pot.i >= 4;
    const parts = [['Factori majori', maj + ' (minimum 6)'], ['Istoric', cnt.h + ' (minimum 4)'], ['Examen', cnt.e + ' (minimum 4)'], ['Imagistică și artroscopie', cnt.i + ' (minimum 4)'], ['Total', tot + ' (minimum 12)']];
    const notes = ['Criterii de consens, nevalidate; autorii scriu că pot supradiagnostica.'];
    if (met) return {big: 'Criteriile de consens sunt îndeplinite', ok: true, miss: 0, parts, notes, band: {t: 'Microinstabilitate de șold, după consensul din 2023', c: 'info'}, bandSrc: 'Khanduja 2023'};
    if (!could) return {big: 'Criteriile nu sunt îndeplinite', ok: true, miss: 0, parts, notes, band: {t: miss ? 'Nu se mai pot îndeplini, oricare ar fi răspunsurile rămase' : 'Pragurile nu sunt atinse', c: 'info'}, bandSrc: 'Khanduja 2023'};
    return miss === its.length ? {val: '', ok: false, miss} : {big: 'Încă nedecis', ok: false, miss, parts, notes};
  }
};
const cr3 = {
  yn: (v, k) => v[k] === '1' ? true : v[k] === '0' ? false : null,
  num: (v, k) => scHas(v[k]) && v[k] !== 'x' && isFinite(+v[k]) ? +v[k] : null,
  and: a => a.some(x => x === false) ? false : a.every(x => x === true) ? true : null,
  or: a => a.some(x => x === true) ? true : a.every(x => x === false) ? false : null,
  atl: (a, n) => { const y = a.filter(x => x === true).length, u = a.filter(x => x == null).length; return y >= n ? true : y + u < n ? false : null; },
  txt: x => x === true ? 'îndeplinite' : x === false ? 'neîndeplinite' : x === 'na' ? 'nu se aplică' : 'încă incomplete',
  miss: (sc, v, skip) => scItems(sc).filter(it => !it.cb && (!skip || skip.indexOf(it.id) < 0) && !scHas(v[it.id])).length
};
/* suma punctelor: itemii fără răspuns adaugă minimul lor (lo) și maximul lor (hi) */
function crRange(sc, v, skip) {
  let lo = 0, hi = 0, s = 0, miss = 0;
  scItems(sc).forEach(it => {
    if (it.num || it.cb || (skip && skip.indexOf(it.id) >= 0)) return;
    const os = scOpts(it), a = v[it.id], o = scHas(a) ? os.find(x => x.v === a) : null;
    if (o) { lo += o.p; hi += o.p; s += o.p; } else { miss++; lo += Math.min.apply(null, os.map(x => x.p)); hi += Math.max.apply(null, os.map(x => x.p)); }
  });
  return {lo, hi, s, miss};
}
const crDone = miss => miss ? 'Cu ' + plural(miss, 'item fără răspuns', 'itemi fără răspuns') + ': rezultatul nu se mai schimbă.' : '';
Object.assign(SC_CALC, {
  acrknee(sc, v) {
    const yn = k => cr3.yn(v, k), age = cr3.num(v, 'age'), esr = cr3.num(v, 'esr');
    const a50 = age == null ? null : age > 50, pain = yn('pain');
    const clin = [a50, yn('stiff'), yn('crep'), yn('bten'), yn('benl'), yn('warm')];
    const lab = [esr != null ? esr < 40 : v.esr === 'x' ? false : null, v.rf === 'x' ? false : yn('rf'), v.sf === 'x' ? false : yn('sf')];
    const c1 = cr3.and([pain, cr3.atl(clin, 3)]);
    const c2 = v.esr === 'x' && v.rf === 'x' && v.sf === 'x' ? 'na' : cr3.and([pain, cr3.atl(clin.concat(lab), 5)]);
    const c3 = v.osteo === 'x' ? 'na' : cr3.and([pain, yn('osteo'), cr3.or([a50, yn('stiff'), yn('crep')])]);
    const parts = [['Criteriile clinice', cr3.txt(c1)], ['Clinice cu laborator', cr3.txt(c2)], ['Clinice cu radiografie', cr3.txt(c3)]];
    const notes = ['Clinice: sensibilitate 95%, specificitate 69%. Cu laborator: 92% și 75%. Cu radiografie: 91% și 86%. Sunt criterii de clasificare, nu un test diagnostic.'];
    const met = [c1 === true ? 'criteriile clinice' : '', c2 === true ? 'criteriile cu laborator' : '', c3 === true ? 'criteriile cu radiografie' : ''].filter(Boolean);
    if (met.length) return {big: 'Clasificat ca gonartroză', ok: true, miss: 0, parts, notes, band: {t: 'Îndeplinite: ' + met.join(', '), c: 'info'}, bandSrc: 'Altman 1986'};
    if ([c1, c2, c3].every(x => x === false || x === 'na')) return {big: 'Criteriile ACR nu sunt îndeplinite', ok: true, miss: 0, parts, notes, band: {t: 'Niciun set de criterii nu este îndeplinit', c: 'info'}, bandSrc: 'Altman 1986'};
    const miss = cr3.miss(sc, v);
    return Object.keys(v).length ? {big: 'Încă nedecis', ok: false, miss, parts, notes} : {val: '', ok: false, miss};
  },
  acrhand(sc, v) {
    const yn = k => cr3.yn(v, k), pain = yn('pain'), hte = yn('hte'), dip = yn('dip'), mcp = yn('mcp'), def = yn('def');
    const tree = cr3.and([pain, hte, mcp, cr3.or([dip, def])]), trad = cr3.and([pain, cr3.atl([hte, dip, mcp, def], 3)]);
    const parts = [['Arborele de clasificare', cr3.txt(tree)], ['Formatul tradițional', cr3.txt(trad)]];
    const notes = ['Arborele: sensibilitate 92%, specificitate 98%. Formatul tradițional: 94% și 87%.'];
    const met = [tree === true ? 'arborele de clasificare' : '', trad === true ? 'formatul tradițional' : ''].filter(Boolean);
    if (met.length) return {big: 'Clasificat ca artroză a mâinii', ok: true, miss: 0, parts, notes, band: {t: 'Îndeplinite: ' + met.join(' și '), c: 'info'}, bandSrc: 'Altman 1990'};
    if (tree === false && trad === false) return {big: 'Criteriile ACR nu sunt îndeplinite', ok: true, miss: 0, parts, notes, band: {t: 'Niciun format nu este îndeplinit', c: 'info'}, bandSrc: 'Altman 1990'};
    const miss = cr3.miss(sc, v);
    return Object.keys(v).length ? {big: 'Încă nedecis', ok: false, miss, parts, notes} : {val: '', ok: false, miss};
  },
  cts6(sc, v) {
    const r = crRange(sc, v); if (r.miss === 6) return {val: '', ok: false, miss: 6};
    const f = x => scN(x, 1), notes = ['Față de electrodiagnostic, pragul de 12: sensibilitate 89%, specificitate 80%, LR+ 4,5, LR− 0,14 (Fowler 2014). Pragul de 18: specificitate 99%, sensibilitate 31% (Wang 2018). Valorile vin dintr-o sursă secundară (AAFP 2024).'];
    const hiP = r.lo >= 12, loP = r.hi < 12;
    if (!hiP && !loP) return {val: f(r.s), max: '26', ok: false, miss: r.miss, notes: ['Intervalul posibil: ' + f(r.lo) + '-' + f(r.hi) + '.'].concat(notes)};
    return {val: f(r.s), max: '26', sub: crDone(r.miss), ok: true, miss: r.miss, notes, band: hiP ? {t: 'Probabilitate mare de sindrom de tunel carpian (12 sau peste)', c: 'info'} : {t: 'Sub pragul de 12', c: 'info'}, bandSrc: 'Graham 2008, Fowler 2014'};
  },
  caspar(sc, v) {
    const ent = cr3.yn(v, 'ent'), r = crRange(sc, v, ['ent']);
    if (ent === false) return {big: 'Criteriile CASPAR nu se aplică', ok: true, miss: 0, band: {t: 'Lipsește boala articulară inflamatorie', c: 'info'}, bandSrc: 'Taylor 2006'};
    if (ent == null && r.miss === 5) return {val: '', ok: false, miss: 6};
    const pts = r.lo >= 3 ? true : r.hi < 3 ? false : null, met = cr3.and([ent, pts]);
    const parts = [['Boală articulară inflamatorie', ent ? 'da' : '?'], ['Puncte', r.s + ' din 6' + (r.miss ? ' (' + plural(r.miss, 'categorie', 'categorii') + ' fără răspuns)' : '')]];
    const notes = ['Sensibilitate 91,4%, specificitate 98,7%.'];
    if (met === true) return {val: String(r.s), max: '6', sub: crDone(r.miss), ok: true, miss: r.miss, parts, notes, band: {t: 'Clasificat ca artrită psoriazică (3 puncte sau peste)', c: 'info'}, bandSrc: 'Taylor 2006'};
    if (met === false) return {val: String(r.s), max: '6', sub: crDone(r.miss), ok: true, miss: r.miss, parts, notes, band: {t: 'Sub 3 puncte: criteriile nu sunt îndeplinite', c: 'info'}, bandSrc: 'Taylor 2006'};
    return {val: String(r.s), max: '6', ok: false, miss: r.miss + (ent == null ? 1 : 0), parts, notes};
  },
  ra2010(sc, v) {
    const tgt = cr3.yn(v, 'tgt'), r = crRange(sc, v, ['tgt']);
    if (tgt === false) return {big: 'Criteriile nu se aplică', ok: true, miss: 0, band: {t: 'Lipsește sinovita clinică sigură, neexplicată de altă boală', c: 'info'}, bandSrc: 'Aletaha 2010'};
    if (tgt == null && r.miss === 4) return {val: '', ok: false, miss: 5};
    const pts = r.lo >= 6 ? true : r.hi < 6 ? false : null, met = cr3.and([tgt, pts]);
    const notes = ['Sub 6 puncte, statusul se poate reevalua: criteriile se pot îndeplini cumulativ în timp.'];
    if (met === true) return {val: String(r.s), max: '10', sub: crDone(r.miss), ok: true, miss: r.miss, band: {t: 'Poliartrită reumatoidă sigură (6 puncte sau peste)', c: 'info'}, bandSrc: 'Aletaha 2010'};
    if (met === false) return {val: String(r.s), max: '10', sub: crDone(r.miss), ok: true, miss: r.miss, notes, band: {t: 'Sub 6 puncte: nu se clasifică acum ca poliartrită reumatoidă', c: 'info'}, bandSrc: 'Aletaha 2010'};
    return {val: String(r.s), max: '10', ok: false, miss: r.miss + (tgt == null ? 1 : 0), notes: ['Intervalul posibil: ' + r.lo + '-' + r.hi + '.']};
  },
  gout15(sc, v) {
    const ent = cr3.yn(v, 'ent');
    if (ent === false) return {big: 'Criteriile nu se aplică', ok: true, miss: 0, band: {t: 'Lipsește criteriul de intrare', c: 'info'}, bandSrc: 'Neogi 2015'};
    if (v.msu === '1') return ent ? {big: 'Gută', ok: true, miss: 0, band: {t: 'Criteriul suficient: cristale de urat', c: 'info'}, bandSrc: 'Neogi 2015'} : {big: 'Gută, dacă este îndeplinit criteriul de intrare', ok: false, miss: 1};
    const r = crRange(sc, v, ['ent']), ua = cr3.num(v, 'ua');
    const up = ua == null ? null : ua < 4 ? -4 : ua < 6 ? 0 : ua < 8 ? 2 : ua < 10 ? 3 : 4;
    const lo = r.lo + (up == null ? -4 : up), hi = r.hi + (up == null ? 4 : up), s = r.s + (up || 0), miss = r.miss + (up == null ? 1 : 0);
    if (ent == null && miss === 10) return {val: '', ok: false, miss: 11};
    const parts = [['Acid uric', up == null ? '?' : scN(ua, 1) + ' mg/dL: ' + up + ' puncte']], notes = ['Sensibilitate 92%, specificitate 89%.'];
    if (!scHas(v.msu)) notes.unshift('Dacă se găsesc cristale de urat, criteriul suficient decide singur.');
    const pts = lo >= 8 ? true : hi < 8 ? false : null, met = cr3.and([ent, pts]);
    if (met === true) return {val: String(s), max: '23', sub: crDone(miss), ok: true, miss, parts, notes, band: {t: 'Clasificat ca gută (8 puncte sau peste)', c: 'info'}, bandSrc: 'Neogi 2015'};
    if (met === false && scHas(v.msu)) return {val: String(s), max: '23', sub: crDone(miss), ok: true, miss, parts, notes, band: {t: 'Sub 8 puncte: criteriile nu sunt îndeplinite', c: 'info'}, bandSrc: 'Neogi 2015'};
    return {val: String(s), max: '23', ok: false, miss: miss + (ent == null ? 1 : 0), parts, notes: ['Intervalul posibil: ' + lo + '-' + hi + '.'].concat(notes)};
  },
  fm2016(sc, v) {
    const R = [['jl', 'sgl', 'ual', 'lal'], ['jr', 'sgr', 'uar', 'lar'], ['hl', 'ull', 'lll'], ['hr', 'ulr', 'llr'], ['neck', 'ub', 'lb', 'chest', 'abd']], EX = ['jl', 'jr', 'chest', 'abd'];
    const on = k => v[k] === '1', wpi = R.reduce((s, r) => s + r.filter(on).length, 0), regs = R.filter(r => r.some(k => on(k) && EX.indexOf(k) < 0)).length;
    const SK = [['fat', 3], ['wak', 3], ['cog', 3], ['head', 1], ['abdp', 1], ['dep', 1]];
    const sss = SK.reduce((s, [k]) => s + (scHas(v[k]) ? +v[k] : 0), 0), sssHi = sss + SK.reduce((s, [k, m]) => s + (scHas(v[k]) ? 0 : m), 0);
    const miss = SK.filter(([k]) => !scHas(v[k])).length + (scHas(v.dur) ? 0 : 1);
    if (!Object.keys(v).length) return {val: '', ok: false, miss};
    const c1f = x => (wpi >= 7 && x >= 5) || (wpi >= 4 && wpi <= 6 && x >= 9);
    const c1 = c1f(sss) ? true : !c1f(sssHi) ? false : null, c2 = regs >= 4, c3 = cr3.yn(v, 'dur');
    const parts = [['Indicele durerii generalizate (WPI)', wpi + ' din 19'], ['Severitatea simptomelor (SSS)', (sssHi > sss ? 'cel puțin ' : '') + sss + ' din 12'], ['Regiuni cu durere', regs + ' din 5 (minimum 4)'], ['Scorul de severitate a fibromialgiei (WPI + SSS)', (sssHi > sss ? 'cel puțin ' : '') + (wpi + sss) + ' din 31']];
    const no = miss ? [] : [c1 === false ? 'WPI și SSS sub praguri' : '', !c2 ? 'durerea nu este generalizată (sub 4 regiuni)' : ''].filter(Boolean);
    if (c3 === false) no.push('durata sub 3 luni');
    if (no.length) return {big: 'Criteriile 2016 nu sunt îndeplinite', ok: true, miss: 0, parts, band: {t: 'Lipsesc: ' + no.join('; '), c: 'info'}, bandSrc: 'Wolfe 2016'};
    if (miss === 0 && c1 && c2 && c3) return {big: 'Fibromialgie: criteriile 2016 sunt îndeplinite', ok: true, miss: 0, parts, band: {t: 'Diagnosticul este valid indiferent de alte diagnostice', c: 'info'}, bandSrc: 'Wolfe 2016'};
    return {big: 'Încă nedecis', ok: false, miss, parts};
  },
  budapest(sc, v) {
    const yn = k => cr3.yn(v, k), S = ['s1', 's2', 's3', 's4'].map(yn), E = ['e1', 'e2', 'e3', 'e4'].map(yn);
    const A = yn('a'), B = cr3.atl(S, 3), C = cr3.atl(E, 2), D = yn('d'), full = cr3.and([A, B, C, D]);
    const n = a => a.filter(x => x === true).length + ' din 4' + (a.some(x => x == null) ? ' (incomplet)' : '');
    const parts = [['A. Durere disproporționată', A == null ? '?' : A ? 'da' : 'nu'], ['B. Categorii cu simptome', n(S) + ', minimum 3'], ['C. Categorii cu semne', n(E) + ', minimum 2'], ['D. Fără alt diagnostic mai bun', D == null ? '?' : D ? 'da' : 'nu']];
    const miss = cr3.miss(sc, v), src = 'IASP, adaptarea Valencia 2021';
    if (!Object.keys(v).length) return {val: '', ok: false, miss};
    if (full === true) {
      const nv = yn('nerve');
      return {big: nv === true ? 'SDRC tip II' : nv === false ? 'SDRC tip I' : 'SDRC', ok: true, miss: 0, parts, band: {t: 'Criteriile IASP (Budapesta) sunt îndeplinite' + (nv == null ? '; tipul depinde de leziunea de nerv' : ''), c: 'info'}, bandSrc: src};
    }
    if (full === false) {
      const pv = yn('prev'), any = S.concat(E, [A]).some(x => x === true);
      if (pv === true) return {big: 'SDRC cu remisiunea unor elemente', ok: true, miss: 0, parts, band: {t: 'Criteriile au fost îndeplinite anterior, dar acum nu complet', c: 'info'}, bandSrc: src};
      if (D === false) return {big: 'Criteriile nu sunt îndeplinite', ok: true, miss: 0, parts, band: {t: 'Alt diagnostic explică mai bine tabloul', c: 'info'}, bandSrc: src};
      if (pv === false && D === true) return any ? {big: 'SDRC fără altă specificare (NOS)', ok: true, miss: 0, parts, band: {t: 'Unele elemente, dar nu toate; criteriile nu au fost îndeplinite niciodată', c: 'info'}, bandSrc: src}
        : {big: 'Criteriile nu sunt îndeplinite', ok: true, miss: 0, parts, band: {t: 'Niciun element de SDRC', c: 'info'}, bandSrc: src};
      return {big: 'Criteriile complete nu sunt îndeplinite', ok: false, miss, parts, notes: ['Pentru subtip, completați punctul D și dacă criteriile au fost îndeplinite anterior.']};
    }
    return {big: 'Încă nedecis', ok: false, miss, parts};
  },
  tlics(sc, v) {
    const r = crRange(sc, v); if (r.miss === 3) return {val: '', ok: false, miss: 3};
    if (r.miss) return {val: String(r.s), max: '10', ok: false, miss: r.miss, notes: ['Intervalul posibil: ' + r.lo + '-' + r.hi + '.']};
    const t = r.s, b = t <= 3 ? 'Tratament nechirurgical' : t === 4 ? 'Tratament chirurgical sau nechirurgical' : 'Tratament chirurgical';
    return {val: String(t), max: '10', ok: true, miss: 0, band: {t: b + ', după sistem', c: 'info'}, bandSrc: 'Vaccaro 2005'};
  },
  genant(sc, v) {
    const x = cr3.num(v, 'red'); if (x == null) return {val: '', ok: false, miss: 1};
    const g = x < 20 ? 0 : x < 25 ? 1 : x < 40 ? 2 : 3;
    return {big: 'Gradul ' + g, ok: true, miss: 0, band: {t: ['Normal, fără fractură', 'Fractură ușoară', 'Fractură moderată', 'Fractură severă'][g], c: 'info'}, notes: ['Pragurile sunt aproximative: circa 20%, 25% și 40%.'], bandSrc: 'Genant 1993'};
  },
  osteodx(sc, v) {
    const yn = k => cr3.yn(v, k), pop = yn('pop');
    if (pop === false) return {big: 'Criteriile T-score nu se aplică', ok: true, miss: 0, band: {t: 'La bărbații sub 50 de ani și la femeile înainte de menopauză se folosește Z-score; un Z-score scăzut poate cere investigații suplimentare', c: 'info'}, bandSrc: 'NOGG 2024'};
    if (!Object.keys(v).length) return {val: '', ok: false, miss: cr3.miss(sc, v)};
    const t = cr3.num(v, 'tsc'), noT = v.tsc === 'x';
    const who = noT ? 'na' : t == null ? null : t <= -2.5, low = t == null ? (noT ? false : null) : t > -2.5 && t < -1;
    const cat = t == null ? (noT ? 'fără DXA' : '?') : scN(t, 1) + ': ' + (t <= -2.5 ? 'osteoporoză' : t < -1 ? 'masă osoasă scăzută (osteopenie)' : 'normal');
    const mof = cr3.num(v, 'mof'), hp = cr3.num(v, 'hipr');
    const fm = mof != null ? mof >= 20 : v.mof === 'x' ? false : null, fh = hp != null ? hp >= 3 : v.hipr === 'x' ? false : null;
    const whoA = who === 'na' ? 'na' : cr3.and([pop, who]);
    const why = [[who === 'na' ? false : who, 'T-score de -2,5 sau mai mic'], [yn('hipfx'), 'fractură de șold după traumatism mic'], [cr3.and([low, yn('ofx')]), 'osteopenie cu fractură de fragilitate'], [fm, 'FRAX pentru fractura majoră de 20% sau peste'], [fh, 'FRAX pentru șold de 3% sau peste']];
    const nbha = cr3.and([pop, cr3.or(why.map(w => w[0]))]);
    const parts = [['T-score', cat], ['Criteriul densitometric (OMS, NOGG 2024)', cr3.txt(whoA)], ['Criteriile clinice NBHA (SUA)', cr3.txt(nbha)]];
    const notes = ['Diferența: NBHA (SUA) pune diagnosticul de osteoporoză și fără T-score de -2,5, după fracturi sau după FRAX; NOGG 2024 (Marea Britanie) folosește T-score-ul pentru diagnostic, iar FRAX pentru riscul de fractură și pragurile de intervenție.'];
    if (whoA === true) return {big: 'Osteoporoză (criteriul densitometric)', ok: true, miss: 0, parts, notes, band: {t: 'T-score de -2,5 sau mai mic', c: 'info'}, bandSrc: 'OMS; NOGG 2024'};
    if (nbha === true) return {big: 'Osteoporoză după criteriile clinice NBHA (SUA)', ok: true, miss: 0, parts, notes, band: {t: 'Motiv: ' + why.filter(w => w[0] === true).map(w => w[1]).join('; '), c: 'info'}, bandSrc: 'NBHA 2014'};
    if (nbha === false) return {big: 'Criteriile de osteoporoză nu sunt îndeplinite', ok: true, miss: 0, parts, notes, band: {t: 'T-score ' + cat, c: 'info'}, bandSrc: 'OMS; NBHA 2014'};
    return {big: 'Încă nedecis', ok: false, miss: cr3.miss(sc, v), parts, notes};
  },
  sosort(sc, v) {
    const a = cr3.num(v, 'age'), c = cr3.num(v, 'cobb'), parts = [];
    if (a == null && c == null) return {val: '', ok: false, miss: 2};
    if (a != null) parts.push(['După vârsta la diagnostic', a < 3 ? 'infantilă (0-2 ani)' : a < 10 ? 'juvenilă (3-9 ani)' : a < 18 ? 'a adolescentului (10-17 ani)' : 'a adultului (de la 18 ani)']);
    if (c == null) return {big: 'Introduceți unghiul Cobb', ok: false, miss: 1, parts};
    if (c <= 10) return {big: 'Sub pragul de scolioză', ok: true, miss: 0, parts, band: {t: 'Scolioza înseamnă peste 10° Cobb', c: 'info'}, bandSrc: 'Wong 2025'};
    const g = c <= 20 ? ['mică', 'până la 20°'] : c <= 35 ? ['moderată', '21-35°'] : c <= 40 ? ['moderată spre severă', '36-40°'] : c <= 50 ? ['severă', '41-50°'] : c <= 55 ? ['severă spre foarte severă', '51-55°'] : ['foarte severă', 'de la 56°'];
    parts.push(['După unghiul Cobb', g[0] + ' (' + g[1] + ')']);
    return {big: 'Scolioză, curbură ' + g[0], ok: a != null, miss: a == null ? 1 : 0, parts, band: {t: 'Peste 10° Cobb: ' + scN(c, 1) + '°', c: 'info'}, bandSrc: 'SOSORT 2016'};
  },
  ewgsop2(sc, v) {
    if (!Object.keys(v).length) return {val: '', ok: false, miss: cr3.miss(sc, v)};
    const sx = v.sex, n = k => cr3.num(v, k), X = k => v[k] === 'x', cut = (m, f) => sx === 'm' ? m : sx === 'f' ? f : null;
    const low = (k, test) => n(k) != null ? test(n(k)) : X(k) ? 'x' : null;
    const crit = a => a.some(x => x === true) ? true : a.some(x => x === false) ? false : a.every(x => x === 'x') ? 'nm' : null; /* un test măsurat ajunge */
    const sexLow = (k, m, f) => n(k) != null ? (cut(m, f) == null ? null : n(k) < cut(m, f)) : X(k) ? 'x' : null;
    const c1 = crit([sexLow('grip', 27, 16), low('chair', x => x > 15)]);
    const c2 = crit([sexLow('asm', 20, 15), sexLow('asmh', 7, 5.5)]);
    const c3 = crit([low('gait', x => x <= 0.8), low('sppb', x => x <= 8), low('tug', x => x >= 20), v.w400 === '1' ? true : v.w400 === '0' ? false : v.w400 === 'x' ? 'x' : null]);
    const tx = x => x === true ? 'scăzută' : x === false ? 'normală' : x === 'nm' ? 'nemăsurată' : '?';
    const parts = [['1. Forța musculară', tx(c1)], ['2. Masa musculară', tx(c2)], ['3. Performanța fizică', tx(c3)]], notes = [];
    if (!sx && (n('grip') != null || n('asm') != null || n('asmh') != null)) notes.push('Alegeți sexul: pragurile pentru forță și masă diferă.');
    const R = (big, t, ok) => ({big, ok, miss: ok ? 0 : cr3.miss(sc, v), parts, notes, band: t ? {t, c: 'info'} : null, bandSrc: 'EWGSOP2, Cruz-Jentoft 2019'});
    if (c1 === false) return R('Nu este sarcopenie', 'Forța musculară nu este scăzută', true);
    if (c1 !== true) return R(c1 === 'nm' ? 'Lipsește forța musculară' : 'Încă nedecis', c1 === 'nm' ? 'Măsurați forța de prehensiune sau ridicările de pe scaun' : '', false);
    if (c2 === false) { notes.push('Căutați și alte cauze ale forței scăzute, de exemplu depresia, AVC-ul, tulburările de echilibru sau boala vasculară periferică.'); return R('Sarcopenie probabilă, neconfirmată', 'Forță scăzută, masă musculară normală', true); }
    if (c2 !== true) return R('Sarcopenie probabilă', 'Forță scăzută; confirmarea cere masa musculară (DXA, BIA, CT sau RMN)', c2 === 'nm');
    if (c3 === true) return R('Sarcopenie severă', 'Forță și masă scăzute, performanță fizică scăzută', true);
    if (c3 === false) return R('Sarcopenie confirmată', 'Forță și masă scăzute; performanța fizică nu este scăzută', true);
    notes.push('Pentru severitate, măsurați performanța fizică.');
    return R('Sarcopenie confirmată', 'Forță și masă scăzute', c3 === 'nm');
  },
  wfalls(sc, v) {
    if (!Object.keys(v).length) return {val: '', ok: false, miss: cr3.miss(sc, v)};
    const yn = k => cr3.yn(v, k), entry = cr3.or([yn('f12'), yn('unst'), yn('worry')]), sev = cr3.or(['inj', 'two', 'frail', 'floor', 'loc'].map(yn));
    const gs = cr3.num(v, 'gs'), tg = cr3.num(v, 'tug'), g1 = gs == null ? null : gs <= 0.8, g2 = tg == null ? null : tg > 15;
    const gb = g1 === true || g2 === true ? true : g1 === false || g2 === false ? false : v.gs === 'x' && v.tug === 'x' ? 'nm' : null;
    const parts = [['Întrebările cheie', entry === true ? 'cel puțin un răspuns pozitiv' : entry === false ? 'toate negative' : '?'], ['Cădere gravă', sev === true ? 'da' : sev === false ? 'nu' : '?'], ['Mers și echilibru', gb === true ? 'afectate' : gb === false ? 'neafectate' : gb === 'nm' ? 'nemăsurate' : '?']];
    const notes = yn('loc') === true ? ['Suspiciunea de sincopă cere evaluarea și tratamentul sincopei.'] : [], src = 'World Falls 2022, figura 1';
    const low = () => ({big: 'Risc scăzut', ok: true, miss: 0, parts, notes: notes.concat(['Educație despre prevenirea căderilor; sfaturi pentru activitate fizică; reevaluare peste 1 an.']), band: {t: 'Obiectiv: prevenție primară', c: 'ok'}, bandSrc: src});
    if (entry === false) return low();
    if (entry === true && sev === true) return {big: 'Risc mare', ok: true, miss: 0, parts, notes: notes.concat(['Evaluare multifactorială a riscului de cădere; intervenții individualizate; urmărire la 30-90 de zile.']), band: {t: 'Obiectiv: prevenție secundară și tratament', c: 'bad'}, bandSrc: src};
    if (entry === true && sev === false) {
      if (gb === true) return {big: 'Risc intermediar', ok: true, miss: 0, parts, notes: notes.concat(['Exerciții individualizate de echilibru, mers și forță (trimitere la fizioterapeut); educație despre prevenirea căderilor; reevaluare peste 1 an.']), band: {t: 'Obiectiv: prevenție secundară', c: 'mid'}, bandSrc: src};
      if (gb === false) return low();
      if (gb === 'nm') return {big: 'Încă nedecis', ok: false, miss: 0, parts, notes: notes.concat(['Măsurați viteza de mers sau TUG.'])};
    }
    return {big: 'Încă nedecis', ok: false, miss: cr3.miss(sc, v), parts, notes};
  }
});
export function scCompute(sc, v) { return (SC_CALC[sc.calc] || scDefault)(sc, v || {}); }
export { scOpts, scItems, scHas, scN, scFold };