import {
  DomainValidationError,
  Entity,
  UniqueEntityId,
} from '@vero/core-domain';

import { AccountCode } from '../value-objects/account-code.js';

export interface CreateAccountProps {
  readonly id: string;
  readonly tenantId: string;
  readonly groupId: string;
  readonly code: string;
  readonly name: string;
  readonly parentId?: string | null;
  readonly acceptsPosting?: boolean;
  readonly active?: boolean;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export class Account extends Entity<UniqueEntityId> {
  readonly tenantId: UniqueEntityId;
  readonly groupId: UniqueEntityId;
  readonly code: AccountCode;
  readonly name: string;
  readonly parentId: UniqueEntityId | null;
  readonly acceptsPosting: boolean;
  readonly createdAt: Date;

  private active: boolean;
  private updatedAt: Date;

  private constructor(props: CreateAccountProps) {
    super(UniqueEntityId.from(props.id));

    this.tenantId = UniqueEntityId.from(props.tenantId);
    this.groupId = UniqueEntityId.from(props.groupId);
    this.code = AccountCode.create(props.code);
    this.name = Account.required(props.name, 'name');
    this.parentId = props.parentId ? UniqueEntityId.from(props.parentId) : null;
    this.acceptsPosting = props.acceptsPosting ?? true;
    this.active = props.active ?? true;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt ?? props.createdAt);
  }

  static create(props: CreateAccountProps): Account {
    return new Account(props);
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
        'FINANCE_ACCOUNT_FIELD_INVALID',
        { field },
      );
    }

    return normalized;
  }
}