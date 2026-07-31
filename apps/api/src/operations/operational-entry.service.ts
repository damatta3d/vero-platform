import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';

import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import {
  PrismaOperationalEntryRepository,
  type OperationalEntryChannel,
  type OperationalEntryStatus,
  type OperationalEntryType
} from '@vero/infrastructure-database';
import { OPERATIONAL_ENTRY_REPOSITORY } from './operational-entry.tokens.js';

export interface CreateOperationalEntryRequest {
  readonly type: OperationalEntryType;
  readonly status: OperationalEntryStatus;
  readonly channel: OperationalEntryChannel | null;
  readonly category: string;
  readonly description: string;
  readonly counterparty: string | null;
  readonly paymentMethod: string | null;
  readonly amountCents: number;
  readonly orderCount: number;
  readonly occurredAt: Date;
  readonly competenceDate: Date;
  readonly notes: string | null;
}

function tenantFrom(access: AuthorizedAccessContext, expectedAction: string): string {
  const authorized = consumeAuthorizedAccess(access);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'finance.operations'
  ) {
    throw new Error('Unauthorized operational access');
  }
  return authorized.request.tenant.tenantId.toString();
}

@Injectable()
export class OperationalEntryService {
  constructor(
    @Inject(OPERATIONAL_ENTRY_REPOSITORY)
    private readonly repository: PrismaOperationalEntryRepository
  ) {}

  create(access: AuthorizedAccessContext, input: CreateOperationalEntryRequest) {
    return this.repository.create({
      ...input,
      id: randomUUID(),
      tenantId: tenantFrom(access, 'finance.create'),
      now: new Date()
    });
  }

  list(access: AuthorizedAccessContext, from: Date, to: Date, limit: number) {
    return this.repository.list(tenantFrom(access, 'finance.read'), from, to, limit);
  }

  summarize(access: AuthorizedAccessContext, from: Date, to: Date) {
    return this.repository.summarize(tenantFrom(access, 'finance.read'), from, to);
  }
}
