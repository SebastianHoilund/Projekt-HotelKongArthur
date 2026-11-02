import { Router } from 'express';

export interface Controllers {
  health: Router;
}

export function createRoutes(controllers: Controllers): Router {
  const router = Router();
  router.use('/health', controllers.health);
  return router;
}
