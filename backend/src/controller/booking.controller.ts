import { Router } from 'express';
import type { RoomTypeName, Season } from '../domain/types.js';
import { asyncHandler } from '../middleware/async-handler.js';
import type { BookingService } from '../service/booking.service.js';

// Query, path og body er allerede valideret mod kontrakten af openapi-validatoren.
export function bookingController(bookings: BookingService): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { year, roomType, country, season } = req.query as Record<string, string | undefined>;
      res.json(
        await bookings.list({
          year: year === undefined ? undefined : Number(year),
          roomType: roomType as RoomTypeName | undefined,
          country,
          season: season as Season | undefined,
        }),
      );
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await bookings.get(Number(req.params.id)));
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const booking = await bookings.create(req.body);
      res.status(201).location(`/api/bookings/${booking.id}`).json(booking);
    }),
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await bookings.update(Number(req.params.id), req.body));
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await bookings.delete(Number(req.params.id));
      res.status(204).end();
    }),
  );

  return router;
}
