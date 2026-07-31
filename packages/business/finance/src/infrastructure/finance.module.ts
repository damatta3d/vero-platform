import { Module } from '@nestjs/common';

import { AccountRepository } from '../application/repositories/account.repository.js';
import { AccountGroupRepository } from '../application/repositories/account-group.repository.js';
import { PayableRepository } from '../application/repositories/payable.repository.js';

import { AccountMapper } from './prisma/mappers/account.mapper.js';
import { AccountGroupMapper } from './prisma/mappers/account-group.mapper.js';
import { PayableMapper } from './prisma/mappers/payable.mapper.js';
import { PaymentMapper } from './prisma/mappers/payment.mapper.js';

import { PrismaAccountRepository } from './prisma/repositories/prisma-account.repository.js';
import { PrismaAccountGroupRepository } from './prisma/repositories/prisma-account-group.repository.js';
import { PrismaPayableRepository } from './prisma/repositories/prisma-payable.repository.js';

import { PrismaService } from './prisma/prisma.service.js';

@Module({
  providers: [
    PrismaService,

    AccountMapper,
    AccountGroupMapper,
    PayableMapper,
    PaymentMapper,

    PrismaAccountRepository,
    PrismaAccountGroupRepository,
    PrismaPayableRepository,

    {
      provide: AccountRepository,
      useExisting: PrismaAccountRepository,
    },
    {
      provide: AccountGroupRepository,
      useExisting: PrismaAccountGroupRepository,
    },
    {
      provide: PayableRepository,
      useExisting: PrismaPayableRepository,
    },
  ],
  exports: [
    PrismaService,
    AccountRepository,
    AccountGroupRepository,
    PayableRepository,
  ],
})
export class FinanceInfrastructureModule {}