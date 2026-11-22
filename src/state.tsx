import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Api } from './data/api';
import { DemoApi } from './data/demoApi';
import { SupabaseApi } from './data/supabaseApi';
import { dictionaries, type Lang, type TKey } from './i18n';
import type { AppSettings, Cabinet, Patient, PlanItem, Procedure, Profile, Room } from './types';

// ---------------------------------------------------------------------
// API: Supabase dacă există configurare, altfel mod demo.
// ---------------------------------------------------------------------
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const api: Api = url && key && !url.includes('YOUR-PROJECT') ? new SupabaseApi(url, key) : new DemoApi();

// ---------------------------------------------------------------------
// Preferințe per dispozitiv (temă, mărime text, limbă) — localStorage.
// ---------------------------------------------------------------------
export type Theme = 'system' | 'light' | 'dark';
export interface Prefs {
  lang: Lang;
  theme: Theme;
  fontScale: number; // 0.85 – 1.5
}

const PREFS_KEY = 'medsched-prefs';
function loadPrefs(): Prefs {
  const fallback: Prefs = {
    lang: navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en',
    theme: 'system',
    fontScale: 1,
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Prefs>) } : fallback;
  } catch {
    return fallback;
  }
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  if (p.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', p.theme);
  root.style.fontSize = `${Math.round(p.fontScale * 100)}%`;
  root.lang = p.lang;
}

// ---------------------------------------------------------------------
// Context aplicație
// ---------------------------------------------------------------------
interface Lookups {
  profiles: Profile[];
  cabinets: Cabinet[];
  rooms: Room[];
  procedures: Procedure[];
  patients: Patient[];
  plan: PlanItem[];
  settings: AppSettings;
}

interface Ctx extends Lookups {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  t: (k: TKey) => string;
  me: Profile | null;
  reloadLookups: () => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);

const emptyLookups: Lookups = {
  profiles: [],
  cabinets: [],
  rooms: [],
  procedures: [],
  patients: [],
  plan: [],
  settings: { clinic_name: '', email_enabled: true, sms_enabled: false, keep_documents: true, documents_retention_days: null },
};

export function AppProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [lookups, setLookups] = useState<Lookups>(emptyLookups);

  useEffect(() => applyPrefs(prefs), [prefs]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((old) => {
      const next = { ...old, ...p };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reloadLookups = useCallback(async () => {
    if (!userId) return;
    const [profiles, cabinets, rooms, procedures, patients, plan, settings] = await Promise.all([
      api.listProfiles(),
      api.listCabinets(),
      api.listRooms(),
      api.listProcedures(),
      api.listPatients().catch(() => [] as Patient[]),
      api.listPlan().catch(() => [] as PlanItem[]),
      api.getSettings().catch(() => emptyLookups.settings),
    ]);
    setLookups({ profiles, cabinets, rooms, procedures, patients, plan, settings });
  }, [userId]);

  useEffect(() => {
    void reloadLookups();
    // Pacienții și planurile se schimbă de la mai multe persoane: reîncărcăm la orice modificare.
    return userId ? api.onPatientsChange(() => void reloadLookups()) : undefined;
  }, [reloadLookups, userId]);

  // La deschidere, un medic șterge documentele expirate după politica de retenție.
  const myRole = lookups.profiles.find((p) => p.id === userId)?.role;
  useEffect(() => {
    if (userId && myRole && myRole !== 'scheduler') void api.purgeExpiredDocuments().catch(() => undefined);
  }, [userId, myRole]);

  const value = useMemo<Ctx>(() => {
    const dict = dictionaries[prefs.lang];
    return {
      ...lookups,
      prefs,
      setPrefs,
      t: (k) => dict[k] ?? k,
      me: lookups.profiles.find((p) => p.id === userId) ?? null,
      reloadLookups,
    };
  }, [lookups, prefs, setPrefs, userId, reloadLookups]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

// ---------------------------------------------------------------------
// Utilitare de dată/oră (fusul orar local al dispozitivului)
// ---------------------------------------------------------------------
export const locale = (lang: Lang) => (lang === 'ro' ? 'ro-RO' : 'en-GB');

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // luni = 0
  return addDays(x, -dow);
}
export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function fmtRange(from: Date, to: Date, view: 'day' | 'week' | 'month', lang: Lang) {
  const l = locale(lang);
  if (view === 'month') return from.toLocaleDateString(l, { month: 'long', year: 'numeric' });
  if (view === 'day') return fmtDayHeading(from, lang);
  const last = addDays(to, -1);
  const a = from.toLocaleDateString(l, { day: 'numeric', month: 'short' });
  const b = last.toLocaleDateString(l, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}
export function toDateInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function toTimeInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fmtTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' });
}
export function fmtDateTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleString(locale(lang), {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
export function fmtDayHeading(d: Date, lang: Lang) {
  return d.toLocaleDateString(locale(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
