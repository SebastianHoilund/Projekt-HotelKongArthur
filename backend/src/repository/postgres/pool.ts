import pg from 'pg';
import type { Pool } from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

// pg leverer NUMERIC som streng for ikke at miste præcision. Beløb har højst 2 decimaler, så number er nok.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));
// DATE-kolonner skal forblive 'YYYY-MM-DD' og ikke blive til Date i serverens tidszone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export function createPool(): Pool {
  // Uden timeout venter en forespørgsel for evigt, hvis databasen er nede.
  const pool = new pg.Pool({ ...env.db, max: 10, connectionTimeoutMillis: 5000 });
  // En ledig forbindelse kan miste databasen. Uden lytter crasher Node på den uhåndterede 'error'.
  pool.on('error', (err) => logger.warn({ err }, 'Ledig databaseforbindelse fejlede'));
  return pool;
}

export async function createMigrationClient(): Promise<pg.Client> {
  const client = new pg.Client(env.db);
  await client.connect();
  return client;
}

export async function pingDatabase(pool: Pool): Promise<void> {
  await pool.query('SELECT 1');
}
