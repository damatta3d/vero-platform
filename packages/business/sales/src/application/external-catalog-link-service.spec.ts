import {
  actionRef,
  createAccessAuthorizer,
  resourceRef,
  type AuthorizedAccessContext
} from '@vero/core-access';
/* Test-only owner fixtures create the trusted security contexts exercised by this module. */
/* eslint-disable @nx/enforce-module-boundaries */
import { requireTrustedAuthenticationResult } from '../../../../core/identity/src/application/authenticator.js';
import { promoteVerifiedSubject } from '../../../../core/identity/src/internal/trusted-authentication.js';
import { createResolvedTenantContext } from '../../../../core/tenancy/src/application/resolved-tenant-context.js';
import { createTenantIdFromTrustedValue } from '../../../../core/tenancy/src/domain/tenant-id.js';

import {
  ExternalCatalogLinkService,
  type ExternalCatalogLinkRepository,
  type PersistedExternalCatalogLink
} from './external-catalog-link-service.js';

async function access(action: string): Promise<AuthorizedAccessContext> {
  const authentication = requireTrustedAuthenticationResult(
    promoteVerifiedSubject('vero', 'christian', 'human')
  );
  if (!authentication.authenticated) throw authentication.error;
  return createAccessAuthorizer({
    evaluate: () =>
      Promise.resolve({
        outcome: 'allow',
        reason: 'test',
        policyRevision: '1'
      })
  }).authorize({
    identity: authentication.context,
    tenant: createResolvedTenantContext(createTenantIdFromTrustedValue('santo-parma')),
    action: actionRef(action),
    resource: resourceRef('sales.management')
  });
}

function persisted(catalogProductId = '10000000-0000-4000-8000-000000000001') {
  const at = new Date('2026-07-29T16:30:00.000Z');
  return Object.freeze({
    tenantId: 'santo-parma',
    provider: 'ANOTA_AI',
    establishmentExternalId: 'page-1',
    kind: 'ITEM' as const,
    providerItemId: 'item-1',
    catalogProductId,
    authoredBy: 'christian',
    createdAt: at,
    updatedAt: at
  });
}

describe(ExternalCatalogLinkService.name, () => {
  it('homologates an explicit link with tenant and audit identity from authorization', async () => {
    const saved = persisted();
    const upsert = jest.fn().mockResolvedValue(saved);
    const repository = {
      upsert,
      remove: jest.fn(),
      list: jest.fn()
    } as unknown as ExternalCatalogLinkRepository;
    const at = new Date('2026-07-29T16:30:00.000Z');
    const service = new ExternalCatalogLinkService(repository, {
      now: () => at
    });

    await expect(
      service.homologate(await access('sales.catalog-link.manage'), {
        provider: 'ANOTA_AI',
        establishmentExternalId: 'page-1',
        kind: 'ITEM',
        providerItemId: 'item-1',
        catalogProductId: saved.catalogProductId
      })
    ).resolves.toEqual(saved);
    expect(upsert).toHaveBeenCalledWith(
      {
        tenantId: 'santo-parma',
        provider: 'ANOTA_AI',
        establishmentExternalId: 'page-1',
        kind: 'ITEM',
        providerItemId: 'item-1',
        catalogProductId: saved.catalogProductId
      },
      { authoredBy: 'vero:christian', at }
    );
  });

  it('lists and removes links only inside the authorized tenant scope', async () => {
    const link = persisted();
    const list = jest.fn().mockResolvedValue([link]);
    const remove = jest.fn().mockResolvedValue(true);
    const repository = {
      upsert: jest.fn(),
      remove,
      list
    } as unknown as ExternalCatalogLinkRepository;
    const service = new ExternalCatalogLinkService(repository, {
      now: () => new Date()
    });

    await expect(
      service.list(await access('sales.catalog-link.read'), {
        provider: 'ANOTA_AI',
        establishmentExternalId: 'page-1'
      })
    ).resolves.toEqual([link]);
    await expect(
      service.remove(await access('sales.catalog-link.manage'), {
        provider: 'ANOTA_AI',
        establishmentExternalId: 'page-1',
        kind: 'ITEM',
        providerItemId: 'item-1'
      })
    ).resolves.toBe(true);
    expect(list).toHaveBeenCalledWith('santo-parma', 'ANOTA_AI', 'page-1');
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'santo-parma',
        providerItemId: 'item-1'
      })
    );
  });

  it('rejects an authorization issued for another action', async () => {
    const repository = {
      upsert: jest.fn(),
      remove: jest.fn(),
      list: jest.fn()
    } as unknown as ExternalCatalogLinkRepository;
    const service = new ExternalCatalogLinkService(repository, {
      now: () => new Date()
    });

    await expect(
      service.homologate(await access('sales.read'), {
        provider: 'ANOTA_AI',
        establishmentExternalId: 'page-1',
        kind: 'MODIFIER',
        providerItemId: 'modifier-1',
        catalogProductId: '10000000-0000-4000-8000-000000000001'
      })
    ).rejects.toThrow('not authorized');
  });
});
