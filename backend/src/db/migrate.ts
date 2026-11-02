import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';
import { logger } from '../config/logger.js';
import { createMigrationConnection } from '../repository/mysql/pool.js';

const migrationsDir = fileURLToPath(new URL('./migrations/', import.meta.url));

export async function migrate(): Promise<void> {
  const connection = await createMigrationConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const [rows] = await connection.query<RowDataPacket[]>('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version as string));

    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const version = path.basename(file, '.sql');
      if (applied.has(version)) continue;

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
      logger.info({ version }, 'Migration kørt');
    }
  } finally {
    await connection.end();
  }
}
