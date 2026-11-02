import mysql from 'mysql2/promise';
import type { Connection, Pool } from 'mysql2/promise';
import { env } from '../../config/env.js';

export function createPool(): Pool {
  return mysql.createPool({
    ...env.mysql,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    // DATE-kolonner skal forblive 'YYYY-MM-DD' og ikke blive til Date i serverens tidszone.
    dateStrings: true,
  });
}

// multipleStatements kun her: migrationsfiler har flere sætninger, men pool'en må ikke tillade det.
export function createMigrationConnection(): Promise<Connection> {
  return mysql.createConnection({ ...env.mysql, multipleStatements: true });
}

export async function pingDatabase(pool: Pool): Promise<void> {
  await pool.query('SELECT 1');
}
