import {
  consumeAuthorizedAccess,
  type AuthorizedAccessContext
} from '@vero/core-access';

import {
  activateAccount,
  createAccount,
  deactivateAccount,
  type Account
} from '../domain/entities/account.js';
import type { AccountGroupType } from '../domain/enums/account-group.js';
import type { AccountRepository } from './account-repository.js';

export interface AccountIdGenerator {
  generate(): string;
}

export interface AccountClock {
  now(): Date;
}

export interface CreateAccountCommand {
  readonly code: string;
  readonly name: string;
  readonly group: AccountGroupType;
  readonly parentId?: string | null;
  readonly acceptsPosting?: boolean;
}

function authorize(
  context: AuthorizedAccessContext,
  expectedAction: string
): { tenantId: string } {
  const authorized = consumeAuthorizedAccess(context);

  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'finance.management'
  ) {
    throw new Error('Finance authorization denied');
  }

  return {
    tenantId: authorized.request.tenant.tenantId.toString()
  };
}

export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly ids: AccountIdGenerator,
    private readonly clock: AccountClock
  ) {}

  async create(
    access: AuthorizedAccessContext,
    input: CreateAccountCommand
  ): Promise<Account> {
    const { tenantId } = authorize(access, 'finance.create');

    const existing = await this.repository.findByCode(tenantId, input.code);

    if (existing) {
      throw new Error('Account already exists');
    }

    return this.repository.create(
      createAccount({
        id: this.ids.generate(),
        tenantId,
        code: input.code,
        name: input.name,
        group: input.group,
        parentId: input.parentId ?? null,
        acceptsPosting: input.acceptsPosting ?? true,
        createdAt: this.clock.now()
      })
    );
  }

  async activate(
    access: AuthorizedAccessContext,
    id: string
  ): Promise<Account> {
    const { tenantId } = authorize(access, 'finance.update');
    const account = await this.getRequired(tenantId, id);

    return this.repository.update(
      activateAccount(account, this.clock.now())
    );
  }

  async deactivate(
    access: AuthorizedAccessContext,
    id: string
  ): Promise<Account> {
    const { tenantId } = authorize(access, 'finance.update');
    const account = await this.getRequired(tenantId, id);

    return this.repository.update(
      deactivateAccount(account, this.clock.now())
    );
  }

  list(
    access: AuthorizedAccessContext
  ): Promise<readonly Account[]> {
    const { tenantId } = authorize(access, 'finance.read');

    return this.repository.list({
      tenantId
    });
  }

  private async getRequired(
    tenantId: string,
    id: string
  ): Promise<Account> {
    const account = await this.repository.findById(tenantId, id);

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }
}