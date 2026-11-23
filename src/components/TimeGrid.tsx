import { useEffect, useMemo, useRef, useState } from 'react';
import type { Appointment } from '../types';
import { fmtTime, useApp } from '../state';

export interface GridCol {
  key: string;
  title: string;
  sub?: string;
  date: Date; // miezul nopții al zilei coloanei
  roomId?: string;
  personId?: string;
  today: boolean;
  items: Appointment[];
}

export interface BlockInfo {
  proc: string;
  patient: string;
  room: string;
  hue: number;
}

interface Props {
  cols: GridCol[];
  describe: (a: Appointment) => BlockInfo;
  showRoom: boolean;
  onSlot: (start: Date, col: GridCol) => void;
  onOpen: (a: Appointment) => void;
}

const HOUR_REM = 4.5;
const SNAP_MIN = 15;
const STATUS_ICON: Record<string, string> = { confirmed: '✓ ', in_progress: '▶ ', done: '✔ ', cancelled: '✕ ', no_show: '∅ ' };

const clamp = (m: number) => Math.max(0, Math.min(1440, m));
const minutesOf = (iso: string, day: Date) => clamp((new Date(iso).getTime() - day.getTime()) / 60000);

interface Placed {
  a: Appointment;
  s: number;
  e: number;
  lane: number;
  lanes: number;
}

/** Așază programările suprapuse una lângă alta (pe „benzi”). */
function layout(items: Appointment[], day: Date): Placed[] {
  const rows: Placed[] = items
    .map((a) => ({ a, s: minutesOf(a.starts_at, day), e: minutesOf(a.ends_at, day), lane: 0, lanes: 1 }))
    .sort((x, y) => x.s - y.s || y.e - x.e);
  let cluster: Placed[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((r) => (r.lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };
  for (const r of rows) {
    if (cluster.length && r.s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= r.s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(r.e);
    } else laneEnds[lane] = r.e;
    r.lane = lane;
    cluster.push(r);
    clusterEnd = Math.max(clusterEnd, r.e);
  }
  flush();
  return rows;
}

export function TimeGrid({ cols, describe, showRoom, onSlot, onOpen }: Props) {
  const { prefs, t } = useApp();
  const [now, setNow] = useState(() => new Date());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const placed = useMemo(() => cols.map((c) => layout(c.items, c.date)), [cols]);

  let startH = 8;
  let endH = 18;
  for (const col of placed) {
    for (const p of col) {
      startH = Math.min(startH, Math.floor(p.s / 60));
      endH = Math.max(endH, Math.ceil(p.e / 60));
    }
  }
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const bodyH = (endH - startH) * HOUR_REM;
  const rem = (min: number) => `${((min - startH * 60) / 60) * HOUR_REM}rem`;

  // Derulare la prima programare / ora curentă când se schimbă intervalul.
  const firstKey = cols.map((c) => c.key).join('|');
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const first = Math.min(...placed.flat().map((p) => p.s), Infinity);
    const target = Number.isFinite(first) ? first : 8 * 60;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    el.scrollTop = Math.max(0, (((target - startH * 60) / 60) * HOUR_REM - 0.5) * remPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey]);

  function slotClick(e: React.MouseEvent<HTMLDivElement>, col: GridCol) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = startH * 60 + ((e.clientY - rect.top) / rect.height) * (endH - startH) * 60;
    const snapped = Math.floor(mins / SNAP_MIN) * SNAP_MIN;
    const d = new Date(col.date);
    d.setHours(0, snapped, 0, 0);
    onSlot(d, col);
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="tg-wrap" ref={wrapRef}>
      <div className="tg" style={{ gridTemplateColumns: `3rem repeat(${cols.length}, minmax(8rem, 1fr))` }}>
        <div className="tg-corner" />
        {cols.map((c) => (
          <div key={c.key} className={c.today ? 'tg-head today' : 'tg-head'}>
            <strong>{c.title}</strong>
            {c.sub && <span className="muted small">{c.sub}</span>}
          </div>
        ))}

        <div className="tg-axis" style={{ height: `${bodyH}rem` }}>
          {hours.map((h) => (
            <span key={h} style={{ top: `${(h - startH) * HOUR_REM}rem` }}>
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>

        {cols.map((c, ci) => (
          <div
            key={c.key}
            className={c.today ? 'tg-col today' : 'tg-col'}
            style={{ height: `${bodyH}rem`, backgroundSize: `100% ${HOUR_REM}rem` }}
            onClick={(e) => slotClick(e, c)}
            role="presentation"
            title={t('tapToAdd')}
          >
            {c.today && nowMin >= startH * 60 && nowMin <= endH * 60 && (
              <div className="tg-now" style={{ top: rem(nowMin) }} aria-hidden="true" />
            )}
            {placed[ci].map(({ a, s, e, lane, lanes }) => {
              const info = describe(a);
              const heightRem = Math.max(((e - s) / 60) * HOUR_REM, 1.5);
              const tier = heightRem < 1.9 ? 'one' : heightRem < 3.3 ? 'two' : 'full';
              const compact = tier === 'one';
              const blocked = a.status === 'cancelled' || a.status === 'no_show';
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`tg-block status-${a.status}${a.overlap_ok ? ' overlap' : ''}${compact ? ' compact' : ''}`}
                  style={{
                    top: rem(s),
                    height: `${heightRem}rem`,
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                    ['--h' as string]: info.hue,
                  }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onOpen(a);
                  }}
                  title={`${fmtTime(a.starts_at, prefs.lang)}–${fmtTime(a.ends_at, prefs.lang)} · ${info.proc} · ${info.patient} · ${info.room}`}
                  aria-label={`${fmtTime(a.starts_at, prefs.lang)} ${info.proc} ${info.patient}`}
                >
                  {tier === 'full' ? (
                    <>
                      <span className="tg-time">
                        {STATUS_ICON[a.status] ?? ''}
                        {fmtTime(a.starts_at, prefs.lang)}–{fmtTime(a.ends_at, prefs.lang)}
                      </span>
                      <strong className={blocked ? 'strike' : ''}>{info.proc}</strong>
                      <span>{info.patient}</span>
                      {showRoom && <span className="tg-room">{info.room}</span>}
                    </>
                  ) : (
                    <>
                      <span className="tg-line">
                        <span className="tg-time">
                          {STATUS_ICON[a.status] ?? ''}
                          {fmtTime(a.starts_at, prefs.lang)}
                        </span>{' '}
                        <strong className={blocked ? 'strike' : ''}>{info.proc}</strong>
                        {compact && <> · {info.patient}</>}
                      </span>
                      {!compact && <span>{info.patient}</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
