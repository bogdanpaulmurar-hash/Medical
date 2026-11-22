import { IS_TEST } from '../envKey';
import { useEffect, useState } from 'react';
import { api, useApp } from '../state';
import { roleLabels, type Lang } from '../i18n';
import type { Profile } from '../types';

export function Login() {
  const { t, prefs, setPrefs } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoUsers, setDemoUsers] = useState<Profile[]>([]);

  useEffect(() => {
    if (api.mode === 'demo') void api.listProfiles().then(setDemoUsers);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.sendMagicLink(email.trim(), window.location.origin + window.location.pathname);
      setSent(true);
    } catch {
      // Mesaj generic: nu dezvăluim dacă emailul există.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    {IS_TEST && <div className="test-banner" role="note">{t('testBanner')}</div>}
    {api.mode === 'demo' && <div className="demo-banner" role="note">{t('demoBanner')}</div>}
    <main className="center-card">
      <div className="card login">
        <div className="lang-switch">
          {(['ro', 'en'] as Lang[]).map((l) => (
            <button key={l} className={prefs.lang === l ? 'chip on' : 'chip'} onClick={() => setPrefs({ lang: l })}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={56} height={56} />
        <h1 className="wordmark">Vademecum <span>MFR</span></h1>
        <p className="muted">{t('tagline')}</p>

        {api.mode === 'demo' ? (
          <>
            <p className="muted">{t('loginDemoIntro')}</p>
            <div className="stack">
              {demoUsers.map((u) => (
                <button key={u.id} className="secondary" onClick={() => void api.sendMagicLink(u.email, '')}>
                  {u.full_name} · {roleLabels[prefs.lang][u.role]}
                </button>
              ))}
            </div>
          </>
        ) : sent ? (
          <p role="status">{t('linkSent')}</p>
        ) : (
          <form onSubmit={submit} className="stack">
            <p className="muted">{t('loginIntro')}</p>
            <label>
              {t('email')}
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" disabled={busy}>
              {t('sendLink')}
            </button>
            <p className="muted small">{t('loginOnlyInvited')}</p>
            {error && <p className="error">{error}</p>}
          </form>
        )}
        <p className="muted small version">
          {t('version')}: {__APP_VERSION__}
        </p>
      </div>
    </main>
    </>
  );
}
