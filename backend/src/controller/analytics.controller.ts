import { Router } from 'express';
import type { Request } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import type { AnalyticsService } from '../service/analytics.service.js';

// Kontraktens default for year (parameteren Year).
const DEFAULT_YEAR = 2026;

// year er allerede valideret mod kontrakten af openapi-validatoren.
const yearOf = (req: Request) =>
  req.query.year === undefined ? DEFAULT_YEAR : Number(req.query.year);

export function analyticsController(analytics: AnalyticsService): Router {
  const router = Router();

  router.get(
    '/summary',
    asyncHandler(async (req, res) => {
      res.json(await analytics.summary(yearOf(req)));
    }),
  );

  router.get(
    '/occupancy',
    asyncHandler(async (req, res) => {
      res.json(await analytics.occupancy(yearOf(req)));
    }),
  );

  router.get(
    '/revenue/room-types',
    asyncHandler(async (req, res) => {
      res.json(await analytics.revenueByRoomType(yearOf(req)));
    }),
  );

  router.get(
    '/revenue/countries',
    asyncHandler(async (req, res) => {
      res.json(await analytics.revenueByCountry(yearOf(req)));
    }),
  );

  router.get(
    '/satisfaction',
    asyncHandler(async (req, res) => {
      res.json(await analytics.satisfaction(yearOf(req)));
    }),
  );

  router.get(
    '/bar',
    asyncHandler(async (req, res) => {
      res.json(await analytics.bar(yearOf(req)));
    }),
  );

  return router;
}
