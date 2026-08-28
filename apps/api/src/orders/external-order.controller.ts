import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException
} from '@nestjs/common';
import { z } from 'zod';

import {
  ExternalOrderInboxError,
  ExternalOrderInboxService,
  type ExternalOrder,
  type ExternalOrderInboxListQuery,
  type ExternalOrderOperationalStatus
} from '@vero/business-sales';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

const text128 = z.string().trim().min(1).max(128);
const text256 = z.string().trim().min(1).max(256);
const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const quantity = z.number().int().positive().max(9999);

const itemReferenceSchema = z.object({
  providerItemId: text256,
  externalId: text256.optional(),
  internalId: text256.optional(),
  backofficeId: text256.optional()
});

const modifierSchema = itemReferenceSchema.extend({
  parentProviderItemId: text256,
  name: z.string().trim().min(1).max(512),
  quantity,
  unitPriceCents: money,
  totalCents: money
});

const itemSchema = itemReferenceSchema.extend({
  name: z.string().trim().min(1).max(512),
  quantity,
  unitPriceCents: money,
  totalCents: money,
  modifiers: z.array(modifierSchema).max(200)
});

const externalOrderSchema = z.object({
  currency: z.literal('BRL'),
  identity: z.object({
    provider: z.string().trim().min(1).max(64),
    establishmentExternalId: text256,
    orderExternalId: text256,
    idempotencyKey: z.string().trim().min(1).max(256),
    reference: text128
  }),
  merchant: z.object({
    externalId: text256,
    name: text256,
    unit: z.string().trim().max(256)
  }),
  source: z.object({
    salesChannel: text128,
    origin: text128,
    type: text128,
    menuVersion: z.number().int().nonnegative()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(itemSchema).min(1).max(500),
  discounts: z.array(
    z.object({
      amountCents: money,
      tag: text256
    })
  ),
  deliveryFeeCents: money,
  additionalFeesCents: z.array(money).max(50),
  payments: z.array(
    z.object({
      externalId: text256.optional(),
      code: text128,
      name: text256,
      card: z.string().trim().max(128),
      prepaid: z.boolean(),
      changeForCents: money.optional(),
      amountCents: money
    })
  ),
  totalCents: money,
  customer: z.object({
    name: text256.optional(),
    phone: z.string().trim().min(1).max(64).optional()
  }),
  deliveryAddress: z
    .object({
      formattedAddress: z.string().trim().min(1).max(1024),
      streetName: z.string().trim().min(1).max(512),
      streetNumber: z.string().trim().min(1).max(64),
      complement: z.string().trim().max(512),
      neighborhood: text256,
      city: text256,
      state: text128,
      country: text128,
      postalCode: z.string().trim().min(1).max(32),
      latitude: z.number().finite(),
      longitude: z.number().finite()
    })
    .optional()
});

const receiveSchema = z.object({
  order: externalOrderSchema,
  providerStatus: text128.optional(),
  sourceRevision: text256.optional(),
  observedAt: z.coerce.date().optional()
});

const statusSchema = z.enum([
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'COMPLETED',
  'CANCELLED'
]);

const mappingStatusSchema = z.enum(['MAPPED', 'REVIEW_REQUIRED']);

const listSchema = z.object({
  provider: z.string().trim().min(1).max(64).optional(),
  status: statusSchema.optional(),
  mappingStatus: mappingStatusSchema.optional(),
  cursor: z.string().trim().min(1).max(1024).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

const idSchema = z.string().uuid();

@Controller('v1/external-orders')
export class ExternalOrderController {
  constructor(
    @Inject(ExternalOrderInboxService) private readonly orders: ExternalOrderInboxService,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Post('intake')
  async receive(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) invalidRequest(parsed.error.issues.map((issue) => issue.path.join('.')));

    try {
      return await this.orders.receive(
        await this.security.authorize(authorization, tenantId, 'orders.intake'),
        {
          order: parsed.data.order as ExternalOrder,
          ...(parsed.data.providerStatus === undefined
            ? {}
            : { providerStatus: parsed.data.providerStatus }),
          ...(parsed.data.sourceRevision === undefined
            ? {}
            : { sourceRevision: parsed.data.sourceRevision }),
          ...(parsed.data.observedAt === undefined ? {} : { observedAt: parsed.data.observedAt })
        }
      );
    } catch (error) {
      throw mapInboxError(error);
    }
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query() query: Record<string, string | undefined>
  ) {
    const parsed = listSchema.safeParse(query);
    if (!parsed.success) invalidRequest(parsed.error.issues.map((issue) => issue.path.join('.')));
    const filters: ExternalOrderInboxListQuery = {
      limit: parsed.data.limit,
      ...(parsed.data.provider === undefined ? {} : { provider: parsed.data.provider }),
      ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
      ...(parsed.data.mappingStatus === undefined
        ? {}
        : { mappingStatus: parsed.data.mappingStatus }),
      ...(parsed.data.cursor === undefined ? {} : { cursor: parsed.data.cursor })
    };
    try {
      return await this.orders.list(
        await this.security.authorize(authorization, tenantId, 'orders.read'),
        filters
      );
    } catch (error) {
      throw mapInboxError(error);
    }
  }

  @Get(':id')
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ) {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) invalidRequest(['id']);
    try {
      return await this.orders.get(
        await this.security.authorize(authorization, tenantId, 'orders.read'),
        parsedId.data
      );
    } catch (error) {
      throw mapInboxError(error);
    }
  }

  @Patch(':id/status')
  async changeStatus(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsedId = idSchema.safeParse(id);
    const parsedBody = z.object({ status: statusSchema }).safeParse(body);
    if (!parsedId.success || !parsedBody.success) invalidRequest(['id', 'status']);
    try {
      return await this.orders.changeStatus(
        await this.security.authorize(authorization, tenantId, 'orders.update'),
        parsedId.data,
        parsedBody.data.status as ExternalOrderOperationalStatus
      );
    } catch (error) {
      throw mapInboxError(error);
    }
  }
}

function invalidRequest(fields: readonly string[]): never {
  throw new BadRequestException({ code: 'INVALID_REQUEST', fields });
}

function mapInboxError(error: unknown): Error {
  if (!(error instanceof ExternalOrderInboxError)) {
    return error instanceof Error ? error : new Error('External order inbox failed.');
  }
  switch (error.code) {
    case 'NOT_FOUND':
      return new NotFoundException({ code: error.code, field: error.field });
    case 'SOURCE_REVISION_CONFLICT':
    case 'INVALID_STATUS_TRANSITION':
    case 'CATALOG_MAPPING_REQUIRED':
      return new ConflictException({ code: error.code, field: error.field });
    case 'UNAUTHORIZED':
      return new UnauthorizedException();
    case 'INVALID_INPUT':
    default:
      return new BadRequestException({ code: error.code, field: error.field });
  }
}
