import { Injectable } from '@nestjs/common';

import { AccountGroupRepository } from '../../../application/repositories/account-group.repository.js';
import { AccountGroup } from '../../../domain/entities/account-group.js';
import { AccountGroupMapper } from '../mappers/account-group.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaAccountGroupRepository implements AccountGroupRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: AccountGroupMapper,
  ) {}

  async save(accountGroup: AccountGroup): Promise<void> {
    const data = this.mapper.toPersistence(accountGroup);

    await this.prisma.accountGroup.upsert({
      where: {
        tenantId_code: {
          tenantId: data.tenantId,
          code: data.code,
        },
      },
      create: data,
      update: {
        name: data.name,
        type: data.type,
        active: data.active,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    });
  }

  async findById(id: string): Promise<AccountGroup | null> {
    const accountGroup = await this.prisma.accountGroup.findUnique({
      where: { id },
    });

    return accountGroup ? this.mapper.toDomain(accountGroup) : null;
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<AccountGroup | null> {
    const accountGroup = await this.prisma.accountGroup.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
    });

    return accountGroup ? this.mapper.toDomain(accountGroup) : null;
  }

  async findAll(tenantId: string): Promise<AccountGroup[]> {
    const accountGroups = await this.prisma.accountGroup.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return accountGroups.map(group => this.mapper.toDomain(group));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.accountGroup.delete({
      where: {
        id,
      },
    });
  }
}