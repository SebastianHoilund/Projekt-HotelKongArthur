import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../src/db/seed.js';
import { startFreshApp } from './setup.js';

let pool: Pool;

beforeAll(async () => {
  ({ pool } = await startFreshApp());
}, 60_000);

afterAll(async () => {
  await pool.end();
});

const one = async <T>(sql: string): Promise<T> => (await pool.query(sql)).rows[0] as T;

describe('seed (T052, FR-013)', () => {
  it('indlæser 8 værelsestyper med 214 værelser og plads til 428 gæster', async () => {
    expect(
      await one(`SELECT count(*)::int AS types, sum(room_count)::int AS rooms,
                        sum(room_count * max_guests)::int AS capacity
                 FROM room_type`),
    ).toEqual({ types: 8, rooms: 214, capacity: 428 });
    expect(await one('SELECT count(*)::int AS rooms FROM room')).toEqual({ rooms: 214 });
  });

  it('indlæser 1.000 bookinger med 5.379 nætter, 705 tilfredshedssvar og én gæst pr. booking', async () => {
    expect(
      await one(`SELECT count(*)::int AS bookings, sum(nights)::int AS nights,
                        count(satisfaction)::int AS responses,
                        count(DISTINCT guest_id)::int AS guests,
                        bool_and(price_is_manual) AS manual
                 FROM booking`),
    ).toEqual({ bookings: 1000, nights: 5379, responses: 705, guests: 1000, manual: true });
  });

  it('har ingen overlappende bookinger på samme værelse (FR-017)', async () => {
    expect(
      await one(`SELECT count(*)::int AS overlaps
                 FROM booking a JOIN booking b
                   ON a.room_id = b.room_id AND a.id < b.id
                  AND a.check_in < b.check_out AND a.check_out > b.check_in`),
    ).toEqual({ overlaps: 0 });
  });

  it('indlæser 30 drinks (20 cocktails, 10 kaffe) med ét årssalg hver', async () => {
    expect(
      await one(`SELECT count(*) FILTER (WHERE category = 'Cocktail')::int AS cocktails,
                        count(*) FILTER (WHERE category = 'Coffee')::int AS coffee
                 FROM drink`),
    ).toEqual({ cocktails: 20, coffee: 10 });
    expect(
      await one(`SELECT count(*)::int AS sales, count(DISTINCT drink_id)::int AS drinks
                 FROM drink_sale`),
    ).toEqual({ sales: 30, drinks: 30 });
  });

  it('giver en belægningsgrad på 6,89 % for 2026', async () => {
    const { nights } = await one<{ nights: number }>(
      'SELECT sum(nights)::int AS nights FROM booking WHERE year = 2026',
    );
    expect(Math.round((nights / (214 * 365)) * 10_000) / 100).toBe(6.89);
  });

  it('kører ikke igen ved næste opstart, heller ikke når alle bookinger er slettet', async () => {
    await pool.query('DELETE FROM booking');
    await seed(pool);
    expect(await one('SELECT count(*)::int AS bookings FROM booking')).toEqual({ bookings: 0 });
  });
});
