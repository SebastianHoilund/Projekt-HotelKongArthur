import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFreshApp } from './setup.js';

let app: Express;
let pool: Pool;

beforeAll(async () => {
  ({ app, pool } = await startFreshApp());
}, 60_000);

afterAll(async () => {
  await pool.end();
});

const get = async (path: string) => (await request(app).get(path).expect(200)).body;

// Svarene valideres mod api/openapi.yaml (NODE_ENV=test). Værdierne er dem fra data-model.md.
describe('analytics-API (T054)', () => {
  it('summary for 2026 giver de forventede nøgletal (quickstart scenarie 7)', async () => {
    const summary = await get('/api/analytics/summary?year=2026');
    expect(summary).toMatchObject({
      year: 2026,
      bookings: 1000,
      nightsSold: 5379,
      availableNights: 78_110,
      occupancyRate: 6.89,
      satisfaction: { average: 3.87, responses: 705 },
    });
    expect(summary.adr).toBeCloseTo(summary.revenue / 5379, 2);
    expect(summary.revpar).toBeCloseTo(summary.revenue / 78_110, 2);
  });

  it('occupancy har året, 3 sæsoner og 12 måneder, der summerer til året', async () => {
    const occupancy = await get('/api/analytics/occupancy?year=2026');
    expect(occupancy.bySeason.map((r: { period: string }) => r.period)).toEqual([
      'low',
      'mid',
      'high',
    ]);
    expect(occupancy.byMonth).toHaveLength(12);
    const sum = (
      rows: { nightsSold: number; availableNights: number }[],
      key: 'nightsSold' | 'availableNights',
    ) => rows.reduce((total, row) => total + row[key], 0);
    expect(sum(occupancy.byMonth, 'availableNights')).toBe(78_110);
    expect(sum(occupancy.bySeason, 'nightsSold')).toBe(5379);
    expect(sum(occupancy.byMonth, 'nightsSold')).toBe(5379);
  });

  it('revenue/room-types giver alle 8 typer rangeret 1–8 efter indtjening', async () => {
    const types = await get('/api/analytics/revenue/room-types?year=2026');
    expect(types.map((t: { rank: number }) => t.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const revenues = types.map((t: { total: { revenue: number } }) => t.total.revenue);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    expect(
      types.reduce((n: number, t: { total: { bookings: number } }) => n + t.total.bookings, 0),
    ).toBe(1000);
  });

  it('revenue/countries rangerer landene efter indtjening', async () => {
    const countries = await get('/api/analytics/revenue/countries?year=2026');
    expect(countries[0]).toMatchObject({ rank: 1, country: 'South Korea', bookings: 63 });
    const revenues = countries.map((c: { revenue: number }) => c.revenue);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
  });

  it('satisfaction giver samlet og pr. type med antal svar', async () => {
    const report = await get('/api/analytics/satisfaction?year=2026');
    expect(report.overall).toEqual({ average: 3.87, responses: 705 });
    expect(report.byRoomType).toHaveLength(8);
    expect(
      report.byRoomType.reduce((n: number, r: { responses: number }) => n + r.responses, 0),
    ).toBe(705);
  });

  it('bar giver Helene Christines total, 30 drinks og en fordeling, der summerer til 100 %', async () => {
    const bar = await get('/api/analytics/bar?year=2026');
    expect(bar.bartender).toBe('Helene Christine');
    expect(bar.drinks).toHaveLength(30);
    expect(bar.totals.units).toBe(179_958);
    const shares = (key: 'revenueShare' | 'unitShare') =>
      bar.categorySplit.reduce((n: number, c: Record<string, number>) => n + c[key], 0);
    expect(shares('revenueShare')).toBeCloseTo(100, 10);
    expect(shares('unitShare')).toBeCloseTo(100, 10);
  });

  it('afspejler nye data med det samme uden cache (booking og barsalg)', async () => {
    const before = await get('/api/analytics/summary?year=2026');
    const created = await request(app)
      .post('/api/bookings')
      .send({
        guest: { firstName: 'Live', familyName: 'Data', country: 'Iceland' },
        roomType: 'Suite',
        checkIn: '2026-10-05',
        checkOut: '2026-10-08',
        guests: 2,
        price: 40_000,
      })
      .expect(201);
    const after = await get('/api/analytics/summary?year=2026');
    expect(after.revenue - before.revenue).toBe(40_000);
    expect(after.bookings).toBe(before.bookings + 1);

    const report = await get('/api/reports/bookings?year=2026');
    expect(report.some((r: { bookingId: number }) => r.bookingId === created.body.id)).toBe(true);

    const barBefore = await get('/api/analytics/bar?year=2026');
    await request(app)
      .post('/api/drink-sales')
      .send({ drinkId: 1, units: 2, soldAt: '2026-06-01T20:00:00+02:00' })
      .expect(201);
    const barAfter = await get('/api/analytics/bar?year=2026');
    expect(barAfter.totals.units - barBefore.totals.units).toBe(2);
  });

  it('giver 0 i stedet for fejl for et år uden data og 400 for et ugyldigt år', async () => {
    const empty = await get('/api/analytics/summary?year=2030');
    expect(empty).toMatchObject({ revenue: 0, occupancyRate: 0, adr: 0, alos: 0 });
    await request(app).get('/api/analytics/summary?year=1999').expect(400);
  });

  it('leverer rapporterne som CSV med header-række', async () => {
    const res = await request(app).get('/api/reports/bookings?year=2026&format=csv').expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe(
      'bookingId,year,month,season,checkIn,checkOut,roomType,roomNumber,country,guests,nights,price,satisfaction',
    );
    expect(lines).toHaveLength(1002);
  });
});
