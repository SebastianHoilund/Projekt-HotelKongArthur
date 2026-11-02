import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { Drink, DrinkCategory } from '../../domain/types.js';
import type { DrinkRepository } from '../interfaces.js';

interface DrinkRow extends RowDataPacket {
  id: number;
  name: string;
  category: DrinkCategory;
  unit_price: number;
}

function toDrink(row: DrinkRow): Drink {
  return { id: row.id, name: row.name, category: row.category, unitPrice: row.unit_price };
}

export class MysqlDrinkRepository implements DrinkRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(category?: DrinkCategory): Promise<Drink[]> {
    const [rows] = category
      ? await this.pool.execute<DrinkRow[]>('SELECT * FROM drink WHERE category = ? ORDER BY id', [
          category,
        ])
      : await this.pool.execute<DrinkRow[]>('SELECT * FROM drink ORDER BY id');
    return rows.map(toDrink);
  }

  async findById(id: number): Promise<Drink | null> {
    const [rows] = await this.pool.execute<DrinkRow[]>('SELECT * FROM drink WHERE id = ?', [id]);
    return rows[0] ? toDrink(rows[0]) : null;
  }
}
