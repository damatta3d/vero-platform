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

import { FinanceService } from '@vero/business-finance';
import { SalesService } from '@vero/business-sales';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

const recordSaleSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().uuid()
});

@Controller('v1/sales')
export class SalesController {
  constructor(
    @Inject(SalesService) private readonly sales: SalesService,
    @Inject(FinanceService) private readonly finance: FinanceService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post()
  async recordSale(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = recordSaleSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: parsed.error.issues.map((issue) => issue.path.join('.'))
      });
    }

    const posting = await this.sales.recordSale(
      await this.security.authorize(authorization, tenantId, 'sales.create'),
      parsed.data
    );

    await this.finance.create(
      await this.security.authorize(authorization, tenantId, 'finance.create'),
      {
        idempotencyKey: `sale:${posting.idempotencyKey}`,
        type: 'RECEIVABLE',
        description: `Venda ${posting.productName}`,
        category: 'Vendas',
        amountCents: posting.grossRevenueCents,
        dueAt: posting.soldAt,
        sourceType: 'SALE',
        sourceId: posting.id
      }
    );

    return posting;
  }

  @Get()
  async listSales(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('limit') limit: string | undefined
  ) {
    const parsedLimit = limit === undefined ? 50 : Number(limit);

    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: ['limit']
      });
    }

    return this.sales.listSales(
      await this.security.authorize(authorization, tenantId, 'sales.read'),
      parsedLimit
    );
  }

  @Get('summary')
  async summarize(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.sales.summarize(
      await this.security.authorize(authorization, tenantId, 'sales.read')
    );
  }
}
