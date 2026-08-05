import type { Ingredient, Product, Recipe } from '../domain/catalog-model.js';

export interface CatalogRepository {
  saveIngredient(ingredient: Ingredient): Promise<void>;
  deleteIngredient(tenantId: string, ingredientId: string): Promise<boolean>;
  saveProduct(product: Product): Promise<void>;
  saveRecipe(recipe: Recipe): Promise<void>;
  findIngredient(tenantId: string, ingredientId: string): Promise<Ingredient | undefined>;
  findIngredients(
    tenantId: string,
    ingredientIds: readonly string[]
  ): Promise<readonly Ingredient[]>;
  findProduct(tenantId: string, productId: string): Promise<Product | undefined>;
  findLatestRecipe(tenantId: string, productId: string): Promise<Recipe | undefined>;
  listIngredients(tenantId: string): Promise<readonly Ingredient[]>;
  listProducts(tenantId: string): Promise<readonly Product[]>;
}
