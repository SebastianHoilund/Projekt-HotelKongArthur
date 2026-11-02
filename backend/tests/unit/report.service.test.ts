import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/controller/csv.js';
import type { Booking, DrinkSale } from '../../src/domain/types.js';
import type {
  BookingFilters,
  BookingRepository,
  DrinkSaleFilters,
  DrinkSaleRepository,
} from '../../src/repository/interfaces.js';
import { ReportService } from '../../src/service/report.service.js';

const booking: Booking = {
  id: 7,
  guest: { id: 3, firstName: 'Anna', familyName: 'Jensen', country: 'South Korea' },
  roomType: 'LOFT Suite',
  roomNumber: 801,
  checkIn: '2026-12-20',
  checkOut: '2026-12-23',
  nights: 3,
  guests: 2,
  season: 'high',
  year: 2026,
  price: 12_000,
  priceIsManual: false,
  satisfaction: null,
};

const sale: DrinkSale = {
  id: 31,
  drinkId: 2,
  drinkName: 'Mojito',
  category: 'Cocktail',
  units: 3,
  unitPrice: 142.38,
  revenue: 427.14,
  soldAt: '2026-11-02T13:25:49.169Z',
  year: 2026,
  bartender: 'Helene Christine',
};

function service(bookingCalls: BookingFilters[] = [], saleCalls: DrinkSaleFilters[] = []) {
  const bookings = {
    findAll: async (filters: BookingFilters = {}) => {
      bookingCalls.push(filters);
      return [booking];
    },
  } as BookingRepository;
  const sales = {
    findAll: async (filters: DrinkSaleFilters = {}) => {
      saleCalls.push(filters);
      return [sale];
    },
  } as DrinkSaleRepository;
  return new ReportService(bookings, sales);
}

describe('ReportService', () => {
  it('giver én fakta-række pr. booking med måned fra indtjekningen og uden gæstens navn', async () => {
    const calls: BookingFilters[] = [];
    expect(await service(calls).bookingsReport(2026)).toEqual([
      {
        bookingId: 7,
        year: 2026,
        month: 12,
        season: 'high',
        checkIn: '2026-12-20',
        checkOut: '2026-12-23',
        roomType: 'LOFT Suite',
        roomNumber: 801,
        country: 'South Korea',
        guests: 2,
        nights: 3,
        price: 12_000,
        satisfaction: null,
      },
    ]);
    expect(calls).toEqual([{ year: 2026 }]);
  });

  it('giver én fakta-række pr. drinksalg', async () => {
    const calls: DrinkSaleFilters[] = [];
    expect(await service([], calls).drinkSalesReport(2026)).toEqual([
      {
        saleId: 31,
        year: 2026,
        soldAt: '2026-11-02T13:25:49.169Z',
        drinkName: 'Mojito',
        category: 'Cocktail',
        units: 3,
        unitPrice: 142.38,
        revenue: 427.14,
        bartender: 'Helene Christine',
      },
    ]);
    expect(calls).toEqual([{ year: 2026 }]);
  });
});

describe('toCsv', () => {
  it('skriver en header-række og citerer tekst, men ikke tal', () => {
    const csv = toCsv(
      [
        { id: 1, name: 'Old Fashioned', price: 129.17, note: null },
        { id: 2, name: 'Say "hi", Bob', price: 0, note: 'linje\nskift' },
      ],
      ['id', 'name', 'price', 'note'],
    );
    expect(csv).toBe(
      'id,name,price,note\r\n' +
        '1,"Old Fashioned",129.17,\r\n' +
        '2,"Say ""hi"", Bob",0,"linje\nskift"\r\n',
    );
  });

  it('skriver kun header-rækken, når der ingen rækker er', () => {
    expect(toCsv([], ['a', 'b'])).toBe('a,b\r\n');
  });
});
