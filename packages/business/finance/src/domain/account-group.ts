export enum AccountGroupType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export interface AccountGroup {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountGroupType;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAccountGroupInput {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountGroupType;
  readonly createdAt: Date;
}

function required(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Invalid ${field}`);
  }

  return normalized;
}

export function createAccountGroup(
  input: CreateAccountGroupInput
): AccountGroup {
  return Object.freeze({
    id: required(input.id, 'id'),
    tenantId: required(input.tenantId, 'tenantId'),
    code: required(input.code, 'code'),
    name: required(input.name, 'name'),
    type: input.type,
    active: true,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  });
}