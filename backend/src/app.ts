import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import type { Pool } from 'mysql2/promise';
import { healthController } from './controller/health.controller.js';
import { NotFoundError } from './domain/errors.js';
import { errorHandler } from './middleware/error-handler.js';
import { openApiValidator } from './middleware/openapi-validator.js';
import { pingDatabase } from './repository/mysql/pool.js';
import { createRoutes } from './routes.js';

// Frontend og Swagger UI må skrive. Andre origins må kun læse (research R-13).
const WRITE_ORIGINS = ['http://localhost:8080', 'http://localhost:8081'];

// Eneste sted, der kobler lagene sammen. Her skiftes repository-implementering, hvis MySQL udskiftes.
export function createApp(pool: Pool): Express {
  const app = express();

  app.use(express.json());
  app.use(
    cors((req, callback) => {
      const canWrite = WRITE_ORIGINS.includes(req.headers.origin ?? '');
      callback(null, {
        origin: true,
        exposedHeaders: ['Location'],
        ...(canWrite ? {} : { methods: ['GET', 'HEAD'] }),
      });
    }),
  );
  app.use(openApiValidator());

  app.use(
    '/api',
    createRoutes({
      health: healthController(() => pingDatabase(pool)),
    }),
  );

  // Endpoints i kontrakten, som endnu ikke har en controller, skal også svare i fælles fejlformat.
  app.use((req, _res, next) => {
    next(new NotFoundError(`${req.method} ${req.path} findes ikke`));
  });
  app.use(errorHandler);

  return app;
}
