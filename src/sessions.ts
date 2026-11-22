import type { Frequency } from './types';

/** Următoarea zi de ședință după `d`, după frecvența din plan (zile lucrătoare). */
export function nextSession(d: Date, freq: Frequency): Date {
  const x = new Date(d);
  if (freq === 'weekly') {
    x.setDate(x.getDate() + 7);
    return x;
  }
  let steps = freq === 'alternate' ? 2 : 1;
  while (steps > 0) {
    x.setDate(x.getDate() + 1);
    if (x.getDay() !== 0 && x.getDay() !== 6) steps--;
  }
  return x;
}
