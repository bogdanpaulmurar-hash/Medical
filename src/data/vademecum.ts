// Conținutul medical de referință din Vademecum MFR 3.0 (ghiduri pe afecțiuni, aparate, contraindicații).
// Datele sunt preluate neschimbat din aplicația medicului (public/data/*.json) și se încarcă la prima deschidere.

export type GuideStatus = 'rec' | 'opt' | 'ins' | 'no';

export interface GuideRow {
  s: string; // secțiunea: proc, med, inv, ref, alt
  l: string; // procedura / măsura
  d: string[]; // aparatele (id-uri din catalog)
  st: GuideStatus;
  g: string; // gradul din ghid
  src: string; // ghidul
  n: string; // notă
  ev: string; // nivelul dovezilor: h, m, l, v, u, b
  pg?: string;
  bk?: number; // 1 = din manualul de referință
}

export interface PatCategory {
  id: string;
  t: string;
  ico: string;
  p: string[];
}

export interface GuideData {
  GUIDE: Record<string, GuideRow[]>;
  BKB: Record<string, GuideRow[]>;
  BK_SEE: Record<string, string[]>;
  PATNOTE: Record<string, string>;
  REFS: Record<string, string>;
  SYS: Record<string, string>;
  GSEC: [string, string, string][];
  GSTAT: Record<GuideStatus, string>;
  GSIGN: Record<GuideStatus, string>;
  GORDER: GuideStatus[];
  PAT_CATS: PatCategory[];
  ICONS: Record<string, string>;
}

export interface TreeNode {
  g?: string; // grup
  p?: string; // program
  info?: string;
  tag?: string;
  items?: (TreeNode | string)[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  short: string;
  note: string;
  params: string;
  ind: string;
  tree: (TreeNode | string)[];
  cat: string;
}

export interface Contra {
  abs?: string[];
  prec?: string[];
  note?: string;
}

export interface DeviceData {
  DEVICES: DeviceInfo[];
  CI: Record<string, Contra>;
  CATS: { id: string; name: string }[];
}

const cache: Record<string, Promise<unknown>> = {};
function load<T>(file: string): Promise<T> {
  // Numărul versiunii în adresă: serviciul offline păstrează fișierul doar până la următoarea lansare.
  const url = `${import.meta.env.BASE_URL}data/${file}?v=${__APP_RELEASE__}`;
  if (!cache[file]) {
    cache[file] = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    cache[file].catch(() => delete cache[file]);
  }
  return cache[file] as Promise<T>;
}

export const loadGuide = () => load<GuideData>('guide.json');
export const loadDevices = () => load<DeviceData>('devices.json');

export interface ScaleItem {
  id?: string; t?: string; g?: string; h?: string;
  o?: (string | number)[][]; n?: number;
  num?: number; min?: number; max?: number; u?: string; uL?: string; unable?: string;
  cb?: number; np?: number;
}
export interface Scale {
  id: string; cat: string; t: string; al?: string; what: string; who?: string; time?: string;
  items?: ScaleItem[]; bands?: [number, number, string, string][]; bandSrc?: string;
  about?: string; src?: string[]; lic?: string;
  info?: boolean; sec?: [string, string | string[]][]; calc?: string; pts?: number;
}
export interface ScaleData { cats: { id: string; t: string }[]; scales: Scale[] }
export const loadScales = () => load<ScaleData>('scales.json');

/** Normalizare pentru căutare: fără diacritice și litere mici. */
export const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const EVIDENCE_LABEL: Record<string, { ro: string; en: string }> = {
  h: { ro: 'dovezi solide', en: 'high-quality evidence' },
  m: { ro: 'dovezi moderate', en: 'moderate evidence' },
  l: { ro: 'dovezi slabe', en: 'low evidence' },
  v: { ro: 'dovezi foarte slabe sau opinia experților', en: 'very low evidence or expert opinion' },
  u: { ro: 'nivel nespecificat', en: 'level not specified' },
  b: { ro: 'manual de referință', en: 'reference textbook' },
};
