import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { Pool, PoolClient } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { nightsBetween, overlaps } from '../domain/booking-rules.js';

const SEED_VERSION = 'seed_csv_2026';

type BookingCsvRow = {
  'First Name': string;
  'Family Name': string;
  Country: string;
  'Room Type': string;
  'Days Rented': string;
  Season: string;
  Price: string;
  'Check In Date': string;
  'Check Out Date': string;
  Year: string;
  Guests: string;
  'Room Number': string;
  Satisfaction: string;
};

type DrinkCsvRow = {
  'Drink Name': string;
  Category: string;
  'Price (DKK)': string;
  'Units Sold': string;
  Year: string;
};

async function readCsv<T>(file: string): Promise<T[]> {
  const content = await readFile(path.join(env.dataDir, file), 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

/**
 * Indlæser de historiske CSV-data én gang i én transaktion (FR-013).
 * Seedet registreres i schema_migrations, så det aldrig kører igen, heller ikke hvis alle
 * bookinger senere slettes.
 */
export async function seed(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
      SEED_VERSION,
    ]);
    if (rowCount) {
      await client.query('ROLLBACK');
      return;
    }

    const bookings = await seedBookings(client);
    const drinks = await seedDrinks(client);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [SEED_VERSION]);
    await client.query('COMMIT');
    logger.info({ bookings, drinks, drinkSales: drinks }, 'Seed indlæst');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedBookings(client: PoolClient): Promise<number> {
  const rows = await readCsv<BookingCsvRow>('hotel_bookings_2026.csv');
  const { rows: rooms } = await client.query<{
    id: number;
    number: number;
    room_type: string;
    max_guests: number;
  }>(
    `SELECT r.id, r.number, rt.name AS room_type, rt.max_guests
     FROM room r JOIN room_type rt ON rt.id = r.room_type_id`,
  );
  const roomsByNumber = new Map(rooms.map((room) => [room.number, room]));
  const periodsByRoom = new Map<number, { checkIn: string; checkOut: string }[]>();

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const room = roomsByNumber.get(Number(row['Room Number']));
    const checkIn = row['Check In Date'];
    const checkOut = row['Check Out Date'];
    const nights = Number(row['Days Rented']);
    const guests = Number(row.Guests);

    if (!room || room.room_type !== row['Room Type']) {
      throw new Error(
        `Linje ${line}: værelse ${row['Room Number']} er ikke en ${row['Room Type']}`,
      );
    }
    if (nightsBetween(checkIn, checkOut) !== nights) {
      throw new Error(`Linje ${line}: Days Rented passer ikke med datoerne`);
    }
    if (guests < 1 || guests > room.max_guests) {
      throw new Error(`Linje ${line}: ${guests} gæster er for mange til ${room.room_type}`);
    }
    // FR-017 gælder også seed: afbryd hellere opstarten end at indlæse overlap.
    const periods = periodsByRoom.get(room.id) ?? [];
    if (periods.some((period) => overlaps(period, { checkIn, checkOut }))) {
      throw new Error(`Linje ${line}: overlapper en anden booking på værelse ${room.number}`);
    }
    periods.push({ checkIn, checkOut });
    periodsByRoom.set(room.id, periods);

    const { rows: guest } = await client.query<{ id: number }>(
      'INSERT INTO guest (first_name, family_name, country) VALUES ($1, $2, $3) RETURNING id',
      [row['First Name'], row['Family Name'], row.Country],
    );
    // Historiske priser bevares uændret og markeres derfor som manuelle (data-model.md).
    await client.query(
      `INSERT INTO booking (guest_id, room_id, check_in, check_out, nights, guests, season, year,
                            price, price_is_manual, satisfaction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)`,
      [
        guest[0].id,
        room.id,
        checkIn,
        checkOut,
        nights,
        guests,
        row.Season,
        Number(row.Year),
        Number(row.Price),
        row.Satisfaction === '' ? null : Number(row.Satisfaction),
      ],
    );
  }
  return rows.length;
}

async function seedDrinks(client: PoolClient): Promise<number> {
  const rows = await readCsv<DrinkCsvRow>('drinks_menu_with_sales.csv');
  for (const row of rows) {
    const unitPrice = Number(row['Price (DKK)']);
    const { rows: drink } = await client.query<{ id: number }>(
      'INSERT INTO drink (name, category, unit_price) VALUES ($1, $2, $3) RETURNING id',
      [row['Drink Name'], row.Category, unitPrice],
    );
    // Årets samlede salg som én transaktion pr. drink (FR-007).
    await client.query(
      `INSERT INTO drink_sale (drink_id, units, unit_price, sold_at, year)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        drink[0].id,
        Number(row['Units Sold']),
        unitPrice,
        `${row.Year}-12-31 23:59:59`,
        Number(row.Year),
      ],
    );
  }
  return rows.length;
}
