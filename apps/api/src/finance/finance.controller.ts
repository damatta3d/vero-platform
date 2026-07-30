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

    const input = {
      idempotencyKey: parsed.data.idempotencyKey,
      type: parsed.data.type,
      description: parsed.data.description,
      category: parsed.data.category,
      amountCents: parsed.data.amountCents,
      dueAt: parsed.data.dueAt,
      ...(parsed.data.counterparty !== undefined ? { counterparty: parsed.data.counterparty } : {}),
      ...(parsed.data.sourceType !== undefined ? { sourceType: parsed.data.sourceType } : {}),
      ...(parsed.data.sourceId !== undefined ? { sourceId: parsed.data.sourceId } : {})
    };

    return this.finance.create(
      await this.security.authorize(authorization, tenantId, 'finance.create'),
      input
    );
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: unknown
  ) {
    const parsed = listSchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }

    const filter = {
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.from !== undefined ? { from: parsed.data.from } : {}),
      ...(parsed.data.to !== undefined ? { to: parsed.data.to } : {})
    };

    return this.finance.list(
      await this.security.authorize(authorization, tenantId, 'finance.read'),
      filter
    );
  }

  @Get('summary')
  async summary(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: unknown
  ) {
    const parsed = listSchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }

    const filter = {
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.from !== undefined ? { from: parsed.data.from } : {}),
      ...(parsed.data.to !== undefined ? { to: parsed.data.to } : {})
    };

    return this.finance.summary(
      await this.security.authorize(authorization, tenantId, 'finance.read'),
      filter
    );
  }

  @Patch(':id/settle')
  async settle(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = z
      .object({
        paidAt: z.coerce.date().optional()
      })
      .safeParse(body);

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
