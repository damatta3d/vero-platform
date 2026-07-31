import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { z } from 'zod';

import { AccountGroupType, AccountService } from '@vero/business-finance';

import { MvpSecurityService } from '../catalog/mvp-security.service.js';

const createAccountSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  group: z.nativeEnum(AccountGroupType),
  parentId: z.string().uuid().nullable().optional(),
  acceptsPosting: z.boolean().optional()
});

const accountIdSchema = z.string().uuid();

@Controller('v1/finance/accounts')
export class AccountController {
  constructor(
    private readonly accounts: AccountService,
    private readonly security: MvpSecurityService
  ) {}

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: parsed.error.issues.map((issue) => issue.path.join('.'))
      });
    }

    return this.accounts.create(
      await this.security.authorize(authorization, tenantId, 'finance.create'),
      {
        code: parsed.data.code,
        name: parsed.data.name,
        group: parsed.data.group,
        parentId: parsed.data.parentId ?? null,
        acceptsPosting: parsed.data.acceptsPosting ?? true
      }
    );
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined
  ) {
    return this.accounts.list(
      await this.security.authorize(authorization, tenantId, 'finance.read')
    );
  }

  @Patch(':id/activate')
  async activate(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    if (!accountIdSchema.safeParse(id).success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }

    return this.accounts.activate(
      await this.security.authorize(authorization, tenantId, 'finance.update'),
      id
    );
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    if (!accountIdSchema.safeParse(id).success) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }

    return this.accounts.deactivate(
      await this.security.authorize(authorization, tenantId, 'finance.update'),
      id
    );
  }
}
