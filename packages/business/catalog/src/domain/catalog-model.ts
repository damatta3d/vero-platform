import { CatalogTenantMismatchError, InvalidCatalogDataError } from './catalog-errors.js';

export const unitOfMeasureValues = ['UNIT', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER'] as const;
export type UnitOfMeasure = (typeof unitOfMeasureValues)[number];

export const catalogItemKindValues = ['INGREDIENT', 'PACKAGING'] as const;
export type CatalogItemKind = (typeof catalogItemKindValues)[number];

export interface Ingredient {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly kind: CatalogItemKind;
  readonly unit: UnitOfMeasure;
  readonly packageQuantityMicros: number;
  readonly packageCostCents: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Product {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly salePriceCents: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface RecipeLine {
  readonly ingredientId: string;
  readonly quantityMicros: number;
}

export interface Recipe {
  readonly id: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly version: number;
  readonly yieldUnits: number;
  readonly lines: readonly RecipeLine[];
  readonly authoredBy: string;
  readonly createdAt: Date;
}

export interface RecipeCost {
  readonly totalCostCents: number;
  readonly costPerUnitCents: number;
  readonly salePriceCents: number;
  readonly marginCents: number;
  readonly marginBasisPoints: number;
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 160) {
    throw new InvalidCatalogDataError(field);
  }
  return normalized;
}

function positiveSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidCatalogDataError(field);
  return value;
}

function nonNegativeSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new InvalidCatalogDataError(field);
  return value;
}

type CreateIngredientData = Omit<Ingredient, 'kind'> & {
  readonly kind?: CatalogItemKind;
};

export function createIngredient(input: CreateIngredientData): Ingredient {
  if (!unitOfMeasureValues.includes(input.unit)) throw new InvalidCatalogDataError('unit');
  const kind = input.kind ?? 'INGREDIENT';
  if (!catalogItemKindValues.includes(kind)) throw new InvalidCatalogDataError('kind');
  return Object.freeze({
    ...input,
    kind,
    id: requiredText(input.id, 'ingredientId'),
    tenantId: requiredText(input.tenantId, 'tenantId'),
    name: requiredText(input.name, 'ingredientName'),
    packageQuantityMicros: positiveSafeInteger(
      input.packageQuantityMicros,
      'packageQuantityMicros'
    ),
    packageCostCents: nonNegativeSafeInteger(input.packageCostCents, 'packageCostCents')
  });
}

export function createProduct(input: Product): Product {
  return Object.freeze({
    ...input,
    id: requiredText(input.id, 'productId'),
    tenantId: requiredText(input.tenantId, 'tenantId'),
    name: requiredText(input.name, 'productName'),
    salePriceCents: nonNegativeSafeInteger(input.salePriceCents, 'salePriceCents')
  });
}

export function createRecipe(input: Recipe): Recipe {
  const lines = input.lines.map((line) =>
    Object.freeze({
      ingredientId: requiredText(line.ingredientId, 'ingredientId'),
      quantityMicros: positiveSafeInteger(line.quantityMicros, 'quantityMicros')
    })
  );
  if (lines.length === 0 || new Set(lines.map((line) => line.ingredientId)).size !== lines.length) {
    throw new InvalidCatalogDataError('recipeLines');
  }
  return Object.freeze({
    ...input,
    id: requiredText(input.id, 'recipeId'),
    tenantId: requiredText(input.tenantId, 'tenantId'),
    productId: requiredText(input.productId, 'productId'),
    version: positiveSafeInteger(input.version, 'recipeVersion'),
    yieldUnits: positiveSafeInteger(input.yieldUnits, 'yieldUnits'),
    authoredBy: requiredText(input.authoredBy, 'authoredBy'),
    lines: Object.freeze(lines)
  });
}

export function calculateRecipeCost(
  product: Product,
  recipe: Recipe,
  ingredients: readonly Ingredient[]
): RecipeCost {
  if (
    product.tenantId !== recipe.tenantId ||
    product.id !== recipe.productId ||
    ingredients.some((ingredient) => ingredient.tenantId !== recipe.tenantId)
  ) {
    throw new CatalogTenantMismatchError();
  }
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  let totalCostCents = 0;
  for (const line of recipe.lines) {
    const ingredient = ingredientById.get(line.ingredientId);
    if (!ingredient) throw new InvalidCatalogDataError('recipeIngredient');
    const lineNumerator = ingredient.packageCostCents * line.quantityMicros;
    if (!Number.isSafeInteger(lineNumerator)) {
      throw new InvalidCatalogDataError('recipeCostOverflow');
    }
    totalCostCents += Math.round(lineNumerator / ingredient.packageQuantityMicros);
  }
  const costPerUnitCents = Math.round(totalCostCents / recipe.yieldUnits);
  const marginCents = product.salePriceCents - costPerUnitCents;
  const marginBasisPoints =
    product.salePriceCents === 0 ? 0 : Math.round((marginCents * 10_000) / product.salePriceCents);
  return Object.freeze({
    totalCostCents,
    costPerUnitCents,
    salePriceCents: product.salePriceCents,
    marginCents,
    marginBasisPoints
  });
}
