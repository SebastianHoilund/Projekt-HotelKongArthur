import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { logger } from '../config/logger.js';
import { createMigrationClient } from '../repository/postgres/pool.js';

const migrationsDir = fileURLToPath(new URL('./migrations/', import.meta.url));

export async function migrate(): Promise<void> {
  const client = await createMigrationClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations',
    );
    const applied = new Set(rows.map((row) => row.version));

    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const version = path.basename(file, '.sql');
      if (applied.has(version)) continue;

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      // DDL er transaktionel i PostgreSQL, så en fejlet migration efterlader ingen halve tabeller.
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      logger.info({ version }, 'Migration kørt');
    }
  } finally {
    await client.end();
  }
}
