import type { Pool, PoolClient } from 'pg';
import type { Tx, UnitOfWork } from '../interfaces.js';

class PostgresTx {
  constructor(readonly client: PoolClient) {}
}

/** Vælger transaktionens forbindelse, hvis der er en, ellers pool'en. */
export function executor(pool: Pool, tx?: Tx): Pool | PoolClient {
  return tx instanceof PostgresTx ? tx.client : pool;
}

export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(new PostgresTx(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
