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
      fulfillment?: 'DELIVERY' | 'PICKUP';
      address?: CheckoutDraft['address'];
      items: Array<{ menuItemId: string; quantity: number; note?: string }>;
    }
  ) {
    const pricing = await priceCheckout(this.db, request);
    return {
      items: pricing.items,
      itemsTotalCents: pricing.itemsTotalCents,
      discountCents: pricing.discountCents,
      deliveryFeeCents: pricing.deliveryFeeCents,
      deliveryDistanceMeters: pricing.deliveryDistanceMeters,
      deliveryQuoteProvider: pricing.deliveryQuoteProvider,
      deliveryFeeRule: pricing.deliveryFeeRule,
      normalizedDeliveryAddress: pricing.normalizedDeliveryAddress,
      amountDueCents: pricing.totalCents,
      coupon: pricing.coupon
    };
  }

  @Post('delivery-quote')
  async deliveryQuote(
    @Body()
    request: {
      menuSlug: string;
      couponCode?: string;
      address: CheckoutDraft['address'];
      items: Array<{ menuItemId: string; quantity: number; note?: string }>;
      deliveryFeeCents?: unknown;
      totalCents?: unknown;
    }
  ) {
    if (
      !request.address?.postalCode?.trim() ||
      !request.address.street?.trim() ||
      !request.address.number?.trim() ||
      !request.address.district?.trim() ||
      !request.address.city?.trim() ||
      !request.address.stateCode?.trim() ||
      !/^\d{5}-?\d{3}$/.test(request.address.postalCode.trim()) ||
      !/^[A-Za-z]{2}$/.test(request.address.stateCode.trim())
    ) {
      throw new BadRequestException({
        code: 'INVALID_DELIVERY_ADDRESS',
        message: 'Informe CEP, rua, número, bairro, cidade e UF.'
      });
    }
    const pricing = await priceCheckout(this.db, { ...request, fulfillment: 'DELIVERY' });
    const availability = await loadStoreAvailability(this.db, pricing.tenantId);
    if (!availability.canAcceptOrders) {
      throw new ConflictException({ code: 'STORE_CLOSED', message: availability.statusMessage });
    }
    return {
      eligible: true,
      normalizedAddress: pricing.normalizedDeliveryAddress,
      distanceMeters: pricing.deliveryDistanceMeters,
      deliveryFeeCents: pricing.deliveryFeeCents,
      itemsTotalCents: pricing.itemsTotalCents,
      discountCents: pricing.discountCents,
      totalCents: pricing.totalCents,
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
      deliveryDistanceMeters: pricing.deliveryDistanceMeters,
      normalizedDeliveryAddress: pricing.normalizedDeliveryAddress,
      amountDueCents: pricing.totalCents,
      coupon: pricing.coupon
    };
  }
}
