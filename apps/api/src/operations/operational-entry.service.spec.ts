import { NotFoundException } from '@nestjs/common';

import { parseConfiguration } from '@vero/core-configuration';
import type { PrismaOperationalEntryRepository } from '@vero/infrastructure-database';

import { MvpSecurityService } from '../catalog/mvp-security.service.js';
import { OperationalEntryService } from './operational-entry.service.js';

describe(OperationalEntryService.name, () => {
  const apiKey = 'santo-parma-integration-key-123456';
  const security = new MvpSecurityService(
    parseConfiguration({
      VERO_ENVIRONMENT: 'test',
      VERO_POSTGRES_ENABLED: 'true',
      VERO_DATABASE_URL: 'postgresql://vero:vero@localhost:5432/vero',
      VERO_MVP_ENABLED: 'true',
      VERO_MVP_API_KEY: apiKey,
      VERO_MVP_TENANT_ID: 'santo-parma'
    })
  );

  const repository = {
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    summarize: jest.fn()
  };

  const service = new OperationalEntryService(
    repository as unknown as PrismaOperationalEntryRepository
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an operational entry for the authorized tenant', async () => {
    const occurredAt = new Date('2026-07-31T12:00:00.000Z');
    const competenceDate = new Date('2026-07-31T12:00:00.000Z');
    repository.create.mockResolvedValue({
      id: '0f579813-1634-4d9a-8070-2debd24028b4',
      tenantId: 'santo-parma',
      type: 'INCOME',
      status: 'PAID',
      channel: 'IFOOD',
      category: 'Faturamento iFood',
      description: 'Fechamento diário',
      counterparty: null,
      paymentMethod: null,
      amountCents: 125000,
      orderCount: 14,
      occurredAt,
      competenceDate,
      notes: null,
      createdAt: occurredAt,
      updatedAt: occurredAt
    });
    const access = await security.authorize(`Bearer ${apiKey}`, 'santo-parma', 'finance.create');

    const result = await service.create(access, {
      type: 'INCOME',
      status: 'PAID',
      channel: 'IFOOD',
      category: 'Faturamento iFood',
      description: 'Fechamento diário',
      counterparty: null,
      paymentMethod: null,
      amountCents: 125000,
      orderCount: 14,
      occurredAt,
      competenceDate,
      notes: null
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'santo-parma',
        type: 'INCOME',
        amountCents: 125000,
        orderCount: 14,
        id: expect.any(String),
        now: expect.any(Date)
      })
    );
    expect(result.tenantId).toBe('santo-parma');
  });

  it('updates an operational entry only inside the authorized tenant', async () => {
    const entryId = '0f579813-1634-4d9a-8070-2debd24028b4';
    const occurredAt = new Date('2026-07-31T14:00:00.000Z');
    const competenceDate = new Date('2026-07-31T12:00:00.000Z');
    repository.update.mockResolvedValue({
      id: entryId,
      tenantId: 'santo-parma',
      type: 'INCOME',
      status: 'PAID',
      channel: 'ANOTA_AI',
      category: 'Faturamento Anota AI',
      description: 'Fechamento corrigido',
      counterparty: null,
      paymentMethod: 'PIX',
      amountCents: 135000,
      orderCount: 16,
      occurredAt,
      competenceDate,
      notes: 'Valor conferido',
      createdAt: competenceDate,
      updatedAt: occurredAt
    });
    const access = await security.authorize(`Bearer ${apiKey}`, 'santo-parma', 'finance.update');

    const result = await service.update(access, entryId, {
      type: 'INCOME',
      status: 'PAID',
      channel: 'ANOTA_AI',
      category: 'Faturamento Anota AI',
      description: 'Fechamento corrigido',
      counterparty: null,
      paymentMethod: 'PIX',
      amountCents: 135000,
      orderCount: 16,
      occurredAt,
      competenceDate,
      notes: 'Valor conferido'
    });

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: entryId,
        tenantId: 'santo-parma',
        amountCents: 135000,
        orderCount: 16,
        now: expect.any(Date)
      })
    );
    expect(result.description).toBe('Fechamento corrigido');
  });

  it('returns not found when the entry does not belong to the authorized tenant', async () => {
    repository.update.mockResolvedValue(undefined);
    const access = await security.authorize(`Bearer ${apiKey}`, 'santo-parma', 'finance.update');

    await expect(
      service.update(access, '0f579813-1634-4d9a-8070-2debd24028b4', {
        type: 'EXPENSE',
        status: 'PAID',
        channel: null,
        category: 'Despesa',
        description: 'Conta operacional',
        counterparty: null,
        paymentMethod: 'PIX',
        amountCents: 1000,
        orderCount: 0,
        occurredAt: new Date('2026-07-31T12:00:00.000Z'),
        competenceDate: new Date('2026-07-31T12:00:00.000Z'),
        notes: null
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists entries only for the authorized tenant', async () => {
    repository.list.mockResolvedValue([]);
    const access = await security.authorize(`Bearer ${apiKey}`, 'santo-parma', 'finance.read');
    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');

    await expect(service.list(access, from, to, 100)).resolves.toEqual([]);
    expect(repository.list).toHaveBeenCalledWith('santo-parma', from, to, 100);
  });

  it('returns the financial summary for the authorized tenant', async () => {
    const summary = {
      incomeCents: 300000,
      outflowCents: 120000,
      pendingCents: 20000,
      balanceCents: 180000,
      orderCount: 32
    };
    repository.summarize.mockResolvedValue(summary);
    const access = await security.authorize(`Bearer ${apiKey}`, 'santo-parma', 'finance.read');
    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');

    await expect(service.summarize(access, from, to)).resolves.toEqual(summary);
    expect(repository.summarize).toHaveBeenCalledWith('santo-parma', from, to);
  });

  it('rejects an access context authorized for a different action', async () => {
    const access = await security.authorize(`Bearer ${apiKey}`, 'santo-parma', 'finance.read');

    expect(() =>
      service.create(access, {
        type: 'EXPENSE',
        status: 'PAID',
        channel: null,
        category: 'Despesa',
        description: 'Conta operacional',
        counterparty: null,
        paymentMethod: 'PIX',
        amountCents: 1000,
        orderCount: 0,
        occurredAt: new Date('2026-07-31T12:00:00.000Z'),
        competenceDate: new Date('2026-07-31T12:00:00.000Z'),
        notes: null
      })
    ).toThrow('Unauthorized operational access');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
