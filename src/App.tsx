import { useEffect, useState } from 'react';
import { api, AppProvider, useApp } from './state';
import { Login } from './components/Login';
import { Schedule } from './components/Schedule';
import { HistoryPage } from './components/History';
import { SettingsPage } from './components/Settings';
import { Help } from './components/Help';
import { DemoApi } from './data/demoApi';

type Page = 'schedule' | 'history' | 'settings' | 'help';

export default function App() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const refresh = () => void api.getSessionUserId().then(setUserId);
    refresh();
    return api.onAuthChange(refresh);
  }, []);

  if (userId === undefined) return null;
  return (
    <AppProvider userId={userId}>
      {userId ? <Shell /> : <Login />}
    </AppProvider>
  );
}

function pageFromHash(): Page {
  const h = window.location.hash.replace('#', '');
  return (['schedule', 'history', 'settings', 'help'] as Page[]).includes(h as Page) ? (h as Page) : 'schedule';
}

function Shell() {
  const { t, me, profiles, settings } = useApp();
  const [page, setPage] = useState<Page>(pageFromHash);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Profil încărcat dar inactiv => blocat (RLS blochează oricum datele).
  if (profiles.length > 0 && !me) {
    return (
      <main className="center-card">
        <div className="card">
          <p>{t('notActive')}</p>
          <button onClick={() => void api.signOut()}>{t('signOut')}</button>
        </div>
      </main>
    );
  }

  const nav: { id: Page; label: string }[] = [
    { id: 'schedule', label: t('navSchedule') },
    { id: 'history', label: t('navHistory') },
    { id: 'settings', label: t('navSettings') },
    { id: 'help', label: t('navHelp') },
  ];

  return (
    <>
      {api.mode === 'demo' && (
        <div className="demo-banner" role="note">
          {t('demoBanner')}{' '}
          <button
            className="link"
            onClick={() => {
              (api as DemoApi).reset();
              window.location.reload();
            }}
          >
            {t('demoReset')}
          </button>
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
          <span>{t('appName')}</span>
          {settings.clinic_name && <span className="muted small clinic">{settings.clinic_name}</span>}
        </div>
        <nav aria-label="main">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} aria-current={page === n.id ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="me">
          <span className="muted small">{me?.full_name || me?.email}</span>
          <button className="ghost" onClick={() => void api.signOut()}>
            {t('signOut')}
          </button>
        </div>
      </header>
      <main className="page">
        {page === 'schedule' && <Schedule />}
        {page === 'history' && <HistoryPage />}
        {page === 'settings' && <SettingsPage />}
        {page === 'help' && <Help />}
      </main>
    </>
  );
}
