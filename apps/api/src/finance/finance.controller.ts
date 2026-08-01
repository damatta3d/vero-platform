import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
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
    @Inject(FinanceService) private readonly finance: FinanceService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
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
    const tenant = await this.authorizedTenant(authorization, tenantId, 'finance.create');
    const entry = await this.finance.create(
      { tenantId: tenant },
      {
        ...parsed.data,
        counterparty: parsed.data.counterparty ?? null,
        sourceKey: parsed.data.sourceKey ?? null
      }
    );
    return entry.snapshot;
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('status') status: string | undefined
  ) {
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    const tenant = await this.authorizedTenant(authorization, tenantId, 'finance.read');
    const entries = await this.finance.list({ tenantId: tenant }, parsedStatus.data);
    return entries.map((entry) => entry.snapshot);
  }

  @Get('summary')
  async summary(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    const tenant = await this.authorizedTenant(authorization, tenantId, 'finance.read');
    return this.finance.summary({ tenantId: tenant });
  }

  @Patch(':id/settle')
  async settle(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    const tenant = await this.authorizedTenant(authorization, tenantId, 'finance.update');
    const entry = await this.finance.settle({ tenantId: tenant }, parsedId.data);
    return entry.snapshot;
  }

  @Patch(':id/cancel')
  async cancel(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new BadRequestException({ code: 'INVALID_REQUEST' });
    const tenant = await this.authorizedTenant(authorization, tenantId, 'finance.update');
    const entry = await this.finance.cancel({ tenantId: tenant }, parsedId.data);
    return entry.snapshot;
  }

  private async authorizedTenant(
    authorization: string | undefined,
    tenantId: string | undefined,
    action: string
  ): Promise<string> {
    await this.security.authorize(authorization, tenantId, action);
    if (!tenantId) throw new BadRequestException({ code: 'INVALID_TENANT' });
    return tenantId;
  }
}
