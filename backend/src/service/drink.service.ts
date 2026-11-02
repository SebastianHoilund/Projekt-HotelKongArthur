import { NotFoundError, ValidationError } from '../domain/errors.js';
import { drinkSaleInputSchema } from '../domain/schemas.js';
import type { Drink, DrinkCategory, DrinkSale } from '../domain/types.js';
import type {
  DrinkRepository,
  DrinkSaleFilters,
  DrinkSaleRepository,
} from '../repository/interfaces.js';

export class DrinkService {
  constructor(
    private readonly drinks: DrinkRepository,
    private readonly sales: DrinkSaleRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listDrinks(category?: DrinkCategory): Promise<Drink[]> {
    return this.drinks.findAll(category);
  }

  async getDrink(id: number): Promise<Drink> {
    const drink = await this.drinks.findById(id);
    if (!drink) throw new NotFoundError(`Drink ${id} findes ikke`);
    return drink;
  }

  listSales(filters: DrinkSaleFilters = {}): Promise<DrinkSale[]> {
    return this.sales.findAll(filters);
  }

  async createSale(rawInput: unknown): Promise<DrinkSale> {
    const parsed = drinkSaleInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(
        'Ugyldigt salg',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    const { drinkId, units, soldAt } = parsed.data;
    const drink = await this.getDrink(drinkId);

    // Tidspunktet gemmes i UTC, og året følger det gemte tidspunkt.
    const soldAtUtc = (soldAt ? new Date(soldAt) : this.now()).toISOString();
    // Prisen kopieres, så senere prisændringer ikke ændrer gamle salg.
    return this.sales.create({
      drinkId,
      units,
      unitPrice: drink.unitPrice,
      soldAt: soldAtUtc,
      year: Number(soldAtUtc.slice(0, 4)),
    });
  }
}
