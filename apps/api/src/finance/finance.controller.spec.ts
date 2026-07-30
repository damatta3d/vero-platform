import { BadRequestException } from '@nestjs/common';

import type { FinanceService } from '@vero/business-finance';
import type { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { FinanceController } from './finance.controller.js';

describe('FinanceController', () => {
  it('rejects an invalid financial entry', async () => {
    const controller = new FinanceController({} as FinanceService, {} as MvpSecurityService);
    await expect(controller.create('Bearer token', 'santo-parma', {})).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
