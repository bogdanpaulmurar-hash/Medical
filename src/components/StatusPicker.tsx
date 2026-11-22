import { useState } from 'react';
import { ApiError } from '../data/api';
import { changeStatus } from '../statusChange';
import { useApp } from '../state';
import { statusLabels, type TKey } from '../i18n';
import { STATUSES, type Appointment, type Status } from '../types';

/** Rând de butoane pentru schimbarea rapidă a statusului, fără mod de editare. */
export function StatusPicker({ appointment: a, onChanged }: { appointment: Appointment; onChanged?: (saved: Appointment) => void }) {
  const { t, prefs } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(s: Status) {
    if (s === a.status || busy) return;
    setBusy(true);
    setError(null);
    try {
      onChanged?.(await changeStatus(a, s));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'other';
      setError(code === 'other' ? t('errorGeneric') : t(code as TKey));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="status-picker">
      <p className="muted small" style={{ margin: 0 }}>{t('changeStatus')}</p>
      <div className="row wrap" role="group" aria-label={t('changeStatus')}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={s === a.status ? 'chip on' : 'chip'}
            aria-pressed={s === a.status}
            disabled={busy}
            onClick={() => void pick(s)}
          >
            {statusLabels[prefs.lang][s]}
          </button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
