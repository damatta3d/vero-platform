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
  Post
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { formatOperationalOrderNumber } from './order-number.js';
import { transitionPersistedOrder } from './order-workflow.js';

type Database = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (transaction: Database) => Promise<T>): Promise<T>;
};

type DeliveryStatus = 'WAITING' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

type LockedDelivery = {
  deliveryId: string;
  orderId: string;
  driverId: string | null;
  status: DeliveryStatus;
  orderStatus:
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY'
    | 'DISPATCHED'
    | 'COMPLETED'
    | 'CANCELLED';
  paymentMethod: string;
  paymentStatus: string;
};

const idSchema = z.string().uuid();
const createDriverSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(8).max(32).nullable().optional().default(null),
    active: z.boolean().optional().default(true)
  })
  .strict();
const updateDriverSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    phone: z.string().trim().min(8).max(32).nullable().optional(),
    active: z.boolean().optional()
  })
  .strict();
const assignSchema = z.object({ driverId: idSchema }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown, code: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code,
      fields: [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
    });
  }
  return result.data;
}

function tenant(value: string | undefined): string {
  if (!value?.trim()) throw new BadRequestException({ code: 'TENANT_REQUIRED' });
  return value.trim();
}

@Controller('v1/delivery')
export class DeliveryOperationsController {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: Database,
    @Inject(MvpSecurityService) private readonly security: MvpSecurityService
  ) {}

  @Get('drivers')
  async drivers(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantHeader?: string
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.drivers.read');
    return this.database.$queryRawUnsafe(
      `SELECT id,name,phone,active,created_at AS "createdAt",updated_at AS "updatedAt"
         FROM commerce_delivery_drivers
        WHERE tenant_id=$1 ORDER BY active DESC,name,id`,
      tenantId
    );
  }

  @Post('drivers')
  async createDriver(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() rawBody: unknown
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.drivers.write');
    const body = parse(createDriverSchema, rawBody, 'INVALID_DELIVERY_DRIVER');
    const id = randomUUID();
    await this.database.$executeRawUnsafe(
      `INSERT INTO commerce_delivery_drivers
         (id,tenant_id,name,phone,active,created_at,updated_at)
       VALUES ($1::uuid,$2,$3,$4,$5,NOW(),NOW())`,
      id,
      tenantId,
      body.name,
      body.phone,
      body.active
    );
    return { id, ...body };
  }

  @Patch('drivers/:driverId')
  async updateDriver(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('driverId') driverIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.drivers.write');
    const driverId = parse(idSchema, driverIdRaw, 'INVALID_DELIVERY_DRIVER');
    const body = parse(updateDriverSchema, rawBody, 'INVALID_DELIVERY_DRIVER');
    if (!Object.keys(body).length) {
      throw new BadRequestException({ code: 'EMPTY_DELIVERY_DRIVER_UPDATE' });
    }
    return this.database.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{ name: string; phone: string | null; active: boolean }>
      >(
        `SELECT name,phone,active FROM commerce_delivery_drivers
          WHERE id=$1::uuid AND tenant_id=$2 FOR UPDATE`,
        driverId,
        tenantId
      );
      const current = rows[0];
      if (!current) throw new NotFoundException({ code: 'DELIVERY_DRIVER_NOT_FOUND' });
      const next = { ...current, ...body };
      if (!next.active) {
        const assigned = await tx.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*)::int AS count FROM commerce_deliveries
            WHERE tenant_id=$1 AND driver_id=$2::uuid
              AND status IN ('ASSIGNED','OUT_FOR_DELIVERY')`,
          tenantId,
          driverId
        );
        if ((assigned[0]?.count ?? 0) > 0) {
          throw new ConflictException({
            code: 'DELIVERY_DRIVER_BUSY',
            message: 'O entregador possui entregas em andamento.'
          });
        }
      }
      await tx.$executeRawUnsafe(
        `UPDATE commerce_delivery_drivers
            SET name=$3,phone=$4,active=$5,updated_at=NOW()
          WHERE id=$1::uuid AND tenant_id=$2`,
        driverId,
        tenantId,
        next.name,
        next.phone,
        next.active
      );
      return { id: driverId, ...next };
    });
  }

  @Get('operations')
  async operations(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') tenantHeader?: string
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.operations.read');
    const rows = await this.database.$queryRawUnsafe<
      Array<{ operationalNumber: number } & Record<string, unknown>>
    >(
      `SELECT d.id AS "deliveryId",d.status,d.driver_id AS "driverId",
              d.assigned_at AS "assignedAt",d.out_for_delivery_at AS "outForDeliveryAt",
              d.delivered_at AS "deliveredAt",o.id AS "orderId",
              o.operational_number AS "operationalNumber",o.customer_name AS "customerName",
              o.customer_phone AS "customerPhone",o.delivery_address AS address,
              o.delivery_distance_m AS "distanceMeters",o.delivery_fee_cents AS "feeCents",
              o.status AS "orderStatus",o.payment_method AS "paymentMethod",
              o.payment_status AS "paymentStatus",dr.name AS "driverName"
         FROM commerce_deliveries d
         JOIN commerce_native_orders o ON o.id=d.order_id AND o.tenant_id=d.tenant_id
         LEFT JOIN commerce_delivery_drivers dr ON dr.id=d.driver_id AND dr.tenant_id=d.tenant_id
        WHERE d.tenant_id=$1 AND d.status<>'CANCELLED'
        ORDER BY CASE d.status WHEN 'WAITING' THEN 0 WHEN 'ASSIGNED' THEN 1
                 WHEN 'OUT_FOR_DELIVERY' THEN 2 ELSE 3 END,d.created_at`,
      tenantId
    );
    return {
      deliveries: rows.map(({ operationalNumber, ...row }) => ({
        ...row,
        orderNumber: formatOperationalOrderNumber(operationalNumber)
      }))
    };
  }

  @Patch('operations/:deliveryId/assign')
  async assign(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('deliveryId') deliveryIdRaw: string,
    @Body() rawBody: unknown
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.operations.write');
    const deliveryId = parse(idSchema, deliveryIdRaw, 'INVALID_DELIVERY_OPERATION');
    const { driverId } = parse(assignSchema, rawBody, 'INVALID_DELIVERY_OPERATION');
    return this.database.$transaction(async (tx) => {
      const delivery = await this.lockedDelivery(tx, tenantId, deliveryId);
      if (delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') {
        throw new ConflictException({ code: 'DELIVERY_ALREADY_FINISHED' });
      }
      if (delivery.status === 'OUT_FOR_DELIVERY') {
        throw new ConflictException({ code: 'DELIVERY_ALREADY_DISPATCHED' });
      }
      const drivers = await tx.$queryRawUnsafe<Array<{ id: string; active: boolean }>>(
        `SELECT id,active FROM commerce_delivery_drivers
          WHERE id=$1::uuid AND tenant_id=$2 FOR UPDATE`,
        driverId,
        tenantId
      );
      if (!drivers[0]?.active) {
        throw new BadRequestException({ code: 'DELIVERY_DRIVER_UNAVAILABLE' });
      }
      if (delivery.driverId && delivery.driverId !== driverId) {
        throw new ConflictException({ code: 'DELIVERY_ALREADY_ASSIGNED' });
      }
      if (delivery.driverId === driverId && delivery.status === 'ASSIGNED') {
        return { deliveryId, status: 'ASSIGNED', driverId };
      }
      const changed = await tx.$executeRawUnsafe(
        `UPDATE commerce_deliveries
            SET driver_id=$3::uuid,status='ASSIGNED',assigned_at=NOW(),updated_at=NOW()
          WHERE id=$1::uuid AND tenant_id=$2 AND status='WAITING'`,
        deliveryId,
        tenantId,
        driverId
      );
      if (changed !== 1) throw new ConflictException({ code: 'DELIVERY_CONCURRENTLY_CHANGED' });
      return { deliveryId, status: 'ASSIGNED', driverId };
    });
  }

  @Patch('operations/:deliveryId/start')
  async start(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('deliveryId') deliveryIdRaw: string
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.operations.write');
    const deliveryId = parse(idSchema, deliveryIdRaw, 'INVALID_DELIVERY_OPERATION');
    return this.database.$transaction(async (tx) => {
      const delivery = await this.lockedDelivery(tx, tenantId, deliveryId);
      if (delivery.status === 'OUT_FOR_DELIVERY') {
        return { deliveryId, status: delivery.status, orderStatus: 'DISPATCHED' };
      }
      if (delivery.status !== 'ASSIGNED' || !delivery.driverId) {
        throw new ConflictException({ code: 'DELIVERY_NOT_ASSIGNED' });
      }
      if (delivery.orderStatus !== 'READY') {
        throw new ConflictException({ code: 'ORDER_NOT_READY_FOR_DELIVERY' });
      }
      await transitionPersistedOrder(tx, tenantId, delivery.orderId, 'DISPATCHED');
      const changed = await tx.$executeRawUnsafe(
        `UPDATE commerce_deliveries
            SET status='OUT_FOR_DELIVERY',out_for_delivery_at=NOW(),updated_at=NOW()
          WHERE id=$1::uuid AND tenant_id=$2 AND status='ASSIGNED'`,
        deliveryId,
        tenantId
      );
      if (changed !== 1) throw new ConflictException({ code: 'DELIVERY_CONCURRENTLY_CHANGED' });
      return { deliveryId, status: 'OUT_FOR_DELIVERY', orderStatus: 'DISPATCHED' };
    });
  }

  @Patch('operations/:deliveryId/complete')
  async complete(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('deliveryId') deliveryIdRaw: string
  ) {
    const tenantId = tenant(tenantHeader);
    await this.security.authorize(authorization, tenantId, 'delivery.operations.write');
    const deliveryId = parse(idSchema, deliveryIdRaw, 'INVALID_DELIVERY_OPERATION');
    return this.database.$transaction(async (tx) => {
      const delivery = await this.lockedDelivery(tx, tenantId, deliveryId);
      if (delivery.status === 'DELIVERED') {
        return { deliveryId, status: delivery.status, orderStatus: 'COMPLETED' };
      }
      if (delivery.status !== 'OUT_FOR_DELIVERY' || delivery.orderStatus !== 'DISPATCHED') {
        throw new ConflictException({ code: 'DELIVERY_NOT_OUT_FOR_DELIVERY' });
      }
      if (delivery.paymentMethod === 'PAY_ON_DELIVERY' && delivery.paymentStatus !== 'PAID') {
        throw new ConflictException({
          code: 'DELIVERY_PAYMENT_NOT_RECEIVED',
          message: 'Confirme o recebimento do pagamento antes de concluir a entrega.'
        });
      }
      await transitionPersistedOrder(tx, tenantId, delivery.orderId, 'COMPLETED');
      const changed = await tx.$executeRawUnsafe(
        `UPDATE commerce_deliveries
            SET status='DELIVERED',delivered_at=NOW(),updated_at=NOW()
          WHERE id=$1::uuid AND tenant_id=$2 AND status='OUT_FOR_DELIVERY'`,
        deliveryId,
        tenantId
      );
      if (changed !== 1) throw new ConflictException({ code: 'DELIVERY_CONCURRENTLY_CHANGED' });
      return { deliveryId, status: 'DELIVERED', orderStatus: 'COMPLETED' };
    });
  }

  private async lockedDelivery(
    database: Database,
    tenantId: string,
    deliveryId: string
  ): Promise<LockedDelivery> {
    const rows = await database.$queryRawUnsafe<LockedDelivery[]>(
      `SELECT d.id AS "deliveryId",d.order_id AS "orderId",d.driver_id AS "driverId",d.status,
              o.status AS "orderStatus",o.payment_method AS "paymentMethod",
              o.payment_status AS "paymentStatus"
         FROM commerce_deliveries d
         JOIN commerce_native_orders o ON o.id=d.order_id AND o.tenant_id=d.tenant_id
        WHERE d.id=$1::uuid AND d.tenant_id=$2 FOR UPDATE OF d,o`,
      deliveryId,
      tenantId
    );
    if (!rows[0]) throw new NotFoundException({ code: 'DELIVERY_NOT_FOUND' });
    return rows[0];
  }
}
