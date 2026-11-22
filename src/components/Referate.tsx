import { useEffect, useRef, useState } from 'react';
import { api, useApp } from '../state';
import { NS } from '../envKey';
import { loadReferate, loadScales, type ReferateData, type ScaleData } from '../data/vademecum';
import { scCompute } from '../data/scaleEngine';
import { createReferate } from '../data/referateEngine';

const DRAFT_KEY = 'medslot-referate-draft' + NS;
const MED_KEY = 'medslot-referate-medic' + NS;
// Toate rubricile celor 4 formulare (A16, A5, handicap, A39B) stau într-un singur document la pacient, de tip „a16”.
const KIND = 'a16' as const;

const readLs = (k: string): Record<string, unknown> => {
  try { return JSON.parse(localStorage.getItem(k) || '{}') ?? {}; } catch { return {}; }
};
const writeLs = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* fără stocare locală */ } };

/** Fila „Referate”: formularele medicului, montate în pagină; pacienții și salvarea vin din aplicație. */
export function ReferateTab({ onTab }: { onTab: (tab: string) => void }) {
  const { t, patients, plan, procedures, profiles, settings } = useApp();
  const hostRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReferateData | null>(null);
  const [scales, setScales] = useState<ScaleData | null>(null);
  const [docs, setDocs] = useState<Record<string, Record<string, string>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState('');
  const keep = settings.keep_documents;

  useEffect(() => {
    Promise.all([loadReferate(), loadScales()]).then(([d, s]) => { setData(d); setScales(s); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (!keep) { setDocs({}); return; }
    api.listDocuments(KIND).then((l) => {
      const m: Record<string, Record<string, string>> = {};
      l.forEach((d) => { m[d.patient_id] = d.data as Record<string, string>; });
      setDocs(m);
    }).catch(() => setFailed(true));
  }, [keep]);

  useEffect(() => {
    const root = hostRef.current;
    if (!root || !data || !scales || !docs) return;
    const docOf = (pid: string) => profiles.find((p) => p.id === pid)?.full_name ?? '';
    // pacienții, în forma pe care o așteaptă formularele medicului
    const pats = patients.map((p) => ({
      id: p.id, code: p.code, dx: p.diagnosis ?? '', doctor: p.doctor_id ? docOf(p.doctor_id) : '',
      type: p.kind === 'outpatient' ? 'amb' : 'int', start: p.start_date,
      procs: plan.filter((x) => x.patient_id === p.id && x.active).map((x) => ({
        id: x.id, dev: procedures.find((q) => q.id === x.procedure_id)?.name ?? '', n: x.sessions, freq: x.frequency,
      })),
      ref: docs[p.id] ?? {},
    }));
    const state = {
      settings: { header: settings.clinic_name || '', refMed: readLs(MED_KEY) },
      ui: { refP: '_', refD: 'a16', sel: '', tab: 'referate' },
      patients: pats,
      refDraft: readLs(DRAFT_KEY),
    };
    const snap: Record<string, string> = {};
    pats.forEach((p) => { if (docs[p.id]) snap[p.id] = JSON.stringify(p.ref); });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = '';
    let eng: ReturnType<typeof createReferate> | null = null;

    const save = async (key: string) => {
      const P = pats.find((p) => p.id === key); if (!P) return;
      setStatus('saving');
      try {
        if (!Object.keys(P.ref).length) await api.deleteDocument(P.id, KIND);
        else await api.saveDocument(P.id, KIND, P.ref as Record<string, unknown>);
        snap[key] = JSON.stringify(P.ref);
        setStatus('saved');
      } catch { setStatus('error'); }
    };
    const persist = () => {
      writeLs(MED_KEY, state.settings.refMed);
      const key = eng ? eng.rfKey() : '_';
      if (key === '_') { writeLs(DRAFT_KEY, state.refDraft); setStatus(''); return; }
      const P = pats.find((p) => p.id === key); if (!P) return;
      const now = JSON.stringify(P.ref);
      if (snap[key] === undefined) { snap[key] = now; return; } // prima completare automată (medic, unitate) nu se salvează
      if (snap[key] === now) return;
      if (!keep) { setStatus('off'); return; }
      clearTimeout(timer);
      pending = key;
      timer = setTimeout(() => { pending = ''; void save(key); }, 1200);
    };

    root.innerHTML = '<div id="view-referate"></div><div id="modal-root"></div><div id="toast" role="status"></div>';
    eng = createReferate({
      root, state, data: data as { dx999: string[]; a38: unknown[] } as never, scales: scales.scales,
      scCompute, persist, goTab: onTab,
    });
    eng.renderRefs();
    return () => {
      clearTimeout(timer);
      eng?.rfFlush();
      if (pending) { clearTimeout(timer); const k = pending; pending = ''; void save(k); } // salvează ce era în așteptare
      eng?.destroy();
      root.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, scales, docs, patients.length]);

  if (failed) return <p className="alert">{t('guidesLoadError')}</p>;
  if (!data || !scales || !docs) return <p className="muted">{t('loading')}</p>;
  return (
    <div>
      <p className="muted small">{keep ? t('rfKeepOn') : t('rfKeepOff')}{status === 'saving' ? ' · ' + t('biSaving') : status === 'saved' ? ' · ' + t('biSaved') : status === 'error' ? ' · ' + t('biSaveError') : ''}</p>
      <div ref={hostRef} className="rf-host" />
    </div>
  );
}
