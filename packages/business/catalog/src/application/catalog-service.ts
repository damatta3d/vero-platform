import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import type { CatalogRepository } from './catalog-repository.js';
import {
  calculateRecipeCost,
  createIngredient,
  createProduct,
  createRecipe,
  type Ingredient,
  type CatalogItemKind,
  type Product,
  type Recipe,
  type RecipeCost,
  type RecipeLine,
  type UnitOfMeasure
} from '../domain/catalog-model.js';
import {
  CatalogAuthorizationError,
  CatalogItemNotFoundError,
  CatalogTenantMismatchError
} from '../domain/catalog-errors.js';

export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}

export interface CreateIngredientInput {
  readonly name: string;
  readonly kind?: CatalogItemKind;
  readonly unit: UnitOfMeasure;
  readonly packageQuantityMicros: number;
  readonly packageCostCents: number;
}

export interface CreateProductInput {
  readonly name: string;
  readonly salePriceCents: number;
}

export interface SaveRecipeInput {
  readonly productId: string;
  readonly yieldUnits: number;
  readonly lines: readonly RecipeLine[];
}

function catalogTenant(context: AuthorizedAccessContext, expectedAction: string): string {
  const authorized = consumeAuthorizedAccess(context);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'catalog.management'
  ) {
    throw new CatalogAuthorizationError();
  }
  return authorized.request.tenant.tenantId.toString();
}

export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async createIngredient(
    access: AuthorizedAccessContext,
    input: CreateIngredientInput
  ): Promise<Ingredient> {
    const tenantId = catalogTenant(access, 'catalog.ingredient.create');
    const now = this.clock.now();
    const ingredient = createIngredient({
      id: this.ids.generate(),
      tenantId,
      name: input.name,
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      unit: input.unit,
      packageQuantityMicros: input.packageQuantityMicros,
      packageCostCents: input.packageCostCents,
      createdAt: now,
      updatedAt: now
    });
    await this.repository.saveIngredient(ingredient);
    return ingredient;
  }

  async createProduct(
    access: AuthorizedAccessContext,
    input: CreateProductInput
  ): Promise<Product> {
    const tenantId = catalogTenant(access, 'catalog.product.create');
    const now = this.clock.now();
    const product = createProduct({
      id: this.ids.generate(),
      tenantId,
      name: input.name,
      salePriceCents: input.salePriceCents,
      createdAt: now,
      updatedAt: now
    });
    await this.repository.saveProduct(product);
    return product;
  }

  async saveRecipe(access: AuthorizedAccessContext, input: SaveRecipeInput): Promise<Recipe> {
    const tenantId = catalogTenant(access, 'catalog.recipe.save');
    const product = await this.repository.findProduct(tenantId, input.productId);
    if (!product) throw new CatalogItemNotFoundError('Product');
    const ingredients = await this.repository.findIngredients(
      tenantId,
      input.lines.map((line) => line.ingredientId)
    );
    if (ingredients.length !== input.lines.length) {
      throw new CatalogItemNotFoundError('Ingredient');
    }
    if (ingredients.some((ingredient) => ingredient.tenantId !== tenantId)) {
      throw new CatalogTenantMismatchError();
    }
    const latest = await this.repository.findLatestRecipe(tenantId, input.productId);
    const recipe = createRecipe({
      id: this.ids.generate(),
      tenantId,
      productId: product.id,
      version: (latest?.version ?? 0) + 1,
      yieldUnits: input.yieldUnits,
      lines: input.lines,
      authoredBy: access.request.identity.principal.id.toString(),
      createdAt: this.clock.now()
    });
    await this.repository.saveRecipe(recipe);
    return recipe;
  }

  async getProductCost(access: AuthorizedAccessContext, productId: string): Promise<RecipeCost> {
    const tenantId = catalogTenant(access, 'catalog.cost.read');
    const [product, recipe] = await Promise.all([
      this.repository.findProduct(tenantId, productId),
      this.repository.findLatestRecipe(tenantId, productId)
    ]);
    if (!product) throw new CatalogItemNotFoundError('Product');
    if (!recipe) throw new CatalogItemNotFoundError('Recipe');
    const ingredients = await this.repository.findIngredients(
      tenantId,
      recipe.lines.map((line) => line.ingredientId)
    );
    return calculateRecipeCost(product, recipe, ingredients);
  }

  async listIngredients(access: AuthorizedAccessContext): Promise<readonly Ingredient[]> {
    return this.repository.listIngredients(catalogTenant(access, 'catalog.ingredient.read'));
  }

  async listProducts(access: AuthorizedAccessContext): Promise<readonly Product[]> {
    return this.repository.listProducts(catalogTenant(access, 'catalog.product.read'));
  }
}
