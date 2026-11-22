import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, useApp } from '../state';
import {
  EVIDENCE_LABEL, loadDevices, loadGuide, norm,
  type Contra, type DeviceData, type DeviceInfo, type GuideData, type GuideRow, type GuideStatus, type TreeNode,
} from '../data/vademecum';
import { ScalesTab } from './Scales';
import { ExamTab } from './Exam';
import { BiletTab } from './Bilet';
import { CATALOG_PROCEDURES } from '../data/catalog';

/** Text cu **îngroșat** și rânduri noi, cum vine din ghiduri. */
function Rich({ text }: { text: string }) {
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {text.split('**').map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <Fragment key={i}>{p}</Fragment>))}
    </span>
  );
}

type Tab = 'pat' | 'dev' | 'sc' | 'ex' | 'bi';

export function GuidesPage() {
  const { t, me } = useApp();
  const [tab, setTab] = useState<Tab>('pat');
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [devices, setDevices] = useState<DeviceData | null>(null);
  const [failed, setFailed] = useState(false);
  const [pat, setPat] = useState('');
  const [dev, setDev] = useState('');

  useEffect(() => {
    Promise.all([loadGuide(), loadDevices()])
      .then(([g, d]) => {
        setGuide(g);
        setDevices(d);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="alert">{t('guidesLoadError')}</p>;
  if (!guide || !devices) return <p className="muted">{t('loading')}</p>;

  const openDevice = (id: string) => {
    setDev(id);
    setTab('dev');
    window.scrollTo({ top: 0 });
  };
  const openPathology = (name: string) => {
    setPat(name);
    setTab('pat');
    window.scrollTo({ top: 0 });
  };

  return (
    <section>
      <div className="chips" role="tablist">
        <button role="tab" aria-selected={tab === 'pat'} className={tab === 'pat' ? 'chip on' : 'chip'} onClick={() => setTab('pat')}>
          {t('guidesPathologies')}
        </button>
        <button role="tab" aria-selected={tab === 'dev'} className={tab === 'dev' ? 'chip on' : 'chip'} onClick={() => setTab('dev')}>
          {t('guidesDevices')}
        </button>
        <button role="tab" aria-selected={tab === 'sc'} className={tab === 'sc' ? 'chip on' : 'chip'} onClick={() => setTab('sc')}>
          {t('guidesScales')}
        </button>
        <button role="tab" aria-selected={tab === 'ex'} className={tab === 'ex' ? 'chip on' : 'chip'} onClick={() => setTab('ex')}>
          {t('guidesExam')}
        </button>
        {me?.role !== 'scheduler' && <button role="tab" aria-selected={tab === 'bi'} className={tab === 'bi' ? 'chip on' : 'chip'} onClick={() => setTab('bi')}>
          {t('guidesBilet')}
        </button>}
      </div>
      <p className="muted small">{t('guidesSource')}</p>
      {tab === 'bi' ? (
        <BiletTab />
      ) : tab === 'ex' ? (
        <ExamTab onPathology={openPathology} />
      ) : tab === 'sc' ? (
        <ScalesTab />
      ) : tab === 'pat' ? (
        <Pathologies guide={guide} devices={devices} selected={pat} onSelect={setPat} onDevice={openDevice} />
      ) : (
        <Devices guide={guide} devices={devices} selected={dev} onSelect={setDev} onPathology={openPathology} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// Patologii
// ---------------------------------------------------------------------
function Pathologies({
  guide, devices, selected, onSelect, onDevice,
}: {
  guide: GuideData;
  devices: DeviceData;
  selected: string;
  onSelect: (n: string) => void;
  onDevice: (id: string) => void;
}) {
  const { t, patients } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const names = useMemo(() => {
    const all = new Set<string>(Object.keys(guide.GUIDE));
    guide.PAT_CATS.forEach((c) => c.p.forEach((p) => all.add(p)));
    return [...all].sort((a, b) => a.localeCompare(b, 'ro'));
  }, [guide]);

  if (selected) {
    return (
      <PathologyPage name={selected} guide={guide} devices={devices} patients={patients} onBack={() => onSelect('')} onSelect={onSelect} onDevice={onDevice} />
    );
  }
  const s = norm(q.trim());
  const shown = s ? names.filter((n) => norm(n).includes(s)) : cat ? guide.PAT_CATS.find((c) => c.id === cat)?.p ?? [] : [];
  return (
    <>
      <input type="search" placeholder={t('guidesSearchPat')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('guidesSearchPat')} />
      <div className="nav-tiles">
        {guide.PAT_CATS.map((c) => (
          <button key={c.id} className={cat === c.id && !s ? 'nav-tile on' : 'nav-tile'} onClick={() => { setCat(c.id === cat ? '' : c.id); setQ(''); }}>
            <span className="nav-ico" dangerouslySetInnerHTML={{ __html: guide.ICONS[c.ico] ?? '' }} />
            <span className="nav-txt">
              <b>{c.t}</b>
              <span className="nav-sub">{c.p.length}</span>
            </span>
          </button>
        ))}
      </div>
      {!s && !cat && <p className="muted">{t('guidesPickCategory')} ({names.length})</p>}
      {(s || cat) && shown.length === 0 && <p className="muted">{t('noResults')}</p>}
      <ul className="plain pat-list">
        {shown.map((n) => (
          <li key={n}>
            <button className="pick" onClick={() => onSelect(n)}>
              <span>{n}</span>
              <span className="muted small">{guide.GUIDE[n] ? `${guide.GUIDE[n].length}` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function PathologyPage({
  name, guide, devices, patients, onBack, onSelect, onDevice,
}: {
  name: string;
  guide: GuideData;
  devices: DeviceData;
  patients: ReturnType<typeof useApp>['patients'];
  onBack: () => void;
  onSelect: (n: string) => void;
  onDevice: (id: string) => void;
}) {
  const { t, prefs, me, plan, procedures, reloadLookups } = useApp();
  const [showBook, setShowBook] = useState(false);
  const [patientId, setPatientId] = useState(() => {
    try {
      return sessionStorage.getItem('medsched-patient') ?? '';
    } catch {
      return '';
    }
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canEdit = me?.role !== 'scheduler';
  const patient = patients.find((p) => p.id === patientId && p.active) ?? null;

  const rows = guide.GUIDE[name] ?? [];
  const bookRows = guide.BKB[name] ?? [];
  const kine = devices.DEVICES.find((d) => d.id === 'kineto')?.tree.find((x): x is TreeNode => typeof x !== 'string' && x.p === name);
  const all = [...rows, ...(showBook ? bookRows : [])];
  const srcs = [...new Set([...rows, ...bookRows].map((r) => r.src))];

  async function addToPlan(key: string) {
    const c = CATALOG_PROCEDURES.find((x) => x.key === key);
    const proc = c && procedures.find((p) => p.name === c.name);
    if (!patient || !proc) return;
    if (plan.some((x) => x.patient_id === patient.id && x.procedure_id === proc.id && x.active)) {
      setMsg({ ok: false, text: `${proc.name}: ${t('guidesAlreadyInPlan')}` });
      return;
    }
    try {
      await api.savePlanItem({ patient_id: patient.id, procedure_id: proc.id, sessions: 10, frequency: 'daily', active: true });
      await reloadLookups();
      setMsg({ ok: true, text: `${proc.name} → ${patient.code}` });
    } catch {
      setMsg({ ok: false, text: t('errorGeneric') });
    }
  }

  const chipOf = (key: string) => CATALOG_PROCEDURES.find((c) => c.key === key);

  return (
    <article className="card">
      <div className="row">
        <button className="secondary small" onClick={onBack}>← {t('back')}</button>
        <h2 className="h-inline">{name}</h2>
      </div>
      {guide.PATNOTE[name] && <p className="note-box">{guide.PATNOTE[name]}</p>}

      {canEdit && (
        <div className="row plan-bar">
          <label className="inline small">
            {t('guidesPatientForPlan')}
            <select
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value);
                setMsg(null);
                try {
                  sessionStorage.setItem('medsched-patient', e.target.value);
                } catch {
                  /* ignore */
                }
              }}
            >
              <option value="">—</option>
              {patients.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.code} · {p.initials}</option>
              ))}
            </select>
          </label>
          {msg && <span className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</span>}
        </div>
      )}

      {(guide.BK_SEE[name] ?? []).filter((x) => guide.GUIDE[x]).length > 0 && (
        <p className="small">
          {t('guidesSeeAlso')}:{' '}
          {(guide.BK_SEE[name] ?? []).filter((x) => guide.GUIDE[x]).map((x) => (
            <button key={x} className="link" onClick={() => onSelect(x)}>{x}</button>
          ))}
        </p>
      )}

      {kine?.info && (
        <details open className="sec">
          <summary><b>{t('guidesKineProgram')}</b></summary>
          <Rich text={kine.info} />
        </details>
      )}

      {bookRows.length > 0 && (
        <label className="inline small">
          <input type="checkbox" checked={showBook} onChange={(e) => setShowBook(e.target.checked)} />
          {t('guidesShowBook')} ({bookRows.length})
        </label>
      )}

      {guide.GSEC.map(([sec, title]) => {
        const inSec = all.filter((r) => r.s === sec);
        if (inSec.length === 0) return null;
        return (
          <section key={sec} className="sec">
            <h3>{title}</h3>
            {guide.GORDER.map((st) => {
              const list = inSec.filter((r) => r.st === st);
              if (list.length === 0) return null;
              return (
                <details key={st} open={st === 'rec' || st === 'opt'} className={`vg vg-${st}`}>
                  <summary>
                    <span className={`vsign vsign-${st}`}>{guide.GSIGN[st]}</span> {guide.GSTAT[st]} ({list.length})
                  </summary>
                  <ul className="plain rec-rows">
                    {list.map((r, i) => (
                      <RecRow key={i} r={r} lang={prefs.lang} chipOf={chipOf} canAdd={canEdit && !!patient} onAdd={addToPlan} onDevice={onDevice} st={st} />
                    ))}
                  </ul>
                </details>
              );
            })}
          </section>
        );
      })}

      {rows.length === 0 && bookRows.length === 0 && <p className="muted">{t('guidesNoRecs')}</p>}

      {srcs.length > 0 && (
        <details className="sec">
          <summary><b>{t('guidesSources')} ({srcs.length})</b></summary>
          <ul className="plain">
            {srcs.map((s) => (
              <li key={s} className="small">
                <b>{s}</b>
                {guide.REFS[s] ? `: ${guide.REFS[s]}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function RecRow({
  r, lang, chipOf, canAdd, onAdd, onDevice, st,
}: {
  r: GuideRow;
  lang: 'ro' | 'en';
  chipOf: (k: string) => { short: string; color: string; name: string } | undefined;
  canAdd: boolean;
  onAdd: (k: string) => void;
  onDevice: (id: string) => void;
  st: GuideStatus;
}) {
  const { t } = useApp();
  const ev = EVIDENCE_LABEL[r.ev];
  return (
    <li className={`rec-row rec-${st}`}>
      <div>
        <strong><Rich text={r.l} /></strong>{' '}
        {r.d.map((k) => {
          const c = chipOf(k);
          return c ? (
            <span key={k} className="rec-dev">
              <button type="button" className="proc-chip" style={{ ['--c' as string]: c.color }} title={c.name} onClick={() => onDevice(k)}>
                {c.short}
              </button>
              {canAdd && st !== 'no' && (
                <button type="button" className="ghost small" title={t('guidesAddToPlan')} aria-label={`${t('guidesAddToPlan')}: ${c.name}`} onClick={() => onAdd(k)}>
                  +
                </button>
              )}
            </span>
          ) : null;
        })}
      </div>
      <div className="muted small">
        {r.g}
        {r.src ? ` · ${r.src}` : ''}
        {r.pg ? ` · ${r.pg}` : ''}
        {ev ? ` · ${ev[lang]}` : ''}
      </div>
      {r.n && <div className="small"><Rich text={r.n} /></div>}
    </li>
  );
}

// ---------------------------------------------------------------------
// Aparate
// ---------------------------------------------------------------------
function TreeView({ nodes, depth = 0 }: { nodes: (TreeNode | string)[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'plain tree' : 'plain tree sub'}>
      {nodes.map((n, i) => {
        if (typeof n === 'string') return <li key={i}>{n}</li>;
        const label = n.g ?? n.p ?? '';
        const kids = n.items ?? [];
        return (
          <li key={i}>
            {kids.length > 0 ? (
              <details>
                <summary>{label}{n.tag ? <span className="muted small"> · {n.tag}</span> : null}</summary>
                {n.info && <div className="small"><Rich text={n.info} /></div>}
                <TreeView nodes={kids} depth={depth + 1} />
              </details>
            ) : n.info ? (
              <details>
                <summary>{label}{n.tag ? <span className="muted small"> · {n.tag}</span> : null}</summary>
                <div className="small"><Rich text={n.info} /></div>
              </details>
            ) : (
              <span>{label}{n.tag ? <span className="muted small"> · {n.tag}</span> : null}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Devices({
  guide, devices, selected, onSelect, onPathology,
}: {
  guide: GuideData;
  devices: DeviceData;
  selected: string;
  onSelect: (id: string) => void;
  onPathology: (n: string) => void;
}) {
  const { t } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const dev = devices.DEVICES.find((d) => d.id === selected) ?? null;

  if (dev) return <DevicePage dev={dev} ci={devices.CI[dev.id]} guide={guide} onBack={() => onSelect('')} onPathology={onPathology} />;

  const s = norm(q.trim());
  const list = devices.DEVICES.filter((d) => (!cat || d.cat === cat) && (!s || norm(`${d.name} ${d.short}`).includes(s)));
  return (
    <>
      <input type="search" placeholder={t('guidesSearchDev')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('guidesSearchDev')} />
      <div className="chips">
        <button className={cat === '' ? 'chip on' : 'chip'} onClick={() => setCat('')}>{t('all')}</button>
        {devices.CATS.map((c) => (
          <button key={c.id} className={cat === c.id ? 'chip on' : 'chip'} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>
      <ul className="plain pat-list">
        {list.map((d) => {
          const c = CATALOG_PROCEDURES.find((x) => x.key === d.id);
          return (
            <li key={d.id}>
              <button className="pick" onClick={() => onSelect(d.id)}>
                {c && <span className="proc-chip" style={{ ['--c' as string]: c.color }}>{c.short}</span>}
                <span>{d.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DevicePage({
  dev, ci, guide, onBack, onPathology,
}: {
  dev: DeviceInfo;
  ci: Contra | undefined;
  guide: GuideData;
  onBack: () => void;
  onPathology: (n: string) => void;
}) {
  const { t } = useApp();
  const c = CATALOG_PROCEDURES.find((x) => x.key === dev.id);
  const used = useMemo(() => {
    const out: { pat: string; r: GuideRow }[] = [];
    for (const [pat, rows] of Object.entries(guide.GUIDE)) for (const r of rows) if (r.d.includes(dev.id)) out.push({ pat, r });
    return out;
  }, [guide, dev.id]);
  const Block = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="sec">
      <h3>{title}</h3>
      {children}
    </section>
  );
  return (
    <article className="card">
      <div className="row">
        <button className="secondary small" onClick={onBack}>← {t('back')}</button>
        {c && <span className="proc-chip" style={{ ['--c' as string]: c.color }}>{c.short}</span>}
        <h2 className="h-inline">{dev.name}</h2>
      </div>
      {dev.note && <p><Rich text={dev.note} /></p>}
      {dev.ind && <Block title={t('guidesIndications')}><Rich text={dev.ind} /></Block>}
      {dev.params && <Block title={t('guidesParams')}><Rich text={dev.params} /></Block>}
      {ci && (ci.abs?.length || ci.prec?.length) ? (
        <Block title={t('guidesContra')}>
          {ci.abs && ci.abs.length > 0 && (
            <>
              <h4>{t('guidesContraAbs')}</h4>
              <ul>{ci.abs.map((x, i) => <li key={i}><Rich text={x} /></li>)}</ul>
            </>
          )}
          {ci.prec && ci.prec.length > 0 && (
            <>
              <h4>{t('guidesContraPrec')}</h4>
              <ul>{ci.prec.map((x, i) => <li key={i}><Rich text={x} /></li>)}</ul>
            </>
          )}
          {ci.note && <p className="small"><Rich text={ci.note} /></p>}
        </Block>
      ) : null}
      {dev.tree.length > 0 && !(dev.tree.length === 1 && typeof dev.tree[0] !== 'string' && (dev.tree[0] as { implicit?: boolean }).implicit) && (
        <Block title={`${t('guidesPrograms')} (${dev.tree.length})`}>
          <TreeView nodes={dev.tree} />
        </Block>
      )}
      {used.length > 0 && (
        <Block title={`${t('guidesRecommendedIn')} (${used.length})`}>
          <ul className="plain">
            {used.map(({ pat, r }, i) => (
              <li key={i} className="small">
                <button className="link" onClick={() => onPathology(pat)}>{pat}</button>: {guide.GSIGN[r.st]} {r.l}
                <span className="muted"> · {r.g}{r.src ? ` · ${r.src}` : ''}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </article>
  );
}
