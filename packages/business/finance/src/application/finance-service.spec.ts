import { actionRef, createAccessAuthorizer, resourceRef } from '@vero/core-access';
import {
  AuthenticationEvidence,
  createAuthenticator,
  requireTrustedAuthenticationResult
} from '@vero/core-identity';
import { TenantCandidate, createTenantResolver } from '@vero/core-tenancy';

import type { FinancialEntry } from '../domain/finance-model.js';
import type { FinanceRepository } from './finance-repository.js';
import { FinanceService } from './finance-service.js';

async function access(action: string) {
  const authentication = requireTrustedAuthenticationResult(
    await createAuthenticator({
      verify: () =>
        Promise.resolve({
          authority: 'test',
          subject: 'owner',
          type: 'human' as const
        })
    }).authenticate(AuthenticationEvidence.fromUntrusted('ok'))
  );

  if (!authentication.authenticated) throw authentication.error;

  const tenant = await createTenantResolver({
    findTenantId: () => Promise.resolve('santo-parma')
  }).resolve(TenantCandidate.fromUntrusted('santo-parma'));

  if (!tenant.resolved) throw tenant.error;

  return createAccessAuthorizer({
    evaluate: () =>
      Promise.resolve({
        outcome: 'allow' as const,
        reason: 'test',
        policyRevision: '1'
      })
  }).authorize({
    identity: authentication.context,
    tenant: tenant.context,
    action: actionRef(action),
    resource: resourceRef('finance.management')
  });
}

describe('FinanceService', () => {
  it('returns the same entry for an idempotent request', async () => {
    const entries = new Map<string, FinancialEntry>();

    const repository: FinanceRepository = {
      create(entry) {
        entries.set(entry.idempotencyKey, entry);
        return Promise.resolve(entry);
      },

      findById(_tenantId, id) {
        const found = [...entries.values()].find((entry) => entry.id === id) ?? null;

        return Promise.resolve(found);
      },

      findByIdempotencyKey(_tenantId, key) {
        return Promise.resolve(entries.get(key) ?? null);
      },

      list() {
        return Promise.resolve([...entries.values()]);
      },

      update(entry) {
        entries.set(entry.idempotencyKey, entry);
        return Promise.resolve(entry);
      }
    };

    const service = new FinanceService(
      repository,
      {
        generate: () => '11111111-1111-4111-8111-111111111111'
      },
      {
        now: () => new Date('2026-07-30T12:00:00Z')
      }
    );

    const input = {
      idempotencyKey: 'rent-2026-08',
      type: 'PAYABLE' as const,
      description: 'Aluguel',
      category: 'Ocupacao',
      amountCents: 160000,
      dueAt: new Date('2026-08-01T12:00:00Z')
    };

    const first = await service.create(await access('finance.create'), input);
    const second = await service.create(await access('finance.create'), input);

    expect(second.id).toBe(first.id);
    expect(entries.size).toBe(1);
  });
});
