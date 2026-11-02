import type { BookingFact, DrinkSaleFact } from '../domain/types.js';
import type { BookingRepository, DrinkSaleRepository } from '../repository/interfaces.js';

/** Fakta-tabeller til Tableau (research R-11). Alle udledte felter kommer herfra, Tableau summerer kun. */
export class ReportService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly drinkSales: DrinkSaleRepository,
  ) {}

  async bookingsReport(year: number): Promise<BookingFact[]> {
    const bookings = await this.bookings.findAll({ year });
    return bookings.map((b) => ({
      bookingId: b.id,
      year: b.year,
      // Hele bookingen hører til indtjekningens måned (clarification 3).
      month: Number(b.checkIn.slice(5, 7)),
      season: b.season,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      roomType: b.roomType,
      roomNumber: b.roomNumber,
      country: b.guest.country,
      guests: b.guests,
      nights: b.nights,
      price: b.price,
      satisfaction: b.satisfaction,
    }));
  }

  async drinkSalesReport(year: number): Promise<DrinkSaleFact[]> {
    const sales = await this.drinkSales.findAll({ year });
    return sales.map((s) => ({
      saleId: s.id,
      year: s.year,
      soldAt: s.soldAt,
      drinkName: s.drinkName,
      category: s.category,
      units: s.units,
      unitPrice: s.unitPrice,
      revenue: s.revenue,
      bartender: s.bartender,
    }));
  }
}
