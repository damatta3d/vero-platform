import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { z } from 'zod';

import { CatalogService, catalogItemKindValues, unitOfMeasureValues } from '@vero/business-catalog';
import { MvpSecurityService } from './mvp-security.service.js';

const ingredientSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    kind: z.enum(catalogItemKindValues).default('INGREDIENT'),
    unit: z.enum(unitOfMeasureValues),
    packageQuantityMicros: z.number().int().positive(),
    packageCostCents: z.number().int().nonnegative()
  })
  .superRefine((input, context) => {
    if (input.unit === 'UNIT' && input.packageQuantityMicros % 1_000_000 !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['packageQuantityMicros'],
        message: 'Unit quantities must be whole numbers.'
      });
    }
  });

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  salePriceCents: z.number().int().nonnegative()
});

const saveRecipeSchema = z.object({
  yieldUnits: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        quantityMicros: z.number().int().positive()
      })
    )
    .min(1)
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'INVALID_REQUEST',
      fields: parsed.error.issues.map((issue) => issue.path.join('.'))
    });
  }
  return parsed.data;
}

@Controller('v1/catalog')
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post('ingredients')
  async createIngredient(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    return this.catalog.createIngredient(
      await this.security.authorize(authorization, tenantId, 'catalog.ingredient.create'),
      parse(ingredientSchema, body)
    );
  }

  @Patch('ingredients/:ingredientId')
  async updateIngredient(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('ingredientId') ingredientId: string,
    @Body() body: unknown
  ) {
    return this.catalog.updateIngredient(
      await this.security.authorize(authorization, tenantId, 'catalog.ingredient.update'),
      { ...parse(ingredientSchema, body), ingredientId }
    );
  }

  @Delete('ingredients/:ingredientId')
  @HttpCode(204)
  async deleteIngredient(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('ingredientId') ingredientId: string
  ): Promise<void> {
    try {
      await this.catalog.deleteIngredient(
        await this.security.authorize(authorization, tenantId, 'catalog.ingredient.delete'),
        ingredientId
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'CATALOG_ITEM_IN_USE') {
        throw new ConflictException({
          code: 'CATALOG_ITEM_IN_USE',
          message: 'O item possui histórico ou vínculos e não pode ser excluído.'
        });
      }
      throw error;
    }
  }

  @Get('ingredients')
  async listIngredients(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.catalog.listIngredients(
      await this.security.authorize(authorization, tenantId, 'catalog.ingredient.read')
    );
  }

  @Post('products')
  async createProduct(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    return this.catalog.createProduct(
      await this.security.authorize(authorization, tenantId, 'catalog.product.create'),
      parse(createProductSchema, body)
    );
  }

  @Get('products')
  async listProducts(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.catalog.listProducts(
      await this.security.authorize(authorization, tenantId, 'catalog.product.read')
    );
  }

  @Post('products/:productId/recipes')
  async saveRecipe(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('productId') productId: string,
    @Body() body: unknown
  ) {
    const input = parse(saveRecipeSchema, body);
    return this.catalog.saveRecipe(
      await this.security.authorize(authorization, tenantId, 'catalog.recipe.save'),
      { ...input, productId }
    );
  }

  @Get('products/:productId/cost')
  async getProductCost(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('productId') productId: string
  ) {
    return this.catalog.getProductCost(
      await this.security.authorize(authorization, tenantId, 'catalog.cost.read'),
      productId
    );
  }
}
