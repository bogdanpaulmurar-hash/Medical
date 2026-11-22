import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, findConflicts } from '../data/api';
import { addDays, api, fmtTime, startOfDay, toDateInput, toTimeInput, useApp } from '../state';
import { statusLabels, type TKey } from '../i18n';
import { STATUSES, type Appointment, type AppointmentInput, type Status } from '../types';

interface Props {
  appointment: Appointment | null;
  defaultDate: Date;
  defaults?: { start: Date; roomId?: string; attendingId?: string; receivingId?: string };
  onClose: () => void;
  onSaved: (saved: Appointment) => void;
}

export function AppointmentForm({ appointment, defaultDate, defaults, onClose, onSaved }: Props) {
  const { t, prefs, procedures, rooms, cabinets, profiles, me } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const initStart = appointment ? new Date(appointment.starts_at) : defaults ? new Date(defaults.start) : (() => {
    const d = new Date(defaultDate);
    d.setHours(9, 0, 0, 0);
    return d;
  })();
  const initDuration = appointment
    ? Math.round((new Date(appointment.ends_at).getTime() - initStart.getTime()) / 60000)
    : procedures.find((p) => p.active)?.default_duration ?? 30;

  const [f, setF] = useState({
    patient_code: appointment?.patient_code ?? '',
    patient_initials: appointment?.patient_initials ?? '',
    patient_name: appointment?.patient_name ?? '',
    diagnosis: appointment?.diagnosis ?? '',
    notes: appointment?.notes ?? '',
    procedure_id: appointment?.procedure_id ?? procedures.find((p) => p.active)?.id ?? '',
    room_id: appointment?.room_id ?? defaults?.roomId ?? rooms.find((r) => r.active)?.id ?? '',
    date: toDateInput(initStart),
    time: toTimeInput(initStart),
    duration: initDuration,
    attending_id: appointment?.attending_id ?? defaults?.attendingId ?? (me?.role === 'attending' ? me.id : ''),
    receiving_id: appointment?.receiving_id ?? defaults?.receivingId ?? '',
    status: (appointment?.status ?? 'planned') as Status,
  });
  const [dayItems, setDayItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const start = new Date(`${f.date}T${f.time || '00:00'}`);
  const end = new Date(start.getTime() + Number(f.duration || 0) * 60000);

  // Programările din ziua respectivă, pentru verificarea conflictelor în timp real.
  useEffect(() => {
    if (Number.isNaN(start.getTime())) return;
    const d0 = startOfDay(start);
    void api.listAppointments(d0.toISOString(), addDays(d0, 1).toISOString()).then(setDayItems);
  }, [f.date]);

  const input: AppointmentInput = {
    patient_code: f.patient_code.trim(),
    patient_initials: f.patient_initials.trim().toUpperCase(),
    patient_name: f.patient_name.trim() || null,
    diagnosis: f.diagnosis.trim() || null,
    notes: f.notes.trim() || null,
    procedure_id: f.procedure_id,
    room_id: f.room_id,
    starts_at: Number.isNaN(start.getTime()) ? '' : start.toISOString(),
    ends_at: Number.isNaN(end.getTime()) ? '' : end.toISOString(),
    attending_id: f.attending_id,
    receiving_id: f.receiving_id || null,
    status: f.status,
  };

  const conflicts = useMemo(
    () => (input.starts_at ? findConflicts(input, dayItems, appointment?.id ?? null) : []),
    [dayItems, input.starts_at, input.ends_at, input.room_id, input.attending_id, input.receiving_id, input.status],
  );

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (conflicts.length) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveAppointment(appointment?.id ?? null, input);
      onSaved(saved);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'other';
      setError(code === 'other' ? t('errorGeneric') : t(code as TKey));
    } finally {
      setBusy(false);
    }
  }

  const doctors = profiles.filter((p) => p.active || p.id === f.attending_id || p.id === f.receiving_id);
  const name = (id: string | null) => profiles.find((p) => p.id === id)?.full_name ?? '';

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} aria-labelledby="appt-title">
      <form onSubmit={submit} className="form">
        <header className="modal-head">
          <h2 id="appt-title">{appointment ? t('editAppointment') : t('newAppointment')}</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </header>

        <div className="grid2">
          <label>
            {t('patientCode')} *
            <input required maxLength={32} value={f.patient_code} onChange={(e) => set('patient_code', e.target.value)} autoFocus />
          </label>
          <label>
            {t('patientInitials')} *
            <input required maxLength={8} value={f.patient_initials} onChange={(e) => set('patient_initials', e.target.value)} />
          </label>
        </div>

        <label>
          {t('procedure')} *
          <select
            required
            value={f.procedure_id}
            onChange={(e) => {
              const p = procedures.find((x) => x.id === e.target.value);
              setF((o) => ({ ...o, procedure_id: e.target.value, duration: appointment ? o.duration : p?.default_duration ?? o.duration }));
            }}
          >
            <option value="" disabled />
            {procedures
              .filter((p) => p.active || p.id === f.procedure_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>

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

        <label>
          {t('room')} *
          <select required value={f.room_id} onChange={(e) => set('room_id', e.target.value)}>
            <option value="" disabled />
            {cabinets.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {rooms
                  .filter((r) => r.cabinet_id === c.id && (r.active || r.id === f.room_id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {c.name} / {r.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="grid2">
          <label>
            {t('attending')} *
            <select required value={f.attending_id} onChange={(e) => set('attending_id', e.target.value)}>
              <option value="" disabled />
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
            {t('cancel')}
          </button>
          <button type="submit" className="primary" disabled={busy || conflicts.length > 0}>
            {t('save')}
          </button>
        </footer>

      </form>
    </dialog>
  );
}
