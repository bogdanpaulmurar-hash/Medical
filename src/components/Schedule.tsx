import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays, addMonths, api, fmtDayHeading, fmtRange, fmtTime, sameDay, startOfDay, startOfMonth, startOfWeek,
  toDateInput, useApp,
} from '../state';
import { roleLabels, statusLabels } from '../i18n';
import type { Appointment, Status } from '../types';
import { AppointmentDetail } from './AppointmentDetail';
import { AppointmentForm } from './AppointmentForm';
import { MonthGrid } from './MonthGrid';
import { TimeGrid, type BlockInfo, type GridCol } from './TimeGrid';

type View = 'timeline' | 'week' | 'month' | 'list' | 'occupancy' | 'board';
type Group = 'room' | 'attending' | 'receiving';
type ListRange = 'day' | 'week' | 'month' | 'next30';
type Dialog =
  | null
  | { kind: 'view'; appt: Appointment }
  | { kind: 'edit'; appt: Appointment }
  | { kind: 'new'; start?: Date; roomId?: string; attendingId?: string; receivingId?: string };

const HUES = [172, 212, 266, 330, 24, 96, 190, 46];
const VIEWS: View[] = ['timeline', 'week', 'month', 'list', 'occupancy', 'board'];
const OCC_FROM = 8 * 60;
const OCC_TO = 18 * 60;

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function Schedule() {
  const { t, prefs, rooms, cabinets, procedures, profiles } = useApp();
  const [view, setViewState] = useState<View>(() => stored('medsched-view', VIEWS, window.innerWidth < 700 ? 'timeline' : 'week'));
  const [group, setGroupState] = useState<Group>(() => stored('medsched-group', ['room', 'attending', 'receiving'] as const, 'room'));
  const [listRange, setListRange] = useState<ListRange>('week');
  const [occDays, setOccDays] = useState<7 | 14 | 28>(7);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const setView = (v: View) => {
    setViewState(v);
    remember('medsched-view', v);
  };
  const setGroup = (g: Group) => {
    setGroupState(g);
    remember('medsched-group', g);
  };

  const { from, to } = useMemo(() => {
    switch (view) {
      case 'timeline':
      case 'board':
        return { from: anchor, to: addDays(anchor, 1) };
      case 'month': {
        const first = startOfWeek(startOfMonth(anchor));
        return { from: first, to: addDays(first, 42) };
      }
      case 'occupancy': {
        const w = startOfWeek(anchor);
        return { from: w, to: addDays(w, occDays) };
      }
      case 'list':
        if (listRange === 'day') return { from: anchor, to: addDays(anchor, 1) };
        if (listRange === 'next30') return { from: anchor, to: addDays(anchor, 30) };
        if (listRange === 'month') return { from: startOfMonth(anchor), to: addMonths(anchor, 1) };
        return { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 7) };
      default: {
        const w = startOfWeek(anchor);
        return { from: w, to: addDays(w, 7) };
      }
    }
  }, [view, anchor, listRange, occDays]);

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

  const dead = (a: Appointment) => a.status === 'cancelled' || a.status === 'no_show';
  const matches = (a: Appointment) =>
    (!roomFilter || a.room_id === roomFilter) &&
    (!doctorFilter || a.attending_id === doctorFilter || a.receiving_id === doctorFilter);
  const filtered = items.filter((a) => (showCancelled || !dead(a)) && matches(a));

  const today = startOfDay(new Date());
  const people = profiles.filter((p) => p.active && p.role !== 'scheduler');

  const cols: GridCol[] = useMemo(() => {
    if (view === 'timeline') {
      const isToday = sameDay(anchor, today);
      if (group === 'room') {
        const used = new Set(filtered.map((a) => a.room_id));
        return orderedRooms
          .filter((r) => (r.active || used.has(r.id)) && (!roomFilter || r.id === roomFilter))
          .map((r) => ({
            key: r.id, title: r.name, sub: lookups.cab.get(r.cabinet_id)?.name, date: anchor, roomId: r.id,
            today: isToday, items: filtered.filter((a) => a.room_id === r.id),
          }));
      }
      const field = group === 'attending' ? 'attending_id' : 'receiving_id';
      const used = new Set(filtered.map((a) => a[field]));
      return profiles
        .filter((p) => p.role !== 'scheduler' && (p.active || used.has(p.id)) && (!doctorFilter || p.id === doctorFilter))
        .map((p) => ({
          key: p.id, title: p.full_name || p.email, sub: roleLabels[prefs.lang][p.role], date: anchor, personId: p.id,
          roomId: roomFilter || undefined, today: isToday, items: filtered.filter((a) => a[field] === p.id),
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
  }, [view, group, filtered, orderedRooms, roomFilter, doctorFilter, anchor, from, prefs.lang, lookups, profiles]);

  const step = (dir: 1 | -1) => {
    if (view === 'timeline' || view === 'board') return setAnchor(addDays(anchor, dir));
    if (view === 'month') return setAnchor(addMonths(anchor, dir));
    if (view === 'occupancy') return setAnchor(addDays(anchor, dir * occDays));
    if (view === 'list') {
      if (listRange === 'day') return setAnchor(addDays(anchor, dir));
      if (listRange === 'month') return setAnchor(addMonths(anchor, dir));
      return setAnchor(addDays(anchor, dir * (listRange === 'next30' ? 30 : 7)));
    }
    return setAnchor(addDays(anchor, 7 * dir));
  };

  const single = view === 'timeline' || view === 'board' || (view === 'list' && listRange === 'day');
  const monthly = view === 'month' || (view === 'list' && listRange === 'month');
  const title = fmtRange(monthly ? startOfMonth(anchor) : from, to, single ? 'day' : monthly ? 'month' : 'week', prefs.lang);
  const viewLabel: Record<View, string> = {
    timeline: t('viewTimeline'), week: t('viewWeek'), month: t('viewMonth'), list: t('viewList'),
    occupancy: t('viewOccupancy'), board: t('viewBoard'),
  };

  const open = (appt: Appointment) => setDialog({ kind: 'view', appt });
  const days = Array.from({ length: Math.round((to.getTime() - from.getTime()) / 86400000) }, (_, i) => addDays(from, i));

  // --- Ocupare: saloane × zile ---
  const occupancy = useMemo(() => {
    if (view !== 'occupancy') return null;
    const live = items.filter((a) => !dead(a) && (!doctorFilter || a.attending_id === doctorFilter || a.receiving_id === doctorFilter));
    const used = new Set(live.map((a) => a.room_id));
    const roomRows = orderedRooms.filter((r) => (r.active || used.has(r.id)) && (!roomFilter || r.id === roomFilter));
    return roomRows.map((r) => ({
      room: r,
      cells: days.map((d) => {
        const dayStart = d.getTime();
        const win0 = dayStart + OCC_FROM * 60000;
        const win1 = dayStart + OCC_TO * 60000;
        let mins = 0;
        let count = 0;
        for (const a of live) {
          if (a.room_id !== r.id) continue;
          const s = Math.max(new Date(a.starts_at).getTime(), win0);
          const e = Math.min(new Date(a.ends_at).getTime(), win1);
          const inDay = new Date(a.starts_at).getTime() < dayStart + 86400000 && new Date(a.ends_at).getTime() > dayStart;
          if (inDay) count++;
          if (e > s) mins += (e - s) / 60000;
        }
        return { day: d, count, pct: Math.min(100, Math.round((mins / (OCC_TO - OCC_FROM)) * 100)) };
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, items, orderedRooms, roomFilter, doctorFilter, from, to]);

  return (
    <section>
      <div className="toolbar">
        <div className="btn-group">
          <button className="secondary" onClick={() => step(-1)} aria-label={t('prev')}>‹</button>
          <button className="secondary" onClick={() => setAnchor(startOfDay(new Date()))}>{t('today')}</button>
          <button className="secondary" onClick={() => step(1)} aria-label={t('next')}>›</button>
        </div>
        <h1 className="range-title">{title}</h1>
        <button className="primary push-right" onClick={() => setDialog({ kind: 'new' })}>
          + {t('newAppointment')}
        </button>
      </div>
      <div className="toolbar">
        <div className="seg scroll" role="group">
          {VIEWS.map((v) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)} aria-pressed={view === v}>
              {viewLabel[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="toolbar sub">
        <input
          type="date"
          value={toDateInput(anchor)}
          onChange={(e) => e.target.value && setAnchor(startOfDay(new Date(`${e.target.value}T00:00`)))}
          aria-label={t('date')}
        />
        {view === 'timeline' && (
          <select value={group} onChange={(e) => setGroup(e.target.value as Group)} aria-label={t('groupBy')}>
            <option value="room">{t('byRoom')}</option>
            <option value="attending">{t('byAttending')}</option>
            <option value="receiving">{t('byReceiving')}</option>
          </select>
        )}
        {view === 'list' && (
          <select value={listRange} onChange={(e) => setListRange(e.target.value as ListRange)} aria-label={t('occupancyRange')}>
            <option value="day">{t('listDay')}</option>
            <option value="week">{t('listWeek')}</option>
            <option value="month">{t('listMonth')}</option>
            <option value="next30">{t('listNext30')}</option>
          </select>
        )}
        {view === 'occupancy' && (
          <select value={occDays} onChange={(e) => setOccDays(Number(e.target.value) as 7 | 14 | 28)} aria-label={t('occupancyRange')}>
            <option value={7}>{t('weeks1')}</option>
            <option value={14}>{t('weeks2')}</option>
            <option value={28}>{t('weeks4')}</option>
          </select>
        )}
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
          {people.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name || d.email}</option>
          ))}
        </select>
        {view !== 'board' && view !== 'occupancy' && (
          <label className="inline">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            {t('showCancelled')}
          </label>
        )}
      </div>

      {(view === 'timeline' || view === 'week') &&
        (cols.length === 0 ? (
          <p className="muted">{t('noRoomsToShow')}</p>
        ) : (
          <>
            <TimeGrid
              cols={cols}
              describe={describe}
              showRoom={view === 'week' || group !== 'room'}
              onSlot={(start, col) =>
                setDialog({
                  kind: 'new', start, roomId: col.roomId,
                  attendingId: group === 'attending' && view === 'timeline' ? col.personId : undefined,
                  receivingId: group === 'receiving' && view === 'timeline' ? col.personId : undefined,
                })
              }
              onOpen={open}
            />
            <p className="muted small hint">{t('tapToAdd')}</p>
          </>
        ))}

      {view === 'month' && (
        <MonthGrid
          month={startOfMonth(anchor)}
          items={filtered}
          describe={describe}
          onOpen={open}
          onDay={(d) => {
            setAnchor(startOfDay(d));
            setView('timeline');
          }}
        />
      )}

      {view === 'list' && (
        <>
          {days.map((d) => {
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
                        <button className={`appt status-${a.status}`} style={{ ['--h' as string]: info.hue }} onClick={() => open(a)}>
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

      {view === 'occupancy' && occupancy && (
        <>
          {occupancy.length === 0 ? (
            <p className="muted">{t('noRoomsToShow')}</p>
          ) : (
            <div className="occ-wrap">
              <table className="occ">
                <thead>
                  <tr>
                    <th />
                    {days.map((d) => (
                      <th key={d.toISOString()} className={sameDay(d, today) ? 'today' : ''}>
                        {d.toLocaleDateString(prefs.lang === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'short' })}
                        <br />
                        <span className="muted small">{d.getDate()}/{d.getMonth() + 1}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {occupancy.map(({ room, cells }) => (
                    <tr key={room.id}>
                      <th scope="row">
                        {room.name}
                        <br />
                        <span className="muted small">{lookups.cab.get(room.cabinet_id)?.name}</span>
                      </th>
                      {cells.map((c) => (
                        <td key={c.day.toISOString()}>
                          <button
                            className="occ-cell"
                            style={{ ['--p' as string]: c.pct }}
                            onClick={() => {
                              setAnchor(c.day);
                              setView('timeline');
                              setGroup('room');
                            }}
                            aria-label={`${room.name} ${c.day.toLocaleDateString(prefs.lang === 'ro' ? 'ro-RO' : 'en-GB')}: ${c.pct}%`}
                          >
                            {c.count > 0 ? (
                              <>
                                <strong>{c.pct}%</strong>
                                <span className="small">{c.count}</span>
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small hint">{t('occupancyHint')}</p>
        </>
      )}

      {view === 'board' && (
        <div className="board">
          {(['planned', 'confirmed', 'in_progress', 'done', 'cancelled'] as Status[]).map((s) => {
            const colItems = items
              .filter((a) => matches(a) && (s === 'cancelled' ? dead(a) : a.status === s))
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            return (
              <div key={s} className="board-col">
                <h2>
                  {s === 'cancelled' ? t('cancelledGroup') : statusLabels[prefs.lang][s]} <span className="count">{colItems.length}</span>
                </h2>
                {colItems.length === 0 && <p className="muted small">{t('noItems')}</p>}
                {colItems.map((a) => {
                  const info = describe(a);
                  return (
                    <button key={a.id} className={`card-item status-${a.status}`} style={{ ['--h' as string]: info.hue }} onClick={() => open(a)}>
                      <span className="muted small">
                        {fmtTime(a.starts_at, prefs.lang)}–{fmtTime(a.ends_at, prefs.lang)}
                        {s === 'cancelled' && ` · ${statusLabels[prefs.lang][a.status]}`}
                      </span>
                      <strong>{info.proc}</strong>
                      <span>{info.patient}</span>
                      <span className="muted small">{info.room}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
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
          defaults={
            dialog.kind === 'new' && dialog.start
              ? { start: dialog.start, roomId: dialog.roomId, attendingId: dialog.attendingId, receivingId: dialog.receivingId }
              : undefined
          }
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
