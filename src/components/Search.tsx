import { useCallback, useEffect, useState } from 'react';
import type { SearchFilters } from '../data/api';
import { downloadText, toCsv } from '../csv';
import { api, fmtDateTime, fmtTime, useApp } from '../state';
import { statusLabels } from '../i18n';
import { STATUSES, type Appointment, type Status } from '../types';
import { AppointmentDetail } from './AppointmentDetail';
import { AppointmentForm } from './AppointmentForm';

const PAGE = 50;
const EXPORT_MAX = 5000;

type Dialog = null | { kind: 'view'; appt: Appointment } | { kind: 'edit'; appt: Appointment };

interface FormState {
  text: string;
  includeNotes: boolean;
  procedureId: string;
  roomId: string;
  doctorId: string;
  status: Status | '';
  from: string;
  to: string;
}

const EMPTY: FormState = { text: '', includeNotes: false, procedureId: '', roomId: '', doctorId: '', status: '', from: '', to: '' };

function toFilters(f: FormState): SearchFilters {
  return {
    text: f.text,
    includeNotes: f.includeNotes,
    procedureId: f.procedureId || undefined,
    roomId: f.roomId || undefined,
    doctorId: f.doctorId || undefined,
    status: f.status,
    from: f.from ? new Date(`${f.from}T00:00`).toISOString() : undefined,
    // „Până la” este inclusiv: adăugăm o zi.
    to: f.to ? new Date(new Date(`${f.to}T00:00`).getTime() + 86400000).toISOString() : undefined,
  };
}

export function SearchPage() {
  const { t, prefs, procedures, rooms, cabinets, profiles } = useApp();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [applied, setApplied] = useState<FormState>(EMPTY);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const run = useCallback(async (f: FormState, offset: number) => {
    setBusy(true);
    setError(false);
    try {
      const res = await api.searchAppointments(toFilters(f), offset, PAGE);
      setRows((old) => (offset === 0 ? res.rows : [...old, ...res.rows]));
      setTotal(res.total);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run(EMPTY, 0);
  }, [run]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((o) => ({ ...o, [k]: v }));

  const lookup = {
    proc: (id: string) => procedures.find((p) => p.id === id)?.name ?? '?',
    room: (id: string) => {
      const r = rooms.find((x) => x.id === id);
      return r ? `${cabinets.find((c) => c.id === r.cabinet_id)?.name ?? ''} / ${r.name}` : '?';
    },
    person: (id: string | null) => profiles.find((p) => p.id === id)?.full_name ?? '',
  };

  async function exportCsv() {
    const all: Appointment[] = [];
    while (all.length < EXPORT_MAX) {
      const res = await api.searchAppointments(toFilters(applied), all.length, 500);
      all.push(...res.rows);
      if (all.length >= res.total || res.rows.length === 0) break;
    }
    const header = ['Data', 'Început', 'Sfârșit', 'Cod pacient', 'Inițiale', 'Procedură', 'Salon', 'Medic curant', 'Medic primitor', 'Status'];
    const hdrEn = ['Date', 'Start', 'End', 'Patient code', 'Initials', 'Procedure', 'Room', 'Attending', 'Receiving', 'Status'];
    const data = all.map((a) => [
      new Date(a.starts_at).toLocaleDateString('ro-RO'),
      fmtTime(a.starts_at, 'ro'),
      fmtTime(a.ends_at, 'ro'),
      a.patient_code,
      a.patient_initials,
      lookup.proc(a.procedure_id),
      lookup.room(a.room_id),
      lookup.person(a.attending_id),
      lookup.person(a.receiving_id),
      statusLabels[prefs.lang][a.status],
    ]);
    downloadText('programari.csv', toCsv([prefs.lang === 'ro' ? header : hdrEn, ...data]));
  }

  return (
    <section>
      <h1>{t('searchTitle')}</h1>
      <form
        className="card filters"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(form);
          void run(form, 0);
        }}
      >
        <label className="grow">
          {t('searchText')}
          <input value={form.text} onChange={(e) => set('text', e.target.value)} autoComplete="off" />
        </label>
        <div className="grid3">
          <label>
            {t('procedure')}
            <select value={form.procedureId} onChange={(e) => set('procedureId', e.target.value)}>
              <option value="">{t('anyProcedure')}</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            {t('room')}
            <select value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
              <option value="">{t('allRooms')}</option>
              {cabinets.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {rooms.filter((r) => r.cabinet_id === c.id).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            {t('attending')} / {t('receiving')}
            <select value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
              <option value="">{t('allDoctors')}</option>
              {profiles.filter((p) => p.role !== 'scheduler').map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          </label>
          <label>
            {t('status')}
            <select value={form.status} onChange={(e) => set('status', e.target.value as Status | '')}>
              <option value="">{t('anyStatus')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabels[prefs.lang][s]}</option>
              ))}
            </select>
          </label>
          <label>
            {t('fromDate')}
            <input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} />
          </label>
          <label>
            {t('toDate')}
            <input type="date" value={form.to} onChange={(e) => set('to', e.target.value)} />
          </label>
        </div>
        <label className="inline">
          <input type="checkbox" checked={form.includeNotes} onChange={(e) => set('includeNotes', e.target.checked)} />
          {t('searchDeep')}
        </label>
        <div className="row">
          <button type="submit" className="primary" disabled={busy}>{t('doSearch')}</button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setForm(EMPTY);
              setApplied(EMPTY);
              void run(EMPTY, 0);
            }}
          >
            {t('reset')}
          </button>
          <span className="push-right" />
          <button type="button" className="secondary" onClick={() => void exportCsv()} disabled={total === 0}>
            ⤓ {t('exportCsv')}
          </button>
        </div>
        <p className="muted small">{t('exportHint')}</p>
      </form>

      <p className="muted" role="status">
        <strong>{total}</strong> {t(total === 1 ? 'resultOne' : 'resultsCount')}. {t('newestFirst')}
      </p>
      {error && <p className="error">{t('errorGeneric')}</p>}
      {rows.length === 0 && !busy && !error && <p className="muted">{t('noResults')}</p>}

      {rows.length > 0 && (
        <div className="table-wrap card flush">
          <table className="results">
            <thead>
              <tr>
                <th>{t('when')}</th>
                <th>{t('patient')}</th>
                <th>{t('procedure')}</th>
                <th>{t('room')}</th>
                <th>{t('attending')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <button className="rowlink" onClick={() => setDialog({ kind: 'view', appt: a })}>
                      {fmtDateTime(a.starts_at, prefs.lang)}
                    </button>
                  </td>
                  <td>
                    <strong>{a.patient_code}</strong> · {a.patient_initials}
                  </td>
                  <td>{lookup.proc(a.procedure_id)}</td>
                  <td>{lookup.room(a.room_id)}</td>
                  <td>{lookup.person(a.attending_id)}</td>
                  <td>
                    <span className={`badge badge-${a.status}`}>{statusLabels[prefs.lang][a.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length < total && (
        <button className="secondary" disabled={busy} onClick={() => void run(applied, rows.length)}>
          {t('loadMore')}
        </button>
      )}

      {dialog?.kind === 'view' && (
        <AppointmentDetail appointment={dialog.appt} onClose={() => setDialog(null)} onEdit={() => setDialog({ kind: 'edit', appt: dialog.appt })}
          onStatusChanged={(saved) => {
            setRows((old) => old.map((r) => (r.id === saved.id ? saved : r)));
            setDialog({ kind: 'view', appt: saved });
          }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <AppointmentForm
          appointment={dialog.appt}
          defaultDate={new Date()}
          onClose={() => setDialog({ kind: 'view', appt: dialog.appt })}
          onSaved={(saved) => {
            setRows((old) => old.map((r) => (r.id === saved.id ? saved : r)));
            setDialog({ kind: 'view', appt: saved });
          }}
        />
      )}
    </section>
  );
}
