import { determineSeason } from '../domain/seasons.js';
import type { RoomType, Season } from '../domain/types.js';

export interface PriceResult {
  price: number;
  season: Season;
  priceIsManual: boolean;
}

export class PricingService {
  /**
   * Hele opholdet afregnes efter indtjekningens sæson (reference-data.md §1).
   * En manuel pris > 0 bruges uændret, ellers takst × nætter.
   */
  calculatePrice(
    roomType: RoomType,
    checkIn: string,
    nights: number,
    manualPrice?: number,
  ): PriceResult {
    const season = determineSeason(new Date(`${checkIn}T00:00:00Z`));

    if (manualPrice !== undefined && manualPrice > 0) {
      return { price: manualPrice, season, priceIsManual: true };
    }

    const price = Math.round(roomType.rates[season] * nights * 100) / 100;
    return { price, season, priceIsManual: false };
  }
}
