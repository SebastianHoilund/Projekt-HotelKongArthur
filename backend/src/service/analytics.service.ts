import { CAPACITY_ROOMS, ROOM_TYPE_NAMES } from '../domain/constants.js';
import { countDays } from '../domain/seasons.js';
import type {
  Booking,
  CountryRevenue,
  Occupancy,
  OccupancyRow,
  RevenueCell,
  RoomTypeRevenue,
  SatisfactionReport,
  SatisfactionValue,
  Season,
  Summary,
} from '../domain/types.js';
import type { BookingRepository } from '../repository/interfaces.js';

const SEASONS: Season[] = ['low', 'mid', 'high'];

// Research R-08: 2 decimaler, og først når alt er summeret.
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const ratio = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;
const sum = (bookings: Booking[], pick: (booking: Booking) => number) =>
  bookings.reduce((total, booking) => total + pick(booking), 0);

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

/** Henter årets bookinger og lader de rene funktioner ovenfor regne. Ingen caching. */
export class AnalyticsService {
  constructor(private readonly bookings: BookingRepository) {}

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

  private forYear(year: number): Promise<Booking[]> {
    return this.bookings.findAll({ year });
  }
}
