import { describe, expect, it } from 'vitest';
import { ROOM_TYPES } from '../../src/domain/constants.js';
import type { RoomType, RoomTypeName, Season } from '../../src/domain/types.js';
import { PricingService } from '../../src/service/pricing.service.js';

const roomTypes: RoomType[] = ROOM_TYPES.map((type, index) => ({ id: index + 1, ...type }));
const roomType = (name: RoomTypeName) => roomTypes.find((type) => type.name === name)!;

// Én indtjekningsdato pr. sæson.
const CHECK_IN: Record<Season, string> = {
  low: '2026-01-15',
  mid: '2026-04-15',
  high: '2026-07-15',
};

describe('PricingService.calculatePrice', () => {
  const pricing = new PricingService();

  it('Standard Double, 15. juli, 5 nætter = 8.000 DKK (acceptance scenario US2-2)', () => {
    expect(pricing.calculatePrice(roomType('Standard Double'), '2026-07-15', 5)).toEqual({
      price: 8000,
      season: 'high',
      priceIsManual: false,
    });
  });

  describe.each(roomTypes.map((type) => [type.name, type] as const))('%s', (_name, type) => {
    it.each<Season>(['low', 'mid', 'high'])('%s: takst × nætter', (season) => {
      const result = pricing.calculatePrice(type, CHECK_IN[season], 3);
      expect(result).toEqual({ price: type.rates[season] * 3, season, priceIsManual: false });
    });
  });

  it('bruger indtjekningens sæson for hele opholdet', () => {
    // 15. dec er low, selvom resten af opholdet ligger i high.
    const result = pricing.calculatePrice(roomType('LOFT Suite'), '2026-12-15', 10);
    expect(result).toEqual({ price: 30_000, season: 'low', priceIsManual: false });
  });

  it('bruger en manuel pris uændret og markerer den som manuel', () => {
    const result = pricing.calculatePrice(roomType('Suite'), '2026-07-15', 4, 5000);
    expect(result).toEqual({ price: 5000, season: 'high', priceIsManual: true });
  });

  it.each([undefined, 0, -100])('beregner prisen, når den manuelle pris er %s', (manualPrice) => {
    const result = pricing.calculatePrice(roomType('Grand Lit'), '2026-04-15', 2, manualPrice);
    expect(result).toEqual({ price: 2500, season: 'mid', priceIsManual: false });
  });
});
