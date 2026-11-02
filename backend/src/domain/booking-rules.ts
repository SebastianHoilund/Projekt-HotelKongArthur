export interface Period {
  checkIn: string;
  checkOut: string;
}

const DAY_MS = 86_400_000;

/** Antal nætter mellem to 'YYYY-MM-DD'-datoer. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / DAY_MS;
}

/** FR-017: overlap er ci₁ < co₂ og co₁ > ci₂. Udtjekningsdagen må være næste gæsts indtjekningsdag. */
export function overlaps(a: Period, b: Period): boolean {
  return a.checkIn < b.checkOut && a.checkOut > b.checkIn;
}
