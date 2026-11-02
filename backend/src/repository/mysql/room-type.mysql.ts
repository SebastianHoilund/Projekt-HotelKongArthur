import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { RoomType, RoomTypeName } from '../../domain/types.js';
import type { RoomTypeRepository } from '../interfaces.js';

interface RoomTypeRow extends RowDataPacket {
  id: number;
  name: RoomTypeName;
  max_guests: number;
  room_count: number;
  rate_low: number;
  rate_mid: number;
  rate_high: number;
}

function toRoomType(row: RoomTypeRow): RoomType {
  return {
    id: row.id,
    name: row.name,
    maxGuests: row.max_guests,
    roomCount: row.room_count,
    rates: { low: row.rate_low, mid: row.rate_mid, high: row.rate_high },
  };
}

export class MysqlRoomTypeRepository implements RoomTypeRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<RoomType[]> {
    const [rows] = await this.pool.execute<RoomTypeRow[]>('SELECT * FROM room_type ORDER BY id');
    return rows.map(toRoomType);
  }

  async findById(id: number): Promise<RoomType | null> {
    const [rows] = await this.pool.execute<RoomTypeRow[]>('SELECT * FROM room_type WHERE id = ?', [
      id,
    ]);
    return rows[0] ? toRoomType(rows[0]) : null;
  }

  async findByName(name: string): Promise<RoomType | null> {
    const [rows] = await this.pool.execute<RoomTypeRow[]>(
      'SELECT * FROM room_type WHERE name = ?',
      [name],
    );
    return rows[0] ? toRoomType(rows[0]) : null;
  }
}
