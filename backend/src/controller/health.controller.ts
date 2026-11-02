import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function healthController(pingDatabase: () => Promise<void>): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      await pingDatabase();
      res.json({ status: 'ok' });
    }),
  );

  return router;
}
