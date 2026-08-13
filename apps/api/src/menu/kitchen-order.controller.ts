import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Patch } from '@nestjs/common';
import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { kitchenQueue } from './kitchen-queue.service.js';
import type { NativeOrderStatus } from './native-order.types.js';

@Controller('v1/kitchen/orders')
export class KitchenOrderController {
  constructor(@Inject(MvpSecurityService) private readonly security: MvpSecurityService) {}

  @Get()
  async list(@Headers('authorization') authorization?: string, @Headers('x-tenant-id') tenantId?: string) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.list');
    return { orders: kitchenQueue.listActive() };
  }

  @Patch(':orderId/status')
  async transition(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('orderId') orderId: string,
    @Body() body: { status?: NativeOrderStatus }
  ) {
    await this.security.authorize(authorization, tenantId, 'orders.kitchen.transition');
    if (!body.status) throw new BadRequestException('Order status is required.');
    try { return kitchenQueue.transition(orderId, body.status); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid order transition.'); }
  }
}
