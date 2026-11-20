import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays, addMonths, api, fmtDayHeading, fmtRange, fmtTime, sameDay, startOfDay, startOfMonth, startOfWeek,
  toDateInput, useApp,
} from '../state';
import { statusLabels } from '../i18n';
import type { Appointment } from '../types';
import { AppointmentDetail } from './AppointmentDetail';
import { AppointmentForm } from './AppointmentForm';
import { MonthGrid } from './MonthGrid';
import { TimeGrid, type BlockInfo, type GridCol } from './TimeGrid';

type View = 'day' | 'week' | 'month' | 'list';
type Dialog =
  | null
  | { kind: 'view'; appt: Appointment }
  | { kind: 'edit'; appt: Appointment }
  | { kind: 'new'; start?: Date; roomId?: string };

const HUES = [172, 212, 266, 330, 24, 96, 190, 46];

export function Schedule() {
  const { t, prefs, rooms, cabinets, procedures, profiles } = useApp();
  const [view, setView] = useState<View>(() => (window.innerWidth < 700 ? 'day' : 'week'));
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const { from, to } = useMemo(() => {
    if (view === 'day') return { from: anchor, to: addDays(anchor, 1) };
    if (view === 'month') {
      const first = startOfWeek(startOfMonth(anchor));
      return { from: first, to: addDays(first, 42) };
    }
    const w = startOfWeek(anchor);
    return { from: w, to: addDays(w, 7) };
  }, [view, anchor]);

  const load = useCallback(async () => {
    setItems(await api.listAppointments(from.toISOString(), to.toISOString()));
  }, [from, to]);

  useEffect(() => {
    void load();
    return api.onAppointmentsChange(() => void load());
  }, [load]);

  const orderedRooms = useMemo(() => cabinets.flatMap((c) => rooms.filter((r) => r.cabinet_id === c.id)), [cabinets, rooms]);
  const lookups = useMemo(
    () => ({
      room: new Map(rooms.map((r) => [r.id, r])),
      cab: new Map(cabinets.map((c) => [c.id, c])),
      proc: new Map(procedures.map((p) => [p.id, p])),
      prof: new Map(profiles.map((p) => [p.id, p])),
      hue: new Map(orderedRooms.map((r, i) => [r.id, HUES[i % HUES.length]])),
    }),
    [rooms, cabinets, procedures, profiles, orderedRooms],
  );

  const describe = useCallback(
    (a: Appointment): BlockInfo => {
      const room = lookups.room.get(a.room_id);
      return {
        proc: lookups.proc.get(a.procedure_id)?.name ?? '?',
        patient: `${a.patient_code} · ${a.patient_initials}`,
        room: room ? `${lookups.cab.get(room.cabinet_id)?.name ?? ''} / ${room.name}` : '',
        hue: lookups.hue.get(a.room_id) ?? HUES[0],
      };
    },
    [lookups],
  );

  const filtered = items.filter(
    (a) =>
      (showCancelled || (a.status !== 'cancelled' && a.status !== 'no_show')) &&
      (!roomFilter || a.room_id === roomFilter) &&
      (!doctorFilter || a.attending_id === doctorFilter || a.receiving_id === doctorFilter),
  );

  const today = startOfDay(new Date());
  const cols: GridCol[] = useMemo(() => {
    if (view === 'day') {
      const dayItems = filtered;
      const used = new Set(dayItems.map((a) => a.room_id));
      return orderedRooms
        .filter((r) => (r.active || used.has(r.id)) && (!roomFilter || r.id === roomFilter))
        .map((r) => ({
          key: r.id,
          title: r.name,
          sub: lookups.cab.get(r.cabinet_id)?.name,
          date: anchor,
          roomId: r.id,
          today: sameDay(anchor, today),
          items: dayItems.filter((a) => a.room_id === r.id),
        }));
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i);
      return {
        key: d.toISOString(),
        title: d.toLocaleDateString(prefs.lang === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'short', day: 'numeric' }),
        date: d,
        roomId: roomFilter || undefined,
        today: sameDay(d, today),
        items: filtered.filter((a) => sameDay(startOfDay(new Date(a.starts_at)), d)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filtered, orderedRooms, roomFilter, anchor, from, prefs.lang, lookups]);

  const step = (dir: 1 | -1) =>
    setAnchor(view === 'day' ? addDays(anchor, dir) : view === 'month' ? addMonths(anchor, dir) : addDays(anchor, 7 * dir));

  const doctors = profiles.filter((p) => p.active && p.role !== 'scheduler');
  const viewKey: Record<View, 'day' | 'week' | 'month' | 'list'> = { day: 'day', week: 'week', month: 'month', list: 'list' };
  const rangeView = view === 'month' ? 'month' : view === 'day' ? 'day' : 'week';

  return (
    <section>
      <div className="toolbar">
        <div className="btn-group">
          <button className="secondary" onClick={() => step(-1)} aria-label={t('prev')}>‹</button>
          <button className="secondary" onClick={() => setAnchor(startOfDay(new Date()))}>{t('today')}</button>
          <button className="secondary" onClick={() => step(1)} aria-label={t('next')}>›</button>
        </div>
        <h1 className="range-title">
          {fmtRange(view === 'month' ? startOfMonth(anchor) : from, to, rangeView, prefs.lang)}
        </h1>
        <div className="seg" role="group">
          {(['day', 'week', 'month', 'list'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)} aria-pressed={view === v}>
              {t(viewKey[v])}
            </button>
          ))}
        </div>
        <button className="primary push-right" onClick={() => setDialog({ kind: 'new' })}>
          + {t('newAppointment')}
        </button>
      </div>
      <div className="toolbar sub">
        <input
          type="date"
          value={toDateInput(anchor)}
          onChange={(e) => e.target.value && setAnchor(startOfDay(new Date(`${e.target.value}T00:00`)))}
          aria-label={t('date')}
        />
        <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} aria-label={t('room')}>
          <option value="">{t('allRooms')}</option>
          {cabinets.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {rooms.filter((r) => r.cabinet_id === c.id).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} aria-label={t('attending')}>
          <option value="">{t('allDoctors')}</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name || d.email}</option>
          ))}
        </select>
        <label className="inline">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          {t('showCancelled')}
        </label>
      </div>

      {(view === 'day' || view === 'week') &&
        (cols.length === 0 ? (
          <p className="muted">{t('noRoomsToShow')}</p>
        ) : (
          <>
            <TimeGrid
              cols={cols}
              describe={describe}
              showRoom={view === 'week'}
              onSlot={(start, roomId) => setDialog({ kind: 'new', start, roomId })}
              onOpen={(appt) => setDialog({ kind: 'view', appt })}
            />
            <p className="muted small hint">{t('tapToAdd')}</p>
          </>
        ))}

      {view === 'month' && (
        <MonthGrid
          month={startOfMonth(anchor)}
          items={filtered}
          describe={describe}
          onOpen={(appt) => setDialog({ kind: 'view', appt })}
          onDay={(d) => {
            setAnchor(startOfDay(d));
            setView('day');
          }}
        />
      )}

      {view === 'list' && (
        <>
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
            const dayItems = filtered.filter((a) => sameDay(startOfDay(new Date(a.starts_at)), d));
            if (dayItems.length === 0) return null;
            return (
              <div key={d.toISOString()} className="day">
                <h2 className="day-heading">{fmtDayHeading(d, prefs.lang)}</h2>
                <ul className="appt-list">
                  {dayItems.map((a) => {
                    const info = describe(a);
                    const att = lookups.prof.get(a.attending_id);
                    const rec = a.receiving_id ? lookups.prof.get(a.receiving_id) : null;
                    return (
                      <li key={a.id}>
                        <button className={`appt status-${a.status}`} style={{ ['--h' as string]: info.hue }} onClick={() => setDialog({ kind: 'view', appt: a })}>
                          <span className="appt-time">
                            {fmtTime(a.starts_at, prefs.lang)}
                            <span className="muted">–{fmtTime(a.ends_at, prefs.lang)}</span>
                          </span>
                          <span className="appt-main">
                            <strong>{info.proc}</strong>
                            <span>{info.patient}</span>
                          </span>
                          <span className="appt-meta">
                            <span>{info.room}</span>
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
              </div>
            );
          })}
          {filtered.length === 0 && <p className="muted">{t('noAppointments')}</p>}
        </>
      )}

      {dialog?.kind === 'view' && (
        <AppointmentDetail
          appointment={items.find((a) => a.id === dialog.appt.id) ?? dialog.appt}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ kind: 'edit', appt: items.find((a) => a.id === dialog.appt.id) ?? dialog.appt })}
        />
      )}
      {(dialog?.kind === 'edit' || dialog?.kind === 'new') && (
        <AppointmentForm
          appointment={dialog.kind === 'edit' ? dialog.appt : null}
          defaultDate={anchor}
          defaults={dialog.kind === 'new' && dialog.start ? { start: dialog.start, roomId: dialog.roomId } : undefined}
          onClose={() => setDialog(dialog.kind === 'edit' ? { kind: 'view', appt: dialog.appt } : null)}
          onSaved={(saved) => {
            setDialog({ kind: 'view', appt: saved });
            void load();
          }}
        />
      )}
    </section>
  );
}
