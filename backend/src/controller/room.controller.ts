import { Router } from 'express';
import type { RoomTypeName } from '../domain/types.js';
import { asyncHandler } from '../middleware/async-handler.js';
import type { RoomService } from '../service/room.service.js';

// Query og path er allerede valideret mod kontrakten af openapi-validatoren.
export function roomController(rooms: RoomService): Router {
  const router = Router();

  router.get(
    '/room-types',
    asyncHandler(async (_req, res) => {
      res.json(await rooms.listRoomTypes());
    }),
  );

  router.get(
    '/room-types/:id',
    asyncHandler(async (req, res) => {
      res.json(await rooms.getRoomType(Number(req.params.id)));
    }),
  );

  router.get(
    '/rooms',
    asyncHandler(async (req, res) => {
      const { roomType, availableFrom, availableTo } = req.query as Record<
        string,
        string | undefined
      >;
      res.json(
        await rooms.listRooms({
          roomType: roomType as RoomTypeName | undefined,
          availableFrom,
          availableTo,
        }),
      );
    }),
  );

  return router;
}
