import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient, type CatalogRecipe as CatalogRecipeRow } from '@prisma/client';

import {
  createIngredient,
  createProduct,
  createRecipe,
  type CatalogRepository,
  type CatalogItemKind,
  type Ingredient,
  type Product,
  type Recipe,
  type UnitOfMeasure
} from '@vero/business-catalog';
type CatalogPrismaClient = InstanceType<typeof PrismaClient>;

function safeNumber(value: bigint): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error('Catalog quantity exceeds safe range.');
  return converted;
}

function ingredientFromRow(row: {
  id: string;
  tenantId: string;
  name: string;
  kind: string;
  unit: string;
  packageQuantityMicros: bigint;
  packageCostCents: number;
  createdAt: Date;
  updatedAt: Date;
}): Ingredient {
  return createIngredient({
    ...row,
    kind: row.kind as CatalogItemKind,
    unit: row.unit as UnitOfMeasure,
    packageQuantityMicros: safeNumber(row.packageQuantityMicros)
  });
}

function productFromRow(row: {
  id: string;
  tenantId: string;
  name: string;
  salePriceCents: number;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  return createProduct(row);
}

function recipeFromRow(
  row: CatalogRecipeRow & {
    lines: Array<{ ingredientId: string; quantityMicros: bigint }>;
  }
): Recipe {
  return createRecipe({
    id: row.id,
    tenantId: row.tenantId,
    productId: row.productId,
    version: row.version,
    yieldUnits: row.yieldUnits,
    authoredBy: row.authoredBy,
    createdAt: row.createdAt,
    lines: row.lines.map((line) => ({
      ingredientId: line.ingredientId,
      quantityMicros: safeNumber(line.quantityMicros)
    }))
  });
}

export function createDatabaseClient(databaseUrl: string): CatalogPrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl })
  });
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly client: CatalogPrismaClient) {}

  async saveIngredient(ingredient: Ingredient): Promise<void> {
    await this.client.catalogIngredient.upsert({
      where: {
        tenantId_id: { tenantId: ingredient.tenantId, id: ingredient.id }
      },
      create: {
        ...ingredient,
        packageQuantityMicros: BigInt(ingredient.packageQuantityMicros)
      },
      update: {
        name: ingredient.name,
        kind: ingredient.kind,
        unit: ingredient.unit,
        packageQuantityMicros: BigInt(ingredient.packageQuantityMicros),
        packageCostCents: ingredient.packageCostCents,
        updatedAt: ingredient.updatedAt
      }
    });
  }

  async deleteIngredient(tenantId: string, ingredientId: string): Promise<boolean> {
    try {
      const result = await this.client.catalogIngredient.deleteMany({
        where: { tenantId, id: ingredientId }
      });
      return result.count === 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new Error('CATALOG_ITEM_IN_USE');
      }
      throw error;
    }
  }

  async saveProduct(product: Product): Promise<void> {
    await this.client.catalogProduct.upsert({
      where: { tenantId_id: { tenantId: product.tenantId, id: product.id } },
      create: product,
      update: {
        name: product.name,
        salePriceCents: product.salePriceCents,
        updatedAt: product.updatedAt
      }
    });
  }

  async saveRecipe(recipe: Recipe): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      await transaction.catalogRecipe.create({
        data: {
          id: recipe.id,
          tenantId: recipe.tenantId,
          productId: recipe.productId,
          version: recipe.version,
          yieldUnits: recipe.yieldUnits,
          authoredBy: recipe.authoredBy,
          createdAt: recipe.createdAt
        }
      });
      await transaction.catalogRecipeLine.createMany({
        data: recipe.lines.map((line) => ({
          tenantId: recipe.tenantId,
          recipeId: recipe.id,
          ingredientId: line.ingredientId,
          quantityMicros: BigInt(line.quantityMicros)
        }))
      });
    });
  }

  async findIngredient(tenantId: string, ingredientId: string): Promise<Ingredient | undefined> {
    const row = await this.client.catalogIngredient.findUnique({
      where: { tenantId_id: { tenantId, id: ingredientId } }
    });
    return row ? ingredientFromRow(row) : undefined;
  }

  async findIngredients(
    tenantId: string,
    ingredientIds: readonly string[]
  ): Promise<readonly Ingredient[]> {
    const rows = await this.client.catalogIngredient.findMany({
      where: { tenantId, id: { in: [...ingredientIds] } },
      orderBy: { name: 'asc' }
    });
    return rows.map(ingredientFromRow);
  }

  async findProduct(tenantId: string, productId: string): Promise<Product | undefined> {
    const row = await this.client.catalogProduct.findUnique({
      where: { tenantId_id: { tenantId, id: productId } }
    });
    return row ? productFromRow(row) : undefined;
  }

  async findLatestRecipe(tenantId: string, productId: string): Promise<Recipe | undefined> {
    const row = await this.client.catalogRecipe.findFirst({
      where: { tenantId, productId },
      include: { lines: true },
      orderBy: { version: 'desc' }
    });
    return row ? recipeFromRow(row) : undefined;
  }

  async listIngredients(tenantId: string): Promise<readonly Ingredient[]> {
    const rows = await this.client.catalogIngredient.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
    return rows.map(ingredientFromRow);
  }

  async listProducts(tenantId: string): Promise<readonly Product[]> {
    const rows = await this.client.catalogProduct.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
    return rows.map(productFromRow);
  }
}
