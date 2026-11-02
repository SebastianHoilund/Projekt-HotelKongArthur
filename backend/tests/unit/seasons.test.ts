import { describe, expect, it } from 'vitest';
import { SEASON_DAYS } from '../../src/domain/constants.js';
import { determineSeason } from '../../src/domain/seasons.js';
import type { Season } from '../../src/domain/types.js';

const season = (date: string) => determineSeason(new Date(`${date}T00:00:00Z`));

describe('determineSeason', () => {
  it.each<[string, Season]>([
    ['2026-01-01', 'low'],
    ['2026-02-28', 'low'],
    ['2026-03-01', 'mid'],
    ['2026-05-31', 'mid'],
    ['2026-06-01', 'high'],
    ['2026-08-31', 'high'],
    ['2026-09-01', 'mid'],
    ['2026-10-31', 'mid'],
    ['2026-11-01', 'low'],
    ['2026-12-15', 'low'],
    ['2026-12-16', 'high'],
    ['2026-12-31', 'high'],
  ])('%s er %s (sæsongrænse)', (date, expected) => {
    expect(season(date)).toBe(expected);
  });

  it.each<[string, Season]>([
    ['2026-07-15', 'high'],
    ['2026-12-20', 'high'],
    ['2026-12-10', 'low'],
  ])('%s er %s (acceptance scenario US2-3)', (date, expected) => {
    expect(season(date)).toBe(expected);
  });

  it('giver 104 lave, 153 mellem og 108 høje dage i 2026', () => {
    const days: Record<Season, number> = { low: 0, mid: 0, high: 0 };
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86_400_000) {
      days[determineSeason(new Date(t))]++;
    }
    expect(days).toEqual(SEASON_DAYS);
  });
});
