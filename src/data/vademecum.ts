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
  o?: string[]; // tipuri de orteze la care se referă rândul
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
export interface OrtData {
  ORTHO: { id: string; name: string; reg: string }[];
  ORT_REG: string[];
  ORT_BOOK: Record<string, { pg: string; d?: string[]; b: [string, string[]][] }>;
  ORT_GEN: [string, string[]][];
  ORT_BOOK_REF: string[];
}
export const loadOrteze = () => load<OrtData>('orteze.json');
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
  info?: boolean; sec?: [string, string | string[]][]; calc?: string; pts?: number; special?: string;
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

export interface ExamSource { r?: string; l?: string; se?: number; sp?: number; os?: string; [k: string]: unknown }
export interface ExamTest {
  id: string; t: string; h?: string; k?: string; ord?: string; g?: string; rule?: number;
  opt?: { t: string; lr: number | null; ci?: number[] }[];
  num?: { u: string; op?: string; x?: number; b?: { l?: string; op: string; x: number; lr: number; ci?: number[] }[] };
  v: ExamSource[];
}
export interface ExamComb {
  id: string; t: string; r: string; m: string[]; x?: string[]; h?: string;
  rules: { t: string; m?: string[]; st: { a: number; b: number; lr: number; ci?: number[]; sec?: string; calc?: number }[] }[];
}
export interface ExamCond { id: string; t: string; pre: number | null; preN?: string; note: string; tests: ExamTest[]; k?: ExamComb[] }
export interface ExamData {
  EX_QT: Record<string, string>; EX_REF: Record<string, { q: string; c: string }>;
  EX_REG: { id: string; t: string; c: ExamCond[] }[];
  EX_ROM_AGES: string[]; EX_ROM: unknown[][]; EX_ROM_REF: string;
  EX_SCALES: { id: string; t: string; r: string; g: string[][] }[];
  EX_PAT: Record<string, string>; EX_THR_REF: string;
}
export const loadExam = () => load<ExamData>('exam.json');

export interface BiletData {
  BI_LOCO: string[][]; BI_GEN: string[][]; BI_NEUF: string[][]; BI_NEU: string[][];
  BI_REC: [string, string, boolean][]; BI_INV: string[][]; BI_LAS: string[][]; BI_PAT: string[][]; BI_GAP: string;
}
export const loadBilet = () => load<BiletData>('bilet.json');
export interface ReferateData { dx999: string[]; a38: unknown[] }
export const loadReferate = () => load<ReferateData>('referate.json');
