import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, api, fmtDayHeading, fmtTime, startOfDay, startOfWeek, toDateInput, useApp } from '../state';
import { statusLabels } from '../i18n';
import type { Appointment } from '../types';
import { AppointmentForm } from './AppointmentForm';

type View = 'day' | 'week';

export function Schedule() {
  const { t, prefs, rooms, cabinets, procedures, profiles } = useApp();
  const [view, setView] = useState<View>(() => (window.innerWidth < 700 ? 'day' : 'week'));
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [editing, setEditing] = useState<Appointment | 'new' | null>(null);

  const from = view === 'day' ? anchor : startOfWeek(anchor);
  const to = addDays(from, view === 'day' ? 1 : 7);

  const load = useCallback(async () => {
    setItems(await api.listAppointments(from.toISOString(), to.toISOString()));
  }, [from.getTime(), to.getTime()]);

  useEffect(() => {
    void load();
    return api.onAppointmentsChange(() => void load());
  }, [load]);

  const byId = useMemo(
    () => ({
      room: new Map(rooms.map((r) => [r.id, r])),
      cab: new Map(cabinets.map((c) => [c.id, c])),
      proc: new Map(procedures.map((p) => [p.id, p])),
      prof: new Map(profiles.map((p) => [p.id, p])),
    }),
    [rooms, cabinets, procedures, profiles],
  );

  const filtered = items.filter(
    (a) =>
      (showCancelled || (a.status !== 'cancelled' && a.status !== 'no_show')) &&
      (!roomFilter || a.room_id === roomFilter) &&
      (!doctorFilter || a.attending_id === doctorFilter || a.receiving_id === doctorFilter),
  );

  const days = Array.from({ length: view === 'day' ? 1 : 7 }, (_, i) => addDays(from, i));
  const step = view === 'day' ? 1 : 7;
  const doctors = profiles.filter((p) => p.active && p.role !== 'scheduler');

  return (
    <section>
      <div className="toolbar">
        <div className="btn-group">
          <button className="secondary" onClick={() => setAnchor(addDays(anchor, -step))} aria-label={t('prev')}>
            ‹
          </button>
          <button className="secondary" onClick={() => setAnchor(startOfDay(new Date()))}>
            {t('today')}
          </button>
          <button className="secondary" onClick={() => setAnchor(addDays(anchor, step))} aria-label={t('next')}>
            ›
          </button>
        </div>
        <input
          type="date"
          value={toDateInput(anchor)}
          onChange={(e) => e.target.value && setAnchor(startOfDay(new Date(`${e.target.value}T00:00`)))}
          aria-label={t('date')}
        />
        <div className="btn-group" role="group">
          {(['day', 'week'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'chip on' : 'chip'} onClick={() => setView(v)}>
              {t(v)}
            </button>
          ))}
        </div>
        <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} aria-label={t('room')}>
          <option value="">{t('allRooms')}</option>
          {cabinets.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {rooms
                .filter((r) => r.cabinet_id === c.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} aria-label={t('attending')}>
          <option value="">{t('allDoctors')}</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name || d.email}
            </option>
          ))}
        </select>
        <label className="inline">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          {t('showCancelled')}
        </label>
        <button className="primary push-right" onClick={() => setEditing('new')}>
          + {t('newAppointment')}
        </button>
      </div>

      {days.map((d) => {
        const dayItems = filtered.filter((a) => startOfDay(new Date(a.starts_at)).getTime() === d.getTime());
        if (view === 'week' && dayItems.length === 0) return null;
        return (
          <div key={d.toISOString()} className="day">
            <h2 className="day-heading">{fmtDayHeading(d, prefs.lang)}</h2>
            {dayItems.length === 0 ? (
              <p className="muted">{t('noAppointments')}</p>
            ) : (
              <ul className="appt-list">
                {dayItems.map((a) => {
                  const room = byId.room.get(a.room_id);
                  const cab = room && byId.cab.get(room.cabinet_id);
                  const att = byId.prof.get(a.attending_id);
                  const rec = a.receiving_id ? byId.prof.get(a.receiving_id) : null;
                  return (
                    <li key={a.id}>
                      <button className={`appt status-${a.status}`} onClick={() => setEditing(a)}>
                        <span className="appt-time">
                          {fmtTime(a.starts_at, prefs.lang)}
                          <span className="muted">–{fmtTime(a.ends_at, prefs.lang)}</span>
                        </span>
                        <span className="appt-main">
                          <strong>{byId.proc.get(a.procedure_id)?.name ?? '?'}</strong>
                          <span>
                            {a.patient_code} · {a.patient_initials}
                          </span>
                        </span>
                        <span className="appt-meta">
                          <span>
                            {cab?.name} / {room?.name}
                          </span>
                          <span className="muted small">
                            {att?.full_name}
                            {rec ? ` → ${rec.full_name}` : ''}
                          </span>
                        </span>
                        <span className={`badge badge-${a.status}`}>{statusLabels[prefs.lang][a.status]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      {view === 'week' && filtered.length === 0 && <p className="muted">{t('noAppointments')}</p>}

      {editing && (
        <AppointmentForm
          appointment={editing === 'new' ? null : editing}
          defaultDate={anchor}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </section>
  );
}
