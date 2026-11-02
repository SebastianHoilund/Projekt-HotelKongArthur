import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { BookingInput } from '../../src/domain/types.js';
import { BookingService } from '../../src/service/booking.service.js';
import { PricingService } from '../../src/service/pricing.service.js';
import { createFakes } from './fakes.js';

const input = (overrides: Partial<BookingInput> = {}): BookingInput => ({
  guest: { firstName: 'Anna', familyName: 'Jensen', country: 'Denmark' },
  roomType: 'Standard Double',
  checkIn: '2026-07-15',
  checkOut: '2026-07-20',
  guests: 2,
  ...overrides,
});

const loft = (checkIn: string, checkOut: string, overrides: Partial<BookingInput> = {}) =>
  input({ roomType: 'LOFT Suite', checkIn, checkOut, ...overrides });

describe('BookingService', () => {
  let fakes: ReturnType<typeof createFakes>;
  let service: BookingService;

  beforeEach(() => {
    fakes = createFakes();
    service = new BookingService(
      fakes.bookingRepo,
      fakes.guestRepo,
      fakes.roomRepo,
      fakes.roomTypeRepo,
      fakes.unitOfWork,
      new PricingService(),
    );
  });

  describe('create', () => {
    it('udleder sæson, nætter, år og pris og tildeler laveste ledige værelse (US1-1, US2-2)', async () => {
      const booking = await service.create(input());
      expect(booking).toMatchObject({
        roomType: 'Standard Double',
        roomNumber: 301,
        nights: 5,
        season: 'high',
        year: 2026,
        price: 8000,
        priceIsManual: false,
        satisfaction: null,
        guest: { firstName: 'Anna', familyName: 'Jensen', country: 'Denmark' },
      });
    });

    it('trimmer gæstens navn og land', async () => {
      const booking = await service.create(
        input({ guest: { firstName: ' Anna ', familyName: 'Jensen ', country: ' Denmark' } }),
      );
      expect(booking.guest).toMatchObject({
        firstName: 'Anna',
        familyName: 'Jensen',
        country: 'Denmark',
      });
    });

    it('bruger en manuel pris', async () => {
      const booking = await service.create(input({ price: 5000 }));
      expect(booking).toMatchObject({ price: 5000, priceIsManual: true, season: 'high' });
    });

    it.each([
      ['udtjekning samme dag som indtjekning', input({ checkOut: '2026-07-15' })],
      ['udtjekning før indtjekning', input({ checkOut: '2026-07-10' })],
      ['flere gæster end typen tillader', input({ roomType: 'Standard Single', guests: 2 })],
      ['ukendt værelsestype', { ...input(), roomType: 'Penthouse' } as unknown as BookingInput],
      ['tomt fornavn', input({ guest: { firstName: '  ', familyName: 'J', country: 'DK' } })],
      ['0 gæster', input({ guests: 0 })],
      ['negativ pris', input({ price: -1 })],
      ['ugyldig dato', input({ checkIn: '2026-02-30' })],
    ])('afviser %s med ValidationError', async (_name, bad) => {
      await expect(service.create(bad)).rejects.toBeInstanceOf(ValidationError);
      expect(fakes.bookings.size).toBe(0);
    });

    it('springer optagne værelser over og tillader udtjekning = indtjekning (US1-5)', async () => {
      const first = await service.create(loft('2026-03-10', '2026-03-13'));
      const overlapping = await service.create(loft('2026-03-12', '2026-03-14'));
      const sameDay = await service.create(loft('2026-03-13', '2026-03-15'));
      expect([first.roomNumber, overlapping.roomNumber, sameDay.roomNumber]).toEqual([
        801, 802, 801,
      ]);
    });

    it('afviser med ConflictError, når alle værelser af typen er optaget', async () => {
      for (let i = 0; i < 6; i++) await service.create(loft('2026-03-10', '2026-03-13'));
      await expect(service.create(loft('2026-03-12', '2026-03-14'))).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(fakes.bookings.size).toBe(6);
    });
  });

  describe('update', () => {
    it('beholder værelset, når typen er uændret og værelset er ledigt, og genberegner prisen', async () => {
      const created = await service.create(input());
      const updated = await service.update(
        created.id,
        input({ checkIn: '2026-04-10', checkOut: '2026-04-12' }),
      );
      expect(updated).toMatchObject({
        roomNumber: created.roomNumber,
        season: 'mid',
        nights: 2,
        price: 2800,
        priceIsManual: false,
      });
    });

    it('flytter til et ledigt værelse, når det nuværende er optaget i den nye periode', async () => {
      const a = await service.create(loft('2026-03-10', '2026-03-13'));
      const b = await service.create(loft('2026-03-20', '2026-03-22'));
      expect([a.roomNumber, b.roomNumber]).toEqual([801, 801]);
      const moved = await service.update(b.id, loft('2026-03-12', '2026-03-14'));
      expect(moved.roomNumber).toBe(802);
    });

    it('tildeler et værelse af den nye type, når typen ændres', async () => {
      const created = await service.create(input());
      const updated = await service.update(created.id, input({ roomType: 'Suite' }));
      expect(updated).toMatchObject({ roomType: 'Suite', roomNumber: 701, price: 17_500 });
    });

    it('afviser med ConflictError, når intet værelse af den nye type er ledigt', async () => {
      for (let i = 0; i < 6; i++) await service.create(loft('2026-03-10', '2026-03-13'));
      const other = await service.create(input({ checkIn: '2026-03-10', checkOut: '2026-03-13' }));
      await expect(
        service.update(other.id, loft('2026-03-10', '2026-03-13')),
      ).rejects.toBeInstanceOf(ConflictError);
      expect((await service.get(other.id)).roomType).toBe('Standard Double');
    });

    it('bruger en ny manuel pris', async () => {
      const created = await service.create(input());
      const updated = await service.update(created.id, input({ price: 5000 }));
      expect(updated).toMatchObject({ price: 5000, priceIsManual: true });
    });

    it('genberegner en manuel pris, når datoerne ændres uden ny pris (clarification 2)', async () => {
      const created = await service.create(input({ price: 5000 }));
      const updated = await service.update(created.id, input({ checkOut: '2026-07-18' }));
      expect(updated).toMatchObject({ price: 4800, priceIsManual: false });
    });

    it('beholder en manuel pris, når kun gæsten ændres', async () => {
      const created = await service.create(input({ price: 5000 }));
      const updated = await service.update(
        created.id,
        input({ guest: { firstName: 'Bo', familyName: 'Jensen', country: 'Norway' } }),
      );
      expect(updated).toMatchObject({ price: 5000, priceIsManual: true });
      expect(updated.guest).toMatchObject({ id: created.guest.id, country: 'Norway' });
    });

    it('giver NotFoundError for en ukendt booking', async () => {
      await expect(service.update(999, input())).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete og get', () => {
    it('sletter bookingen og den forladte gæst, så værelset bliver ledigt (US1-3)', async () => {
      const created = await service.create(loft('2026-03-10', '2026-03-13'));
      await service.delete(created.id);
      expect(fakes.bookings.size).toBe(0);
      expect(fakes.guests.size).toBe(0);
      await expect(service.get(created.id)).rejects.toBeInstanceOf(NotFoundError);
      expect((await service.create(loft('2026-03-10', '2026-03-13'))).roomNumber).toBe(801);
    });

    it('giver NotFoundError ved sletning af en ukendt booking', async () => {
      await expect(service.delete(999)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
