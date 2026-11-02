import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { migrate } from './db/migrate.js';
import { createPool } from './repository/postgres/pool.js';

try {
  await migrate();
  // T037: seed() kaldes her, når seed-modulet er lavet.

  const app = createApp(createPool());
  app.listen(env.port, () => {
    logger.info({ port: env.port }, 'Backend lytter');
  });
} catch (err) {
  // Exit med fejlkode, så compose genstarter containeren (restart: on-failure).
  logger.fatal({ err }, 'Opstart fejlede');
  process.exit(1);
}
