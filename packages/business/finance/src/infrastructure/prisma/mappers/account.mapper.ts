import { Injectable } from '@nestjs/common';
import { Account as PrismaAccount } from '@prisma/client';

import { Account } from '../../../domain/entities/account.js';

@Injectable()
export class AccountMapper {
  toDomain(model: PrismaAccount): Account {
    return Account.create({
      id: model.id,
      tenantId: model.tenantId,
      code: model.code,
      name: model.name,
      group: model.group,
      parentId: model.parentId,
      acceptsPosting: model.acceptsPosting,
      active: model.active,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  toPersistence(entity: Account): PrismaAccount {
    return {
      id: entity.id.value,
      tenantId: entity.tenantId.value,
      code: entity.code.value,
      name: entity.name,
      group: entity.group,
      parentId: entity.parentId?.value ?? null,
      acceptsPosting: entity.acceptsPosting,
      active: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.lastUpdatedAt,
      createdBy: null,
      updatedBy: null,
    } as PrismaAccount;
  }
}