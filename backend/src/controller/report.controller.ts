import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import type { BookingFact, DrinkSaleFact } from '../domain/types.js';
import type { ReportService } from '../service/report.service.js';
import { toCsv } from './csv.js';

// Kontraktens default for year (parameteren Year).
const DEFAULT_YEAR = 2026;

const BOOKING_COLUMNS: (keyof BookingFact)[] = [
  'bookingId',
  'year',
  'month',
  'season',
  'checkIn',
  'checkOut',
  'roomType',
  'roomNumber',
  'country',
  'guests',
  'nights',
  'price',
  'satisfaction',
];

const DRINK_SALE_COLUMNS: (keyof DrinkSaleFact)[] = [
  'saleId',
  'year',
  'soldAt',
  'drinkName',
  'category',
  'units',
  'unitPrice',
  'revenue',
  'bartender',
];

// year og format er allerede valideret mod kontrakten af openapi-validatoren.
const yearOf = (req: Request) =>
  req.query.year === undefined ? DEFAULT_YEAR : Number(req.query.year);

function send<T extends object>(
  req: Request,
  res: Response,
  rows: T[],
  columns: (keyof T & string)[],
  name: string,
) {
  if (req.query.format !== 'csv') {
    res.json(rows);
    return;
  }
  res
    .type('text/csv; charset=utf-8')
    .attachment(`${name}_${yearOf(req)}.csv`)
    .send(toCsv(rows, columns));
}

export function reportController(reports: ReportService): Router {
  const router = Router();

  router.get(
    '/bookings',
    asyncHandler(async (req, res) => {
      send(req, res, await reports.bookingsReport(yearOf(req)), BOOKING_COLUMNS, 'bookings');
    }),
  );

  router.get(
    '/drink-sales',
    asyncHandler(async (req, res) => {
      send(
        req,
        res,
        await reports.drinkSalesReport(yearOf(req)),
        DRINK_SALE_COLUMNS,
        'drink_sales',
      );
    }),
  );

  return router;
}
