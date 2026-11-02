import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { Drink, DrinkSale, DrinkSaleData } from '../../src/domain/types.js';
import type {
  DrinkRepository,
  DrinkSaleFilters,
  DrinkSaleRepository,
} from '../../src/repository/interfaces.js';
import { DrinkService } from '../../src/service/drink.service.js';

const drinks: Drink[] = [
  { id: 1, name: 'Margarita', category: 'Cocktail', unitPrice: 72.47 },
  { id: 2, name: 'Espresso', category: 'Coffee', unitPrice: 35 },
];

const drinkRepo: DrinkRepository = {
  findAll: async (category) => drinks.filter((d) => !category || d.category === category),
  findById: async (id) => drinks.find((d) => d.id === id) ?? null,
};

function fakeSales() {
  const created: DrinkSaleData[] = [];
  const calls: DrinkSaleFilters[] = [];
  const repo: DrinkSaleRepository = {
    findAll: async (filters = {}) => {
      calls.push(filters);
      return [];
    },
    create: async (data) => {
      created.push(data);
      const drink = drinks.find((d) => d.id === data.drinkId)!;
      return {
        id: created.length,
        ...data,
        drinkName: drink.name,
        category: drink.category,
        revenue: data.units * data.unitPrice,
        bartender: 'Helene Christine',
      } satisfies DrinkSale;
    },
  };
  return { repo, created, calls };
}

describe('DrinkService', () => {
  const now = new Date('2026-11-02T14:30:00.000Z');
  let sales: ReturnType<typeof fakeSales>;
  let service: DrinkService;

  beforeEach(() => {
    sales = fakeSales();
    service = new DrinkService(drinkRepo, sales.repo, () => now);
  });

  it('lister drinks, evt. pr. kategori', async () => {
    expect(await service.listDrinks()).toHaveLength(2);
    expect(await service.listDrinks('Coffee')).toEqual([drinks[1]]);
  });

  it('giver NotFoundError for en ukendt drink', async () => {
    await expect(service.getDrink(99)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sender filtre videre ved listning af salg', async () => {
    await service.listSales({ year: 2026, drinkId: 1 });
    expect(sales.calls).toEqual([{ year: 2026, drinkId: 1 }]);
  });

  it('kopierer drinkens aktuelle pris og bruger nu som salgstidspunkt', async () => {
    const sale = await service.createSale({ drinkId: 1, units: 3 });
    expect(sales.created).toEqual([
      { drinkId: 1, units: 3, unitPrice: 72.47, soldAt: '2026-11-02T14:30:00.000Z', year: 2026 },
    ]);
    expect(sale).toMatchObject({ drinkName: 'Margarita', revenue: 217.41 });
  });

  it('gemmer et angivet tidspunkt i UTC og udleder året af det', async () => {
    await service.createSale({ drinkId: 2, units: 1, soldAt: '2027-01-01T00:30:00+01:00' });
    expect(sales.created[0]).toMatchObject({ soldAt: '2026-12-31T23:30:00.000Z', year: 2026 });
  });

  it.each([
    ['0 enheder', { drinkId: 1, units: 0 }],
    ['decimaltal', { drinkId: 1, units: 1.5 }],
    ['ugyldigt tidspunkt', { drinkId: 1, units: 1, soldAt: 'i går' }],
    ['ukendt felt', { drinkId: 1, units: 1, price: 10 }],
  ])('afviser %s med ValidationError', async (_name, bad) => {
    await expect(service.createSale(bad)).rejects.toBeInstanceOf(ValidationError);
    expect(sales.created).toHaveLength(0);
  });

  it('giver NotFoundError ved salg af en ukendt drink', async () => {
    await expect(service.createSale({ drinkId: 99, units: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(sales.created).toHaveLength(0);
  });
});
