import { Router } from 'express';

export interface Controllers {
  health: Router;
  rooms: Router;
  bookings: Router;
  analytics: Router;
}

export function createRoutes(controllers: Controllers): Router {
  const router = Router();
  router.use('/health', controllers.health);
  router.use(controllers.rooms);
  router.use('/bookings', controllers.bookings);
  router.use('/analytics', controllers.analytics);
  return router;
}
