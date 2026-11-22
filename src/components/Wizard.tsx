import { useState } from 'react';
import { api, useApp } from '../state';
import type { DemoApi } from '../data/demoApi';
import type { TKey } from '../i18n';

/** Asistent pentru administrator: de la datele de probă la utilizarea reală. Fiecare pas arată starea și are un buton, nimic nu se șterge fără confirmare. */
export function ProductionWizard() {
  const { t: tt, me, profiles, cabinets, rooms, procedures, patients, plan, settings, reloadLookups } = useApp();
  const t = (k: string) => tt(k as TKey);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState(settings.clinic_name);
  if (me?.role !== 'admin') return null;

  const demo = api.mode === 'demo';
  const counts = demo ? (api as DemoApi).counts() : null;
  const demoUsers = profiles.filter((p) => p.active && p.email.endsWith('@exemplu.test') && p.id !== me.id);
  const nameDone = !!settings.clinic_name && !/demo/i.test(settings.clinic_name);
  const dataDone = counts ? counts.patients + counts.plan + counts.appointments === 0 : true;
  const usersDone = demoUsers.length === 0;
  const catalogDone = rooms.length > 0 && procedures.length > 0;

  const act = async (fn: () => Promise<unknown> | unknown, ok: string) => {
    setBusy(true); setMsg('');
    try { await fn(); await reloadLookups(); setMsg(ok); } catch { setMsg(t('errorGeneric')); }
    setBusy(false);
  };
  const Step = ({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) => (
    <li className={done ? 'wz-step done' : 'wz-step'}>
      <b><span aria-hidden="true">{done ? '✓' : '○'}</span> {title}</b>
      <div>{children}</div>
    </li>
  );

  return (
    <details className="card wz" open={!(nameDone && dataDone && usersDone)}>
      <summary><h2 style={{ display: 'inline' }}>{t('wzTitle')}</h2></summary>
      <p className="muted small">{demo ? t('wzIntroDemo') : t('wzIntroLive')}</p>
      <ol className="wz-list">
        <Step done={nameDone} title={t('wzName')}>
          <div className="row">
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('clinicName')} />
            <button className="btn sm" disabled={busy || !name.trim() || name === settings.clinic_name} onClick={() => void act(() => api.updateSettings({ clinic_name: name.trim() }), t('wzSaved'))}>{t('save')}</button>
          </div>
        </Step>
        <Step done={dataDone} title={t('wzData')}>
          {counts ? (
            <>
              <p className="small">{t('wzDataCounts').replace('{p}', String(counts.patients)).replace('{a}', String(counts.appointments)).replace('{h}', String(counts.history))}</p>
              <button className="btn sm danger" disabled={busy || dataDone && counts.history === 0}
                onClick={() => { if (confirm(t('wzDataConfirm'))) void act(() => (api as DemoApi).clearTestData(), t('wzDataDone')); }}>{t('wzDataBtn')}</button>
            </>
          ) : (
            <p className="small">{t('wzDataLive').replace('{p}', String(patients.length)).replace('{n}', String(plan.length))}</p>
          )}
        </Step>
        <Step done={usersDone} title={t('wzUsers')}>
          <p className="small">{demoUsers.length ? t('wzUsersDemo').replace('{n}', String(demoUsers.length)) : t('wzUsersOk')}</p>
          {demoUsers.length > 0 && (
            <button className="btn sm" disabled={busy}
              onClick={() => { if (confirm(t('wzUsersConfirm'))) void act(() => Promise.all(demoUsers.map((u) => api.updateProfile(u.id, { active: false }))), t('wzUsersDone')); }}>{t('wzUsersBtn')}</button>
          )}
          <p className="muted small">{t('wzUsersHint')}</p>
        </Step>
        <Step done={catalogDone} title={t('wzCatalog')}>
          <p className="small">{t('wzCatalogCounts').replace('{c}', String(cabinets.length)).replace('{r}', String(rooms.length)).replace('{p}', String(procedures.length))}</p>
        </Step>
        <Step done={settings.keep_documents || settings.documents_retention_days != null} title={t('wzDocs')}>
          <p className="small">{settings.keep_documents ? t('wzDocsOn') : t('wzDocsOff')}</p>
        </Step>
        <Step done={!demo} title={t('wzLive')}>
          <p className="small">{demo ? t('wzLiveDemo') : t('wzLiveOk')}</p>
        </Step>
      </ol>
      {msg && <p className="ok" role="status">{msg}</p>}
    </details>
  );
}
