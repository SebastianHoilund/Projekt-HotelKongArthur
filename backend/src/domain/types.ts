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
