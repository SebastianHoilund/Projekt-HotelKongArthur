import type { Pool } from 'pg';
import type { Booking, BookingData, RoomTypeName, Season } from '../../domain/types.js';
import type { BookingFilters, BookingRepository, Tx } from '../interfaces.js';
import { executor } from './unit-of-work.postgres.js';

type BookingRow = {
  id: number;
  guest_id: number;
  first_name: string;
  family_name: string;
  country: string;
  room_type: RoomTypeName;
  room_number: number;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  season: Season;
  year: number;
  price: number;
  price_is_manual: boolean;
  satisfaction: number | null;
};

const SELECT_BOOKING = `
  SELECT b.id, b.check_in, b.check_out, b.nights, b.guests, b.season, b.year, b.price,
         b.price_is_manual, b.satisfaction,
         g.id AS guest_id, g.first_name, g.family_name, g.country,
         r.number AS room_number, rt.name AS room_type
  FROM booking b
  JOIN guest g ON g.id = b.guest_id
  JOIN room r ON r.id = b.room_id
  JOIN room_type rt ON rt.id = r.room_type_id`;

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    guest: {
      id: row.guest_id,
      firstName: row.first_name,
      familyName: row.family_name,
      country: row.country,
    },
    roomType: row.room_type,
    roomNumber: row.room_number,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    guests: row.guests,
    season: row.season,
    year: row.year,
    price: row.price,
    priceIsManual: row.price_is_manual,
    satisfaction: row.satisfaction,
  };
}

function values(data: BookingData): unknown[] {
  return [
    data.guestId,
    data.roomId,
    data.checkIn,
    data.checkOut,
    data.nights,
    data.guests,
    data.season,
    data.year,
    data.price,
    data.priceIsManual,
    data.satisfaction,
  ];
}

export class PostgresBookingRepository implements BookingRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(filters: BookingFilters = {}): Promise<Booking[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    const add = (column: string, value: string | number | undefined) => {
      if (value === undefined) return;
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    };
    add('b.year', filters.year);
    add('rt.name', filters.roomType);
    add('g.country', filters.country);
    add('b.season', filters.season);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query<BookingRow>(
      `${SELECT_BOOKING} ${where} ORDER BY b.check_in DESC, b.id DESC`,
      params,
    );
    return rows.map(toBooking);
  }

  async findById(id: number, tx?: Tx): Promise<Booking | null> {
    const { rows } = await executor(this.pool, tx).query<BookingRow>(
      `${SELECT_BOOKING} WHERE b.id = $1`,
      [id],
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async findByRoomsInPeriod(
    roomIds: number[],
    checkIn: string,
    checkOut: string,
    tx?: Tx,
  ): Promise<Booking[]> {
    const { rows } = await executor(this.pool, tx).query<BookingRow>(
      `${SELECT_BOOKING}
       WHERE b.room_id = ANY($1::int[]) AND b.check_in < $3 AND b.check_out > $2`,
      [roomIds, checkIn, checkOut],
    );
    return rows.map(toBooking);
  }

  async create(data: BookingData, tx?: Tx): Promise<number> {
    const { rows } = await executor(this.pool, tx).query<{ id: number }>(
      `INSERT INTO booking (guest_id, room_id, check_in, check_out, nights, guests, season, year,
                            price, price_is_manual, satisfaction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      values(data),
    );
    return rows[0].id;
  }

  async update(id: number, data: BookingData, tx?: Tx): Promise<void> {
    // PostgreSQL har ingen ON UPDATE CURRENT_TIMESTAMP, så updated_at sættes her.
    await executor(this.pool, tx).query(
      `UPDATE booking
       SET guest_id = $1, room_id = $2, check_in = $3, check_out = $4, nights = $5, guests = $6,
           season = $7, year = $8, price = $9, price_is_manual = $10, satisfaction = $11,
           updated_at = now()
       WHERE id = $12`,
      [...values(data), id],
    );
  }

  async delete(id: number, tx?: Tx): Promise<void> {
    await executor(this.pool, tx).query('DELETE FROM booking WHERE id = $1', [id]);
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM booking',
    );
    return rows[0].count;
  }
}
