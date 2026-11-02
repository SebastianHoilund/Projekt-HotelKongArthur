import type { RoomTypeName, Season } from './types.js';

export const CAPACITY_ROOMS = 214;

export const BARTENDER = 'Helene Christine';

export const DRINK_CATEGORIES = ['Cocktail', 'Coffee'] as const;

export const ROOM_TYPE_NAMES = [
  'Standard Single',
  'Grand Lit',
  'Standard Double',
  'Superior Double',
  'Junior Suite',
  'Spa Executive',
  'Suite',
  'LOFT Suite',
] as const;

// Fra reference-data.md §2 og §3.
export const ROOM_TYPES: readonly {
  name: RoomTypeName;
  maxGuests: number;
  roomCount: number;
  rates: Record<Season, number>;
}[] = [
  {
    name: 'Standard Single',
    maxGuests: 1,
    roomCount: 44,
    rates: { low: 900, mid: 1050, high: 1200 },
  },
  { name: 'Grand Lit', maxGuests: 2, roomCount: 30, rates: { low: 1100, mid: 1250, high: 1400 } },
  {
    name: 'Standard Double',
    maxGuests: 2,
    roomCount: 58,
    rates: { low: 1200, mid: 1400, high: 1600 },
  },
  {
    name: 'Superior Double',
    maxGuests: 2,
    roomCount: 40,
    rates: { low: 1400, mid: 1700, high: 2000 },
  },
  {
    name: 'Junior Suite',
    maxGuests: 3,
    roomCount: 16,
    rates: { low: 1800, mid: 2150, high: 2500 },
  },
  {
    name: 'Spa Executive',
    maxGuests: 2,
    roomCount: 12,
    rates: { low: 2000, mid: 2400, high: 2800 },
  },
  { name: 'Suite', maxGuests: 4, roomCount: 8, rates: { low: 2500, mid: 3000, high: 3500 } },
  { name: 'LOFT Suite', maxGuests: 4, roomCount: 6, rates: { low: 3000, mid: 3500, high: 4000 } },
];

export const SEASON_DAYS: Record<Season, number> = { low: 104, mid: 153, high: 108 };

// Januar til december 2026.
export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
