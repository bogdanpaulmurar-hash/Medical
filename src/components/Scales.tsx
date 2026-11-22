import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../state';
import { loadScales, norm, type Scale, type ScaleData, type ScaleItem } from '../data/vademecum';
import { scCompute, scHas, scOpts } from '../data/scaleEngine';
import { IsncsciForm } from './Isncsci';

type Answers = Record<string, Record<string, string>>;

interface Result {
  val?: string; unit?: string; max?: string; big?: string; sub?: string;
  ok?: boolean; miss?: number;
  band?: { t: string; c: string } | null; bandSrc?: string;
  parts?: [string, string][]; notes?: string[];
}

const ptsLabel = (sc: Scale, o: { v: string; p: number }) =>
  o.v === 'UN' ? 'UN' : o.v === 'na' ? 'NA'
    : sc.id === 'hartwig' ? o.v
      : sc.id === 'naranjo' && o.p > 0 ? `+${o.p}` : String(o.p).replace('.', ',');
const noPts = (sc: Scale, it: ScaleItem) =>
  sc.id === 'schumock' || it.id === 'aid' || !!it.np || (sc.cat === 'crit' && !sc.pts);

function resultText(sc: Scale, r: Result): string {
  const head = r.big ?? (scHas(r.val) ? `${r.val}${r.unit ? (r.unit === '%' ? '%' : ' ' + r.unit) : ''}${r.max ? ' / ' + r.max : ''}` : '');
  const lines = [`${sc.t}: ${head}`];
  if (r.band) lines.push(r.band.t);
  (r.parts ?? []).forEach((p) => lines.push(`${p[0].trim()}: ${p[1]}`));
  (r.notes ?? []).forEach((n) => lines.push(`- ${n}`));
  return lines.join('\n');
}

export function ScalesTab() {
  const { t } = useApp();
  const [data, setData] = useState<ScaleData | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState('');
  const [q, setQ] = useState('');
  const [answers, setAnswers] = useState<Answers>({});

  useEffect(() => {
    loadScales().then(setData).catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="alert">{t('guidesLoadError')}</p>;
  if (!data) return <p className="muted">{t('loading')}</p>;

  const sc = data.scales.find((s) => s.id === open);
  if (sc) {
    return (
      <ScalePage
        sc={sc}
        v={answers[sc.id] ?? {}}
        onSet={(k, val) => setAnswers((a) => {
          const cur = { ...(a[sc.id] ?? {}) };
          if (val === '') delete cur[k]; else cur[k] = val;
          return { ...a, [sc.id]: cur };
        })}
        onReset={() => setAnswers((a) => { const c = { ...a }; delete c[sc.id]; return c; })}
        onBack={() => { setOpen(''); window.scrollTo({ top: 0 }); }}
      />
    );
  }

  const nq = norm(q.trim());
  const list = data.scales.filter((s) => !nq || norm(`${s.t} ${s.al ?? ''} ${s.what}`).includes(nq));
  const any = (s: Scale) => Object.keys(answers[s.id] ?? {}).length > 0;
  return (
    <div>
      <input
        type="search" className="grow" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t('scSearch')} aria-label={t('scSearch')}
      />
      <p className="muted small">{list.length} {t('scCount')} · {t('scRoOnly')}</p>
      {data.cats.map((c) => {
        const items = list.filter((s) => s.cat === c.id);
        if (!items.length) return null;
        return (
          <div key={c.id}>
            <h3 className="sec">{c.t}</h3>
            <div className="rec-rows">
              {items.map((s) => (
                <button key={s.id} className="sc-card" onClick={() => { setOpen(s.id); window.scrollTo({ top: 0 }); }}>
                  <b>{s.t}</b>{any(s) && <span className="vsign" aria-label={t('scAnswered')}> ●</span>}
                  <span className="muted small">{s.what}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScalePage({
  sc, v, onSet, onReset, onBack,
}: {
  sc: Scale; v: Record<string, string>;
  onSet: (k: string, val: string) => void; onReset: () => void; onBack: () => void;
}) {
  const { t } = useApp();
  const [msg, setMsg] = useState('');
  const calculable = !sc.info && !sc.sec && !sc.special;
  const r = useMemo<Result | null>(() => (calculable ? (scCompute(sc, v) as Result) : null), [sc, v, calculable]);

  const copy = async () => {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(resultText(sc, r));
      setMsg(t('scCopied'));
    } catch {
      setMsg(t('scCopyFail'));
    }
  };

  const has = !!r && (!!r.big || scHas(r.val));
  return (
    <div>
      <button className="btn sm" onClick={onBack}>{t('scBack')}</button>
      <h2>{sc.t}</h2>
      <p>{sc.what}</p>
      {sc.who && (
        <p className="muted small">
          <b>{t('scWho')}:</b> {sc.who}{sc.time ? <> · <b>{t('scTime')}:</b> {sc.time}</> : null}
        </p>
      )}

      {sc.info && (
        <div className="note-box">
          <p className="band info">{t('scNoCalc')}</p>
          <p>{sc.about}</p>
          <Sources sc={sc} />
        </div>
      )}

      {sc.sec && (
        <div className="note-box">
          {sc.sec.map(([h, l]) => (
            <div key={h}>
              <h3 className="sec">{h}</h3>
              {Array.isArray(l) ? <ul>{l.map((x) => <li key={x}>{x}</li>)}</ul> : <p>{l}</p>}
            </div>
          ))}
          {sc.about && <p className="muted small">{sc.about}</p>}
          <Sources sc={sc} />
        </div>
      )}

      {sc.special === 'isncsci' && <IsncsciForm v={v} onSet={onSet} onReset={onReset} />}

      {calculable && r && (
        <div className="sc-cols">
          <form className="sc-form" onSubmit={(e) => e.preventDefault()}>
            <ScaleForm sc={sc} v={v} onSet={onSet} />
          </form>
          <aside className="sc-res" aria-live="polite" aria-label={t('scResult')}>
            <p className="muted small">{r.ok || !has ? t('scResult') : t('scPartial')}</p>
            {r.big ? <p className="sc-bigtxt">{r.big}</p>
              : has ? (
                <p className="sc-score">
                  <span className="sc-big">{r.val}</span>
                  {r.unit ? <span className="sc-unit"> {r.unit}</span> : null}
                  {r.max ? <span className="muted"> {t('scOutOf')} {r.max}</span> : null}
                </p>
              ) : <p className="muted">{t('scEnter')}</p>}
            {r.sub && has && <p className="muted small">{r.sub}</p>}
            {r.band && <p className={`sc-band ${r.band.c}`}>{r.band.t}</p>}
            {!!r.miss && !r.ok && <p className="muted small">{t('scMissing').replace('{n}', String(r.miss))}</p>}
            {!!r.parts?.length && (
              <dl className="sc-parts">
                {r.parts.map((p, i) => (
                  <div key={i} className={p[0].startsWith('  ') ? 'in' : ''}><dt>{p[0].trim()}</dt><dd>{p[1]}</dd></div>
                ))}
              </dl>
            )}
            {!!r.notes?.length && <ul className="sc-notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            {r.band && (r.bandSrc ?? sc.bandSrc) && <p className="muted small">{t('scInterp')}: {r.bandSrc ?? sc.bandSrc}.</p>}
            <div className="row">
              <button className="btn primary sm" disabled={!has} onClick={copy}>{t('scCopy')}</button>
              <button className="btn sm" onClick={() => { if (confirm(t('scReset') + '?')) { onReset(); setMsg(''); } }}>{t('scReset')}</button>
            </div>
            {msg && <p className="muted small" role="status">{msg}</p>}
          </aside>
        </div>
      )}

      {calculable && r && (
        <div className="sc-bar" aria-hidden="true">
          <b>{r.big ?? (has ? `${r.val}${r.unit ? ' ' + r.unit : ''}${r.max ? ' / ' + r.max : ''}` : '–')}</b>
          {r.band && <span className={`sc-band ${r.band.c}`}>{r.band.t}</span>}
        </div>
      )}

      {(calculable || sc.special) && (
        <details className="vg">
          <summary>{t('scAbout')}</summary>
          {sc.about && <p>{sc.about}</p>}
          <Sources sc={sc} />
          {sc.lic && <p className="muted small"><b>{t('scLicense')}:</b> {sc.lic}</p>}
        </details>
      )}
    </div>
  );
}

function Sources({ sc }: { sc: Scale }) {
  const { t } = useApp();
  if (!sc.src?.length) return null;
  return (
    <>
      <p className="muted small"><b>{t('scSrc')}</b></p>
      <ol className="small">{sc.src.map((s, i) => <li key={i}>{s}</li>)}</ol>
    </>
  );
}

function ScaleForm({ sc, v, onSet }: { sc: Scale; v: Record<string, string>; onSet: (k: string, val: string) => void }) {
  const out: ReactNode[] = [];
  let cbs: ScaleItem[] = [];
  const flush = () => {
    if (!cbs.length) return;
    const group = cbs; cbs = [];
    out.push(
      <div className="sc-it sc-cbs" role="group" key={'cb' + group[0].id}>
        {group.map((it) => (
          <label className="sc-cb" key={it.id}>
            <input type="checkbox" checked={v[it.id!] === '1'} onChange={(e) => onSet(it.id!, e.target.checked ? '1' : '')} />
            <span>{it.t}</span>
          </label>
        ))}
      </div>,
    );
  };
  (sc.items ?? []).forEach((it, i) => {
    if (it.cb) { cbs.push(it); return; }
    flush();
    if (it.g) { out.push(<h3 className="sec" key={'g' + i}>{it.g}</h3>); return; }
    out.push(<ItemField key={it.id} sc={sc} it={it} a={v[it.id!]} onSet={onSet} />);
  });
  flush();
  return <>{out}</>;
}

function ItemField({ sc, it, a, onSet }: { sc: Scale; it: ScaleItem; a: string | undefined; onSet: (k: string, val: string) => void }) {
  const id = it.id!;
  if (it.num) {
    const x = a === 'x';
    return (
      <fieldset className="sc-it">
        <legend>{it.t}{it.h && <span className="muted small"> {it.h}</span>}</legend>
        <div className="row">
          <input
            type="number" inputMode="decimal" step="0.01" min={it.min} max={it.max}
            value={scHas(a) && !x ? a : ''} disabled={x}
            aria-label={`${it.t}, ${it.uL || it.u || 'secunde'}`}
            onChange={(e) => onSet(id, e.target.value)}
          />
          <span>{it.u || 'secunde'}</span>
          {it.unable && (
            <label className="sc-chk">
              <input type="checkbox" checked={x} onChange={(e) => onSet(id, e.target.checked ? 'x' : '')} /> {it.unable}
            </label>
          )}
        </div>
      </fieldset>
    );
  }
  const os = scOpts(it) as { v: string; t: string; p: number }[];
  const pills = it.n != null, np = noPts(sc, it);
  return (
    <fieldset className={'sc-it' + (pills ? ' pills' : '')}>
      <legend>{it.t}{it.h && <span className="muted small"> {it.h}</span>}</legend>
      <div className={pills ? 'sc-pills' : 'sc-opts'}>
        {os.map((o) => (
          <label key={o.v} className={'sc-o' + (a === o.v ? ' on' : '')}>
            <input type="radio" name={`sc_${sc.id}_${id}`} checked={a === o.v} onChange={() => onSet(id, o.v)} />
            {pills ? <span className="sc-pv">{o.t}</span> : (
              <>
                {!np && <span className="sc-p">{ptsLabel(sc, o)}</span>}
                <span className="sc-ot">{o.t}</span>
              </>
            )}
          </label>
        ))}
        {pills && <span className="muted small"> din {it.n}</span>}
      </div>
    </fieldset>
  );
}
