import { Injectable } from '@nestjs/common';
import { Payable as PrismaPayable } from '@prisma/client';

import { Payable } from '../../../domain/entities/payable.js';
import { PayableStatus } from '../../../domain/enums/payable-status.js';
import { AccountCode } from '../../../domain/value-objects/account-code.js';
import { Competency } from '../../../domain/value-objects/competency.js';
import { DocumentNumber } from '../../../domain/value-objects/document-number.js';
import { DueDate } from '../../../domain/value-objects/due-date.js';
import { Money } from '../../../domain/value-objects/money.js';

@Injectable()
export class PayableMapper {
  toDomain(model: PrismaPayable): Payable {
    return Payable.create({
      id: model.id,
      accountCode: AccountCode.create(model.accountId),
      description: model.description,
      supplier: model.supplier,
      amount: Money.fromCents(Number(model.amountCents)),
      competency: Competency.create(model.competency),
      dueDate: DueDate.create(model.dueDate),
      documentNumber: DocumentNumber.create(model.documentNumber),
      status: model.status as PayableStatus,
    });
  }

  toPersistence(entity: Payable): PrismaPayable {
    return {
      id: entity.id.value,
      tenantId: '',
      accountId: entity.accountCode.value,
      supplier: entity.supplier,
      description: entity.description,
      amountCents: BigInt(entity.amount.cents),
      competency: entity.competency.value,
      dueDate: entity.dueDate.value,
      documentNumber: entity.documentNumber.value,
      status: entity.getStatus(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    };
  }
}