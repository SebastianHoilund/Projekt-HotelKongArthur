import { Router } from 'express';

export interface Controllers {
  health: Router;
  rooms: Router;
}

export function createRoutes(controllers: Controllers): Router {
  const router = Router();
  router.use('/health', controllers.health);
  router.use(controllers.rooms);
  return router;
}
