import { Injectable } from '@nestjs/common';

import { AccountRepository } from '../../../application/repositories/account.repository.js';
import { Account } from '../../../domain/entities/account.js';
import { AccountMapper } from '../mappers/account.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: AccountMapper,
  ) {}

  async save(account: Account): Promise<void> {
    const data = this.mapper.toPersistence(account);

    await this.prisma.account.upsert({
      where: {
        tenantId_code: {
          tenantId: data.tenantId,
          code: data.code,
        },
      },
      create: data,
      update: {
        name: data.name,
        group: data.group,
        parentId: data.parentId,
        acceptsPosting: data.acceptsPosting,
        active: data.active,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    });
  }

  async findById(id: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    return account ? this.mapper.toDomain(account) : null;
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
    });

    return account ? this.mapper.toDomain(account) : null;
  }

  async findAll(tenantId: string): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return accounts.map(account => this.mapper.toDomain(account));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({
      where: {
        id,
      },
    });
  }
}