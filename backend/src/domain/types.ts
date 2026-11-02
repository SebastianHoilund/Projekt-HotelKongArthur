import type { ROOM_TYPE_NAMES } from './constants.js';

export type { BookingInput, DrinkSaleInput, GuestInput } from './schemas.js';

export type Season = 'low' | 'mid' | 'high';
export type RoomTypeName = (typeof ROOM_TYPE_NAMES)[number];
export type DrinkCategory = 'Cocktail' | 'Coffee';

export interface RoomType {
  id: number;
  name: RoomTypeName;
  maxGuests: number;
  roomCount: number;
  rates: Record<Season, number>;
}

export interface Room {
  id: number;
  number: number;
  roomType: RoomTypeName;
}

export interface Guest {
  id: number;
  firstName: string;
  familyName: string;
  country: string;
}

export interface Booking {
  id: number;
  guest: Guest;
  roomType: RoomTypeName;
  roomNumber: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  season: Season;
  year: number;
  price: number;
  priceIsManual: boolean;
  satisfaction: number | null;
}

export interface Drink {
  id: number;
  name: string;
  category: DrinkCategory;
  unitPrice: number;
}

export interface DrinkSale {
  id: number;
  drinkId: number;
  drinkName: string;
  category: DrinkCategory;
  units: number;
  unitPrice: number;
  revenue: number;
  soldAt: string;
  year: number;
  bartender: string;
}

/** De kolonner på en booking, som service-laget har beregnet og repository skal gemme. */
export interface BookingData {
  guestId: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  season: Season;
  year: number;
  price: number;
  priceIsManual: boolean;
  satisfaction: number | null;
}

export interface DrinkSaleData {
  drinkId: number;
  units: number;
  unitPrice: number;
  soldAt: string;
  year: number;
}

export interface SatisfactionValue {
  average: number;
  responses: number;
}

export interface Summary {
  year: number;
  revenue: number;
  bookings: number;
  nightsSold: number;
  availableNights: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  alos: number;
  satisfaction: SatisfactionValue;
}

export interface OccupancyRow {
  /** Året ('2026'), sæsonen (low|mid|high) eller måneden ('2026-01'). */
  period: string;
  nightsSold: number;
  availableNights: number;
  occupancyRate: number;
}

export interface Occupancy {
  year: number;
  total: OccupancyRow;
  bySeason: OccupancyRow[];
  byMonth: OccupancyRow[];
}

export interface RevenueCell {
  revenue: number;
  bookings: number;
  nights: number;
}

export interface RoomTypeRevenue {
  rank: number;
  roomType: RoomTypeName;
  total: RevenueCell;
  bySeason: Record<Season, RevenueCell>;
}

export interface CountryRevenue {
  rank: number;
  country: string;
  revenue: number;
  bookings: number;
  nights: number;
  guests: number;
}

export interface SatisfactionReport {
  year: number;
  overall: SatisfactionValue;
  byRoomType: (SatisfactionValue & { roomType: RoomTypeName })[];
}

export interface BarDrink {
  drinkId: number;
  name: string;
  category: DrinkCategory;
  unitPrice: number;
  units: number;
  revenue: number;
}

export interface BarCategorySplit {
  category: DrinkCategory;
  revenue: number;
  units: number;
  revenueShare: number;
  unitShare: number;
}

export interface BarAnalytics {
  year: number;
  bartender: string;
  totals: { revenue: number; units: number };
  drinks: BarDrink[];
  categorySplit: BarCategorySplit[];
}

/** Én række pr. booking til Tableau. Gæstens navn er udeladt; landet er nok til analysen. */
export interface BookingFact {
  bookingId: number;
  year: number;
  month: number;
  season: Season;
  checkIn: string;
  checkOut: string;
  roomType: RoomTypeName;
  roomNumber: number;
  country: string;
  guests: number;
  nights: number;
  price: number;
  satisfaction: number | null;
}

export interface DrinkSaleFact {
  saleId: number;
  year: number;
  soldAt: string;
  drinkName: string;
  category: DrinkCategory;
  units: number;
  unitPrice: number;
  revenue: number;
  bartender: string;
}
