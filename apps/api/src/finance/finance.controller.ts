import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { z } from 'zod';

import { FinanceService } from '@vero/business-finance';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

const createSchema = z.object({
  idempotencyKey: z.string().min(1).max(160),
  type: z.enum(['RECEIVABLE', 'PAYABLE']),
  description: z.string().min(1).max(256),
  category: z.string().min(1).max(120),
  counterparty: z.string().min(1).max(256).nullable().optional(),
  amountCents: z.number().int().positive(),
  dueAt: z.coerce.date(),
  sourceType: z.string().min(1).max(64).nullable().optional(),
  sourceId: z.string().min(1).max(160).nullable().optional()
});

const listSchema = z.object({
  type: z.enum(['RECEIVABLE', 'PAYABLE']).optional(),
  status: z.enum(['OPEN', 'PAID', 'CANCELLED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

@Controller('v1/finance')
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly security: MvpSecurityService
  ) {}

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: parsed.error.issues.map((issue) => issue.path.join('.'))
      });
    }
    return this.finance.create(
      await this.security.authorize(authorization, tenantId, 'finance.create'),
      parsed.data
    );
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: unknown
  ) {
    const parsed = listSchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    return this.finance.list(
      await this.security.authorize(authorization, tenantId, 'finance.read'),
      parsed.data
    );
  }

  @Get('summary')
  async summary(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: unknown
  ) {
    const parsed = listSchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    return this.finance.summary(
      await this.security.authorize(authorization, tenantId, 'finance.read'),
      parsed.data
    );
  }

  @Patch(':id/settle')
  async settle(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = z.object({ paidAt: z.coerce.date().optional() }).safeParse(body);
    if (!parsed.success || !z.string().uuid().safeParse(id).success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }
    return this.finance.settle(
      await this.security.authorize(authorization, tenantId, 'finance.update'),
      id,
      parsed.data.paidAt
    );
  }

  @Patch(':id/cancel')
  async cancel(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    if (!z.string().uuid().safeParse(id).success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }
    return this.finance.cancel(
      await this.security.authorize(authorization, tenantId, 'finance.update'),
      id
    );
  }
}
