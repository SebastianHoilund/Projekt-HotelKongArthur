import type { Pool } from 'pg';
import type { Drink, DrinkCategory } from '../../domain/types.js';
import type { DrinkRepository } from '../interfaces.js';

type DrinkRow = {
  id: number;
  name: string;
  category: DrinkCategory;
  unit_price: number;
};

function toDrink(row: DrinkRow): Drink {
  return { id: row.id, name: row.name, category: row.category, unitPrice: row.unit_price };
}

export class PostgresDrinkRepository implements DrinkRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(category?: DrinkCategory): Promise<Drink[]> {
    const { rows } = category
      ? await this.pool.query<DrinkRow>('SELECT * FROM drink WHERE category = $1 ORDER BY id', [
          category,
        ])
      : await this.pool.query<DrinkRow>('SELECT * FROM drink ORDER BY id');
    return rows.map(toDrink);
  }

  async findById(id: number): Promise<Drink | null> {
    const { rows } = await this.pool.query<DrinkRow>('SELECT * FROM drink WHERE id = $1', [id]);
    return rows[0] ? toDrink(rows[0]) : null;
  }
}
