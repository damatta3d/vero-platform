import { UnauthorizedException } from '@nestjs/common';

import { consumeAuthorizedAccess } from '@vero/core-access';
import { parseConfiguration } from '@vero/core-configuration';
import { MvpSecurityService } from './mvp-security.service.js';

describe(MvpSecurityService.name, () => {
  const apiKey = 'santo-parma-integration-key-123456';
  const service = new MvpSecurityService(
    parseConfiguration({
      VERO_ENVIRONMENT: 'test',
      VERO_POSTGRES_ENABLED: 'true',
      VERO_DATABASE_URL: 'postgresql://vero:vero@localhost:5432/vero',
      VERO_MVP_ENABLED: 'true',
      VERO_MVP_API_KEY: apiKey,
      VERO_MVP_TENANT_ID: 'santo-parma'
    })
  );

  it('creates a trusted single-use access context for the configured tenant', async () => {
    const context = await service.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'catalog.product.read'
    );
    const trusted = consumeAuthorizedAccess(context);
    expect(trusted.request.tenant.tenantId.toString()).toBe('santo-parma');
    expect(trusted.request.identity.principal.type).toBe('human');
  });

  it('creates inventory access only on the inventory resource', async () => {
    const context = await service.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'inventory.position.read'
    );
    const trusted = consumeAuthorizedAccess(context);
    expect(trusted.request.resource.value).toBe('inventory.management');
  });

  it('creates sales access only on the sales resource', async () => {
    const context = await service.authorize(`Bearer ${apiKey}`, 'santo-parma', 'sales.create');
    const trusted = consumeAuthorizedAccess(context);
    expect(trusted.request.resource.value).toBe('sales.management');
  });

  it('creates production access only on the production resource', async () => {
    const context = await service.authorize(`Bearer ${apiKey}`, 'santo-parma', 'production.create');
    const trusted = consumeAuthorizedAccess(context);
    expect(trusted.request.resource.value).toBe('production.management');
  });

  it('creates store settings access only on the settings resource', async () => {
    const context = await service.authorize(
      `Bearer ${apiKey}`,
      'santo-parma',
      'settings.store.write'
    );
    const trusted = consumeAuthorizedAccess(context);
    expect(trusted.request.resource.value).toBe('settings.management');
    expect(trusted.request.action.value).toBe('settings.store.write');
  });

  it.each([
    ['Bearer wrong-key-that-is-long-enough', 'santo-parma'],
    [`Bearer ${apiKey}`, 'another-tenant'],
    [undefined, 'santo-parma']
  ])('denies invalid credentials or tenant %#', async (authorization, tenant) => {
    await expect(service.authorize(authorization, tenant, 'catalog.product.read')).rejects.toThrow(
      UnauthorizedException
    );
  });
});
