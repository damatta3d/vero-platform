import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Query
} from '@nestjs/common';
import { z } from 'zod';

import { ProductionService } from '@vero/business-production';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

const productionSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(1).max(160)
});

function parse(body: unknown) {
  const parsed = productionSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'INVALID_REQUEST',
      fields: parsed.error.issues.map((issue) => issue.path.join('.'))
    });
  }
  return parsed.data;
}

@Controller('v1/production')
export class ProductionController {
  constructor(
    @Inject(ProductionService) private readonly production: ProductionService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post()
  async recordProduction(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    return this.production.recordProduction(
      await this.security.authorize(authorization, tenantId, 'production.create'),
      parse(body)
    );
  }

  @Get()
  async listProduction(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('limit') limit: string | undefined
  ) {
    const parsedLimit = limit === undefined ? 50 : Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException({ code: 'INVALID_REQUEST', fields: ['limit'] });
    }
    return this.production.listProduction(
      await this.security.authorize(authorization, tenantId, 'production.read'),
      parsedLimit
    );
  }

  @Get('summary')
  async summarize(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.production.summarize(
      await this.security.authorize(authorization, tenantId, 'production.read')
    );
  }
}
