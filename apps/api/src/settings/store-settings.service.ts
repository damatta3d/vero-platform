import { Inject, Injectable } from '@nestjs/common';

import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';
import type {
  PrismaStoreSettingsRepository,
  StoreSettingsInput
} from '@vero/infrastructure-database';
import { STORE_SETTINGS_REPOSITORY } from './store-settings.tokens.js';

function tenantFrom(access: AuthorizedAccessContext, expectedAction: string): string {
  const authorized = consumeAuthorizedAccess(access);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'settings.management'
  ) {
    throw new Error('Unauthorized store settings access');
  }
  return authorized.request.tenant.tenantId.toString();
}

@Injectable()
export class StoreSettingsService {
  constructor(
    @Inject(STORE_SETTINGS_REPOSITORY)
    private readonly repository: PrismaStoreSettingsRepository
  ) {}

  get(access: AuthorizedAccessContext) {
    return this.repository.getOrCreate(tenantFrom(access, 'settings.store.read'));
  }

  update(access: AuthorizedAccessContext, input: StoreSettingsInput) {
    return this.repository.update(tenantFrom(access, 'settings.store.write'), input);
  }
}
