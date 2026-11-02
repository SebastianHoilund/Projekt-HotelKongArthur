import { describe, expect, it } from 'vitest';
import { ROOM_TYPE_NAMES } from '../../src/domain/constants.js';
import type { Booking, Drink, DrinkSale } from '../../src/domain/types.js';
import type {
  BookingFilters,
  BookingRepository,
  DrinkRepository,
  DrinkSaleFilters,
  DrinkSaleRepository,
} from '../../src/repository/interfaces.js';
import {
  AnalyticsService,
  getBarAnalytics,
  getOccupancy,
  getRevenueByCountry,
  getRevenueByRoomType,
  getSatisfaction,
  getSummary,
} from '../../src/service/analytics.service.js';

let nextId = 1;
const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: nextId++,
  guest: { id: nextId, firstName: 'Anna', familyName: 'Jensen', country: 'Denmark' },
  roomType: 'Standard Double',
  roomNumber: 301,
  checkIn: '2026-07-15',
  checkOut: '2026-07-16',
  nights: 1,
  guests: 2,
  season: 'high',
  year: 2026,
  price: 1600,
  priceIsManual: false,
  satisfaction: null,
  ...overrides,
});

const from = (country: string, overrides: Partial<Booking> = {}) =>
  booking({ guest: { id: 0, firstName: 'A', familyName: 'B', country }, ...overrides });

describe('getSummary', () => {
  it('beregner indtjening, belægning, ADR, RevPAR, ALOS og tilfredshed', () => {
    const summary = getSummary(
      [
        booking({ price: 1000, nights: 1, satisfaction: 4 }),
        booking({ price: 2000, nights: 2, satisfaction: null }),
        booking({ price: 3000, nights: 3, satisfaction: 5 }),
      ],
      2026,
    );
    expect(summary).toEqual({
      year: 2026,
      revenue: 6000,
      bookings: 3,
      nightsSold: 6,
      availableNights: 78_110,
      occupancyRate: 0.01,
      adr: 1000,
      revpar: 0.08,
      alos: 2,
      satisfaction: { average: 4.5, responses: 2 },
    });
  });

  it('giver 6,89 % for 5.379 solgte nætter i 2026 (kapaciteten skaleres ikke)', () => {
    expect(getSummary([booking({ nights: 5379 })], 2026).occupancyRate).toBe(6.89);
  });

  it('giver 0 i stedet for NaN, når der ingen bookinger er', () => {
    expect(getSummary([], 2026)).toEqual({
      year: 2026,
      revenue: 0,
      bookings: 0,
      nightsSold: 0,
      availableNights: 78_110,
      occupancyRate: 0,
      adr: 0,
      revpar: 0,
      alos: 0,
      satisfaction: { average: 0, responses: 0 },
    });
  });

  it('bruger 366 dage i et skudår', () => {
    expect(getSummary([], 2028).availableNights).toBe(214 * 366);
  });

  it('afrunder først efter summering', () => {
    const summary = getSummary(
      [
        booking({ price: 0.004, satisfaction: 4 }),
        booking({ price: 0.004, satisfaction: 4 }),
        booking({ price: 0.004, satisfaction: 3 }),
      ],
      2026,
    );
    expect(summary.revenue).toBe(0.01);
    expect(summary.satisfaction.average).toBe(3.67);
  });
});

describe('getRevenueByRoomType', () => {
  it('grupperer pr. type og sæson og rangerer efter samlet indtjening', () => {
    const result = getRevenueByRoomType([
      booking({ roomType: 'Suite', season: 'low', price: 5000, nights: 2 }),
      booking({ roomType: 'Suite', season: 'high', price: 7000, nights: 2 }),
      booking({ roomType: 'Grand Lit', season: 'mid', price: 9000, nights: 6 }),
      booking({ roomType: 'Grand Lit', season: 'mid', price: 1000, nights: 1 }),
    ]);

    expect(result).toHaveLength(8);
    expect(result[0]).toEqual({
      rank: 1,
      roomType: 'Suite',
      total: { revenue: 12_000, bookings: 2, nights: 4 },
      bySeason: {
        low: { revenue: 5000, bookings: 1, nights: 2 },
        mid: { revenue: 0, bookings: 0, nights: 0 },
        high: { revenue: 7000, bookings: 1, nights: 2 },
      },
    });
    expect(result[1]).toMatchObject({
      rank: 2,
      roomType: 'Grand Lit',
      total: { revenue: 10_000, bookings: 2, nights: 7 },
    });
  });

  it('medtager alle 8 typer med 0 og rang 1–8 i fast rækkefølge ved lighed', () => {
    const result = getRevenueByRoomType([]);
    expect(result.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.map((row) => row.roomType)).toEqual([...ROOM_TYPE_NAMES]);
    expect(result.every((row) => row.total.revenue === 0)).toBe(true);
  });
});

describe('getRevenueByCountry', () => {
  it('rangerer lande efter indtjening med bookinger, nætter og gæster', () => {
    const result = getRevenueByCountry([
      from('Norway', { price: 1000, nights: 1, guests: 1 }),
      from('Denmark', { price: 3000, nights: 2, guests: 2 }),
      from('Norway', { price: 2500, nights: 3, guests: 2 }),
      from('Sweden', { price: 3500, nights: 2, guests: 1 }),
    ]);
    expect(result).toEqual([
      { rank: 1, country: 'Norway', revenue: 3500, bookings: 2, nights: 4, guests: 3 },
      { rank: 2, country: 'Sweden', revenue: 3500, bookings: 1, nights: 2, guests: 1 },
      { rank: 3, country: 'Denmark', revenue: 3000, bookings: 1, nights: 2, guests: 2 },
    ]);
  });

  it('giver en tom liste uden bookinger', () => {
    expect(getRevenueByCountry([])).toEqual([]);
  });
});

describe('getOccupancy', () => {
  it('bruger 104/153/108 dage × 214 værelser pr. sæson og henfører hele bookingen til indtjekningen', () => {
    const occupancy = getOccupancy(
      [
        booking({ checkIn: '2026-01-30', checkOut: '2026-02-03', nights: 4, season: 'low' }),
        booking({ checkIn: '2026-04-10', checkOut: '2026-04-12', nights: 2, season: 'mid' }),
        booking({ checkIn: '2026-12-20', checkOut: '2026-12-23', nights: 3, season: 'high' }),
      ],
      2026,
    );

    expect(occupancy.year).toBe(2026);
    expect(occupancy.total).toEqual({
      period: '2026',
      nightsSold: 9,
      availableNights: 78_110,
      occupancyRate: 0.01,
    });
    expect(occupancy.bySeason).toEqual([
      { period: 'low', nightsSold: 4, availableNights: 104 * 214, occupancyRate: 0.02 },
      { period: 'mid', nightsSold: 2, availableNights: 153 * 214, occupancyRate: 0.01 },
      { period: 'high', nightsSold: 3, availableNights: 108 * 214, occupancyRate: 0.01 },
    ]);

    expect(occupancy.byMonth).toHaveLength(12);
    expect(occupancy.byMonth[0]).toEqual({
      period: '2026-01',
      nightsSold: 4,
      availableNights: 31 * 214,
      occupancyRate: 0.06,
    });
    expect(occupancy.byMonth[1]).toMatchObject({ period: '2026-02', nightsSold: 0 });
    expect(occupancy.byMonth[1].availableNights).toBe(28 * 214);
    expect(occupancy.byMonth.reduce((sum, row) => sum + row.availableNights, 0)).toBe(78_110);
  });

  it('giver 0 % i alle perioder uden bookinger', () => {
    const occupancy = getOccupancy([], 2026);
    const rows = [occupancy.total, ...occupancy.bySeason, ...occupancy.byMonth];
    expect(rows.every((row) => row.occupancyRate === 0)).toBe(true);
  });
});

describe('getSatisfaction', () => {
  it('beregner gennemsnit over besvarelser samlet og for alle 8 typer', () => {
    const report = getSatisfaction(
      [
        booking({ roomType: 'Suite', satisfaction: 5 }),
        booking({ roomType: 'Suite', satisfaction: 4 }),
        booking({ roomType: 'Suite', satisfaction: null }),
        booking({ roomType: 'Grand Lit', satisfaction: 2 }),
      ],
      2026,
    );

    expect(report.year).toBe(2026);
    expect(report.overall).toEqual({ average: 3.67, responses: 3 });
    expect(report.byRoomType).toHaveLength(8);
    expect(report.byRoomType.map((row) => row.roomType)).toEqual([...ROOM_TYPE_NAMES]);
    expect(report.byRoomType.find((row) => row.roomType === 'Suite')).toEqual({
      roomType: 'Suite',
      average: 4.5,
      responses: 2,
    });
    expect(report.byRoomType.find((row) => row.roomType === 'LOFT Suite')).toEqual({
      roomType: 'LOFT Suite',
      average: 0,
      responses: 0,
    });
  });
});

const drinks: Drink[] = [
  { id: 1, name: 'Margarita', category: 'Cocktail', unitPrice: 75 },
  { id: 2, name: 'Mojito', category: 'Cocktail', unitPrice: 100 },
  { id: 3, name: 'Espresso', category: 'Coffee', unitPrice: 30 },
  { id: 4, name: 'Latte', category: 'Coffee', unitPrice: 40 },
];

let nextSaleId = 1;
const sale = (drinkId: number, units: number, unitPrice: number): DrinkSale => {
  const drink = drinks.find((d) => d.id === drinkId)!;
  return {
    id: nextSaleId++,
    drinkId,
    drinkName: drink.name,
    category: drink.category,
    units,
    unitPrice,
    revenue: units * unitPrice,
    soldAt: '2026-12-31T23:59:59.000Z',
    year: 2026,
    bartender: 'Helene Christine',
  };
};

describe('getBarAnalytics', () => {
  it('summerer Helene Christines salg pr. drink og kategori med salgets egen pris', () => {
    const bar = getBarAnalytics(
      [sale(1, 2, 75), sale(1, 1, 60), sale(2, 1, 100), sale(3, 5, 30)],
      drinks,
      2026,
    );

    expect(bar.year).toBe(2026);
    expect(bar.bartender).toBe('Helene Christine');
    expect(bar.totals).toEqual({ revenue: 460, units: 9 });
    expect(bar.drinks).toEqual([
      {
        drinkId: 1,
        name: 'Margarita',
        category: 'Cocktail',
        unitPrice: 75,
        units: 3,
        revenue: 210,
      },
      { drinkId: 3, name: 'Espresso', category: 'Coffee', unitPrice: 30, units: 5, revenue: 150 },
      { drinkId: 2, name: 'Mojito', category: 'Cocktail', unitPrice: 100, units: 1, revenue: 100 },
      { drinkId: 4, name: 'Latte', category: 'Coffee', unitPrice: 40, units: 0, revenue: 0 },
    ]);
    expect(bar.categorySplit).toEqual([
      { category: 'Cocktail', revenue: 310, units: 4, revenueShare: 67.39, unitShare: 44.44 },
      { category: 'Coffee', revenue: 150, units: 5, revenueShare: 32.61, unitShare: 55.56 },
    ]);
  });

  it('lader andelene summere til præcis 100 trods afrunding', () => {
    const bar = getBarAnalytics([sale(1, 1, 1), sale(3, 2, 1)], drinks, 2026);
    const shares = bar.categorySplit.map((row) => row.unitShare);
    expect(shares).toEqual([33.33, 66.67]);
    expect(shares[0] + shares[1]).toBeCloseTo(100, 10);
  });

  it('giver 0 overalt uden salg, men viser stadig alle drinks', () => {
    const bar = getBarAnalytics([], drinks, 2030);
    expect(bar.totals).toEqual({ revenue: 0, units: 0 });
    expect(bar.drinks).toHaveLength(4);
    expect(bar.categorySplit).toEqual([
      { category: 'Cocktail', revenue: 0, units: 0, revenueShare: 0, unitShare: 0 },
      { category: 'Coffee', revenue: 0, units: 0, revenueShare: 0, unitShare: 0 },
    ]);
  });
});

describe('AnalyticsService', () => {
  const drinkRepo = { findAll: async () => drinks } as unknown as DrinkRepository;

  it('henter kun årets bookinger fra repository', async () => {
    const calls: BookingFilters[] = [];
    const repo = {
      findAll: async (filters: BookingFilters = {}) => {
        calls.push(filters);
        return [booking({ price: 1234, nights: 2 })];
      },
    } as BookingRepository;
    const service = new AnalyticsService(repo, drinkRepo, {} as DrinkSaleRepository);

    expect(await service.summary(2025)).toMatchObject({ year: 2025, revenue: 1234, nightsSold: 2 });
    expect(calls).toEqual([{ year: 2025 }]);
  });

  it('henter kun årets drinksalg til barens nøgletal', async () => {
    const calls: DrinkSaleFilters[] = [];
    const sales = {
      findAll: async (filters: DrinkSaleFilters = {}) => {
        calls.push(filters);
        return [sale(4, 2, 40)];
      },
    } as DrinkSaleRepository;
    const service = new AnalyticsService({} as BookingRepository, drinkRepo, sales);

    expect((await service.bar(2026)).totals).toEqual({ revenue: 80, units: 2 });
    expect(calls).toEqual([{ year: 2026 }]);
  });
});
