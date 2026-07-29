import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post
} from '@nestjs/common';
import { z } from 'zod';

import { CatalogService, catalogItemKindValues, unitOfMeasureValues } from '@vero/business-catalog';
import { MvpSecurityService } from './mvp-security.service.js';

const createIngredientSchema = z.object({
  name: z.string().trim().min(1).max(160),
  kind: z.enum(catalogItemKindValues).default('INGREDIENT'),
  unit: z.enum(unitOfMeasureValues),
  packageQuantityMicros: z.number().int().positive(),
  packageCostCents: z.number().int().nonnegative()
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
      parse(createIngredientSchema, body)
    );
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
