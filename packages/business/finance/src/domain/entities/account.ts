import { AccountCode } from '../value-objects/account-code.js';
import type { AccountGroupType } from '../enums/account-group.js';
export interface Account {
  readonly id: string;
  readonly tenantId: string;
  readonly code: AccountCode;
  readonly name: string;
  readonly group: AccountGroupType;
  readonly parentId: string | null;
  readonly acceptsPosting: boolean;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAccountInput {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly group: AccountGroupType;
  readonly parentId?: string | null;
  readonly acceptsPosting?: boolean;
  readonly createdAt: Date;
}

function required(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Invalid ${field}`);
  }

  return normalized;
}

export function createAccount(
  input: CreateAccountInput
): Account {
  return Object.freeze({
    id: required(input.id, 'id'),
    tenantId: required(input.tenantId, 'tenantId'),
    code: AccountCode.create(input.code),
    name: required(input.name, 'name'),
    group: input.group,
    parentId: input.parentId ?? null,
    acceptsPosting: input.acceptsPosting ?? true,
    active: true,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  });
}

export function deactivateAccount(
  account: Account,
  updatedAt: Date
): Account {
  return Object.freeze({
    ...account,
    active: false,
    updatedAt
  });
}

export function activateAccount(
  account: Account,
  updatedAt: Date
): Account {
  return Object.freeze({
    ...account,
    active: true,
    updatedAt
  });
}