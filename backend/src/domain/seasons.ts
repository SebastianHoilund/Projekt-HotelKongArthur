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
