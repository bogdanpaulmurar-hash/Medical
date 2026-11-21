import { useEffect, useState } from 'react';
import { api, fmtDateTime, useApp } from '../state';
import { fieldLabels, roleLabels, statusLabels, type TKey } from '../i18n';
import type { AuditFilters } from '../data/api';
import type { AuditEntry, Role, Status } from '../types';

const HIDDEN = new Set(['id', 'created_at', 'updated_at', 'created_by', 'updated_by']);

export function HistoryPage() {
  const { t, profiles } = useApp();
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState<'' | 'INSERT' | 'UPDATE' | 'DELETE'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filters: AuditFilters = {
    userId: userId || undefined,
    action: action || undefined,
    from: from ? new Date(`${from}T00:00`).toISOString() : undefined,
    to: to ? new Date(new Date(`${to}T00:00`).getTime() + 86400000).toISOString() : undefined,
  };
  return (
    <section>
      <h1>{t('historyTitle')}</h1>
      <p className="muted">{t('historyIntro')}</p>
      <div className="card filters">
        <div className="grid2 grid4">
          <label>
            {t('who')}
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">{t('anyUser')}</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          </label>
          <label>
            {t('what')}
            <select value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
              <option value="">{t('anyAction')}</option>
              <option value="INSERT">{t('action_INSERT')}</option>
              <option value="UPDATE">{t('action_UPDATE')}</option>
              <option value="DELETE">{t('action_DELETE')}</option>
            </select>
          </label>
          <label>
            {t('fromDate')}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            {t('toDate')}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>
      <AuditList filters={filters} />
    </section>
  );
}

export function AuditList({ recordId, refreshKey, filters }: { recordId?: string; refreshKey?: string; filters?: AuditFilters }) {
  const { t, prefs, profiles, rooms, cabinets, procedures } = useApp();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    void api.listAudit({ ...filters, recordId, limit }).then(setEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, limit, refreshKey, JSON.stringify(filters)]);

  const fmtValue = (field: string, v: unknown): string => {
    if (v === null || v === undefined || v === '') return '∅';
    const s = String(v);
    switch (field) {
      case 'attending_id':
      case 'receiving_id':
        return profiles.find((p) => p.id === s)?.full_name || s.slice(0, 8);
      case 'room_id': {
        const r = rooms.find((x) => x.id === s);
        const c = r && cabinets.find((x) => x.id === r.cabinet_id);
        return r ? `${c?.name ?? ''} / ${r.name}` : s.slice(0, 8);
      }
      case 'cabinet_id':
        return cabinets.find((x) => x.id === s)?.name ?? s.slice(0, 8);
      case 'procedure_id':
        return procedures.find((x) => x.id === s)?.name ?? s.slice(0, 8);
      case 'starts_at':
      case 'ends_at':
        return fmtDateTime(s, prefs.lang);
      case 'status':
        return statusLabels[prefs.lang][s as Status] ?? s;
      case 'role':
        return roleLabels[prefs.lang][s as Role] ?? s;
      default:
        return typeof v === 'boolean' ? (v ? '✓' : '✗') : s;
    }
  };

  const label = (e: AuditEntry) => {
    const d = (e.new_data ?? e.old_data ?? {}) as Record<string, unknown>;
    if (e.table_name === 'appointments') return `${d.patient_code ?? ''} ${d.patient_initials ?? ''}`.trim();
    return String(d.name ?? d.full_name ?? d.email ?? '');
  };

  const changes = (e: AuditEntry) => {
    if (e.action !== 'UPDATE' || !e.old_data || !e.new_data) return [];
    return Object.keys(e.new_data)
      .filter((k) => !HIDDEN.has(k) && JSON.stringify(e.old_data![k]) !== JSON.stringify(e.new_data![k]))
      .map((k) => ({ k, from: fmtValue(k, e.old_data![k]), to: fmtValue(k, e.new_data![k]) }));
  };

  return (
    <div className="audit">
      {entries.length === 0 && <p className="muted">{t('noHistory')}</p>}
      <ul className={recordId ? 'audit-list timeline' : 'audit-list'}>
        {entries.map((e) => {
          const who = profiles.find((p) => p.id === e.changed_by)?.full_name || e.changed_by_email || t('system');
          return (
            <li key={e.id}>
              <div className="audit-head">
                <time className="muted small">{fmtDateTime(e.changed_at, prefs.lang)}</time>
                <span>
                  <strong>{who}</strong> {t(`action_${e.action}` as TKey)}{' '}
                  {!recordId && (
                    <>
                      {t(`table_${e.table_name}` as TKey)} <em>{label(e)}</em>
                    </>
                  )}
                </span>
              </div>
              {changes(e).length > 0 && (
                <ul className="diff">
                  {changes(e).map((c) => (
                    <li key={c.k}>
                      {fieldLabels[prefs.lang][c.k] ?? c.k}: <del>{c.from}</del> → <ins>{c.to}</ins>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {entries.length >= limit && (
        <button className="secondary" onClick={() => setLimit(limit + 100)}>
          {t('loadMore')}
        </button>
      )}
    </div>
  );
}
