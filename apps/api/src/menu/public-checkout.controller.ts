import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  Post
} from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import type { CheckoutDraft } from './checkout.types.js';
import { validateCheckoutDraft } from './checkout.validation.js';
import { priceCheckout } from './checkout-pricing.js';
import { loadStoreAvailability } from './store-availability.repository.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };
@Controller('v1/checkout')
export class PublicCheckoutController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Post('price')
  async price(
    @Body()
    request: {
      menuSlug: string;
      couponCode?: string;
      items: Array<{ menuItemId: string; quantity: number; note?: string }>;
    }
  ) {
    const pricing = await priceCheckout(this.db, request);
    return {
      items: pricing.items,
      itemsTotalCents: pricing.itemsTotalCents,
      discountCents: pricing.discountCents,
      deliveryFeeCents: pricing.deliveryFeeCents,
      amountDueCents: pricing.totalCents,
      coupon: pricing.coupon
    };
  }

  @Post('validate')
  async validate(@Body() draft: CheckoutDraft) {
    const fields = validateCheckoutDraft(draft);
    if (fields.length)
      throw new BadRequestException({ message: 'Revise os dados do pedido.', fields });
    const pricing = await priceCheckout(this.db, draft);
    const availability = await loadStoreAvailability(this.db, pricing.tenantId);
    if (!availability.canAcceptOrders) {
      throw new ConflictException({ code: 'STORE_CLOSED', message: availability.statusMessage });
    }
    return {
      valid: true,
      menuSlug: draft.menuSlug,
      fulfillment: draft.fulfillment,
      customer: draft.customer,
      address: draft.fulfillment === 'DELIVERY' ? draft.address : null,
      orderNote: draft.orderNote?.trim() || null,
      items: pricing.items,
      itemsTotalCents: pricing.itemsTotalCents,
      discountCents: pricing.discountCents,
      deliveryFeeCents: pricing.deliveryFeeCents,
      amountDueCents: pricing.totalCents,
      coupon: pricing.coupon
    };
  }
}
