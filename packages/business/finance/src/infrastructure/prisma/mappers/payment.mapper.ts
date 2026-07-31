import { Injectable } from '@nestjs/common';
import { Payment as PrismaPayment } from '@prisma/client';

import { Payment } from '../../../domain/entities/payment.js';
import { Money } from '../../../domain/value-objects/money.js';

@Injectable()
export class PaymentMapper {
  toDomain(model: PrismaPayment): Payment {
    return Payment.create({
      id: model.id,
      tenantId: model.tenantId,
      payableId: model.payableId,
      amount: Money.fromCents(Number(model.amountCents)),
      paymentDate: model.paymentDate,
      method: model.method,
      reference: model.reference ?? undefined,
      notes: model.notes ?? undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  toPersistence(entity: Payment): PrismaPayment {
    return {
      id: entity.id.value,
      tenantId: entity.tenantId.value,
      payableId: entity.payableId.value,
      amountCents: BigInt(entity.amount.cents),
      paymentDate: entity.paymentDate,
      method: entity.method,
      reference: entity.reference ?? null,
      notes: entity.notes ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.lastUpdatedAt,
      createdBy: null,
      updatedBy: null,
    } as PrismaPayment;
  }
}