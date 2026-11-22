import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../state';
import { loadExam, norm, type ExamCond, type ExamData, type ExamTest } from '../data/vademecum';
import {
  EX_NEXTF, EX_ZSHORT, exAny, exCompute, exF, exKShort, exLR, exLRf, exNextTests, exNum, exOut, exP, exPc, exPf,
  exSetData, exSetState, exSrc, exTests, exThr, exU, exZone, exZoneLabel, exY, exN, exCi, exQ,
} from '../data/examApi';

interface CState {
  a: Record<string, string>;
  pre?: string;
  s: Record<string, number>;
  k: Record<string, { off?: boolean; r?: number }>;
}
type States = Record<string, CState>;
const empty = (): CState => ({ a: {}, s: {}, k: {} });

const OPT: Record<string, string> = { '<': 'sub', '<=': 'cel mult', '>': 'peste', '>=': 'cel puțin' };
const LIM: Record<string, [number, number]> = { ani: [1, 120], '°': [0, 180], kg: [20, 300], 'dinți': [0, 32], cm: [0, 40], puncte: [-5, 20] };
const bandLabel = (b: { l?: string; op: string; x: number }, u: string) => b.l || `${OPT[b.op]} ${exU(b.x, u)}`;
const lim = (T: ExamTest) => (T.num && ((T.num as { lim?: [number, number] }).lim || LIM[T.num.u])) || null;

export function ExamTab({ onPathology }: { onPathology: (name: string) => void }) {
  const { t } = useApp();
  const [data, setData] = useState<ExamData | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState('');
  const [refs, setRefs] = useState(false);
  const [q, setQ] = useState('');
  const [states, setStates] = useState<States>({});
  const [thr, setThr] = useState<{ t?: string; r?: string }>({});

  useEffect(() => {
    loadExam().then((d) => { exSetData(d); setData(d); }).catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="alert">{t('guidesLoadError')}</p>;
  if (!data) return <p className="muted">{t('loading')}</p>;

  const all = data.EX_REG.flatMap((R) => R.c);
  const cond = all.find((c) => c.id === open);
  if (cond) {
    return (
      <CondPage
        data={data} C={cond} thr={thr} onThr={setThr}
        st={states[cond.id] ?? empty()}
        onChange={(fn) => setStates((s) => ({ ...s, [cond.id]: fn(s[cond.id] ?? empty()) }))}
        onReset={() => setStates((s) => { const c = { ...s }; delete c[cond.id]; return c; })}
        onBack={() => { setOpen(''); window.scrollTo({ top: 0 }); }}
        onPathology={onPathology}
      />
    );
  }
  if (refs) return <Refs data={data} onBack={() => setRefs(false)} />;

  const nq = norm(q.trim());
  const match = (C: ExamCond, R: { t: string }) => !nq || norm(`${C.t} ${R.t} ${C.tests.map((x) => x.t).join(' ')}`).includes(nq);
  exSetState(Object.fromEntries(Object.entries(states).map(([k, v]) => [k, v])), null);
  return (
    <div>
      <p className="note-box">{t('exIntro')}</p>
      <input type="search" className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('exSearch')} aria-label={t('exSearch')} />
      <p><button className="btn sm" onClick={() => setRefs(true)}>{t('exRefs')}</button></p>
      {data.EX_REG.map((R) => {
        const cs = R.c.filter((C) => match(C, R));
        if (!cs.length) return null;
        return (
          <div key={R.id}>
            <h3 className="sec">{R.t}</h3>
            <div className="rec-rows">
              {cs.map((C) => (
                <button key={C.id} className="sc-card" onClick={() => { setOpen(C.id); window.scrollTo({ top: 0 }); }}>
                  <b>{C.t}</b>{exAny(C) && <span className="vsign"> ●</span>}
                  <span className="muted small">{C.tests.length} {t('exTests')}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Refs({ data, onBack }: { data: ExamData; onBack: () => void }) {
  const { t } = useApp();
  const [age, setAge] = useState(2);
  return (
    <div>
      <button className="btn sm" onClick={onBack}>{t('scBack')}</button>
      <h3 className="sec">Amplitudinea mișcărilor</h3>
      <label>
        <span>Grupa de vârstă</span>
        <select value={age} onChange={(e) => setAge(+e.target.value)}>
          {data.EX_ROM_AGES.map((a, k) => <option key={a} value={k}>{a}</option>)}
        </select>
      </label>
      <div className="table-wrap">
        <table className="ex-rt">
          <thead><tr><th>Articulație</th><th>Mișcare</th><th>Femei</th><th>Bărbați</th></tr></thead>
          <tbody>
            {data.EX_ROM.map((row, i) => (
              <tr key={i}>
                <td>{row[0] as string}</td><td>{row[1] as string}</td>
                {(row[2 + age] as number[][]).map((x, j) => (
                  <td key={j}><b>{exF(x[0], 1)}°</b> <span className="muted small">{exF(x[1], 1)} la {exF(x[2], 1)}</span></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Media, în grade, și IC 95% al mediei. IC al mediei nu este intervalul normal: valorile normale individuale variază mai mult.</p>
      <p className="muted small">{data.EX_ROM_REF}</p>
      {data.EX_SCALES.map((S) => (
        <div key={S.id}>
          <h3 className="sec">{S.t}</h3>
          <table className="ex-rt"><tbody>{S.g.map((g) => <tr key={g[0]}><th>{g[0]}</th><td>{g[1]}</td></tr>)}</tbody></table>
          <p className="muted small">{S.r}</p>
        </div>
      ))}
    </div>
  );
}

function Flags({ x }: { x: { calc?: unknown; sec?: unknown } }) {
  return <>{x.calc ? <sup title="LR calculat de aplicație din valorile publicate"> calc.</sup> : null}{x.sec ? <sup title="Valoare dintr-o sursă secundară, neverificată în articolul original"> sec.</sup> : null}</>;
}

function CondPage({
  data, C, st, thr, onThr, onChange, onReset, onBack, onPathology,
}: {
  data: ExamData; C: ExamCond; st: CState; thr: { t?: string; r?: string };
  onThr: (x: { t?: string; r?: string }) => void;
  onChange: (fn: (s: CState) => CState) => void; onReset: () => void; onBack: () => void;
  onPathology: (name: string) => void;
}) {
  const { t } = useApp();
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  exSetState({ [C.id]: st }, thr);
  const r = exCompute(C);
  const z = exZone(C, r);
  const p = exP(r);
  const th = exThr();
  const pathName = data.EX_PAT[C.id];
  const hasAny = Object.keys(st.a).length > 0;
  const zc = z === 'hi' || z === 'rp' ? 'bad' : z === 'lo' || z === 'rn' ? 'ok' : 'mid';

  const setA = (id: string, v: string | null) => onChange((s) => {
    const a = { ...s.a };
    if (v == null || v === '' || v === 'x') delete a[id]; else a[id] = v;
    return { ...s, a };
  });
  const setNum = (T: ExamTest, v: string) => {
    setRaw((x) => ({ ...x, [T.id]: v }));
    const n = exNum(v), L = lim(T);
    if (n != null && (!L || (n >= L[0] && n <= L[1]))) setA(T.id, v); else setA(T.id, null);
  };
  const numErr = (T: ExamTest) => {
    const v = raw[T.id]; if (!v || !v.trim()) return '';
    const n = exNum(v), L = lim(T);
    if (n == null) return 'Scrieți un număr, de exemplu 65 sau 6,5. Valoarea nu se folosește.';
    return L && (n < L[0] || n > L[1]) ? `Valoarea trebuie să fie între ${L[0]} și ${L[1]} (${T.num!.u}). Nu se folosește.` : '';
  };

  const copy = async () => {
    const lines = [`${C.t}: probabilitate ${exPf(p)} (pre-test ${exPf(r.pre.p)})`, exZoneLabel(z)];
    r.terms.forEach((x: { t: string; res: string; lr: number }) => lines.push(`- ${x.t}: ${x.res}, LR ${exLRf(x.lr)}`));
    try { await navigator.clipboard.writeText(lines.join('\n')); setMsg(t('scCopied')); } catch { setMsg(t('scCopyFail')); }
  };

  const refsList = useMemo(() => {
    const set = new Set<string>();
    C.tests.forEach((T) => T.v.forEach((v) => { if (v.r) set.add(v.r); if (v.os) set.add(v.os); }));
    (C.k ?? []).forEach((K) => set.add(K.r));
    return [...set].filter((k) => data.EX_REF[k]);
  }, [C, data]);

  const nx = z === 'mid' ? exNextTests(C, r) : [];
  const special = EX_NEXTF[C.id] ? EX_NEXTF[C.id](C, r) : null;

  return (
    <div>
      <button className="btn sm" onClick={onBack}>{t('exBack')}</button>
      <h2>{C.t}</h2>
      <p className="muted">{data.EX_REG.find((R) => R.c.some((c) => c.id === C.id))?.t}</p>

      <div className="sc-cols">
        <form className="sc-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="sc-it">
            <legend>{t('exPre')}</legend>
            <div className="row">
              <input
                type="range" min={1} max={99} value={Math.round(r.pre.p)} aria-label={t('exPre')}
                onChange={(e) => onChange((s) => ({ ...s, pre: e.target.value }))}
              />
              <input
                type="text" inputMode="decimal" style={{ width: '5rem' }} placeholder={String(Math.round(r.pre.p))}
                value={st.pre ?? ''} onChange={(e) => onChange((s) => ({ ...s, pre: e.target.value || undefined }))}
              /> %
            </div>
            <p className="muted small">
              {C.pre != null ? C.preN || '' : 'Nu există o prevalență verificată pentru populația dvs.: 50% este o valoare neutră. Introduceți estimarea dvs.'}
              {st.pre != null && <> <button type="button" className="link" onClick={() => onChange((s) => ({ ...s, pre: undefined }))}>Revino la {C.pre ?? 50}%</button></>}
            </p>
          </fieldset>

          <h3 className="sec">{t('exTestsH')}</h3>
          {exTests(C).map((T: ExamTest) => {
            const a = st.a[T.id];
            const inK = (C.k ?? []).filter((K) => K.m.includes(T.id));
            const v = T.v.length ? exSrc(C, T) : null;
            const fx = r.fx[T.id];
            return (
              <fieldset className="sc-it" key={T.id}>
                <legend>
                  {T.t}
                  {T.k === 'an' && <span className="muted small"> · anamneză</span>}
                  {T.k === 'reg' && <span className="muted small"> · regulă</span>}
                  {inK.map((K) => <span key={K.id} className="muted small"> · în {exKShort(K)}</span>)}
                </legend>
                {T.h && <p className="muted small">{T.h}</p>}
                {T.num ? (
                  <div className="row">
                    <input
                      type="text" inputMode="decimal" style={{ width: '6rem' }} aria-label={T.t}
                      value={raw[T.id] ?? a ?? ''} onChange={(e) => setNum(T, e.target.value)}
                    />
                    <span>{T.num.u}</span>
                  </div>
                ) : (
                  <div className="sc-opts">
                    {(T.opt
                      ? T.opt.map((O, i) => [`o${i}`, O.t])
                      : T.ord === 'np' ? [['n', exN(T)], ['p', exY(T)]] : [['p', exY(T)], ['n', exN(T)]]
                    ).concat([['x', 'Neefectuat']]).map(([val, label]) => (
                      <label key={val} className={'sc-o' + ((a ?? 'x') === val ? ' on' : '')}>
                        <input type="radio" name={`ex_${C.id}_${T.id}`} checked={(a ?? 'x') === val} onChange={() => setA(T.id, val)} />
                        <span className="sc-ot">{label}</span>
                      </label>
                    ))}
                  </div>
                )}
                {numErr(T) && <p className="alert small">{numErr(T)}</p>}
                {T.num && !numErr(T) && <NumInfo T={T} a={a} />}
                <LrLine T={T} v={v} inK={inK.map(exKShort)} />
                {T.v.length > 1 && (
                  <label>
                    <span className="muted small">Sursa</span>
                    <select value={st.s[T.id] ?? 0} onChange={(e) => onChange((s) => ({ ...s, s: { ...s.s, [T.id]: +e.target.value } }))}>
                      {T.v.map((x, i) => <option key={i} value={i}>{x.r}{x.l ? ', ' + x.l : ''} ({exQ(x.r)})</option>)}
                    </select>
                  </label>
                )}
                {a != null && fx && fx.why && <p className="muted small">Nu se înmulțește: {fx.why}.</p>}
              </fieldset>
            );
          })}

          {(C.k ?? []).map((K) => {
            const ks = r.ks.find((x: { K: { id: string } }) => x.K.id === K.id);
            const s = st.k[K.id] ?? {};
            const ri = Math.min(s.r ?? 0, K.rules.length - 1);
            const R = K.rules[ri];
            return (
              <section key={K.id} className="note-box">
                <h3 className="sec">{K.t}</h3>
                <label className="sc-cb">
                  <input type="checkbox" checked={!s.off} onChange={(e) => onChange((x) => ({ ...x, k: { ...x.k, [K.id]: { ...s, off: !e.target.checked } } }))} />
                  <span>Folosește combinația în locul testelor separate</span>
                </label>
                {K.rules.length > 1 ? (
                  <label>
                    <span>Regula</span>
                    <select value={ri} onChange={(e) => onChange((x) => ({ ...x, k: { ...x.k, [K.id]: { ...s, r: +e.target.value } } }))}>
                      {K.rules.map((x, i) => <option key={i} value={i}>{x.t}</option>)}
                    </select>
                  </label>
                ) : <p>{R.t}</p>}
                <table className="ex-rt">
                  <thead><tr><th>Pozitive</th><th>LR</th></tr></thead>
                  <tbody>
                    {R.st.map((x, i) => (
                      <tr key={i}>
                        <td>{x.a === x.b ? x.a : `${x.a}-${x.b}`} din {(R.m ?? K.m).length}</td>
                        <td><b>{exLRf(x.lr)}</b><Flags x={x} />{x.ci ? <span className="muted small"> ({exCi(x.ci)})</span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ks && ks.on && <p className="muted small">{ks.res.pos} din {ks.res.n} pozitive{ks.res.unk ? `, ${ks.res.unk} necompletate` : ''}.</p>}
                <p className="muted small">Sursa: {K.r}, {exQ(K.r)}.</p>
              </section>
            );
          })}
        </form>

        <aside className="sc-res" aria-live="polite" aria-label={t('scResult')}>
          <p className="muted small">Probabilitatea după teste</p>
          <p className="sc-score"><span className="sc-big">{exPf(p)}</span></p>
          <p className="muted small">Pre-test {exPf(r.pre.p)}{r.pre.own ? ' (estimarea dvs.)' : r.pre.neutral ? ' (valoare neutră)' : ''}</p>
          <p className={`sc-band ${zc}`}>{EX_ZSHORT[z] ?? exZoneLabel(z)}</p>
          <p className="muted small">{exZoneLabel(z)}</p>
          {r.terms.length > 0 && (
            <dl className="sc-parts">
              {r.terms.map((x: { id?: string; t: string; res: string; lr: number; calc?: number; sec?: string }, i: number) => (
                <div key={i}><dt>{x.t} <span className="muted small">({x.res})</span></dt><dd>LR {exLRf(x.lr)}<Flags x={x} /></dd></div>
              ))}
            </dl>
          )}
          {r.none.length > 0 && (
            <details className="vg"><summary>Fără efect asupra calculului ({r.none.length})</summary>
              <ul className="sc-notes">{r.none.map((x: { t: string; why: string }, i: number) => <li key={i}><b>{x.t}</b>: {x.why}</li>)}</ul>
            </details>
          )}
          {special ? <div dangerouslySetInnerHTML={{ __html: special.html }} /> : <ZoneText z={z} p={p} th={th} nx={nx} />}
          <details className="vg">
            <summary>Pragurile de decizie</summary>
            <div className="row">
              <label><span className="small">Testare (%)</span>
                <input type="text" inputMode="decimal" style={{ width: '5rem' }} placeholder={String(th.t)} value={thr.t ?? ''} onChange={(e) => onThr({ ...thr, t: e.target.value })} /></label>
              <label><span className="small">Tratament (%)</span>
                <input type="text" inputMode="decimal" style={{ width: '5rem' }} placeholder={String(th.r)} value={thr.r ?? ''} onChange={(e) => onThr({ ...thr, r: e.target.value })} /></label>
            </div>
            <p className="muted small">Implicit 20% și 70%. {data.EX_THR_REF}</p>
          </details>
          <div className="row">
            <button type="button" className="btn primary sm" onClick={copy}>{t('scCopy')}</button>
            <button type="button" className="btn sm" disabled={!hasAny && st.pre == null} onClick={() => { setRaw({}); onReset(); setMsg(''); }}>{t('scReset')}</button>
          </div>
          {msg && <p className="muted small" role="status">{msg}</p>}
          {pathName && <p><button type="button" className="btn sm" onClick={() => onPathology(pathName)}>Pagina afecțiunii: {pathName}</button></p>}
        </aside>
      </div>

      <div className="sc-bar" aria-hidden="true"><b>{exPf(p)}</b><span className={`sc-band ${zc}`}>{EX_ZSHORT[z] ?? ''}</span></div>

      <details className="vg">
        <summary>Despre date și surse</summary>
        <p>{C.note}</p>
        <p className="muted small"><b>calc.</b> = LR calculat de aplicație din valorile publicate. <b>sec.</b> = valoare dintr-o sursă secundară, neverificată în articolul original.</p>
        <ul className="small">
          {refsList.map((k) => <li key={k}><b>{k}</b> ({data.EX_QT[data.EX_REF[k].q]}). {data.EX_REF[k].c}.</li>)}
        </ul>
      </details>
    </div>
  );
}

function NumInfo({ T, a }: { T: ExamTest; a: string | undefined }) {
  const u = T.num!.u;
  const O = a != null ? exOut(T, a) : null;
  if (T.num!.b) {
    if (!O) return <p className="muted small">{T.num!.b.map((b) => `${bandLabel(b, u)}: LR ${exLRf(b.lr)}`).join('; ')}.</p>;
    return <p className="small">{O.b ? `LR ${exLRf(O.b.lr)} (${bandLabel(O.b, u)}).` : 'Între praguri: fără LR.'}</p>;
  }
  const thr = `${OPT[T.num!.op!]} ${exU(T.num!.x!, u)}`;
  return <p className="muted small">{O ? <><b>{O.o === 'p' ? 'Pozitiv' : 'Negativ'}</b> (pragul: {thr}).</> : `Pozitiv dacă este ${thr}.`}</p>;
}

function LrLine({ T, v, inK }: { T: ExamTest; v: ExamTest['v'][number] | null; inK: string[] }) {
  if (T.rule) return <p className="muted small">Fără LR: hotărăște pasul următor, după ghidul NICE NG234.</p>;
  if (!T.v.length) return <p className="muted small">{inK.length ? `Fără LR propriu: contează doar în ${inK.join(', ')}.` : 'Fără LR publicat.'}</p>;
  let lr: React.ReactNode;
  if (T.opt) {
    lr = T.opt.map((O) => `${O.t.toLowerCase()}: ${O.lr == null ? 'fără LR' : 'LR ' + exLRf(O.lr) + (O.ci ? ` (${exCi(O.ci)})` : '')}`).join('; ');
  } else if (T.num && T.num.b) {
    lr = T.num.b.map((b) => `${bandLabel(b, T.num!.u)}: LR ${exLRf(b.lr)}${b.ci ? ` (${exCi(b.ci)})` : ''}`).join('; ');
  } else {
    const P = exLR(v, 'p'), N = exLR(v, 'n');
    const one = (lab: string, L: { lr: number; ci?: number[]; calc?: number; sec?: string } | null) => (
      <span key={lab}>{lab} {L ? <>{exLRf(L.lr)}<Flags x={L} />{L.ci ? <span className="muted small"> ({exCi(L.ci)})</span> : null}</> : <span className="muted">nepublicat</span>}{'  '}</span>
    );
    lr = <>{one('LR+', P)}{one('LR−', N)}</>;
  }
  const ss = v && v.se != null && v.sp != null ? `Sensibilitate ${exPc(v.se)}, specificitate ${exPc(v.sp)}.` : '';
  return (
    <p className="muted small">
      {lr} {ss}
      {T.v.length === 1 && v && v.r ? <><br />{v.r}{exQ(v.r) ? ', ' + exQ(v.r) : ''}{v.os ? `; valoare dintr-un singur studiu inclus: ${v.os}` : ''}</> : null}
    </p>
  );
}

function ZoneText({ z, p, th, nx }: { z: string; p: number; th: { t: number; r: number }; nx: { t: string; txt: string }[] }) {
  if (z === 'rp') return <p>Regula indică radiografia.</p>;
  if (z === 'rn') return <p>Fractura este puțin probabilă ({exPf(p)} după regulă); regula nu cere radiografie.</p>;
  if (z === 'r0') return <p>Completați regula: ea decide dacă este nevoie de radiografie.</p>;
  if (z === 'hi') return <p>Probabilitatea ({exPf(p)}) depășește pragul de tratament: recomandările de pe pagina afecțiunii se aplică, dacă tabloul clinic se potrivește.</p>;
  if (z === 'mid') {
    return (
      <>
        <p>Diagnosticul rămâne incert ({exPf(p)}). {nx.length ? 'Testele care ar schimba cel mai mult probabilitatea:' : 'Testele rămase nu mai pot schimba mult rezultatul.'}</p>
        {nx.length > 0 && <ul>{nx.map((x) => <li key={x.t}><b>{x.t}</b> <span className="muted small">({x.txt})</span></li>)}</ul>}
      </>
    );
  }
  return <p>Afecțiunea este puțin probabilă ({exPf(p)}, sub {th.t}%).</p>;
}
