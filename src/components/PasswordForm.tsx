import { useState } from 'react';
import { api, useApp } from '../state';
import type { TKey } from '../i18n';

/** Alegerea sau schimbarea parolei. `onDone` se cheamă după salvare. */
export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const { t } = useApp();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (a.length < 10) return setMsg({ ok: false, text: t('pwShort' as TKey) });
    if (a !== b) return setMsg({ ok: false, text: t('pwMismatch' as TKey) });
    setBusy(true);
    try {
      await api.updatePassword(a);
      setA('');
      setB('');
      setMsg({ ok: true, text: t('pwSaved' as TKey) });
      onDone?.();
    } catch {
      setMsg({ ok: false, text: t('errorGeneric') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <label>
        {t('pwNew' as TKey)}
        <input type="password" required minLength={10} autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} />
      </label>
      <label>
        {t('pwRepeat' as TKey)}
        <input type="password" required minLength={10} autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} />
      </label>
      <button type="submit" disabled={busy}>{t('pwSave' as TKey)}</button>
      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}
    </form>
  );
}

export function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  const { t } = useApp();
  return (
    <main className="center-card">
      <div className="card login">
        <h1 className="wordmark">Vademecum <span>MFR</span></h1>
        <h2>{t('pwSetTitle' as TKey)}</h2>
        <p className="muted">{t('pwSetIntro' as TKey)}</p>
        <PasswordForm onDone={onDone} />
      </div>
    </main>
  );
}
