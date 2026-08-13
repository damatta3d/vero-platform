import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { kitchenQueue } from './kitchen-queue.service.js';
import type { NativeOrderStatus } from './native-order.types.js';

@Controller('v1/kitchen/orders')
export class KitchenOrderController {
  @Get()
  list() { return { orders: kitchenQueue.listActive() }; }

  @Patch(':orderId/status')
  transition(@Param('orderId') orderId: string, @Body() body: { status?: NativeOrderStatus }) {
    if (!body.status) throw new BadRequestException('Order status is required.');
    try { return kitchenQueue.transition(orderId, body.status); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid order transition.'); }
  }
}
