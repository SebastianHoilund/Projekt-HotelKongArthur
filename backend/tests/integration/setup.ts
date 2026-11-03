import type { Express } from 'express';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { migrate } from '../../src/db/migrate.js';
import { seed } from '../../src/db/seed.js';
import { createPool } from '../../src/repository/postgres/pool.js';

/**
 * Starter fra en tom testdatabase og kører samme opstart som server.ts: migrationer, seed og app.
 * Kører i compose-profilen `test` mod `hotel_kong_arthur_test` med NODE_ENV=test, så alle svar
 * valideres mod api/openapi.yaml (research R-14).
 */
export async function startFreshApp(): Promise<{ app: Express; pool: Pool }> {
  if (process.env.NODE_ENV !== 'test' || !process.env.DB_NAME?.endsWith('_test')) {
    throw new Error(
      'Integrationstests må kun køre mod en testdatabase (NODE_ENV=test, DB_NAME=*_test)',
    );
  }

  const pool = createPool();
  // Testbrugeren ejer databasen og dermed public-skemaet, så det kan nulstilles helt.
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  await seed(pool);
  return { app: createApp(pool), pool };
}
