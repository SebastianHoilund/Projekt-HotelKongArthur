import { Router } from 'express';
import type { DrinkCategory } from '../domain/types.js';
import { asyncHandler } from '../middleware/async-handler.js';
import type { DrinkService } from '../service/drink.service.js';

// Query, path og body er allerede valideret mod kontrakten af openapi-validatoren.
export function drinkController(drinks: DrinkService): Router {
  const router = Router();

  router.get(
    '/drinks',
    asyncHandler(async (req, res) => {
      res.json(await drinks.listDrinks(req.query.category as DrinkCategory | undefined));
    }),
  );

  router.get(
    '/drinks/:id',
    asyncHandler(async (req, res) => {
      res.json(await drinks.getDrink(Number(req.params.id)));
    }),
  );

  router.get(
    '/drink-sales',
    asyncHandler(async (req, res) => {
      const { year, drinkId } = req.query as Record<string, string | undefined>;
      res.json(
        await drinks.listSales({
          year: year === undefined ? undefined : Number(year),
          drinkId: drinkId === undefined ? undefined : Number(drinkId),
        }),
      );
    }),
  );

  router.post(
    '/drink-sales',
    asyncHandler(async (req, res) => {
      const sale = await drinks.createSale(req.body);
      res.status(201).location(`/api/drink-sales/${sale.id}`).json(sale);
    }),
  );

  return router;
}
