import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { Room, RoomTypeName } from '../../domain/types.js';
import type { RoomFilters, RoomRepository, Tx } from '../interfaces.js';
import { executor } from './unit-of-work.mysql.js';

interface RoomRow extends RowDataPacket {
  id: number;
  number: number;
  room_type: RoomTypeName;
}

const SELECT_ROOM = `
  SELECT r.id, r.number, rt.name AS room_type
  FROM room r
  JOIN room_type rt ON rt.id = r.room_type_id`;

function toRoom(row: RoomRow): Room {
  return { id: row.id, number: row.number, roomType: row.room_type };
}

export class MysqlRoomRepository implements RoomRepository {
  constructor(private readonly pool: Pool) {}

  async findByType(
    roomTypeId: number,
    options: { forUpdate?: boolean; tx?: Tx } = {},
  ): Promise<Room[]> {
    // OF r: låsen skal kun ramme værelserne, ikke den room_type-række de er joinet med.
    const lock = options.forUpdate ? 'FOR UPDATE OF r' : '';
    const [rows] = await executor(this.pool, options.tx).execute<RoomRow[]>(
      `${SELECT_ROOM} WHERE r.room_type_id = ? ORDER BY r.number ${lock}`,
      [roomTypeId],
    );
    return rows.map(toRoom);
  }

  async findByNumber(number: number, tx?: Tx): Promise<Room | null> {
    const [rows] = await executor(this.pool, tx).execute<RoomRow[]>(
      `${SELECT_ROOM} WHERE r.number = ?`,
      [number],
    );
    return rows[0] ? toRoom(rows[0]) : null;
  }

  async findAll(filters: RoomFilters = {}): Promise<Room[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.roomType) {
      conditions.push('rt.name = ?');
      params.push(filters.roomType);
    }
    if (filters.availableFrom && filters.availableTo) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM booking b
        WHERE b.room_id = r.id AND b.check_in < ? AND b.check_out > ?
      )`);
      params.push(filters.availableTo, filters.availableFrom);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await this.pool.execute<RoomRow[]>(
      `${SELECT_ROOM} ${where} ORDER BY r.number`,
      params,
    );
    return rows.map(toRoom);
  }
}
