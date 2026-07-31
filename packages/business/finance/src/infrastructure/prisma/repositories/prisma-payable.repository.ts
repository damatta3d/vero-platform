import { Injectable } from '@nestjs/common';

import { PayableRepository } from '../../../application/repositories/payable.repository.js';
import { Payable } from '../../../domain/entities/payable.js';
import { PayableMapper } from '../mappers/payable.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaPayableRepository implements PayableRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: PayableMapper,
  ) {}

  async save(payable: Payable): Promise<void> {
    const data = this.mapper.toPersistence(payable);

    await this.prisma.payable.upsert({
      where: {
        id: data.id,
      },
      create: data,
      update: {
        accountId: data.accountId,
        supplier: data.supplier,
        description: data.description,
        amountCents: data.amountCents,
        competency: data.competency,
        dueDate: data.dueDate,
        documentNumber: data.documentNumber,
        status: data.status,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      },
    });
  }

  async findById(id: string): Promise<Payable | null> {
    const payable = await this.prisma.payable.findUnique({
      where: {
        id,
      },
    });

    return payable ? this.mapper.toDomain(payable) : null;
  }

  async findByDocumentNumber(
    tenantId: string,
    supplier: string,
    documentNumber: string,
  ): Promise<Payable | null> {
    const payable = await this.prisma.payable.findUnique({
      where: {
        tenantId_supplier_documentNumber: {
          tenantId,
          supplier,
          documentNumber,
        },
      },
    });

    return payable ? this.mapper.toDomain(payable) : null;
  }

  async findAll(tenantId: string): Promise<Payable[]> {
    const payables = await this.prisma.payable.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return payables.map(payable => this.mapper.toDomain(payable));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.payable.delete({
      where: {
        id,
      },
    });
  }
}