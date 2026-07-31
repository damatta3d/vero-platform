import {
  DomainValidationError,
  Entity,
  UniqueEntityId,
} from '@vero/core-domain';

import type { AccountGroupType } from '../enums/account-group.js';

export interface CreateAccountGroupProps {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountGroupType;
  readonly active?: boolean;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export class AccountGroup extends Entity<UniqueEntityId> {
  readonly tenantId: UniqueEntityId;
  readonly code: string;
  readonly name: string;
  readonly type: AccountGroupType;
  readonly createdAt: Date;

  private active: boolean;
  private updatedAt: Date;

  private constructor(props: CreateAccountGroupProps) {
    super(UniqueEntityId.from(props.id));

    this.tenantId = UniqueEntityId.from(props.tenantId);
    this.code = AccountGroup.required(props.code, 'code');
    this.name = AccountGroup.required(props.name, 'name');
    this.type = props.type;

    this.active = props.active ?? true;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt ?? props.createdAt);
  }

  static create(props: CreateAccountGroupProps): AccountGroup {
    return new AccountGroup(props);
  }

  get isActive(): boolean {
    return this.active;
  }

  get lastUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  activate(updatedAt: Date = new Date()): void {
    this.active = true;
    this.updatedAt = new Date(updatedAt);
  }

  deactivate(updatedAt: Date = new Date()): void {
    this.active = false;
    this.updatedAt = new Date(updatedAt);
  }

  private static required(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new DomainValidationError(
        `Invalid ${field}`,
        'FINANCE_ACCOUNT_GROUP_FIELD_INVALID',
        { field },
      );
    }

    return normalized;
  }
}