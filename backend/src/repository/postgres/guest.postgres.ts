import type { Pool } from 'pg';
import type { Guest, GuestInput } from '../../domain/types.js';
import type { GuestRepository, Tx } from '../interfaces.js';
import { executor } from './unit-of-work.postgres.js';

export class PostgresGuestRepository implements GuestRepository {
  constructor(private readonly pool: Pool) {}

  async create(guest: GuestInput, tx?: Tx): Promise<Guest> {
    const { rows } = await executor(this.pool, tx).query<{ id: number }>(
      'INSERT INTO guest (first_name, family_name, country) VALUES ($1, $2, $3) RETURNING id',
      [guest.firstName, guest.familyName, guest.country],
    );
    return { id: rows[0].id, ...guest };
  }

  async update(id: number, guest: GuestInput, tx?: Tx): Promise<void> {
    await executor(this.pool, tx).query(
      'UPDATE guest SET first_name = $1, family_name = $2, country = $3 WHERE id = $4',
      [guest.firstName, guest.familyName, guest.country, id],
    );
  }

  async deleteOrphaned(id: number, tx?: Tx): Promise<void> {
    await executor(this.pool, tx).query(
      `DELETE FROM guest
       WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM booking WHERE booking.guest_id = guest.id)`,
      [id],
    );
  }
}
