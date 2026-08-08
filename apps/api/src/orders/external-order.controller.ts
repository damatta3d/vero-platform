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
import { ExternalOrderService } from './external-order.service.js';

const providerSchema = z.enum(['ANOTA_AI', 'IFOOD', 'VERO_NATIVE']);
const statusSchema = z.enum([
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'COMPLETED',
  'CANCELLED'
]);
const idSchema = z.string().trim().min(1).max(256);

const itemSchema = z.object({
  providerItemId: idSchema,
  name: z.string().trim().min(1).max(512),
  quantity: z.number().int().positive().max(9999),
  unitPriceCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  mappedProductId: z.string().uuid().nullable(),
  modifiers: z
    .array(
      z.object({
        providerItemId: idSchema,
        name: z.string().trim().min(1).max(512),
        quantity: z.number().int().positive().max(9999),
        unitPriceCents: z.number().int().nonnegative(),
        totalCents: z.number().int().nonnegative(),
        mappedProductId: z.string().uuid().nullable()
      })
    )
    .default([])
});

const receiveSchema = z.object({
  provider: providerSchema,
  establishmentExternalId: idSchema,
  externalOrderId: idSchema,
  reference: z.string().trim().min(1).max(128),
  customerName: z.string().trim().min(1).max(160).nullable().default(null),
  orderType: z.string().trim().min(1).max(64),
  salesChannel: z.string().trim().min(1).max(128),
  currency: z.literal('BRL'),
  subtotalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  deliveryFeeCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  items: z.array(itemSchema).min(1),
  occurredAt: z.coerce.date(),
  observedAt: z.coerce.date(),
  sourceRevision: z.string().trim().min(1).max(128)
});

const listSchema = z.object({
  provider: providerSchema.optional(),
  status: statusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(200).default(100)
});

@Controller('v1/orders')
export class ExternalOrderController {
  constructor(
    @Inject(ExternalOrderService) private readonly orders: ExternalOrderService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post('intake')
  async receive(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        fields: parsed.error.issues.map((issue) => issue.path.join('.'))
      });
    }
    const authorizedTenant = await this.security.authorize(
      authorization,
      tenantId,
      'orders.intake'
    );
    return this.orders.receive(authorizedTenant, parsed.data);
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: Record<string, string | undefined>
  ) {
    const parsed = listSchema.safeParse(query);
    if (
      !parsed.success ||
      (parsed.data.from && parsed.data.to && parsed.data.from >= parsed.data.to)
    ) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }
    const authorizedTenant = await this.security.authorize(
      authorization,
      tenantId,
      'orders.read'
    );
    const filters = {
      limit: parsed.data.limit,
      ...(parsed.data.provider === undefined ? {} : { provider: parsed.data.provider }),
      ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
      ...(parsed.data.from === undefined ? {} : { from: parsed.data.from }),
      ...(parsed.data.to === undefined ? {} : { to: parsed.data.to })
    };
    return this.orders.list(authorizedTenant, filters);
  }

  @Patch(':provider/:establishmentExternalId/:externalOrderId/status')
  async changeStatus(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('provider') provider: string,
    @Param('establishmentExternalId') establishmentExternalId: string,
    @Param('externalOrderId') externalOrderId: string,
    @Body() body: unknown
  ) {
    const parsedProvider = providerSchema.safeParse(provider);
    const parsedEstablishment = idSchema.safeParse(establishmentExternalId);
    const parsedOrder = idSchema.safeParse(externalOrderId);
    const parsedBody = z.object({ status: statusSchema }).safeParse(body);
    if (
      !parsedProvider.success ||
      !parsedEstablishment.success ||
      !parsedOrder.success ||
      !parsedBody.success
    ) {
      throw new BadRequestException({ code: 'INVALID_REQUEST' });
    }
    const authorizedTenant = await this.security.authorize(
      authorization,
      tenantId,
      'orders.update'
    );
    return this.orders.changeStatus(
      authorizedTenant,
      parsedProvider.data,
      parsedEstablishment.data,
      parsedOrder.data,
      parsedBody.data.status
    );
  }
}
