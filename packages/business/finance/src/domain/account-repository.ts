import type { Account } from '../domain/account.js';

export interface AccountFilter {
  readonly tenantId: string;
  readonly active?: boolean;
  readonly group?: string;
  readonly parentId?: string | null;
}

export interface AccountRepository {
  create(account: Account): Promise<Account>;

  update(account: Account): Promise<Account>;

  findById(
    tenantId: string,
    id: string
  ): Promise<Account | null>;

  findByCode(
    tenantId: string,
    code: string
  ): Promise<Account | null>;

  list(
    filter: AccountFilter
  ): Promise<readonly Account[]>;

  delete(
    tenantId: string,
    id: string
  ): Promise<void>;
}