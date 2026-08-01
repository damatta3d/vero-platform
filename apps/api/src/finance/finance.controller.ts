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
  type: z.enum(['RECEIVABLE', 'PAYABLE']),
  description: z.string().trim().min(1).max(256),
  category: z.string().trim().min(1).max(120),
  amountInCents: z.number().int().positive(),
  dueDate: z.coerce.date(),
  counterparty: z.string().trim().max(160).nullable().optional(),
  sourceKey: z.string().trim().max(160).nullable().optional()
});

const idSchema = z.string().uuid();
const statusSchema = z.enum(['OPEN', 'SETTLED', 'CANCELLED']).optional();

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
    const access = await this.security.authorize(authorization, tenantId, 'finance.create');
    return this.finance.create(
      { tenantId: access.tenant.tenantId },
      {
        ...parsed.data,
        counterparty: parsed.data.counterparty ?? null,
        sourceKey: parsed.data.sourceKey ?? null
      }
    );
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('status') status: string | undefined
  ) {
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    const access = await this.security.authorize(authorization, tenantId, 'finance.read');
    return this.finance.list({ tenantId: access.tenant.tenantId }, parsedStatus.data);
  }

  @Get('summary')
  async summary(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    const access = await this.security.authorize(authorization, tenantId, 'finance.read');
    return this.finance.summary({ tenantId: access.tenant.tenantId });
  }

  @Patch(':id/settle')
  async settle(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    const access = await this.security.authorize(authorization, tenantId, 'finance.update');
    return this.finance.settle({ tenantId: access.tenant.tenantId }, parsedId.data);
  }

  @Patch(':id/cancel')
  async cancel(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    const access = await this.security.authorize(authorization, tenantId, 'finance.update');
    return this.finance.cancel({ tenantId: access.tenant.tenantId }, parsedId.data);
  }
}
