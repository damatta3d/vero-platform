import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { normalizeCouponCode } from './checkout-pricing.js';

type Database = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

const codeSchema = z
  .string()
  .transform(normalizeCouponCode)
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,63}$/));
const nullableText = (maximum: number) => z.string().trim().min(1).max(maximum).nullable();
const dateSchema = z.string().datetime().nullable();
const discountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
const discountValueSchema = z.number().int().positive().max(100_000_000);
const moneySchema = z.number().int().nonnegative().max(100_000_000);
const maxUsesSchema = z.number().int().positive().max(10_000_000).nullable();

const createCouponSchema = z
  .object({
    code: codeSchema,
    name: z.string().trim().min(1).max(160),
    description: nullableText(500).optional().default(null),
    source: nullableText(160).optional().default(null),
    discountType: discountTypeSchema,
    discountValue: discountValueSchema,
    active: z.boolean().optional().default(true),
    startsAt: dateSchema.optional().default(null),
    expiresAt: dateSchema.optional().default(null),
    minimumOrderCents: moneySchema.optional().default(0),
    maxUses: maxUsesSchema.optional().default(null)
  })
  .strict()
  .superRefine(validateCouponRules);

const updateCouponSchema = z
  .object({
    code: codeSchema.optional(),
    name: z.string().trim().min(1).max(160).optional(),
    description: nullableText(500).optional(),
    source: nullableText(160).optional(),
    discountType: discountTypeSchema.optional(),
    discountValue: discountValueSchema.optional(),
    active: z.boolean().optional(),
    startsAt: dateSchema.optional(),
    expiresAt: dateSchema.optional(),
    minimumOrderCents: moneySchema.optional(),
    maxUses: maxUsesSchema.optional()
  })
  .strict();
const idSchema = z.string().uuid();

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: string; meta?: { code?: string } };
  return candidate.meta?.code ?? candidate.code;
}

function validateCouponRules(
  coupon: {
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    startsAt?: string | null;
    expiresAt?: string | null;
  },
  context: z.RefinementCtx
): void {
  if (coupon.discountType === 'PERCENTAGE' && coupon.discountValue > 100) {
    context.addIssue({
      code: 'custom',
      path: ['discountValue'],
      message: 'Percentage must be between 1 and 100.'
    });
  }
  if (coupon.startsAt && coupon.expiresAt && coupon.startsAt >= coupon.expiresAt) {
    context.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'Expiration must be later than the start.'
    });
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code: 'INVALID_COUPON',
      fields: result.error.issues.map((issue) => issue.path.join('.'))
    });
  }
  return result.data;
}

function requiredTenant(value: string | undefined): string {
  const tenantId = value?.trim();
  if (!tenantId) throw new BadRequestException({ code: 'TENANT_REQUIRED' });
  return tenantId;
}

@Controller('v1/coupons')
export class CouponAdminController {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: Database,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantHeader?: string
  ) {
    const tenantId = requiredTenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'coupons.read');
    return this.database.$queryRawUnsafe(
      `SELECT id, code, name, description, source,
              discount_type AS "discountType", discount_value AS "discountValue",
              active, starts_at AS "startsAt", expires_at AS "expiresAt",
              minimum_order_cents AS "minimumOrderCents", max_uses AS "maxUses",
              uses_count AS "usesCount", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM commerce_coupons
        WHERE tenant_id=$1
        ORDER BY active DESC, updated_at DESC, code`,
      tenantId
    );
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() rawBody: unknown
  ) {
    const tenantId = requiredTenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'coupons.write');
    const body = parse(createCouponSchema, rawBody);
    const id = randomUUID();
    try {
      await this.database.$executeRawUnsafe(
        `INSERT INTO commerce_coupons (
           id, tenant_id, code, name, description, source, discount_type, discount_value,
           active, starts_at, expires_at, minimum_order_cents, max_uses, created_at, updated_at
         ) VALUES (
           $1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,$11::timestamptz,$12,$13,NOW(),NOW()
         )`,
        id,
        tenantId,
        body.code,
        body.name,
        body.description,
        body.source,
        body.discountType,
        body.discountValue,
        body.active,
        body.startsAt,
        body.expiresAt,
        body.minimumOrderCents,
        body.maxUses
      );
    } catch (error) {
      if (databaseErrorCode(error) === '23505') {
        throw new BadRequestException({
          code: 'COUPON_CODE_CONFLICT',
          message: 'Já existe um cupom com este código.'
        });
      }
      throw error;
    }
    return { id, tenantId, ...body, usesCount: 0 };
  }

  @Patch(':couponId')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('couponId') couponIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenantId = requiredTenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'coupons.write');
    const couponId = parse(idSchema, couponIdRaw);
    const patch = parse(updateCouponSchema, rawBody);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException({ code: 'EMPTY_COUPON_UPDATE' });
    }

    const rows = await this.database.$queryRawUnsafe<
      Array<{
        code: string;
        name: string;
        description: string | null;
        source: string | null;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue: number;
        active: boolean;
        startsAt: Date | null;
        expiresAt: Date | null;
        minimumOrderCents: number;
        maxUses: number | null;
      }>
    >(
      `SELECT code, name, description, source, discount_type AS "discountType",
              discount_value AS "discountValue", active, starts_at AS "startsAt",
              expires_at AS "expiresAt", minimum_order_cents AS "minimumOrderCents",
              max_uses AS "maxUses"
         FROM commerce_coupons WHERE tenant_id=$1 AND id=$2::uuid`,
      tenantId,
      couponId
    );
    const current = rows[0];
    if (!current) throw new NotFoundException({ code: 'COUPON_NOT_FOUND' });
    const merged = parse(createCouponSchema, {
      ...current,
      startsAt: current.startsAt?.toISOString() ?? null,
      expiresAt: current.expiresAt?.toISOString() ?? null,
      ...patch
    });
    try {
      await this.database.$executeRawUnsafe(
        `UPDATE commerce_coupons
            SET code=$3, name=$4, description=$5, source=$6, discount_type=$7,
                discount_value=$8, active=$9, starts_at=$10::timestamptz,
                expires_at=$11::timestamptz, minimum_order_cents=$12,
                max_uses=$13, updated_at=NOW()
          WHERE tenant_id=$1 AND id=$2::uuid`,
        tenantId,
        couponId,
        merged.code,
        merged.name,
        merged.description,
        merged.source,
        merged.discountType,
        merged.discountValue,
        merged.active,
        merged.startsAt,
        merged.expiresAt,
        merged.minimumOrderCents,
        merged.maxUses
      );
    } catch (error) {
      if (databaseErrorCode(error) === '23505') {
        throw new BadRequestException({
          code: 'COUPON_CODE_CONFLICT',
          message: 'Já existe um cupom com este código.'
        });
      }
      throw error;
    }
    return { id: couponId, tenantId, ...merged };
  }
}
