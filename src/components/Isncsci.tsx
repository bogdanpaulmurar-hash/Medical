import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { scHas } from '../data/scaleEngine';
import { ISN_LIB as ISN_RAW } from '../data/isnLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ISN_LIB = ISN_RAW as any;

/* ISNCSCI: fișa de examinare și clasificarea cu algoritmul oficial (Praxis), ca în Vademecum MFR 3.0. */
const ISN_SL = ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S1', 'S2', 'S3', 'S4_5'];
const ISN_ML = ['C5', 'C6', 'C7', 'C8', 'T1', 'L2', 'L3', 'L4', 'L5', 'S1'];
const ISN_KEY: Record<string, string> = {
  C5: 'flexorii cotului', C6: 'extensorii pumnului', C7: 'extensorii cotului', C8: 'flexorii degetelor (falanga distală a mediusului)', T1: 'abductorii degetului mic',
  L2: 'flexorii șoldului', L3: 'extensorii genunchiului', L4: 'dorsiflexorii gleznei', L5: 'extensorul lung al halucelui', S1: 'flexorii plantari ai gleznei',
};
type V = Record<string, string>;
const isnLv = (l: string) => l.replace('_', '-');
const isnFmt = (s: unknown) => String(s == null ? '' : s).split(',').map((x) => x.replace('S4_5', 'S4-5')).join(' sau ');
const isnComp = (s: unknown) => String(s || '').split(',').map((x) => (x.charAt(0) === 'C' ? 'completă' : 'incompletă')).filter((x, k, a) => a.indexOf(x) === k).join(' sau ');

function isnKeys() {
  const k: string[] = [];
  ISN_SL.forEach((l) => { k.push('rlt_' + l, 'rpp_' + l, 'llt_' + l, 'lpp_' + l); if (ISN_ML.includes(l)) k.push('rm_' + l, 'lm_' + l); });
  return k.concat(['vac', 'dap']);
}
function isnCompute(v: V) {
  const keys = isnKeys(), miss = keys.filter((k) => !scHas(v[k])).length;
  if (miss) return { ok: false as const, miss, total: keys.length };
  const side = (p: string) => {
    const o: Record<string, unknown> = { motor: {} as V, lightTouch: {} as V, pinPrick: {} as V };
    ISN_ML.forEach((l) => { (o.motor as V)[l] = v[p + 'm_' + l]; });
    ISN_SL.forEach((l) => { (o.lightTouch as V)[l] = v[p + 'lt_' + l]; (o.pinPrick as V)[l] = v[p + 'pp_' + l]; });
    if (scHas(v[p + 'nk'])) o.lowestNonKeyMuscleWithMotorFunction = v[p + 'nk'];
    return o;
  };
  try {
    return { ok: true as const, miss: 0, total: keys.length, res: new ISN_LIB.ISNCSCI({ voluntaryAnalContraction: v.vac, deepAnalPressure: v.dap, right: side('r'), left: side('l') }) };
  } catch (e) {
    return { ok: false as const, miss: 0, total: keys.length, err: String((e as Error)?.message ?? e) };
  }
}
type R = ReturnType<typeof isnCompute>;
function isnLines(r: Extract<R, { res: unknown }>): [string, string][] {
  const c = r.res.classification, t = r.res.totals, n = c.neurologicalLevels, z = c.zoneOfPartialPreservations;
  const lr = (a: string, b: string) => 'dreapta ' + isnFmt(a) + ', stânga ' + isnFmt(b);
  const tot = (x: string, d: string, s: string, max: number) => x + '/' + max + ' (dreapta ' + d + ', stânga ' + s + ')';
  return [
    ['Nivel senzitiv', lr(n.sensoryRight, n.sensoryLeft)], ['Nivel motor', lr(n.motorRight, n.motorLeft)],
    ['ZPP senzitiv', lr(z.sensoryRight, z.sensoryLeft)], ['ZPP motor', lr(z.motorRight, z.motorLeft)],
    ['Motor, membre superioare (UEMS)', tot(t.upperExtremity, t.right.upperExtremity, t.left.upperExtremity, 50)],
    ['Motor, membre inferioare (LEMS)', tot(t.lowerExtremity, t.right.lowerExtremity, t.left.lowerExtremity, 50)],
    ['Atingere ușoară', tot(t.lightTouch, t.right.lightTouch, t.left.lightTouch, 112)], ['Înțepătură', tot(t.pinPrick, t.right.pinPrick, t.left.pinPrick, 112)],
  ];
}
const fD = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
function isnCopyText(r: R) {
  if (!r.ok) return 'ISNCSCI: examinare incompletă (lipsesc ' + r.miss + ' din ' + r.total + ' câmpuri). Data: ' + fD(new Date()) + '.';
  const c = r.res.classification;
  return 'ISNCSCI (revizia 2019): AIS ' + isnFmt(c.ASIAImpairmentScale) + ', NLI ' + isnFmt(c.neurologicalLevelOfInjury)
    + (c.ASIAImpairmentScale === 'E' ? ', examinare normală' : ', leziune ' + isnComp(c.injuryComplete)) + '. '
    + isnLines(r).map((p) => p[0] + ': ' + p[1]).join('; ') + '. Data: ' + fD(new Date()) + '.';
}

function Sel({ k, kind, a, label, onSet }: { k: string; kind: 'm' | 's'; a?: string; label: string; onSet: (k: string, v: string) => void }) {
  const vals = kind === 'm' ? ['0', '1', '2', '3', '4', '5', 'NT'] : ['0', '1', '2', 'NT'];
  return (
    <select className={'isn-s' + (scHas(a) ? '' : ' empty')} value={a ?? ''} aria-label={label} onChange={(e) => onSet(k, e.target.value)}>
      <option value="" />
      {vals.map((x) => <option key={x}>{x}</option>)}
    </select>
  );
}

export function IsncsciForm({ v, onSet, onReset }: { v: V; onSet: (k: string, val: string) => void; onReset: () => void }) {
  const { t } = useApp();
  const [msg, setMsg] = useState('');
  const r = useMemo(() => isnCompute(v), [v]);
  const fill = () => {
    ISN_SL.forEach((l) => {
      ['rlt_', 'rpp_', 'llt_', 'lpp_'].forEach((p) => { if (!scHas(v[p + l])) onSet(p + l, '2'); });
      if (ISN_ML.includes(l)) ['rm_', 'lm_'].forEach((p) => { if (!scHas(v[p + l])) onSet(p + l, '5'); });
    });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(isnCopyText(r)); setMsg(t('scCopied')); } catch { setMsg(t('scCopyFail')); }
  };
  const bin = (k: string, title: string) => (
    <label className="isn-bin"><span>{title}</span>
      <select className={'isn-s' + (scHas(v[k]) ? '' : ' empty')} value={v[k] ?? ''} onChange={(e) => onSet(k, e.target.value)}>
        <option value="" />{[['Yes', 'Da'], ['No', 'Nu'], ['NT', 'NT']].map(([x, y]) => <option key={x} value={x}>{y}</option>)}
      </select>
    </label>
  );
  const nk = (k: string, title: string) => (
    <label className="isn-bin"><span>{title}</span>
      <select className="isn-s" value={v[k] ?? ''} onChange={(e) => onSet(k, e.target.value)}>
        <option value="">nicio funcție sau netestat</option>{ISN_ML.map((x) => <option key={x}>{x}</option>)}
      </select>
    </label>
  );
  const c = r.ok ? r.res.classification : null;
  const notes: string[] = [];
  if (r.ok && c) {
    if (/E/.test(c.ASIAImpairmentScale)) notes.push('AIS E se acordă doar dacă pacientul a avut anterior un deficit; altfel, examinarea este normală și nu se acordă un grad AIS.');
    if (/ND/.test(JSON.stringify(r.res.totals))) notes.push('ND: total nedeterminabil, din cauza valorilor NT.');
    if (/,/.test(JSON.stringify(c))) notes.push('Cu NT, unele rezultate au mai multe variante posibile.');
  }
  return (
    <div className="sc-cols wide">
      <form className="sc-form isn" onSubmit={(e) => e.preventDefault()}>
        <div className="isn-tools">
          <button type="button" className="btn sm" onClick={fill}>Completează câmpurile goale cu valori normale</button>
          <span className="sc-h">Motor 5, senzitiv 2. Contracția anală voluntară și presiunea anală profundă nu se completează automat.</span>
        </div>
        <div className="isn-scroll">
          <table className="isn-t">
            <thead>
              <tr><th rowSpan={2} scope="col">Nivel</th><th colSpan={3} scope="colgroup">Dreapta</th><th colSpan={3} scope="colgroup">Stânga</th></tr>
              <tr>
                {[['Motor', 'M'], ['Atingere', 'AU'], ['Înțepătură', 'Î'], ['Atingere', 'AU'], ['Înțepătură', 'Î'], ['Motor', 'M']].map(([l, s], i) => (
                  <th key={i} scope="col"><span className="hd-l">{l}</span><span className="hd-s" aria-hidden="true">{s}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ISN_SL.map((l) => {
                const key = ISN_ML.includes(l), nm = isnLv(l), mu = key ? ', ' + ISN_KEY[l] : '';
                return (
                  <tr key={l} className={key ? 'key' : ''}>
                    <th scope="row"><span className="isn-lv">{nm}</span>{key && <span className="isn-mu">{ISN_KEY[l]}</span>}</th>
                    <td className="m">{key && <Sel k={'rm_' + l} kind="m" a={v['rm_' + l]} label={'Dreapta, motor ' + nm + mu} onSet={onSet} />}</td>
                    <td><Sel k={'rlt_' + l} kind="s" a={v['rlt_' + l]} label={'Dreapta, atingere ușoară ' + nm} onSet={onSet} /></td>
                    <td><Sel k={'rpp_' + l} kind="s" a={v['rpp_' + l]} label={'Dreapta, înțepătură ' + nm} onSet={onSet} /></td>
                    <td><Sel k={'llt_' + l} kind="s" a={v['llt_' + l]} label={'Stânga, atingere ușoară ' + nm} onSet={onSet} /></td>
                    <td><Sel k={'lpp_' + l} kind="s" a={v['lpp_' + l]} label={'Stânga, înțepătură ' + nm} onSet={onSet} /></td>
                    <td className="m">{key && <Sel k={'lm_' + l} kind="m" a={v['lm_' + l]} label={'Stânga, motor ' + nm + mu} onSet={onSet} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="sc-h isn-leg">M = motor, AU = atingere ușoară, Î = înțepătură.</p>
        <div className="isn-extra">
          {bin('vac', 'Contracție anală voluntară')}{bin('dap', 'Presiune anală profundă')}
          {nk('rnk', 'Cea mai joasă funcție musculară non-cheie, dreapta (opțional)')}{nk('lnk', 'Cea mai joasă funcție musculară non-cheie, stânga (opțional)')}
        </div>
        <p className="sc-h">Funcțiile non-cheie contează doar pentru a deosebi AIS B de AIS C (fișa ISNCSCI din 2019).</p>
      </form>
      <aside className="sc-res" aria-live="polite" aria-label={t('scResult')}>
        <p className="muted small">{t('scResult')}</p>
        {!r.ok ? (
          r.err ? <p className="sc-band bad">Clasificarea nu a putut fi calculată: {r.err}</p>
            : <><p className="muted">Completați toate câmpurile, inclusiv contracția anală voluntară și presiunea anală profundă.</p><p className="muted small">Lipsesc {r.miss} din {r.total}.</p></>
        ) : c && (
          <>
            <p className="sc-score"><span className="sc-big">AIS {isnFmt(c.ASIAImpairmentScale)}</span></p>
            <p className="sc-band info">NLI {isnFmt(c.neurologicalLevelOfInjury)}{c.ASIAImpairmentScale === 'E' ? '; examinare normală' : '; leziune ' + isnComp(c.injuryComplete)}</p>
            <dl className="sc-parts">{isnLines(r).map((p) => <div key={p[0]}><dt>{p[0]}</dt><dd>{p[1]}</dd></div>)}</dl>
            {notes.length > 0 && <ul className="sc-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            <p className="muted small">Algoritmul ISNCSCI oficial (Praxis), revizia 2019.</p>
          </>
        )}
        <div className="row">
          <button className="btn primary sm" onClick={copy}>{t('scCopy')}</button>
          <button className="btn sm" onClick={() => { if (confirm(t('scReset') + '?')) { onReset(); setMsg(''); } }}>{t('scReset')}</button>
        </div>
        {msg && <p className="muted small" role="status">{msg}</p>}
      </aside>
    </div>
  );
}
