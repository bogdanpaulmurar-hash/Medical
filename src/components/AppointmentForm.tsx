import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, findConflicts, freeRooms } from '../data/api';
import { addDays, api, fmtTime, startOfDay, toDateInput, toTimeInput, useApp } from '../state';
import { statusLabels, type TKey } from '../i18n';
import { nextSession } from '../sessions';
import { STATUSES, type Appointment, type AppointmentInput, type Frequency, type Status } from '../types';

interface Props {
  appointment: Appointment | null;
  defaultDate: Date;
  defaults?: {
    start: Date;
    roomId?: string;
    attendingId?: string;
    receivingId?: string;
    patientId?: string; // programare pentru un pacient (din fișa lui)
    procedureId?: string;
    repeat?: number; // câte ședințe să propună în serie
  };
  onClose: () => void;
  onSaved: (saved: Appointment) => void;
}

const SEARCH_FROM = 8 * 60;
const SEARCH_TO = 16 * 60;

export function AppointmentForm({ appointment, defaultDate, defaults, onClose, onSaved }: Props) {
  const { t, prefs, procedures, rooms, cabinets, profiles, patients, plan, me } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const initStart = appointment ? new Date(appointment.starts_at) : defaults ? new Date(defaults.start) : (() => {
    const d = new Date(defaultDate);
    d.setHours(9, 0, 0, 0);
    return d;
  })();
  const startPatient = appointment?.patient_id ?? defaults?.patientId ?? '';
  const firstProc = (pid: string) => {
    const items = plan.filter((x) => x.patient_id === pid && x.active);
    return items.find((x) => x.procedure_id === defaults?.procedureId)?.procedure_id ?? items[0]?.procedure_id ?? '';
  };
  const startProcId =
    appointment?.procedure_id ?? (startPatient ? firstProc(startPatient) : procedures.find((p) => p.active)?.id ?? '');
  const durationFor = (pid: string, procId: string) => {
    const item = plan.find((x) => x.patient_id === pid && x.procedure_id === procId && x.active);
    return item?.duration ?? procedures.find((p) => p.id === procId)?.default_duration ?? 30;
  };
  const initDuration = appointment
    ? Math.round((new Date(appointment.ends_at).getTime() - initStart.getTime()) / 60000)
    : durationFor(startPatient, startProcId);

  const [f, setF] = useState({
    patient_id: startPatient,
    patient_code: appointment?.patient_code ?? patients.find((p) => p.id === startPatient)?.code ?? '',
    patient_initials: appointment?.patient_initials ?? patients.find((p) => p.id === startPatient)?.initials ?? '',
    patient_name: appointment?.patient_name ?? patients.find((p) => p.id === startPatient)?.name ?? '',
    diagnosis: appointment?.diagnosis ?? patients.find((p) => p.id === startPatient)?.diagnosis ?? '',
    notes: appointment?.notes ?? '',
    procedure_id: startProcId,
    room_id: appointment?.room_id ?? defaults?.roomId ?? '',
    date: toDateInput(initStart),
    time: toTimeInput(initStart),
    duration: initDuration,
    attending_id: appointment ? (appointment.attending_id ?? '') : defaults?.attendingId ?? (me?.role === 'attending' && !startPatient ? me.id : ''),
    receiving_id: appointment?.receiving_id ?? defaults?.receivingId ?? '',
    status: (appointment?.status ?? 'planned') as Status,
  });
  const [count, setCount] = useState(defaults?.repeat ?? 1);
  const [roomTouched, setRoomTouched] = useState(!!appointment || !!defaults?.roomId);
  const [dayItems, setDayItems] = useState<Appointment[]>([]);
  const [patientAppts, setPatientAppts] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [allowOverlap, setAllowOverlap] = useState(!!appointment?.overlap_ok);
  const [autoShift, setAutoShift] = useState(true);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const patient = patients.find((p) => p.id === f.patient_id) ?? null;
  const planItem = plan.find((x) => x.patient_id === f.patient_id && x.procedure_id === f.procedure_id && x.active) ?? null;
  const proc = procedures.find((p) => p.id === f.procedure_id) ?? null;

  const start = new Date(`${f.date}T${f.time || '00:00'}`);
  const end = new Date(start.getTime() + Number(f.duration || 0) * 60000);

  // Programările din ziua respectivă, pentru verificarea conflictelor în timp real.
  useEffect(() => {
    if (Number.isNaN(start.getTime())) return;
    const d0 = startOfDay(start);
    void api.listAppointments(d0.toISOString(), addDays(d0, 1).toISOString()).then(setDayItems);
  }, [f.date]);

  // Programările pacientului: câte ședințe au rămas la procedura aleasă.
  useEffect(() => {
    if (!f.patient_id) return setPatientAppts([]);
    void api.listPatientAppointments(f.patient_id).then(setPatientAppts);
  }, [f.patient_id]);

  const booked = patientAppts.filter(
    (a) => a.procedure_id === f.procedure_id && a.status !== 'cancelled' && a.status !== 'no_show' && a.id !== appointment?.id,
  ).length;
  const remaining = planItem ? Math.max(0, planItem.sessions - booked) : 0;
  useEffect(() => {
    setCount((c) => Math.max(1, Math.min(c, remaining || 1)));
  }, [remaining]);

  // Aparatele pe care se poate face procedura (altfel, toate).
  const procRoomIds = proc && proc.room_ids.length > 0 ? proc.room_ids : rooms.filter((r) => r.active).map((r) => r.id);
  const startIso = Number.isNaN(start.getTime()) ? '' : start.toISOString();
  const endIso = Number.isNaN(end.getTime()) ? '' : end.toISOString();

  // Alegere automată a unui aparat liber (dacă utilizatorul nu a ales unul).
  useEffect(() => {
    if (roomTouched || !startIso || !endIso) return;
    const free = freeRooms(procRoomIds, rooms, patient?.kind ?? null, startIso, endIso, dayItems, appointment?.id ?? null);
    const next = free[0]?.id ?? procRoomIds[0] ?? '';
    if (next !== f.room_id) setF((o) => ({ ...o, room_id: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTouched, startIso, endIso, f.procedure_id, f.patient_id, dayItems, rooms.length]);

  const input: AppointmentInput = {
    patient_id: f.patient_id || null,
    patient_code: f.patient_code.trim(),
    patient_initials: f.patient_initials.trim().toUpperCase(),
    patient_name: f.patient_name.trim() || null,
    diagnosis: f.diagnosis.trim() || null,
    notes: f.notes.trim() || null,
    procedure_id: f.procedure_id,
    room_id: f.room_id,
    starts_at: startIso,
    ends_at: endIso,
    attending_id: f.attending_id || null,
    receiving_id: f.receiving_id || null,
    status: f.status,
    overlap_ok: false,
  };

  const conflicts = useMemo(
    () => (input.starts_at && input.room_id ? findConflicts(input, dayItems, appointment?.id ?? null, rooms) : []),
    [dayItems, rooms, input.starts_at, input.ends_at, input.room_id, input.attending_id, input.receiving_id, input.patient_id, input.status],
  );

  input.overlap_ok = conflicts.length > 0 && allowOverlap;

  /** Cea mai apropiată oră liberă (aparat, medic, pacient) într-o zi; `earliest` = prima din zi. */
  function freeTimeFor(day: Date, known: Appointment[], desired: Date, earliest: boolean, selfId: string | null) {
    const dur = Number(f.duration || 0);
    if (!dur) return null;
    const want = desired.getHours() * 60 + desired.getMinutes();
    const mins: number[] = [];
    for (let m = SEARCH_FROM; m + dur <= SEARCH_TO; m += 5) mins.push(m);
    if (!earliest) mins.sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
    const pool = [f.room_id, ...procRoomIds.filter((id) => id !== f.room_id)].filter(Boolean);
    for (const m of mins) {
      const s0 = new Date(day);
      s0.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const e0 = new Date(s0.getTime() + dur * 60000);
      for (const roomId of pool) {
        const room = rooms.find((r) => r.id === roomId);
        if (!room || !room.active) continue;
        if (roomId !== f.room_id && room.audience !== 'all' && patient && room.audience !== patient.kind) continue;
        const cand = { ...input, overlap_ok: false, room_id: roomId, starts_at: s0.toISOString(), ends_at: e0.toISOString() };
        if (findConflicts(cand, known, selfId, rooms).length === 0) return { start: s0, roomId };
      }
    }
    return null;
  }

  function suggestTime() {
    setError(null);
    setInfo(null);
    const day = startOfDay(start);
    const hit = freeTimeFor(day, dayItems, start, true, appointment?.id ?? null);
    if (!hit) {
      setError(t('noFreeTime' as TKey));
      return;
    }
    setRoomTouched(false);
    setF((o) => ({ ...o, time: toTimeInput(hit.start), room_id: hit.roomId }));
    setAllowOverlap(false);
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));

  function pickPatient(id: string) {
    const pt = patients.find((p) => p.id === id);
    const procId = id ? firstProc(id) : procedures.find((p) => p.active)?.id ?? '';
    setRoomTouched(false);
    setCount(1);
    setF((o) => ({
      ...o,
      patient_id: id,
      patient_code: pt?.code ?? '',
      patient_initials: pt?.initials ?? '',
      patient_name: pt?.name ?? '',
      diagnosis: pt?.diagnosis ?? '',
      procedure_id: procId,
      duration: appointment ? o.duration : durationFor(id, procId),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (conflicts.length && !allowOverlap) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (!appointment && f.patient_id && count > 1) {
        await saveSeries();
      } else {
        const saved = await api.saveAppointment(appointment?.id ?? null, input);
        onSaved(saved);
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'other';
      setError(code === 'other' ? t('errorGeneric') : t(code as TKey));
    } finally {
      setBusy(false);
    }
  }

  /** O serie de ședințe la aceeași oră, după frecvența din plan; zilele fără loc sunt sărite și raportate. */
  async function saveSeries() {
    const freq: Frequency = planItem?.frequency ?? 'daily';
    const dates: Date[] = [start];
    while (dates.length < count) dates.push(nextSession(dates[dates.length - 1], freq));
    const first = startOfDay(dates[0]);
    const last = addDays(startOfDay(dates[dates.length - 1]), 1);
    const known = await api.listAppointments(first.toISOString(), last.toISOString());
    const made: Appointment[] = [];
    const skipped: string[] = [];
    const shifted: string[] = [];
    const overlapped: string[] = [];
    for (const d of dates) {
      const s = new Date(d);
      const e = new Date(s.getTime() + Number(f.duration) * 60000);
      const pool = [f.room_id, ...procRoomIds.filter((id) => id !== f.room_id)];
      let chosen: AppointmentInput | null = null;
      for (const roomId of pool) {
        const room = rooms.find((r) => r.id === roomId);
        if (!room || !room.active) continue;
        if (roomId !== f.room_id && room.audience !== 'all' && patient && room.audience !== patient.kind) continue;
        const cand = { ...input, overlap_ok: false, room_id: roomId, starts_at: s.toISOString(), ends_at: e.toISOString() };
        if (findConflicts(cand, [...known, ...made], null, rooms).length === 0) {
          chosen = cand;
          break;
        }
      }
      const label = s.toLocaleDateString(prefs.lang === 'ro' ? 'ro-RO' : 'en-GB', { day: 'numeric', month: 'short' });
      if (!chosen && autoShift) {
        const hit = freeTimeFor(startOfDay(s), [...known, ...made], s, false, null);
        if (hit) {
          chosen = { ...input, overlap_ok: false, room_id: hit.roomId, starts_at: hit.start.toISOString(), ends_at: new Date(hit.start.getTime() + Number(f.duration) * 60000).toISOString() };
          shifted.push(`${label} ${toTimeInput(hit.start)}`);
        }
      }
      if (!chosen && allowOverlap) {
        chosen = { ...input, overlap_ok: true, room_id: f.room_id, starts_at: s.toISOString(), ends_at: e.toISOString() };
        overlapped.push(label);
      }
      if (!chosen) {
        skipped.push(label);
        continue;
      }
      made.push(await api.saveAppointment(null, chosen));
    }
    if (skipped.length === 0 && shifted.length === 0 && overlapped.length === 0 && made.length > 0) {
      onSaved(made[0]);
      return;
    }
    setInfo(
      `${t('seriesDone')}: ${made.length}/${dates.length}` +
        (shifted.length ? `. ${t('seriesShifted' as TKey)}: ${shifted.join(', ')}` : '') +
        (overlapped.length ? `. ${t('seriesOverlapped' as TKey)}: ${overlapped.join(', ')}` : ''),
    );
    if (skipped.length) setError(`${t('seriesSkipped')}: ${skipped.join(', ')}`);
  }

  const doctors = profiles.filter((p) => p.active || p.id === f.attending_id || p.id === f.receiving_id);
  const name = (id: string | null) => profiles.find((p) => p.id === id)?.full_name ?? '';

  // Procedurile alese: doar cele din planul pacientului, dacă e ales un pacient.
  const planProcIds = f.patient_id ? plan.filter((x) => x.patient_id === f.patient_id && x.active).map((x) => x.procedure_id) : null;
  const procOptions = procedures.filter((p) => (planProcIds ? planProcIds.includes(p.id) || p.id === f.procedure_id : p.active || p.id === f.procedure_id));
  const patientList = patients.filter((p) => p.active || p.id === f.patient_id);
  const showCount = !appointment && !!f.patient_id && !!planItem;

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} aria-labelledby="appt-title">
      <form onSubmit={submit} className="form">
        <header className="modal-head">
          <h2 id="appt-title">{appointment ? t('editAppointment') : t('newAppointment')}</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </header>

        <label>
          {t('patientFromList')}
          <select value={f.patient_id} onChange={(e) => pickPatient(e.target.value)} disabled={!!appointment?.patient_id}>
            <option value="">{t('patientFree')}</option>
            {patientList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.initials}
                {p.diagnosis ? ` · ${p.diagnosis}` : ''}
              </option>
            ))}
          </select>
        </label>
        {f.patient_id && planProcIds && planProcIds.length === 0 && <p className="alert">{t('planEmptyHint')}</p>}

        <div className="grid2">
          <label>
            {t('patientCode')} *
            <input
              required
              maxLength={32}
              value={f.patient_code}
              onChange={(e) => set('patient_code', e.target.value)}
              readOnly={!!f.patient_id}
              autoFocus={!f.patient_id}
            />
          </label>
          <label>
            {t('patientInitials')} *
            <input required maxLength={8} value={f.patient_initials} onChange={(e) => set('patient_initials', e.target.value)} readOnly={!!f.patient_id} />
          </label>
        </div>

        <label>
          {t('procedure')} *
          <select
            required
            value={f.procedure_id}
            onChange={(e) => {
              setRoomTouched(!!appointment && e.target.value === appointment.procedure_id);
              setF((o) => ({
                ...o,
                procedure_id: e.target.value,
                duration: appointment && e.target.value === appointment.procedure_id ? o.duration : durationFor(o.patient_id, e.target.value),
              }));
            }}
          >
            <option value="" disabled />
            {procOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {f.patient_id && planItem && (
          <p className="muted small">
            {t('planSessions')}: {booked}/{planItem.sessions} · {t('remaining')}: {remaining}
          </p>
        )}

        <div className="grid3">
          <label>
            {t('date')} *
            <input type="date" required value={f.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label>
            {t('start')} *
            <input type="time" required step={300} value={f.time} onChange={(e) => set('time', e.target.value)} />
          </label>
          <label>
            {t('duration')} *
            <input
              type="number"
              required
              min={5}
              max={720}
              step={5}
              value={f.duration}
              onChange={(e) => set('duration', Number(e.target.value))}
            />
          </label>
        </div>
        {!Number.isNaN(end.getTime()) && (
          <p className="muted small">
            {t('end')}: {fmtTime(end.toISOString(), prefs.lang)}
          </p>
        )}
        <div className="row">
          <button type="button" className="secondary small" onClick={suggestTime}>
            {t('suggestTime' as TKey)}
          </button>
          <span className="muted small">{t('suggestTimeHint' as TKey)}</span>
        </div>

        {showCount && (
          <label>
            {t('seriesCount')}
            <input
              type="number"
              min={1}
              max={Math.max(1, remaining)}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(Math.max(1, remaining), Number(e.target.value) || 1)))}
            />
            <span className="muted small">
              {planItem && t(`freq_${planItem.frequency}` as TKey)}. {t('seriesHint')}
            </span>
          </label>
        )}

        <label>
          {t('deviceRoom')} *
          <select
            required
            value={f.room_id}
            onChange={(e) => {
              setRoomTouched(true);
              set('room_id', e.target.value);
            }}
          >
            <option value="" disabled />
            {cabinets.map((c) => {
              const list = rooms.filter(
                (r) => r.cabinet_id === c.id && ((r.active && procRoomIds.includes(r.id)) || r.id === f.room_id),
              );
              if (list.length === 0) return null;
              return (
                <optgroup key={c.id} label={c.name}>
                  {list.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.capacity > 1 ? ` · ${r.capacity} ${t('places')}` : ''}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>

        <div className="grid2">
          <label>
            {t('attending')}
            <select value={f.attending_id} onChange={(e) => set('attending_id', e.target.value)}>
              <option value="">{t('none')}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('receiving')}
            <select value={f.receiving_id} onChange={(e) => set('receiving_id', e.target.value)}>
              <option value="">{t('none')}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          {t('status')}
          <select value={f.status} onChange={(e) => set('status', e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabels[prefs.lang][s]}
              </option>
            ))}
          </select>
        </label>

        <details open={!!(appointment?.patient_name || appointment?.diagnosis || appointment?.notes)}>
          <summary>{t('optionalData')}</summary>
          <p className="muted small">{t('sensitiveHint')}</p>
          <label>
            {t('patientName')}
            <input value={f.patient_name} onChange={(e) => set('patient_name', e.target.value)} autoComplete="off" />
          </label>
          <label>
            {t('diagnosis')}
            <input value={f.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} autoComplete="off" />
          </label>
          <label>
            {t('notes')}
            <textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </details>

        {conflicts.length > 0 && (
          <div className="alert" role="alert">
            <strong>{t('conflictsFound')}</strong>
            <ul>
              {conflicts.map((c, i) => (
                <li key={i}>
                  {t(`conflict_${c.kind}` as TKey)} ({fmtTime(c.appointment.starts_at, prefs.lang)}–
                  {fmtTime(c.appointment.ends_at, prefs.lang)}, {c.appointment.patient_code})
                </li>
              ))}
            </ul>
            <label className="inline">
              <input type="checkbox" checked={allowOverlap} onChange={(e) => setAllowOverlap(e.target.checked)} />
              {t('allowOverlap' as TKey)}
            </label>
          </div>
        )}
        {showCount && count > 1 && (
          <div className="ov-warn">
            <label className="inline">
              <input type="checkbox" checked={autoShift} onChange={(e) => setAutoShift(e.target.checked)} />
              {t('autoShift' as TKey)}
            </label>
            <label className="inline">
              <input type="checkbox" checked={allowOverlap} onChange={(e) => setAllowOverlap(e.target.checked)} />
              {t('allowOverlapSeries' as TKey)}
            </label>
          </div>
        )}
        {info && (
          <div className="ok" role="status">
            {info}
          </div>
        )}
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {appointment && (
          <p className="muted small">
            {t('createdBy')}: {name(appointment.created_by) || '—'} · {t('updatedBy')}: {name(appointment.updated_by) || '—'}
          </p>
        )}

        <footer className="modal-foot">
          <span className="push-right" />
          <button type="button" className="secondary" onClick={onClose}>
            {info ? t('close') : t('cancel')}
          </button>
          {!info && (
            <button type="submit" className="primary" disabled={busy || (conflicts.length > 0 && !allowOverlap) || (!!f.patient_id && !planItem && !(appointment && f.procedure_id === appointment.procedure_id))}>
              {t('save')}
            </button>
          )}
        </footer>

      </form>
    </dialog>
  );
}
