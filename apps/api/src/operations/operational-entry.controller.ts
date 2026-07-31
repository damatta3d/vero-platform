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

import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { OperationalEntryService } from './operational-entry.service.js';

const entrySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'PURCHASE', 'WITHDRAWAL', 'ADJUSTMENT']),
  status: z.enum(['PAID', 'PENDING']),
  channel: z.enum(['IFOOD', 'ANOTA_AI', 'PIX', 'CASH', 'OTHER']).nullable().default(null),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(256),
  counterparty: z.string().trim().min(1).max(160).nullable().default(null),
  paymentMethod: z.string().trim().min(1).max(64).nullable().default(null),
  amountCents: z.number().int().positive(),
  orderCount: z.number().int().nonnegative().default(0),
  occurredAt: z.coerce.date(),
  competenceDate: z.coerce.date(),
  notes: z.string().trim().max(512).nullable().default(null)
});

const entryIdSchema = z.string().uuid();

const rangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  limit: z.coerce.number().int().positive().max(200).default(100)
});

@Controller('v1/operations')
export class OperationalEntryController {
  constructor(
    @Inject(OperationalEntryService) private readonly operations: OperationalEntryService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = entrySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: parsed.error.issues.map((issue) => issue.path.join('.'))
      });
    }

    return this.operations.create(
      await this.security.authorize(authorization, tenantId, 'finance.create'),
      parsed.data
    );
  }

  @Patch(':entryId')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('entryId') entryId: string,
    @Body() body: unknown
  ) {
    const parsedId = entryIdSchema.safeParse(entryId);
    const parsedBody = entrySchema.safeParse(body);
    if (!parsedId.success || !parsedBody.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: [
          ...(parsedId.success ? [] : ['entryId']),
          ...(parsedBody.success
            ? []
            : parsedBody.error.issues.map((issue) => issue.path.join('.')))
        ]
      });
    }

    return this.operations.update(
      await this.security.authorize(authorization, tenantId, 'finance.update'),
      parsedId.data,
      parsedBody.data
    );
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: Record<string, string | undefined>
  ) {
    const parsed = rangeSchema.safeParse(query);
    if (!parsed.success || parsed.data.from >= parsed.data.to) {
      throw new BadRequestException({ code: 'INVALID_REQUEST', fields: ['from', 'to'] });
    }

    return this.operations.list(
      await this.security.authorize(authorization, tenantId, 'finance.read'),
      parsed.data.from,
      parsed.data.to,
      parsed.data.limit
    );
  }

  @Get('summary')
  async summary(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: Record<string, string | undefined>
  ) {
    const parsed = rangeSchema.omit({ limit: true }).safeParse(query);
    if (!parsed.success || parsed.data.from >= parsed.data.to) {
      throw new BadRequestException({ code: 'INVALID_REQUEST', fields: ['from', 'to'] });
    }

    return this.operations.summarize(
      await this.security.authorize(authorization, tenantId, 'finance.read'),
      parsed.data.from,
      parsed.data.to
    );
  }
}
