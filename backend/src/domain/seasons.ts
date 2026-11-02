import type { Season } from './types.js';

// Perioder fra reference-data.md §1. Datoer læses i UTC, så værtens tidszone ikke kan flytte sæsonen.
export function determineSeason(checkIn: Date): Season {
  const month = checkIn.getUTCMonth() + 1;
  const day = checkIn.getUTCDate();

  if (month <= 2 || month === 11) return 'low';
  if (month <= 5 || month === 9 || month === 10) return 'mid';
  if (month <= 8) return 'high';
  return day <= 15 ? 'low' : 'high';
}

export interface DaysInYear {
  total: number;
  bySeason: Record<Season, number>;
  /** Index 0 = januar. */
  byMonth: number[];
}

/** Antal dage i året, pr. sæson og pr. måned. Giver 104/153/108 for 2026 og tager højde for skudår. */
export function countDays(year: number): DaysInYear {
  const days: DaysInYear = { total: 0, bySeason: { low: 0, mid: 0, high: 0 }, byMonth: [] };
  for (let date = new Date(Date.UTC(year, 0, 1)); date.getUTCFullYear() === year;) {
    days.total++;
    days.bySeason[determineSeason(date)]++;
    const month = date.getUTCMonth();
    days.byMonth[month] = (days.byMonth[month] ?? 0) + 1;
    date = new Date(date.getTime() + 86_400_000);
  }
  return days;
}
