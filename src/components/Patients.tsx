import { printHtml, sheetHtml, timetableHtml, type PlanPrintData } from '../printPlan';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../data/api';
import { api, fmtTime, locale, toDateInput, useApp } from '../state';
import { statusLabels, type TKey } from '../i18n';
import { nextSession } from '../sessions';
import {
  FREQUENCIES, PATIENT_KINDS, type Appointment, type Frequency, type Patient, type PatientKind, type PlanItem, type Procedure,
} from '../types';
import { AppointmentForm } from './AppointmentForm';

/** Modal simplu, pe elementul <dialog> nativ. */
function Dlg({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useApp();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-label={title}>
      <div className="form">
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

const live = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'no_show';

type Dialog =
  | null
  | { kind: 'patient'; patient: Patient | null }
  | { kind: 'plan'; item: PlanItem | null }
  | { kind: 'book'; item: PlanItem };

export function PatientsPage() {
  const { t, prefs, me, patients, plan, procedures, profiles, rooms, cabinets, settings, reloadLookups } = useApp();
  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      return sessionStorage.getItem('medsched-patient') ?? '';
    } catch {
      return '';
    }
  });
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [showPast, setShowPast] = useState(false);

  // Doar medicii și administratorul construiesc profilul; persoana de la programări doar programează.
  const canEdit = me?.role !== 'scheduler';
  const selected = patients.find((p) => p.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    try {
      sessionStorage.setItem('medsched-patient', id);
    } catch {
      /* ignore */
    }
  };

  const loadAppts = useCallback(async () => {
    if (!selectedId) return setAppts([]);
    setAppts(await api.listPatientAppointments(selectedId));
  }, [selectedId]);

  useEffect(() => {
    void loadAppts();
    return api.onAppointmentsChange(() => void loadAppts());
  }, [loadAppts]);

  const procOf = useMemo(() => new Map(procedures.map((p) => [p.id, p])), [procedures]);
  const roomOf = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const doctorName = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || '';

  const list = patients
    .filter((p) => showInactive || p.active)
    .filter((p) => {
      const s = q.trim().toLowerCase();
      return !s || [p.code, p.initials, p.diagnosis ?? ''].some((v) => v.toLowerCase().includes(s));
    });

  const planOf = (pid: string) => plan.filter((x) => x.patient_id === pid && x.active);
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale(prefs.lang), { weekday: 'short', day: 'numeric', month: 'short' });

  const items = selected ? planOf(selected.id) : [];
  const pd = (): PlanPrintData => ({
    lang: prefs.lang, org: settings.clinic_name, patient: selected as Patient, doctor: doctorName(selected?.doctor_id ?? null), items, procOf, roomOf, appts,
  });
  const now = Date.now();
  const upcoming = appts.filter((a) => new Date(a.ends_at).getTime() >= now);
  const past = appts.filter((a) => new Date(a.ends_at).getTime() < now).reverse();

  const stats = (item: PlanItem) => {
    const mine = appts.filter((a) => a.procedure_id === item.procedure_id && live(a));
    return { booked: mine.length, done: mine.filter((a) => a.status === 'done').length };
  };

  /** Prima ședință propusă: după ultima programată (aceeași oră), altfel azi sau data de început. */
  function suggestStart(item: PlanItem): Date {
    const mine = appts.filter((a) => a.procedure_id === item.procedure_id && live(a));
    const last = mine.length ? new Date(mine[mine.length - 1].starts_at) : null;
    let d = last ? nextSession(last, item.frequency) : new Date(`${selected?.start_date ?? toDateInput(new Date())}T09:00`);
    const today = new Date();
    if (d.getTime() < today.getTime()) {
      d = new Date(today);
      d.setHours(last ? last.getHours() : 9, last ? last.getMinutes() : 0, 0, 0);
      if (d.getTime() < today.getTime() && !last) d.setDate(d.getDate() + 1);
    }
    return d;
  }

  const chip = (p: Procedure | undefined) =>
    p ? (
      <span className="proc-chip" style={{ ['--c' as string]: p.color }} title={p.name}>
        {p.short_name || p.name}
      </span>
    ) : null;

  return (
    <section>
      <div className="patients-layout">
        <aside className="card patients-list">
          <div className="row">
            <h1 className="h-inline">{t('patientsTitle')}</h1>
            {canEdit && (
              <button className="primary small" onClick={() => setDialog({ kind: 'patient', patient: null })}>
                + {t('newPatient')}
              </button>
            )}
          </div>
          <input type="search" placeholder={t('searchPatients')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('searchPatients')} />
          <label className="inline small">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            {t('showInactivePatients')}
          </label>
          {list.length === 0 && <p className="muted">{t('noPatients')}</p>}
          <ul className="plain patient-rows">
            {list.map((p) => {
              const its = planOf(p.id);
              return (
                <li key={p.id}>
                  <button className={p.id === selectedId ? 'patient-row on' : 'patient-row'} onClick={() => select(p.id)}>
                    <span>
                      <strong>{p.code}</strong> · {p.initials}
                      {!p.active && <span className="muted"> ({t('inactive')})</span>}
                    </span>
                    <span className="muted small">
                      {t(`kind_${p.kind}` as TKey)}
                      {p.diagnosis ? ` · ${p.diagnosis}` : ''}
                    </span>
                    <span className="patient-chips">{its.slice(0, 6).map((x) => <span key={x.id}>{chip(procOf.get(x.procedure_id))}</span>)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="patient-detail">
          {!selected && (
            <div className="card">
              <p className="muted">{t('selectPatient')}</p>
            </div>
          )}
          {selected && (
            <>
              <div className="card">
                <div className="row">
                  <h2 className="h-inline">
                    {selected.code} · {selected.initials}
                  </h2>
                  <span className="badge">{t(`kind_${selected.kind}` as TKey)}</span>
                  {!selected.active && <span className="badge">{t('inactive')}</span>}
                  <span className="push-right" />
                  {canEdit && (
                    <button className="secondary small" onClick={() => setDialog({ kind: 'patient', patient: selected })}>
                      ✎ {t('edit')}
                    </button>
                  )}
                </div>
                <dl className="kvs">
                  <div className="kv"><dt>{t('startDate')}</dt><dd>{new Date(`${selected.start_date}T00:00`).toLocaleDateString(locale(prefs.lang))}</dd></div>
                  <div className="kv"><dt>{t('treatingDoctor')}</dt><dd>{doctorName(selected.doctor_id) || '—'}</dd></div>
                  {selected.name && <div className="kv"><dt>{t('patientName').replace(/ \(.*\)/, '')}</dt><dd>{selected.name}</dd></div>}
                  {selected.diagnosis && <div className="kv"><dt>{t('diagnosis').replace(/ \(.*\)/, '')}</dt><dd>{selected.diagnosis}</dd></div>}
                  {selected.notes && <div className="kv"><dt>{t('patientAlerts')}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</dd></div>}
                </dl>
              </div>

              <div className="card">
                <div className="row">
                  <h2 className="h-inline">{t('planTitle')}</h2>
                  <span className="push-right" />
                  {canEdit && selected.active && (
                    <button className="primary small" onClick={() => setDialog({ kind: 'plan', item: null })}>
                      + {t('addToPlan')}
                    </button>
                  )}
                </div>
                {items.length === 0 && <p className="muted">{t('planEmptyHint')}</p>}
                <ul className="plain plan-rows">
                  {items.map((it) => {
                    const p = procOf.get(it.procedure_id);
                    const st = stats(it);
                    const left = Math.max(0, it.sessions - st.booked);
                    return (
                      <li key={it.id} className="plan-row">
                        <div className="plan-main">
                          {chip(p)} <strong>{p?.name ?? '?'}</strong>
                          <div className="muted small">
                            {t('planSessions')}: {st.booked}/{it.sessions} ({st.done} {t('doneShort')}) · {t(`freq_${it.frequency}` as TKey)} ·{' '}
                            {it.duration ?? p?.default_duration ?? 30} {t('minutesShort')}
                            {it.notes ? ` · ${it.notes}` : ''}
                          </div>
                          <div className="meter" aria-hidden="true">
                            <span style={{ width: `${Math.min(100, Math.round((st.booked / it.sessions) * 100))}%`, background: p?.color }} />
                          </div>
                        </div>
                        <div className="plan-actions">
                          {left > 0 && selected.active && (
                            <button className="primary small" onClick={() => setDialog({ kind: 'book', item: it })}>
                              {t('book')} ({left})
                            </button>
                          )}
                          {left === 0 && <span className="badge badge-confirmed">{t('allBooked')}</span>}
                          {canEdit && (
                            <button className="secondary small" onClick={() => setDialog({ kind: 'plan', item: it })}>
                              ✎
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="card">
                <h2>{t('bookedHours')}</h2>
                <div className="row">
                  <button className="secondary small" onClick={() => printHtml(`${prefs.lang === 'en' ? 'Treatment sheet' : 'Fișă de tratament'} ${selected.code}`, sheetHtml(pd()), prefs.lang)}>🖨 {t('printSheet')}</button>
                  <button className="secondary small" onClick={() => printHtml(`${prefs.lang === 'en' ? 'Timetable' : 'Orar'} ${selected.code}`, timetableHtml(pd()), prefs.lang)}>🖨 {t('printTimetable')}</button>
                </div>
                {upcoming.length === 0 && <p className="muted">{t('noBooked')}</p>}
                <ul className="plain slot-rows">
                  {upcoming.map((a) => (
                    <SlotRow key={a.id} a={a} procOf={procOf} roomName={roomOf.get(a.room_id)?.name ?? ''} dateFmt={dateFmt} chip={chip} lang={prefs.lang} />
                  ))}
                </ul>
                {past.length > 0 && (
                  <>
                    <button className="ghost small" onClick={() => setShowPast((v) => !v)}>
                      {showPast ? '▾' : '▸'} {t('pastSessions')} ({past.length})
                    </button>
                    {showPast && (
                      <ul className="plain slot-rows">
                        {past.map((a) => (
                          <SlotRow key={a.id} a={a} procOf={procOf} roomName={roomOf.get(a.room_id)?.name ?? ''} dateFmt={dateFmt} chip={chip} lang={prefs.lang} />
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {dialog?.kind === 'patient' && (
        <PatientDialog
          patient={dialog.patient}
          onClose={() => setDialog(null)}
          onSaved={async (p) => {
            await reloadLookups();
            select(p.id);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'plan' && selected && (
        <PlanDialog
          patient={selected}
          item={dialog.item}
          cabinetOfProc={(pr) => cabinets.find((c) => c.id === roomOf.get(pr.room_ids[0])?.cabinet_id)?.name ?? ''}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            await reloadLookups();
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'book' && selected && (
        <AppointmentForm
          appointment={null}
          defaultDate={new Date()}
          defaults={{
            start: suggestStart(dialog.item),
            patientId: selected.id,
            procedureId: dialog.item.procedure_id,
            repeat: Math.max(1, dialog.item.sessions - stats(dialog.item).booked),
          }}
          onClose={() => {
            setDialog(null);
            void loadAppts();
          }}
          onSaved={() => {
            setDialog(null);
            void loadAppts();
          }}
        />
      )}
    </section>
  );
}

function SlotRow({
  a, procOf, roomName, dateFmt, chip, lang,
}: {
  a: Appointment;
  procOf: Map<string, Procedure>;
  roomName: string;
  dateFmt: (iso: string) => string;
  chip: (p: Procedure | undefined) => ReactNode;
  lang: 'ro' | 'en';
}) {
  return (
    <li className={`slot-row status-${a.status}`}>
      <span className="slot-when">
        <strong>{dateFmt(a.starts_at)}</strong> {fmtTime(a.starts_at, lang)}–{fmtTime(a.ends_at, lang)}
      </span>
      <span>{chip(procOf.get(a.procedure_id))}</span>
      <span className="muted small">{roomName}</span>
      <span className={`badge badge-${a.status}`}>{statusLabels[lang][a.status]}</span>
    </li>
  );
}

function PatientDialog({
  patient, onClose, onSaved,
}: {
  patient: Patient | null;
  onClose: () => void;
  onSaved: (p: Patient) => void | Promise<void>;
}) {
  const { t, profiles } = useApp();
  const [f, setF] = useState({
    code: patient?.code ?? '',
    initials: patient?.initials ?? '',
    name: patient?.name ?? '',
    diagnosis: patient?.diagnosis ?? '',
    notes: patient?.notes ?? '',
    kind: (patient?.kind ?? 'inpatient') as PatientKind,
    doctor_id: patient?.doctor_id ?? '',
    start_date: patient?.start_date ?? toDateInput(new Date()),
    active: patient?.active ?? true,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));
  const doctors = profiles.filter((p) => p.role !== 'scheduler' && (p.active || p.id === f.doctor_id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const saved = await api.savePatient({
        ...(patient ? { id: patient.id } : {}),
        code: f.code.trim(),
        initials: f.initials.trim().toUpperCase(),
        name: f.name.trim() || null,
        diagnosis: f.diagnosis.trim() || null,
        notes: f.notes.trim() || null,
        kind: f.kind,
        doctor_id: f.doctor_id || null,
        start_date: f.start_date,
        active: f.active,
      });
      await onSaved(saved);
    } catch (ex) {
      setErr(ex instanceof ApiError && ex.code === 'forbidden' ? t('forbidden') : t('patientSaveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dlg title={patient ? t('editPatient') : t('newPatient')} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="grid2">
          <label>
            {t('patientCode')} *
            <input required maxLength={32} value={f.code} onChange={(e) => set('code', e.target.value)} autoFocus />
          </label>
          <label>
            {t('patientInitials')} *
            <input required maxLength={8} value={f.initials} onChange={(e) => set('initials', e.target.value)} />
          </label>
        </div>
        <div className="grid2">
          <label>
            {t('patientKind')}
            <select value={f.kind} onChange={(e) => set('kind', e.target.value as PatientKind)}>
              {PATIENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kind_${k}` as TKey)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('startDate')}
            <input type="date" required value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </label>
        </div>
        <label>
          {t('treatingDoctor')}
          <select value={f.doctor_id} onChange={(e) => set('doctor_id', e.target.value)}>
            <option value="">{t('none')}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name || d.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('diagnosis')}
          <input value={f.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} autoComplete="off" />
        </label>
        <label>
          {t('patientAlerts')}
          <textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t('patientAlertsHint')} />
        </label>
        <label>
          {t('patientName')}
          <input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
        </label>
        <p className="muted small">{t('sensitiveHint')}</p>
        {patient && (
          <label className="inline">
            <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} />
            {t('patientActive')}
          </label>
        )}
        {err && <div className="alert" role="alert">{err}</div>}
        <footer className="modal-foot">
          <span className="push-right" />
          <button type="button" className="secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="primary" disabled={busy}>{t('save')}</button>
        </footer>
      </form>
    </Dlg>
  );
}

function PlanDialog({
  patient, item, cabinetOfProc, onClose, onSaved,
}: {
  patient: Patient;
  item: PlanItem | null;
  cabinetOfProc: (p: Procedure) => string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t, procedures, plan } = useApp();
  const [procId, setProcId] = useState(item?.procedure_id ?? '');
  const [q, setQ] = useState('');
  const [sessions, setSessions] = useState(item?.sessions ?? 10);
  const [freq, setFreq] = useState<Frequency>(item?.frequency ?? 'daily');
  const [duration, setDuration] = useState<string>(item?.duration ? String(item.duration) : '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const taken = new Set(plan.filter((x) => x.patient_id === patient.id && x.active).map((x) => x.procedure_id));
  const proc = procedures.find((p) => p.id === procId);

  // Catalogul, grupat pe categorie (cabinetul primului aparat).
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const m = new Map<string, Procedure[]>();
    for (const p of procedures) {
      if (!p.active || taken.has(p.id)) continue;
      if (s && !`${p.name} ${p.short_name}`.toLowerCase().includes(s)) continue;
      const g = cabinetOfProc(p) || '—';
      m.set(g, [...(m.get(g) ?? []), p]);
    }
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedures, q, plan]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!procId) return;
    setBusy(true);
    setErr(null);
    try {
      await api.savePlanItem({
        ...(item ? { id: item.id } : {}),
        patient_id: patient.id,
        procedure_id: procId,
        sessions,
        frequency: freq,
        duration: duration ? Number(duration) : null,
        notes: notes.trim() || null,
        active: true,
      });
      await onSaved();
    } catch {
      setErr(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item || !window.confirm(t('removeFromPlanConfirm'))) return;
    setBusy(true);
    try {
      await api.savePlanItem({ id: item.id, patient_id: patient.id, procedure_id: item.procedure_id, active: false });
      await onSaved();
    } catch {
      setErr(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dlg title={item ? t('editPlanItem') : t('addToPlan')} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {!item && (
          <>
            <input type="search" placeholder={t('searchProcedures')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label={t('searchProcedures')} />
            <div className="catalog-pick" role="listbox" aria-label={t('procedures')}>
              {groups.length === 0 && <p className="muted">{t('noProcedures')}</p>}
              {groups.map(([g, list]) => (
                <div key={g}>
                  <h4>{g}</h4>
                  {list.map((p) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={p.id === procId}
                      key={p.id}
                      className={p.id === procId ? 'pick on' : 'pick'}
                      onClick={() => {
                        setProcId(p.id);
                        setDuration('');
                      }}
                    >
                      <span className="proc-chip" style={{ ['--c' as string]: p.color }}>{p.short_name || p.name}</span>
                      <span>{p.name}</span>
                      <span className="muted small">{p.default_duration} {t('minutesShort')}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
        {item && proc && <p><span className="proc-chip" style={{ ['--c' as string]: proc.color }}>{proc.short_name || proc.name}</span> <strong>{proc.name}</strong></p>}

        {procId && (
          <>
            <div className="grid3">
              <label>
                {t('sessions')} *
                <input type="number" required min={1} max={90} value={sessions} onChange={(e) => setSessions(Number(e.target.value))} />
              </label>
              <label>
                {t('frequency')}
                <select value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
                  {FREQUENCIES.map((x) => (
                    <option key={x} value={x}>{t(`freq_${x}` as TKey)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('duration').replace(/ \(.*\)/, '')} ({t('minutesShort')})
                <input type="number" min={5} max={720} step={5} placeholder={String(proc?.default_duration ?? '')} value={duration} onChange={(e) => setDuration(e.target.value)} />
              </label>
            </div>
            <label>
              {t('notes')}
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('planNotesHint')} />
            </label>
          </>
        )}
        {err && <div className="alert" role="alert">{err}</div>}
        <footer className="modal-foot">
          {item && <button type="button" className="ghost" onClick={() => void remove()} disabled={busy}>{t('removeFromPlan')}</button>}
          <span className="push-right" />
          <button type="button" className="secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="primary" disabled={busy || !procId}>{t('save')}</button>
        </footer>
      </form>
    </Dlg>
  );
}
