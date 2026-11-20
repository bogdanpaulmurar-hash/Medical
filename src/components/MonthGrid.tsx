import { addDays, fmtTime, locale, sameDay, startOfDay, startOfWeek, useApp } from '../state';
import type { Appointment } from '../types';
import type { BlockInfo } from './TimeGrid';

interface Props {
  month: Date; // prima zi a lunii
  items: Appointment[];
  describe: (a: Appointment) => BlockInfo;
  onOpen: (a: Appointment) => void;
  onDay: (d: Date) => void;
}

const MAX_CHIPS = 3;

export function MonthGrid({ month, items, describe, onOpen, onDay }: Props) {
  const { t, prefs } = useApp();
  const first = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const today = new Date();
  const weekdays = days.slice(0, 7).map((d) => d.toLocaleDateString(locale(prefs.lang), { weekday: 'short' }));

  return (
    <div className="mg">
      {weekdays.map((w) => (
        <div key={w} className="mg-wd muted small">
          {w}
        </div>
      ))}
      {days.map((d) => {
        const dayItems = items
          .filter((a) => sameDay(startOfDay(new Date(a.starts_at)), d))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        const other = d.getMonth() !== month.getMonth();
        const cls = ['mg-day', other ? 'other' : '', sameDay(d, today) ? 'today' : ''].join(' ');
        return (
          <div key={d.toISOString()} className={cls}>
            <button className="mg-num" onClick={() => onDay(d)} aria-label={d.toLocaleDateString(locale(prefs.lang), { dateStyle: 'full' })}>
              {d.getDate()}
            </button>
            {dayItems.slice(0, MAX_CHIPS).map((a) => {
              const info = describe(a);
              const dead = a.status === 'cancelled' || a.status === 'no_show';
              return (
                <button
                  key={a.id}
                  className={dead ? 'mg-chip dead' : 'mg-chip'}
                  style={{ ['--h' as string]: info.hue }}
                  onClick={() => onOpen(a)}
                  title={`${info.proc} · ${info.patient} · ${info.room}`}
                >
                  <span className="mg-t">{fmtTime(a.starts_at, prefs.lang)}</span> {info.proc}
                </button>
              );
            })}
            {dayItems.length > MAX_CHIPS && (
              <button className="mg-more" onClick={() => onDay(d)}>
                +{dayItems.length - MAX_CHIPS} {t('moreItems')}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
