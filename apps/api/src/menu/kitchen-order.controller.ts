import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Patch } from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { kitchenQueue } from './kitchen-queue.service.js';
import type { NativeOrderStatus } from './native-order.types.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };

@Controller('v1/kitchen/orders')
export class KitchenOrderController {
  constructor(@Inject(MvpSecurityService) private readonly security: MvpSecurityService, @Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Get()
  async list(@Headers('authorization') authorization?: string, @Headers('x-tenant-id') tenantId?: string) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.list');
    if (!tenantId) throw new BadRequestException('Tenant is required.');
    const orders = await this.db.$queryRawUnsafe<unknown[]>(`SELECT id AS "orderId",menu_slug AS "menuSlug",customer_name AS "customerName",fulfillment,total_cents AS "totalCents",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt" FROM commerce_native_orders WHERE tenant_id=$1 AND status NOT IN ('COMPLETED','CANCELLED') ORDER BY created_at`, tenantId);
    return { orders };
  }

  @Patch(':orderId/status')
  async transition(@Headers('authorization') authorization: string | undefined, @Headers('x-tenant-id') tenantId: string | undefined, @Param('orderId') orderId: string, @Body() body: { status?: NativeOrderStatus }) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.transition');
    if (!body.status) throw new BadRequestException('Order status is required.');
    try { return kitchenQueue.transition(orderId, body.status); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid order transition.'); }
  }
}
