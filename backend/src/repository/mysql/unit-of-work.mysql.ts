import type { Pool, PoolConnection } from 'mysql2/promise';
import type { Tx, UnitOfWork } from '../interfaces.js';

class MysqlTx {
  constructor(readonly connection: PoolConnection) {}
}

/** Vælger transaktionens forbindelse, hvis der er en, ellers pool'en. */
export function executor(pool: Pool, tx?: Tx): Pick<Pool, 'execute'> {
  return tx instanceof MysqlTx ? tx.connection : pool;
}

export class MysqlUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(new MysqlTx(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
