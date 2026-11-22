import { useEffect, useMemo, useState } from 'react';
import { api, useApp } from '../state';
import { loadBilet, type BiletData } from '../data/vademecum';

interface Inv { w: 'i' | 'a'; t: string; n: string; d: string; z: string; dr: string; x: string }
interface Form { v: Record<string, string>; sex: '' | 'm' | 'f'; neu: boolean; inv: Inv[] }
const empty = (): Form => ({ v: {}, sex: '', neu: false, inv: [] });

const num = (x: string | undefined) => {
  const n = parseFloat(String(x ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fmtDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('.') : '');

export function BiletTab() {
  const { t, patients, plan, procedures, settings, me } = useApp();
  const [D, setD] = useState<BiletData | null>(null);
  const [failed, setFailed] = useState(false);
  const [f, setF] = useState<Form>(empty());
  const [pat, setPat] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { loadBilet().then(setD).catch(() => setFailed(true)); }, []);

  // Salvare la pacient (dacă păstrarea este pornită în Setări): se încarcă la alegerea pacientului, se salvează automat după o pauză.
  const canSave = !!pat && settings.keep_documents && !!me && me.role !== 'scheduler';
  const [saved, setSaved] = useState<'' | 'loading' | 'saving' | 'saved' | 'error'>('');
  const [loadedFor, setLoadedFor] = useState('');
  useEffect(() => {
    setLoadedFor('');
    if (!pat || !canSave) { setSaved(''); return; }
    let live = true;
    setSaved('loading');
    api.getDocument(pat, 'bilet').then((doc) => {
      if (!live) return;
      const d = doc?.data as Partial<Form> | undefined;
      setF(d ? { v: d.v ?? {}, sex: d.sex ?? '', neu: !!d.neu, inv: d.inv ?? [] } : empty());
      setLoadedFor(pat);
      setSaved(doc ? 'saved' : '');
    }).catch(() => { if (live) setSaved('error'); });
    return () => { live = false; };
  }, [pat, canSave]);
  useEffect(() => {
    if (!canSave || loadedFor !== pat) return;
    const id = setTimeout(() => {
      setSaved('saving');
      api.saveDocument(pat, 'bilet', f as unknown as Record<string, unknown>).then(() => setSaved('saved')).catch(() => setSaved('error'));
    }, 1200);
    return () => clearTimeout(id);
  }, [f, canSave, pat, loadedFor]);
  const removeSaved = async () => {
    if (!confirm(t('biDeleteSaved') + '?')) return;
    try { await api.deleteDocument(pat, 'bilet'); setF(empty()); setSaved(''); setLoadedFor(''); setTimeout(() => setLoadedFor(pat), 0); } catch { setSaved('error'); }
  };

  const procNames = useMemo(() => {
    if (!pat) return '';
    const ids = plan.filter((p) => p.patient_id === pat).map((p) => p.procedure_id);
    return [...new Set(ids.map((id) => procedures.find((x) => x.id === id)?.name).filter(Boolean))].join(', ');
  }, [pat, plan, procedures]);

  if (failed) return <p className="alert">{t('guidesLoadError')}</p>;
  if (!D) return <p className="muted">{t('loading')}</p>;
  const GAP = D.BI_GAP;

  const defs: Record<string, string> = {
    alerg: 'Nu se cunoaște cu alergii alimentare sau medicamentoase.', evo: 'favorabilă', stare: 'ameliorată',
    procs: procNames, las: 'neg', pat: 'neg',
  };
  D.BI_GEN.forEach(([k, , v]) => { defs[k] = v; });
  D.BI_LOCO.forEach(([k, , v]) => { defs['l_' + k] = v; });
  D.BI_REC.forEach(([k, v, on]) => { defs[k] = v; defs[k + 'on'] = on ? '1' : ''; });
  const val = (k: string) => (f.v[k] != null ? f.v[k] : defs[k] ?? '');
  const g = (k: string) => val(k).trim();
  const set = (k: string, x: string) => setF((s) => ({ ...s, v: { ...s.v, [k]: x } }));

  const sx = (m: string, fe: string, x: string) => (f.sex === 'f' ? fe : f.sex === 'm' ? m : x);
  const fill = (s: string) => s.replace('{ORI}', sx('orientat', 'orientată', 'orientat(ă)')).replace('{PROG}', GAP).replace('{CR}', g('medcr') || GAP);
  const imc = (() => {
    const G = num(val('G')); let I = num(val('I'));
    if (!G || !I) return '';
    if (I > 3) I /= 100;
    const x = G / (I * I);
    return x > 8 && x < 90 ? (Math.round(x * 10) / 10).toFixed(1).replace('.', ',') : '';
  })();
  const lasTxt = () => {
    const v = val('las'), d = g('lasD') || GAP, s = g('lasS') || GAP;
    return v === 'neg' ? 'Lasègue negativ bilateral' : v === 'd' ? `Lasègue pozitiv în dreapta la ${d}°` : v === 's' ? `Lasègue pozitiv în stânga la ${s}°`
      : v === 'b' ? `Lasègue pozitiv bilateral (în dreapta la ${d}°, în stânga la ${s}°)` : '';
  };
  const patTxt = () => {
    const v = val('pat');
    return v === 'neg' ? 'test Patrick negativ bilateral' : v === 'd' ? 'test Patrick pozitiv în dreapta' : v === 's' ? 'test Patrick pozitiv în stânga' : v === 'b' ? 'test Patrick pozitiv bilateral' : '';
  };
  const segTxt = (k: string) => {
    const x = g('l_' + k).replace(/\.$/, '');
    if (k === 'lomb') return [lasTxt(), 'test Schober ' + (g('sch') || GAP + '/15 cm'), x].filter(Boolean).join(', ');
    if (k === 'sold') return [patTxt(), x].filter(Boolean).join(', ');
    return x;
  };
  const invLine = (x: Inv) => {
    const T = (D.BI_INV.find((z) => z[0] === x.t) ?? D.BI_INV[4])[1];
    const d = x.d ? fmtDate(x.d) : 'ZZ.LL.AAAA';
    const meta = [d].concat(x.t === 'rx' ? ['doză de iradiere: ' + (x.z.trim() || GAP) + ' µGy×m²'] : []).concat(x.t !== 'bio' && x.dr.trim() ? [x.dr.trim()] : []);
    const name = x.t === 'alt' ? (x.n.trim() || 'Investigație') : T + (x.n.trim() ? ' ' + x.n.trim() : '');
    return `${name} (${meta.join(', ')}): ${x.x.trim() || GAP}`;
  };

  const text = (() => {
    const gap = (x: string) => x || GAP;
    const pac = sx('Pacient', 'Pacientă', 'Pacient(ă)'), cun = sx('cunoscut', 'cunoscută', 'cunoscut(ă)');
    const L: string[] = [];
    let a = `${pac} în vârstă de ${gap(g('age'))} ani${g('known') ? ', ' + cun + ' cu ' + g('known') : ''}, se prezintă în serviciul nostru `;
    a += g('pmot') ? g('pmot').replace(/\.$/, '') + '.' : `acuzând durere cu caracter ${gap(g('pch'))} la nivelul ${gap(g('ploc'))}${g('pirad') ? ', cu iradiere ' + g('pirad') : ''}.`;
    a += ` Simptomatologia a debutat în urmă cu ${gap(g('debut'))}${g('evol') ? ', ' + g('evol').replace(/\.$/, '') : ''}.`;
    a += ` Antecedente personale patologice: ${gap(g('app'))}${g('chir') ? '; intervenții chirurgicale: ' + g('chir') : ''}${f.sex === 'f' && g('gin') ? '; antecedente ginecologice: ' + g('gin') : ''}.`;
    if (g('alerg')) a += ' ' + g('alerg').replace(/\.?$/, '.');
    if (g('tox')) a += ` Toxice: ${g('tox').replace(/\.$/, '')}.`;
    if (g('medcr')) a += ` Medicație cronică: ${g('medcr').replace(/\.$/, '')}.`;
    a += ` La internare, durere cu intensitatea ${gap(g('vasI'))}/10 pe scala VAS.`;
    L.push(a);
    const gen: Record<string, string> = {};
    D.BI_GEN.forEach(([k]) => { gen[k] = fill(g(k)).replace(/\.$/, ''); });
    L.push(`Examen obiectiv general: G = ${gap(g('G'))} kg, Î = ${gap(g('I'))} m, IMC = ${gap(imc)} kg/m²; ${gen.teg}. Aparat respirator: ${gen.resp}. Aparat cardiovascular: TA = ${gap(g('ta'))} mmHg, AV = ${gap(g('av'))}/min, ${gen.cv}. Aparat digestiv: ${gen.dig}. Aparat urogenital: ${gen.ug}. SNC: ${gen.snc}.`);
    L.push('Examen obiectiv aparat locomotor: ' + D.BI_LOCO.map(([k, lab]) => `${lab}: ${gap(segTxt(k))}`).join('; ') + '.');
    if (f.neu) {
      L.push('Examen neurologic: ' + D.BI_NEUF.map(([k, , ll]) => {
        const x = g(k).replace(/\.$/, '');
        return !x && !D.BI_NEU.some((z) => z[0] === k) ? '' : (ll ? ll + ': ' : '') + gap(x);
      }).filter(Boolean).join('; ') + '.');
    }
    ([['i', 'INVESTIGAȚII EFECTUATE PE PERIOADA INTERNĂRII'], ['a', 'INVESTIGAȚII EFECTUATE ANTERIOR INTERNĂRII']] as const).forEach(([w, title]) => {
      const l = f.inv.filter((x) => x.w === w);
      if (!l.length) return;
      if (w === 'a') l.sort((x, y) => (y.d < x.d ? -1 : y.d > x.d ? 1 : 0));
      L.push(title);
      l.forEach((x) => L.push(invLine(x)));
    });
    L.push(`Pe parcursul internării a urmat tratament cu ${gap(g('trat'))}, asociat unui program de fiziokinetoterapie${g('procs') ? ' (' + g('procs') + ')' : ''}, cu evoluție ${gap(g('evo'))} (VAS la externare: ${gap(g('vasE'))}/10). Se externează în stare ${gap(g('stare'))}, cu recomandări:`);
    let n = 0;
    D.BI_REC.forEach(([k]) => { if (val(k + 'on') !== '1') return; const x = fill(g(k)); if (x) L.push(`${++n}. ${x}`); });
    return L.join('\n');
  })();

  const MISS: [string, string][] = [['age', 'vârsta'], ['vasI', 'VAS la internare'], ['G', 'greutatea'], ['I', 'înălțimea'], ['ta', 'TA'], ['av', 'AV'],
    ['app', 'antecedentele personale patologice'], ['debut', 'debutul'], ['vasE', 'VAS la externare'], ['trat', 'tratamentul din internare']];
  const missing = MISS.filter(([k]) => !g(k)).map((x) => x[1]);
  if (!g('pmot') && (!g('pch') || !g('ploc'))) missing.push('durerea (caracterul și localizarea)');
  const gaps = (text.match(/…/g) ?? []).length;

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMsg(t('scCopied')); } catch { setMsg(t('scCopyFail')); }
  };
  const print = () => {
    const w = window.open('', '_blank');
    if (!w) { setMsg(t('scCopyFail')); return; }
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    w.document.write(`<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><title>Bilet de ieșire</title><style>body{font:12pt/1.45 serif;margin:18mm}p{margin:0 0 8pt;white-space:pre-wrap}</style></head><body><h2>Bilet de ieșire</h2><p>${esc(text)}</p></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const ta = (k: string, label: string, rows = 2) => (
    <label key={k} className="bi-f">
      <span>{label}</span>
      <textarea rows={rows} value={val(k)} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const inp = (k: string, label: string, w = '8rem', ph?: string) => (
    <label key={k} className="bi-f">
      <span>{label}</span>
      <input type="text" style={{ width: w }} value={val(k)} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const addInv = (w: 'i' | 'a', tp: string) => setF((s) => ({ ...s, inv: [...s.inv, { w, t: tp, n: '', d: '', z: '', dr: '', x: '' }] }));
  const upInv = (i: number, key: keyof Inv, x: string) => setF((s) => ({ ...s, inv: s.inv.map((y, j) => (j === i ? { ...y, [key]: x } : y)) }));

  return (
    <div>
      <p className="note-box">{t('biIntro')}</p>
      <label>
        <span>{t('biPatient')}</span>
        <select value={pat} onChange={(e) => setPat(e.target.value)}>
          <option value="">{t('biNoPatient')}</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.code}{p.diagnosis ? ', ' + p.diagnosis : ''}</option>)}
        </select>
      </label>

      <div className="sc-cols">
        <form className="sc-form" onSubmit={(e) => e.preventDefault()}>
          <details className="vg" open>
            <summary>1. Anamneza</summary>
            <fieldset className="sc-it">
              <legend>Sexul</legend>
              <div className="sc-opts">
                {([['', 'nespecificat'], ['m', 'masculin'], ['f', 'feminin']] as const).map(([k, l]) => (
                  <label key={k} className={'sc-o' + (f.sex === k ? ' on' : '')}>
                    <input type="radio" name="bi-sex" checked={f.sex === k} onChange={() => setF((s) => ({ ...s, sex: k }))} /><span className="sc-ot">{l}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {inp('age', 'Vârsta (ani)', '5rem')}
            {ta('known', 'Boli asociate (cunoscut cu)')}
            {ta('pmot', 'Motivul prezentării, text liber (înlocuiește rubricile de mai jos)')}
            {inp('pch', 'Durere cu caracter', '14rem')}{inp('ploc', 'la nivelul', '14rem')}{inp('pirad', 'iradiere', '12rem')}
            {inp('debut', 'Debut, în urmă cu', '10rem')}{inp('evol', 'Evoluție de la debut', '14rem')}
            {ta('app', 'Antecedente personale patologice')}
            {ta('chir', 'Intervenții chirurgicale')}
            {f.sex === 'f' && ta('gin', 'Antecedente ginecologice')}
            {ta('alerg', 'Alergii')}{ta('tox', 'Toxice')}{ta('medcr', 'Medicație cronică')}
            {inp('vasI', 'VAS la internare (0-10)', '5rem')}
          </details>

          <details className="vg">
            <summary>2. Examen obiectiv general</summary>
            {inp('G', 'Greutate (kg)', '5rem')}{inp('I', 'Înălțime (m)', '5rem')}
            <p className="muted small">IMC calculat: {imc || '…'} kg/m²</p>
            {inp('ta', 'TA (mmHg)', '7rem')}{inp('av', 'AV (/min)', '5rem')}
            {D.BI_GEN.map(([k, lab]) => ta(k, lab))}
          </details>

          <details className="vg">
            <summary>3. Aparat locomotor</summary>
            {D.BI_LOCO.map(([k, lab]) => (
              <div key={k}>
                {k === 'lomb' && (
                  <>
                    <label><span>Lasègue</span>
                      <select value={val('las')} onChange={(e) => set('las', e.target.value)}>
                        {D.BI_LAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select></label>
                    {['d', 'b'].includes(val('las')) && inp('lasD', 'Unghi dreapta (°)', '5rem')}
                    {['s', 'b'].includes(val('las')) && inp('lasS', 'Unghi stânga (°)', '5rem')}
                    {inp('sch', 'Schober', '8rem', 'ex.: 10/14,5 cm')}
                  </>
                )}
                {k === 'sold' && (
                  <label><span>Patrick</span>
                    <select value={val('pat')} onChange={(e) => set('pat', e.target.value)}>
                      {D.BI_PAT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select></label>
                )}
                {ta('l_' + k, lab.charAt(0).toUpperCase() + lab.slice(1))}
              </div>
            ))}
          </details>

          <details className="vg">
            <summary>4. Examen neurologic</summary>
            <label className="sc-cb"><input type="checkbox" checked={f.neu} onChange={(e) => setF((s) => ({ ...s, neu: e.target.checked }))} /><span>Include examenul neurologic în bilet</span></label>
            {f.neu && D.BI_NEUF.map(([k, lab]) => ta(k, lab))}
          </details>

          <details className="vg">
            <summary>5. Investigații</summary>
            {(['i', 'a'] as const).map((w) => (
              <div key={w}>
                <h4>{w === 'i' ? 'Efectuate pe perioada internării' : 'Efectuate anterior internării'}</h4>
                {f.inv.map((x, i) => x.w !== w ? null : (
                  <fieldset className="sc-it" key={i}>
                    <legend>{(D.BI_INV.find((z) => z[0] === x.t) ?? D.BI_INV[4])[1]}</legend>
                    {x.t !== 'bio' && <label className="bi-f"><span>{x.t === 'alt' ? 'Denumirea' : 'Ce s-a făcut'}</span><input value={x.n} onChange={(e) => upInv(i, 'n', e.target.value)} /></label>}
                    <label className="bi-f"><span>Data</span><input type="date" value={x.d} onChange={(e) => upInv(i, 'd', e.target.value)} /></label>
                    {x.t === 'rx' && <label className="bi-f"><span>Doza (µGy×m²)</span><input value={x.z} onChange={(e) => upInv(i, 'z', e.target.value)} /></label>}
                    {x.t !== 'bio' && <label className="bi-f"><span>Medicul și parafa</span><input value={x.dr} onChange={(e) => upInv(i, 'dr', e.target.value)} /></label>}
                    <label className="bi-f"><span>Rezultat</span><textarea rows={2} value={x.x} onChange={(e) => upInv(i, 'x', e.target.value)} /></label>
                    <button type="button" className="btn sm" onClick={() => setF((s) => ({ ...s, inv: s.inv.filter((_, j) => j !== i) }))}>Șterge</button>
                  </fieldset>
                ))}
                <div className="row">{D.BI_INV.map(([k, lab]) => <button key={k} type="button" className="btn sm" onClick={() => addInv(w, k)}>+ {lab}</button>)}</div>
              </div>
            ))}
          </details>

          <details className="vg">
            <summary>6. Evoluție și recomandări</summary>
            {ta('trat', 'Tratament din internare')}{ta('procs', 'Proceduri de fiziokinetoterapie')}
            {inp('evo', 'Evoluție', '10rem')}{inp('vasE', 'VAS la externare (0-10)', '5rem')}{inp('stare', 'Stare la externare', '10rem')}
            <h4>Recomandări</h4>
            {D.BI_REC.map(([k]) => (
              <div key={k}>
                <label className="sc-cb"><input type="checkbox" checked={val(k + 'on') === '1'} onChange={(e) => set(k + 'on', e.target.checked ? '1' : '')} /><span>Include</span></label>
                {ta(k, '', 2)}
              </div>
            ))}
          </details>
        </form>

        <aside className="sc-res" aria-live="polite">
          <p className="muted small">Textul biletului</p>
          <pre className="bi-text">{text}</pre>
          {missing.length > 0 && <p className="muted small">De completat: {missing.join(', ')}.</p>}
          <p className="muted small">{gaps} locuri necompletate (…).</p>
          <div className="row">
            <button type="button" className="btn primary sm" onClick={copy}>{t('scCopy')}</button>
            <button type="button" className="btn sm" onClick={print}>Tipărește</button>
            <button type="button" className="btn sm" onClick={() => { if (confirm(t('scReset') + '?')) { setF(empty()); setMsg(''); } }}>{t('scReset')}</button>
          </div>
          {msg && <p className="muted small" role="status">{msg}</p>}
          <p className="muted small" role="status">
            {canSave
              ? saved === 'saving' ? t('biSaving') : saved === 'saved' ? t('biSaved') : saved === 'error' ? t('biSaveError') : saved === 'loading' ? t('loading') : t('biAutoSave')
              : t('biNote')}
          </p>
          {canSave && saved === 'saved' && <button type="button" className="btn sm" onClick={removeSaved}>{t('biDeleteSaved')}</button>}
        </aside>
      </div>
    </div>
  );
}
