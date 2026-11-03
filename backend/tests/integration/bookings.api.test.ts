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

const booking = (overrides: Record<string, unknown> = {}) => ({
  guest: { firstName: 'Anna', familyName: 'Jensen', country: 'Denmark' },
  roomType: 'Standard Double',
  checkIn: '2027-07-15',
  checkOut: '2027-07-20',
  guests: 2,
  ...overrides,
});

const loft = (checkIn: string, checkOut: string) =>
  booking({ roomType: 'LOFT Suite', checkIn, checkOut });

// Alle svar valideres mod api/openapi.yaml (NODE_ENV=test), så en kontraktafvigelse giver 500.
describe('booking-API (T053)', () => {
  it('opretter en booking med sæson, nætter, pris og værelse fra backenden (201 + Location)', async () => {
    const res = await request(app).post('/api/bookings').send(booking()).expect(201);
    expect(res.headers.location).toBe(`/api/bookings/${res.body.id}`);
    expect(res.body).toMatchObject({
      roomType: 'Standard Double',
      roomNumber: 301,
      season: 'high',
      nights: 5,
      year: 2027,
      price: 8000,
      priceIsManual: false,
      guest: { firstName: 'Anna', familyName: 'Jensen', country: 'Denmark' },
    });
  });

  it.each([
    ['udtjekning = indtjekning', booking({ checkOut: '2027-07-15' })],
    ['for mange gæster', booking({ roomType: 'Standard Single', guests: 2 })],
    ['ukendt værelsestype', booking({ roomType: 'Penthouse' })],
    ['tomt navn', booking({ guest: { firstName: ' ', familyName: 'J', country: 'DK' } })],
    ['dato der ikke findes', booking({ checkIn: '2027-02-30' })],
    ['ukendt felt', booking({ discount: 10 })],
  ])('afviser %s med 400 i fælles fejlformat', async (_name, body) => {
    const res = await request(app).post('/api/bookings').send(body).expect(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('tildeler ledige værelser og afviser overlap med 409, når typen er fuld (FR-017)', async () => {
    const rooms = [];
    for (let i = 0; i < 6; i++) {
      rooms.push(
        (await request(app).post('/api/bookings').send(loft('2027-03-10', '2027-03-13'))).body
          .roomNumber,
      );
    }
    expect(rooms).toEqual([801, 802, 803, 804, 805, 806]);

    const conflict = await request(app)
      .post('/api/bookings')
      .send(loft('2027-03-12', '2027-03-14'));
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('CONFLICT');

    // Udtjekning samme dag som næste indtjekning er ikke overlap.
    await request(app).post('/api/bookings').send(loft('2027-03-13', '2027-03-15')).expect(201);
  });

  it('giver aldrig samme værelse til samtidige bookinger (FOR UPDATE)', async () => {
    const results = await Promise.all(
      Array.from({ length: 7 }, () =>
        request(app).post('/api/bookings').send(loft('2027-05-01', '2027-05-03')),
      ),
    );
    const created = results.filter((r) => r.status === 201).map((r) => r.body.roomNumber);
    expect(created.sort()).toEqual([801, 802, 803, 804, 805, 806]);
    expect(results.filter((r) => r.status === 409)).toHaveLength(1);
  });

  it('lister, filtrerer og henter enkelte bookinger', async () => {
    const all = await request(app).get('/api/bookings').query({ year: 2026 }).expect(200);
    expect(all.body).toHaveLength(1000);

    const filtered = await request(app)
      .get('/api/bookings')
      .query({ year: 2026, roomType: 'LOFT Suite', season: 'high' })
      .expect(200);
    expect(filtered.body.length).toBeGreaterThan(0);
    expect(
      filtered.body.every(
        (b: { roomType: string; season: string }) =>
          b.roomType === 'LOFT Suite' && b.season === 'high',
      ),
    ).toBe(true);

    const one = await request(app).get(`/api/bookings/${all.body[0].id}`).expect(200);
    expect(one.body).toEqual(all.body[0]);
  });

  it('opdaterer, beholder værelset og genberegner prisen (PUT)', async () => {
    const created = (
      await request(app)
        .post('/api/bookings')
        .send(booking({ checkIn: '2027-09-01', checkOut: '2027-09-03' }))
    ).body;
    const updated = await request(app)
      .put(`/api/bookings/${created.id}`)
      .send(booking({ checkIn: '2027-09-01', checkOut: '2027-09-05' }))
      .expect(200);
    expect(updated.body).toMatchObject({
      id: created.id,
      roomNumber: created.roomNumber,
      season: 'mid',
      nights: 4,
      price: 5600,
      priceIsManual: false,
    });

    const manual = await request(app)
      .put(`/api/bookings/${created.id}`)
      .send(booking({ checkIn: '2027-09-01', checkOut: '2027-09-05', price: 5000 }))
      .expect(200);
    expect(manual.body).toMatchObject({ price: 5000, priceIsManual: true });
  });

  it('sletter bookingen og dens gæst (204, derefter 404)', async () => {
    const created = (
      await request(app)
        .post('/api/bookings')
        .send(booking({ checkIn: '2027-11-01', checkOut: '2027-11-02' }))
    ).body;
    await request(app).delete(`/api/bookings/${created.id}`).expect(204);
    await request(app).get(`/api/bookings/${created.id}`).expect(404);
    await request(app).delete(`/api/bookings/${created.id}`).expect(404);

    const { rows } = await pool.query('SELECT 1 FROM guest WHERE id = $1', [created.guest.id]);
    expect(rows).toHaveLength(0);
  });

  it('svarer 404 i fælles fejlformat for ukendte bookinger og endpoints', async () => {
    const res = await request(app).get('/api/bookings/999999').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    await request(app).put('/api/bookings/999999').send(booking()).expect(404);
    await request(app).get('/api/findes-ikke').expect(404);
  });
});
