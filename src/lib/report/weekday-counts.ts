/**
 * Agregação de publicações por dia da semana (Mon=0 … Sun=6, UTC).
 *
 * Esta função vivia como helper privado em
 * `report-redesign/v2/overview/frequency-card.tsx`. Foi extraída sem
 * qualquer alteração de comportamento para poder ser reutilizada pela
 * camada de apresentação Editorial V2 sem criar um segundo algoritmo de
 * dias da semana. Pura, determinística, sem I/O.
 */

export interface WeekdayDayEntry {
  date: string;
  published: boolean;
  postCount: number;
}

export interface WeekdayBucket {
  /** 0 = segunda … 6 = domingo. */
  weekday: number;
  posts: number;
  daysTotal: number;
  daysSilent: number;
}

export function aggregateByWeekday(
  days: ReadonlyArray<WeekdayDayEntry>,
): WeekdayBucket[] {
  const buckets: WeekdayBucket[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    posts: 0,
    daysTotal: 0,
    daysSilent: 0,
  }));
  for (const d of days) {
    const date = new Date(d.date);
    if (Number.isNaN(date.getTime())) continue;
    const idx = (date.getUTCDay() + 6) % 7; // Mon=0
    buckets[idx]!.posts += d.postCount;
    buckets[idx]!.daysTotal += 1;
    if (d.postCount === 0) buckets[idx]!.daysSilent += 1;
  }
  return buckets;
}
