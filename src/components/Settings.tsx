import { useState } from 'react';
import { ApiError } from '../data/api';
import { api, useApp, type Theme } from '../state';
import { roleLabels, type Lang, type TKey } from '../i18n';
import { AUDIENCES, ROLES, type Audience, type Role } from '../types';

function useAction() {
  const { t, reloadLookups } = useApp();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, okText?: string) => {
    setMsg(null);
    try {
      await fn();
      await reloadLookups();
      if (okText) setMsg({ ok: true, text: okText });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'other';
      setMsg({ ok: false, text: code === 'forbidden' ? t('forbidden') : t('errorGeneric') });
    }
  };
  const view = msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>;
  return { run, view };
}

export function SettingsPage() {
  const { t, me } = useApp();
  const isAdmin = me?.role === 'admin';
  return (
    <section className="settings">
      <h1>{t('settingsTitle')}</h1>
      <Personal />
      <MyNotifications />
      <CabinetsRooms />
      <Procedures />
      <Users isAdmin={isAdmin} />
      <ClinicSettings isAdmin={isAdmin} />
      <p className="muted small version">
        MedSlot · {t('version')}: {__APP_VERSION__}
      </p>
    </section>
  );
}

function Personal() {
  const { t, prefs, setPrefs } = useApp();
  return (
    <div className="card">
      <h2>{t('personal')}</h2>
      <div className="grid3">
        <label>
          {t('language')}
          <select value={prefs.lang} onChange={(e) => setPrefs({ lang: e.target.value as Lang })}>
            <option value="ro">Română</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {t('theme')}
          <select value={prefs.theme} onChange={(e) => setPrefs({ theme: e.target.value as Theme })}>
            <option value="system">{t('themeSystem')}</option>
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
          </select>
        </label>
        <label>
          {t('fontSize')}: {Math.round(prefs.fontScale * 100)}%
          <input
            type="range"
            min={0.85}
            max={1.5}
            step={0.05}
            value={prefs.fontScale}
            onChange={(e) => setPrefs({ fontScale: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

function MyNotifications() {
  const { t, me, settings } = useApp();
  const { run, view } = useAction();
  const [phone, setPhone] = useState(me?.phone ?? '');
  if (!me) return null;
  return (
    <div className="card">
      <h2>{t('myNotifications')}</h2>
      <label className="inline">
        <input
          type="checkbox"
          checked={me.notify_email}
          onChange={(e) => void run(() => api.updateProfile(me.id, { notify_email: e.target.checked }))}
        />
        {t('notifyEmail')}
      </label>
      <label className="inline">
        <input
          type="checkbox"
          checked={me.notify_sms}
          disabled={!settings.sms_enabled}
          onChange={(e) => void run(() => api.updateProfile(me.id, { notify_sms: e.target.checked }))}
        />
        {t('notifySms')}
      </label>
      {!settings.sms_enabled && <p className="muted small">{t('smsDisabledGlobally')}</p>}
      {settings.sms_enabled && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api.updateProfile(me.id, { phone: phone.trim() || null }), t('saved'));
          }}
        >
          <label>
            {t('phone')}
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40…" />
          </label>
          <button className="secondary">{t('save')}</button>
        </form>
      )}
      {view}
    </div>
  );
}

function ActiveToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const { t } = useApp();
  return (
    <button type="button" className={active ? 'ghost small' : 'secondary small'} onClick={onToggle}>
      {active ? t('deactivate') : t('activate')}
    </button>
  );
}

function InlineName({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      className="inline-edit"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

function CabinetsRooms() {
  const { t, cabinets, rooms } = useApp();
  const { run, view } = useAction();
  const [newCab, setNewCab] = useState('');
  const [newRoom, setNewRoom] = useState<Record<string, string>>({});
  return (
    <div className="card">
      <h2>{t('cabinetsRooms')}</h2>
      <p className="muted small">{t('deactivateHint')}</p>
      {cabinets.map((c) => (
        <div key={c.id} className={c.active ? 'nested' : 'nested inactive'}>
          <div className="row">
            <strong>{t('cabinet')}:</strong>
            <InlineName value={c.name} onSave={(name) => void run(() => api.saveCabinet({ id: c.id, name }))} />
            <ActiveToggle active={c.active} onToggle={() => void run(() => api.saveCabinet({ id: c.id, name: c.name, active: !c.active }))} />
          </div>
          <ul className="plain">
            {rooms
              .filter((r) => r.cabinet_id === c.id)
              .map((r) => (
                <li key={r.id} className={r.active ? 'row' : 'row inactive'}>
                  <span className="muted">{t('room')}:</span>
                  <InlineName value={r.name} onSave={(name) => void run(() => api.saveRoom({ id: r.id, name, cabinet_id: c.id }))} />
                  <label className="inline small" title={t('capacity')}>
                    <input
                      type="number"
                      className="num"
                      min={1}
                      max={100}
                      defaultValue={r.capacity}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 1 && v !== r.capacity) void run(() => api.saveRoom({ id: r.id, name: r.name, cabinet_id: c.id, capacity: v }));
                      }}
                      aria-label={t('capacity')}
                    />
                    {t('places')}
                  </label>
                  <select
                    className="inline-select"
                    value={r.audience}
                    aria-label={t('audience')}
                    onChange={(e) => void run(() => api.saveRoom({ id: r.id, name: r.name, cabinet_id: c.id, audience: e.target.value as Audience }))}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>{t(`audience_${a}` as TKey)}</option>
                    ))}
                  </select>
                  <ActiveToggle
                    active={r.active}
                    onToggle={() => void run(() => api.saveRoom({ id: r.id, name: r.name, cabinet_id: c.id, active: !r.active }))}
                  />
                </li>
              ))}
          </ul>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const name = (newRoom[c.id] ?? '').trim();
              if (!name) return;
              void run(() => api.saveRoom({ name, cabinet_id: c.id })).then(() => setNewRoom((o) => ({ ...o, [c.id]: '' })));
            }}
          >
            <input placeholder={t('addRoom')} value={newRoom[c.id] ?? ''} onChange={(e) => setNewRoom((o) => ({ ...o, [c.id]: e.target.value }))} />
            <button className="secondary">{t('add')}</button>
          </form>
        </div>
      ))}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newCab.trim()) return;
          void run(() => api.saveCabinet({ name: newCab.trim() })).then(() => setNewCab(''));
        }}
      >
        <input placeholder={t('addCabinet')} value={newCab} onChange={(e) => setNewCab(e.target.value)} />
        <button className="secondary">{t('add')}</button>
      </form>
      {view}
    </div>
  );
}

function Procedures() {
  const { t, procedures, rooms, cabinets } = useApp();
  const { run, view } = useAction();
  const [name, setName] = useState('');
  const [dur, setDur] = useState(30);
  const [open, setOpen] = useState<string | null>(null);
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? '?';
  return (
    <div className="card">
      <h2>{t('procedures')}</h2>
      <ul className="plain">
        {procedures.map((p) => (
          <li key={p.id} className={p.active ? 'proc-edit' : 'proc-edit inactive'}>
            <div className="row">
              <input
                type="color"
                className="color-input"
                value={p.color}
                aria-label={t('color')}
                onChange={(e) => void run(() => api.saveProcedure({ id: p.id, name: p.name, color: e.target.value }))}
              />
              <InlineName value={p.name} onSave={(n) => void run(() => api.saveProcedure({ id: p.id, name: n }))} />
              <input
                className="inline-edit short"
                defaultValue={p.short_name}
                maxLength={24}
                placeholder={t('shortName')}
                aria-label={t('shortName')}
                onBlur={(e) => e.target.value.trim() !== p.short_name && void run(() => api.saveProcedure({ id: p.id, name: p.name, short_name: e.target.value.trim() }))}
              />
              <label className="inline small">
                <input
                  type="number"
                  className="num"
                  min={5}
                  max={720}
                  step={5}
                  defaultValue={p.default_duration}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v && v !== p.default_duration) void run(() => api.saveProcedure({ id: p.id, name: p.name, default_duration: v }));
                  }}
                  aria-label={t('defaultDuration')}
                />
                min
              </label>
              <button type="button" className="ghost small" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                {t('procedureDevices')} ({p.room_ids.length})
              </button>
              <ActiveToggle active={p.active} onToggle={() => void run(() => api.saveProcedure({ id: p.id, name: p.name, active: !p.active }))} />
            </div>
            {open === p.id && (
              <div className="nested">
                {p.room_ids.length === 0 && <p className="muted small">{t('noDevices')}</p>}
                {cabinets.map((c) => {
                  const list = rooms.filter((r) => r.cabinet_id === c.id && r.active);
                  if (!list.length) return null;
                  return (
                    <fieldset key={c.id} className="device-pick">
                      <legend>{c.name}</legend>
                      {list.map((r) => (
                        <label key={r.id} className="inline small">
                          <input
                            type="checkbox"
                            checked={p.room_ids.includes(r.id)}
                            onChange={(e) =>
                              void run(() =>
                                api.saveProcedure({
                                  id: p.id,
                                  name: p.name,
                                  room_ids: e.target.checked ? [...p.room_ids, r.id] : p.room_ids.filter((x) => x !== r.id),
                                }),
                              )
                            }
                          />
                          {roomName(r.id)} ({r.capacity})
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          void run(() => api.saveProcedure({ name: name.trim(), default_duration: dur })).then(() => setName(''));
        }}
      >
        <input placeholder={t('addProcedure')} value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" className="num" min={5} max={720} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} aria-label={t('defaultDuration')} />
        <button className="secondary">{t('add')}</button>
      </form>
      {view}
    </div>
  );
}

function Users({ isAdmin }: { isAdmin: boolean }) {
  const { t, prefs, profiles, me } = useApp();
  const { run, view } = useAction();
  const [inv, setInv] = useState({ email: '', name: '', role: 'attending' as Role });
  return (
    <div className="card">
      <h2>{t('users')}</h2>
      {!isAdmin && <p className="muted small">{t('adminOnly')}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('email')}</th>
              <th>{t('role')}</th>
              <th>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'inactive'}>
                <td>
                  {p.full_name} {p.id === me?.id && <span className="muted small">({t('you')})</span>}
                </td>
                <td className="small">{p.email}</td>
                <td>
                  {isAdmin ? (
                    <select value={p.role} onChange={(e) => void run(() => api.updateProfile(p.id, { role: e.target.value as Role }))}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[prefs.lang][r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roleLabels[prefs.lang][p.role]
                  )}
                </td>
                <td>
                  {isAdmin && p.id !== me?.id ? (
                    <ActiveToggle active={p.active} onToggle={() => void run(() => api.updateProfile(p.id, { active: !p.active }))} />
                  ) : (
                    t(p.active ? 'active' : 'inactive')
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <form
          className="invite"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api.inviteUser(inv.email.trim(), inv.name.trim(), inv.role), t('invited')).then(() =>
              setInv({ email: '', name: '', role: 'attending' }),
            );
          }}
        >
          <h3>{t('inviteUser')}</h3>
          <div className="grid3">
            <label>
              {t('email')}
              <input type="email" required value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
            </label>
            <label>
              {t('name')}
              <input required value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />
            </label>
            <label>
              {t('role')}
              <select value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[prefs.lang][r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="primary">{t('invite')}</button>
        </form>
      )}
      {view}
    </div>
  );
}

function ClinicSettings({ isAdmin }: { isAdmin: boolean }) {
  const { t, settings } = useApp();
  const { run, view } = useAction();
  return (
    <div className="card">
      <h2>{t('notifications')}</h2>
      {!isAdmin && <p className="muted small">{t('adminOnly')}</p>}
      <label>
        {t('clinicName')}
        <InlineNameDisabled value={settings.clinic_name} disabled={!isAdmin} onSave={(v) => void run(() => api.updateSettings({ clinic_name: v }))} />
      </label>
      <label className="inline">
        <input
          type="checkbox"
          disabled={!isAdmin}
          checked={settings.email_enabled}
          onChange={(e) => void run(() => api.updateSettings({ email_enabled: e.target.checked }))}
        />
        {t('emailEnabled')}
      </label>
      <label className="inline">
        <input
          type="checkbox"
          disabled={!isAdmin}
          checked={settings.sms_enabled}
          onChange={(e) => void run(() => api.updateSettings({ sms_enabled: e.target.checked }))}
        />
        {t('smsEnabled')}
      </label>
      <p className="muted small">{t('smsCostHint' as TKey)}</p>
      {view}
    </div>
  );
}

function InlineNameDisabled({ value, disabled, onSave }: { value: string; disabled: boolean; onSave: (v: string) => void }) {
  if (disabled) return <input value={value} disabled readOnly />;
  return <InlineName key={value} value={value} onSave={onSave} />;
}
