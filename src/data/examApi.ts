// Interfața tipată larg către motorul copiat din Vademecum (examEngine.ts, fără verificare de tipuri).
import * as E from './examEngine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const X = E as any;
export const exSetData: (d: unknown) => void = X.exSetData;
export const exSetState: (v: unknown, thr: unknown) => void = X.exSetState;
export const EX_NEXTF: Record<string, (C: unknown, r: unknown) => { z: string; html: string }> = X.EX_NEXTF;
export const EX_ZSHORT: Record<string, string> = X.EX_ZSHORT;
export const exAny: (C: unknown) => boolean = X.exAny;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exCompute: (C: unknown) => any = X.exCompute;
export const exF: (x: number, d: number) => string = X.exF;
export const exKShort: (K: { t: string }) => string = X.exKShort;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exLR: (v: unknown, side: 'p' | 'n') => any = X.exLR;
export const exLRf: (x: number) => string = X.exLRf;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exNextTests: (C: unknown, r: unknown) => any[] = X.exNextTests;
export const exNum: (x: unknown) => number | null = X.exNum;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exOut: (T: unknown, a: unknown) => any = X.exOut;
export const exP: (r: unknown) => number = X.exP;
export const exPc: (x: number) => string = X.exPc;
export const exPf: (x: number) => string = X.exPf;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exSrc: (C: unknown, T: unknown) => any = X.exSrc;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exTests: (C: unknown) => any[] = X.exTests;
export const exThr: () => { t: number; r: number } = X.exThr;
export const exU: (x: number, u: string) => string = X.exU;
export const exZone: (C: unknown, r: unknown) => string = X.exZone;
export const exZoneLabel: (z: string) => string = X.exZoneLabel;
export const exY: (T: unknown) => string = X.exY;
export const exN: (T: unknown) => string = X.exN;
export const exCi: (c: number[], pct?: boolean) => string = X.exCi;
export const exQ: (r?: string) => string = X.exQ;
