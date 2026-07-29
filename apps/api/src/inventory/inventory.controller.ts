import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query
} from '@nestjs/common';
import { z } from 'zod';

import { InventoryService } from '@vero/business-inventory';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

const purchaseSchema = z.object({
  ingredientId: z.string().uuid(),
  quantityMicros: z.number().int().positive(),
  totalCostCents: z.number().int().positive(),
  reference: z.string().trim().min(1).max(256)
});

const consumptionSchema = z.object({
  ingredientId: z.string().uuid(),
  quantityMicros: z.number().int().positive(),
  reason: z.string().trim().min(1).max(256)
});

const adjustmentSchema = z
  .object({
    ingredientId: z.string().uuid(),
    direction: z.enum(['IN', 'OUT']),
    quantityMicros: z.number().int().positive(),
    totalCostCents: z.number().int().positive().optional(),
    reason: z.string().trim().min(1).max(256)
  })
  .refine((input) => input.direction === 'OUT' || input.totalCostCents !== undefined, {
    path: ['totalCostCents']
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

@Controller('v1/inventory')
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post('purchases')
  async recordPurchase(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    return this.inventory.recordPurchase(
      await this.security.authorize(authorization, tenantId, 'inventory.purchase.create'),
      parse(purchaseSchema, body)
    );
  }

  @Post('consumptions')
  async recordConsumption(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    return this.inventory.recordConsumption(
      await this.security.authorize(authorization, tenantId, 'inventory.consumption.create'),
      parse(consumptionSchema, body)
    );
  }

  @Post('adjustments')
  async recordAdjustment(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const input = parse(adjustmentSchema, body);
    return this.inventory.recordAdjustment(
      await this.security.authorize(authorization, tenantId, 'inventory.adjustment.create'),
      input.totalCostCents === undefined
        ? {
            ingredientId: input.ingredientId,
            direction: input.direction,
            quantityMicros: input.quantityMicros,
            reason: input.reason
          }
        : {
            ingredientId: input.ingredientId,
            direction: input.direction,
            quantityMicros: input.quantityMicros,
            totalCostCents: input.totalCostCents,
            reason: input.reason
          }
    );
  }

  @Get('positions')
  async listPositions(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.inventory.listPositions(
      await this.security.authorize(authorization, tenantId, 'inventory.position.read')
    );
  }

  @Get('ingredients/:ingredientId/position')
  async getPosition(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('ingredientId') ingredientId: string
  ) {
    return this.inventory.getPosition(
      await this.security.authorize(authorization, tenantId, 'inventory.position.read'),
      ingredientId
    );
  }

  @Get('ingredients/:ingredientId/movements')
  async listMovements(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('ingredientId') ingredientId: string,
    @Query('limit') limit: string | undefined
  ) {
    const parsedLimit = limit === undefined ? 50 : Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException({ code: 'INVALID_REQUEST', fields: ['limit'] });
    }
    return this.inventory.listMovements(
      await this.security.authorize(authorization, tenantId, 'inventory.movement.read'),
      ingredientId,
      parsedLimit
    );
  }
}
