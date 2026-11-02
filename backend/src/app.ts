import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import type { Pool } from 'pg';
import { analyticsController } from './controller/analytics.controller.js';
import { drinkController } from './controller/drink.controller.js';
import { bookingController } from './controller/booking.controller.js';
import { healthController } from './controller/health.controller.js';
import { roomController } from './controller/room.controller.js';
import { NotFoundError } from './domain/errors.js';
import { errorHandler } from './middleware/error-handler.js';
import { openApiValidator } from './middleware/openapi-validator.js';
import { PostgresBookingRepository } from './repository/postgres/booking.postgres.js';
import { PostgresDrinkSaleRepository } from './repository/postgres/drink-sale.postgres.js';
import { PostgresDrinkRepository } from './repository/postgres/drink.postgres.js';
import { PostgresGuestRepository } from './repository/postgres/guest.postgres.js';
import { pingDatabase } from './repository/postgres/pool.js';
import { PostgresRoomTypeRepository } from './repository/postgres/room-type.postgres.js';
import { PostgresRoomRepository } from './repository/postgres/room.postgres.js';
import { PostgresUnitOfWork } from './repository/postgres/unit-of-work.postgres.js';
import { createRoutes } from './routes.js';
import { AnalyticsService } from './service/analytics.service.js';
import { BookingService } from './service/booking.service.js';
import { DrinkService } from './service/drink.service.js';
import { PricingService } from './service/pricing.service.js';
import { RoomService } from './service/room.service.js';

// Frontend og Swagger UI må skrive. Andre origins må kun læse (research R-13).
const WRITE_ORIGINS = ['http://localhost:8080', 'http://localhost:8081'];

// Eneste sted, der kobler lagene sammen. Her skiftes repository-implementering, hvis databasen udskiftes.
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

  const roomTypeRepository = new PostgresRoomTypeRepository(pool);
  const roomRepository = new PostgresRoomRepository(pool);
  const roomService = new RoomService(roomTypeRepository, roomRepository);
  const bookingRepository = new PostgresBookingRepository(pool);
  const bookingService = new BookingService(
    bookingRepository,
    new PostgresGuestRepository(pool),
    roomRepository,
    roomTypeRepository,
    new PostgresUnitOfWork(pool),
    new PricingService(),
  );
  const drinkRepository = new PostgresDrinkRepository(pool);
  const drinkSaleRepository = new PostgresDrinkSaleRepository(pool);
  const drinkService = new DrinkService(drinkRepository, drinkSaleRepository);
  const analyticsService = new AnalyticsService(
    bookingRepository,
    drinkRepository,
    drinkSaleRepository,
  );
  const analyticsService = new AnalyticsService(bookingRepository);

  app.use(
    '/api',
    createRoutes({
      health: healthController(() => pingDatabase(pool)),
      rooms: roomController(roomService),
      bookings: bookingController(bookingService),
      analytics: analyticsController(analyticsService),
      drinks: drinkController(drinkService),
    }),
  );

  // Endpoints i kontrakten, som endnu ikke har en controller, skal også svare i fælles fejlformat.
  app.use((req, _res, next) => {
    next(new NotFoundError(`${req.method} ${req.path} findes ikke`));
  });
  app.use(errorHandler);

  return app;
}
