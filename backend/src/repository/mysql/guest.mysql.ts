import type { Pool, ResultSetHeader } from 'mysql2/promise';
import type { Guest, GuestInput } from '../../domain/types.js';
import type { GuestRepository, Tx } from '../interfaces.js';
import { executor } from './unit-of-work.mysql.js';

export class MysqlGuestRepository implements GuestRepository {
  constructor(private readonly pool: Pool) {}

  async create(guest: GuestInput, tx?: Tx): Promise<Guest> {
    const [result] = await executor(this.pool, tx).execute<ResultSetHeader>(
      'INSERT INTO guest (first_name, family_name, country) VALUES (?, ?, ?)',
      [guest.firstName, guest.familyName, guest.country],
    );
    return { id: result.insertId, ...guest };
  }

  async update(id: number, guest: GuestInput, tx?: Tx): Promise<void> {
    await executor(this.pool, tx).execute(
      'UPDATE guest SET first_name = ?, family_name = ?, country = ? WHERE id = ?',
      [guest.firstName, guest.familyName, guest.country, id],
    );
  }

  async deleteOrphaned(id: number, tx?: Tx): Promise<void> {
    await executor(this.pool, tx).execute(
      `DELETE FROM guest
       WHERE id = ? AND NOT EXISTS (SELECT 1 FROM booking WHERE booking.guest_id = guest.id)`,
      [id],
    );
  }
}
