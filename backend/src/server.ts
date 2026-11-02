import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { createPool } from './repository/postgres/pool.js';

try {
  await migrate();
  const pool = createPool();
  await seed(pool);

  const app = createApp(pool);
  app.listen(env.port, () => {
    logger.info({ port: env.port }, 'Backend lytter');
  });
} catch (err) {
  // Exit med fejlkode, så compose genstarter containeren (restart: on-failure).
  logger.fatal({ err }, 'Opstart fejlede');
  process.exit(1);
}
