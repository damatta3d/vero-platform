import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  type ExternalOrderInboxFilters,
  type ExternalOrderInboxRecord,
  type ExternalOrderProvider,
  type ExternalOrderStatus,
  PrismaExternalOrderInboxRepository,
  type ReceiveExternalOrderInput
} from '@vero/infrastructure-database';
import { EXTERNAL_ORDER_INBOX_REPOSITORY } from './external-order.tokens.js';

const transitions: Readonly<Record<ExternalOrderStatus, readonly ExternalOrderStatus[]>> = {
  RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

@Injectable()
export class ExternalOrderService {
  constructor(
    @Inject(EXTERNAL_ORDER_INBOX_REPOSITORY)
    private readonly repository: PrismaExternalOrderInboxRepository
  ) {}

  receive(tenantId: string, input: ReceiveExternalOrderInput): Promise<ExternalOrderInboxRecord> {
    return this.repository.receive(tenantId, input);
  }

  list(tenantId: string, filters: ExternalOrderInboxFilters): Promise<ExternalOrderInboxRecord[]> {
    return this.repository.list(tenantId, filters);
  }

  async changeStatus(
    tenantId: string,
    provider: ExternalOrderProvider,
    establishmentExternalId: string,
    externalOrderId: string,
    nextStatus: ExternalOrderStatus
  ): Promise<ExternalOrderInboxRecord> {
    const order = await this.repository.find(
      tenantId,
      provider,
      establishmentExternalId,
      externalOrderId
    );
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
    if (!transitions[order.status].includes(nextStatus)) {
      throw new BadRequestException({
        code: 'INVALID_ORDER_STATUS_TRANSITION',
        from: order.status,
        to: nextStatus
      });
    }
    if (nextStatus === 'CONFIRMED' && order.mappingStatus !== 'MAPPED') {
      throw new BadRequestException({ code: 'ORDER_CATALOG_MAPPING_REQUIRED' });
    }
    return this.repository.updateStatus(
      tenantId,
      provider,
      establishmentExternalId,
      externalOrderId,
      nextStatus,
      new Date()
    );
  }
}
