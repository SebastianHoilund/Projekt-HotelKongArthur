import {
  BARTENDER,
  CAPACITY_ROOMS,
  DRINK_CATEGORIES,
  ROOM_TYPE_NAMES,
} from '../domain/constants.js';
import { countDays } from '../domain/seasons.js';
import type {
  BarAnalytics,
  Booking,
  CountryRevenue,
  Drink,
  DrinkSale,
  Occupancy,
  OccupancyRow,
  RevenueCell,
  RoomTypeRevenue,
  SatisfactionReport,
  SatisfactionValue,
  Season,
  Summary,
} from '../domain/types.js';
import type {
  BookingRepository,
  DrinkRepository,
  DrinkSaleRepository,
} from '../repository/interfaces.js';

const SEASONS: Season[] = ['low', 'mid', 'high'];

// Research R-08: 2 decimaler, og først når alt er summeret.
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const ratio = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;
const sum = <T>(rows: T[], pick: (row: T) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

function occupancyRow(period: string, bookings: Booking[], days: number): OccupancyRow {
  const nightsSold = sum(bookings, (b) => b.nights);
  const availableNights = CAPACITY_ROOMS * days;
  return {
    period,
    nightsSold,
    availableNights,
    occupancyRate: round2(ratio(nightsSold, availableNights) * 100),
  };
}

function revenueCell(bookings: Booking[]): RevenueCell {
  return {
    revenue: round2(sum(bookings, (b) => b.price)),
    bookings: bookings.length,
    nights: sum(bookings, (b) => b.nights),
  };
}

function satisfaction(bookings: Booking[]): SatisfactionValue {
  const scores = bookings.flatMap((b) => (b.satisfaction === null ? [] : [b.satisfaction]));
  return {
    average: round2(
      ratio(
        scores.reduce((total, score) => total + score, 0),
        scores.length,
      ),
    ),
    responses: scores.length,
  };
}

/** Rang 1 = højeste værdi. `sort` er stabil, så lighed beholder den rækkefølge, rækkerne kom i. */
function rankBy<T>(rows: T[], value: (row: T) => number): (T & { rank: number })[] {
  return [...rows]
    .sort((a, b) => value(b) - value(a))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

// Alle funktioner forventer bookinger for ét år. Hele bookingen tæller i indtjekningens
// år, sæson og måned (clarification 3), så de kan grupperes direkte på `season` og `checkIn`.

export function getSummary(bookings: Booking[], year: number): Summary {
  const revenue = sum(bookings, (b) => b.price);
  const { nightsSold, availableNights, occupancyRate } = occupancyRow(
    String(year),
    bookings,
    countDays(year).total,
  );
  return {
    year,
    revenue: round2(revenue),
    bookings: bookings.length,
    nightsSold,
    availableNights,
    occupancyRate,
    adr: round2(ratio(revenue, nightsSold)),
    revpar: round2(ratio(revenue, availableNights)),
    alos: round2(ratio(nightsSold, bookings.length)),
    satisfaction: satisfaction(bookings),
  };
}

export function getOccupancy(bookings: Booking[], year: number): Occupancy {
  const days = countDays(year);
  return {
    year,
    total: occupancyRow(String(year), bookings, days.total),
    bySeason: SEASONS.map((season) =>
      occupancyRow(
        season,
        bookings.filter((b) => b.season === season),
        days.bySeason[season],
      ),
    ),
    byMonth: days.byMonth.map((monthDays, index) => {
      const period = `${year}-${String(index + 1).padStart(2, '0')}`;
      return occupancyRow(
        period,
        bookings.filter((b) => b.checkIn.startsWith(period)),
        monthDays,
      );
    }),
  };
}

export function getRevenueByRoomType(bookings: Booking[]): RoomTypeRevenue[] {
  const rows = ROOM_TYPE_NAMES.map((roomType) => {
    const ofType = bookings.filter((b) => b.roomType === roomType);
    return {
      roomType,
      total: revenueCell(ofType),
      bySeason: Object.fromEntries(
        SEASONS.map((season) => [season, revenueCell(ofType.filter((b) => b.season === season))]),
      ) as Record<Season, RevenueCell>,
    };
  });
  return rankBy(rows, (row) => row.total.revenue);
}

export function getRevenueByCountry(bookings: Booking[]): CountryRevenue[] {
  const countries = [...new Set(bookings.map((b) => b.guest.country))].sort();
  const rows = countries.map((country) => {
    const fromCountry = bookings.filter((b) => b.guest.country === country);
    return {
      country,
      ...revenueCell(fromCountry),
      guests: sum(fromCountry, (b) => b.guests),
    };
  });
  return rankBy(rows, (row) => row.revenue);
}

export function getSatisfaction(bookings: Booking[], year: number): SatisfactionReport {
  return {
    year,
    overall: satisfaction(bookings),
    byRoomType: ROOM_TYPE_NAMES.map((roomType) => ({
      roomType,
      ...satisfaction(bookings.filter((b) => b.roomType === roomType)),
    })),
  };
}

/** Andele i procent, hvor den sidste er resten, så de afrundede andele summerer til præcis 100. */
function shares(values: number[]): number[] {
  const total = values.reduce((acc, value) => acc + value, 0);
  if (total === 0) return values.map(() => 0);
  const rounded = values.slice(0, -1).map((value) => round2((value / total) * 100));
  return [...rounded, round2(100 - rounded.reduce((acc, value) => acc + value, 0))];
}

/** Forventer årets salg. Omsætningen bruger salgets egen pris, ikke drinkens nuværende pris. */
export function getBarAnalytics(sales: DrinkSale[], drinks: Drink[], year: number): BarAnalytics {
  const barDrinks = drinks
    .map((drink) => {
      const ofDrink = sales.filter((s) => s.drinkId === drink.id);
      return {
        drinkId: drink.id,
        name: drink.name,
        category: drink.category,
        unitPrice: drink.unitPrice,
        units: sum(ofDrink, (s) => s.units),
        revenue: round2(sum(ofDrink, (s) => s.units * s.unitPrice)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const categories = DRINK_CATEGORIES.map((category) => {
    const ofCategory = sales.filter((s) => s.category === category);
    return {
      category,
      revenue: sum(ofCategory, (s) => s.units * s.unitPrice),
      units: sum(ofCategory, (s) => s.units),
    };
  });
  const revenueShares = shares(categories.map((c) => c.revenue));
  const unitShares = shares(categories.map((c) => c.units));

  return {
    year,
    bartender: BARTENDER,
    totals: {
      revenue: round2(sum(sales, (s) => s.units * s.unitPrice)),
      units: sum(sales, (s) => s.units),
    },
    drinks: barDrinks,
    categorySplit: categories.map((c, index) => ({
      category: c.category,
      revenue: round2(c.revenue),
      units: c.units,
      revenueShare: revenueShares[index],
      unitShare: unitShares[index],
    })),
  };
}

/** Henter årets bookinger og drinksalg og lader de rene funktioner ovenfor regne. Ingen caching. */
export class AnalyticsService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly drinks: DrinkRepository,
    private readonly drinkSales: DrinkSaleRepository,
  ) {}

  async summary(year: number): Promise<Summary> {
    return getSummary(await this.forYear(year), year);
  }

  async occupancy(year: number): Promise<Occupancy> {
    return getOccupancy(await this.forYear(year), year);
  }

  async revenueByRoomType(year: number): Promise<RoomTypeRevenue[]> {
    return getRevenueByRoomType(await this.forYear(year));
  }

  async revenueByCountry(year: number): Promise<CountryRevenue[]> {
    return getRevenueByCountry(await this.forYear(year));
  }

  async satisfaction(year: number): Promise<SatisfactionReport> {
    return getSatisfaction(await this.forYear(year), year);
  }

  async bar(year: number): Promise<BarAnalytics> {
    const [sales, drinks] = await Promise.all([
      this.drinkSales.findAll({ year }),
      this.drinks.findAll(),
    ]);
    return getBarAnalytics(sales, drinks, year);
  }

  private forYear(year: number): Promise<Booking[]> {
    return this.bookings.findAll({ year });
  }
}
