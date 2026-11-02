import { z } from 'zod';
import { ROOM_TYPE_NAMES } from './constants.js';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dato skal have formatet YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Datoen findes ikke');

const guestName = z.string().trim().min(1).max(100);

export const guestInputSchema = z
  .object({
    firstName: guestName,
    familyName: guestName,
    country: guestName,
  })
  .strict();

export const bookingInputSchema = z
  .object({
    guest: guestInputSchema,
    roomType: z.enum(ROOM_TYPE_NAMES),
    checkIn: dateString,
    checkOut: dateString,
    guests: z.number().int().min(1).max(4),
    price: z.number().positive().optional(),
    satisfaction: z.number().int().min(1).max(5).nullable().optional(),
  })
  .strict();

export const drinkSaleInputSchema = z
  .object({
    drinkId: z.number().int().min(1),
    units: z.number().int().min(1),
    soldAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export type GuestInput = z.infer<typeof guestInputSchema>;
export type BookingInput = z.infer<typeof bookingInputSchema>;
export type DrinkSaleInput = z.infer<typeof drinkSaleInputSchema>;
