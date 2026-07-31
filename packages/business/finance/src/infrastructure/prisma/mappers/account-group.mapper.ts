import { Injectable } from '@nestjs/common';
import { AccountGroup as PrismaAccountGroup } from '@prisma/client';

import { AccountGroup } from '../../../domain/entities/account-group.js';

@Injectable()
export class AccountGroupMapper {
  toDomain(model: PrismaAccountGroup): AccountGroup {
    return AccountGroup.create({
      id: model.id,
      tenantId: model.tenantId,
      code: model.code,
      name: model.name,
      type: model.type,
      active: model.active,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  toPersistence(entity: AccountGroup): PrismaAccountGroup {
    return {
      id: entity.id.value,
      tenantId: entity.tenantId.value,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      active: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.lastUpdatedAt,
      createdBy: null,
      updatedBy: null,
    } as PrismaAccountGroup;
  }
}