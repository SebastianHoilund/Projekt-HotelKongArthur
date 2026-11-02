import type { Pool } from 'pg';
import type { DrinkCategory, DrinkSale, DrinkSaleData } from '../../domain/types.js';
import type { DrinkSaleFilters, DrinkSaleRepository } from '../interfaces.js';

type DrinkSaleRow = {
  id: number;
  drink_id: number;
  drink_name: string;
  category: DrinkCategory;
  units: number;
  unit_price: number;
  revenue: number;
  sold_at: string;
  year: number;
  bartender: string;
};

// sold_at er TIMESTAMP uden tidszone og gemmes i UTC. to_char giver ISO 8601 uden at gå via
// en JavaScript Date i serverens tidszone.
const COLUMNS = `
  s.id, s.drink_id, d.name AS drink_name, d.category, s.units, s.unit_price,
  s.units * s.unit_price AS revenue,
  to_char(s.sold_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS sold_at,
  s.year, s.bartender`;

function toDrinkSale(row: DrinkSaleRow): DrinkSale {
  return {
    id: row.id,
    drinkId: row.drink_id,
    drinkName: row.drink_name,
    category: row.category,
    units: row.units,
    unitPrice: row.unit_price,
    revenue: row.revenue,
    soldAt: row.sold_at,
    year: row.year,
    bartender: row.bartender,
  };
}

export class PostgresDrinkSaleRepository implements DrinkSaleRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(filters: DrinkSaleFilters = {}): Promise<DrinkSale[]> {
    const conditions: string[] = [];
    const params: number[] = [];
    if (filters.year !== undefined) {
      params.push(filters.year);
      conditions.push(`s.year = $${params.length}`);
    }
    if (filters.drinkId !== undefined) {
      params.push(filters.drinkId);
      conditions.push(`s.drink_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query<DrinkSaleRow>(
      `SELECT ${COLUMNS} FROM drink_sale s JOIN drink d ON d.id = s.drink_id
       ${where} ORDER BY s.sold_at DESC, s.id DESC`,
      params,
    );
    return rows.map(toDrinkSale);
  }

  async create(data: DrinkSaleData): Promise<DrinkSale> {
    // soldAt er en UTC-streng ('...Z'), som TIMESTAMP gemmer uændret.
    const { rows } = await this.pool.query<DrinkSaleRow>(
      `WITH s AS (
         INSERT INTO drink_sale (drink_id, units, unit_price, sold_at, year)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *
       )
       SELECT ${COLUMNS} FROM s JOIN drink d ON d.id = s.drink_id`,
      [data.drinkId, data.units, data.unitPrice, data.soldAt, data.year],
    );
    return toDrinkSale(rows[0]);
  }
}
