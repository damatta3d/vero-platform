import { BadRequestException, Body, Controller, Get, Headers, Inject, Put } from '@nestjs/common';
import { z } from 'zod';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';

type Database = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (transaction: Database) => Promise<T>): Promise<T>;
};

const bandSchema = z
  .object({
    minDistanceMeters: z.number().int().nonnegative().max(1_000_000),
    maxDistanceMeters: z.number().int().positive().max(1_000_000),
    feeCents: z.number().int().nonnegative().max(100_000_000),
    active: z.boolean()
  })
  .strict()
  .refine((band) => band.maxDistanceMeters > band.minDistanceMeters, {
    path: ['maxDistanceMeters'],
    message: 'A distância final deve ser maior que a inicial.'
  });

const bandsSchema = z
  .object({ bands: z.array(bandSchema).max(100) })
  .strict()
  .superRefine(({ bands }, context) => {
    bands.forEach((band, index) => {
      const expectedMinimum = index === 0 ? 0 : bands[index - 1]!.maxDistanceMeters;
      if (band.minDistanceMeters !== expectedMinimum) {
        context.addIssue({
          code: 'custom',
          path: ['bands', index, 'minDistanceMeters'],
          message: 'As faixas devem ser contínuas, ordenadas e começar em zero.'
        });
      }
    });
  });

function tenant(value: string | undefined): string {
  if (!value?.trim()) throw new BadRequestException({ code: 'TENANT_REQUIRED' });
  return value.trim();
}

@Controller('v1/delivery/fee-bands')
export class DeliveryAdminController {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: Database,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantHeader?: string
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.settings.read');
    const bands = await this.database.$queryRawUnsafe<
      Array<{
        sequence: number;
        minDistanceMeters: number;
        maxDistanceMeters: number;
        feeCents: number;
        active: boolean;
      }>
    >(
      `SELECT sequence,min_distance_m AS "minDistanceMeters",
              max_distance_m AS "maxDistanceMeters",fee_cents AS "feeCents",active
         FROM store_delivery_fee_bands
        WHERE tenant_id=$1 ORDER BY sequence`,
      tenantId
    );
    return {
      intervalConvention: '[início, fim), com o fim da última faixa inclusivo',
      bands: bands.map((band, index) => ({
        ...band,
        upperBoundInclusive: index === bands.length - 1
      }))
    };
  }

  @Put()
  async replace(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() rawBody: unknown
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.settings.write');
    const parsed = bandsSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_DELIVERY_FEE_BANDS',
        fields: [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))]
      });
    }
    await this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        `${tenantId}:delivery-fee-bands`
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM store_delivery_fee_bands WHERE tenant_id=$1',
        tenantId
      );
      for (const [sequence, band] of parsed.data.bands.entries()) {
        await tx.$executeRawUnsafe(
          `INSERT INTO store_delivery_fee_bands
             (tenant_id,sequence,min_distance_m,max_distance_m,fee_cents,active,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
          tenantId,
          sequence,
          band.minDistanceMeters,
          band.maxDistanceMeters,
          band.feeCents,
          band.active
        );
      }
    });
    return this.list(authorization, tenantId);
  }
}
