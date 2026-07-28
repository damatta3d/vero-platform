import { timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import {
  actionRef,
  createAccessAuthorizer,
  resourceRef,
  type AuthorizedAccessContext
} from '@vero/core-access';
import type { AppConfig } from '@vero/core-configuration';
import {
  AuthenticationEvidence,
  createAuthenticator,
  requireTrustedAuthenticationResult
} from '@vero/core-identity';
import { createTenantResolver, TenantCandidate } from '@vero/core-tenancy';
import { APP_CONFIG } from '../app.tokens.js';

function equalSecret(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.byteLength === expectedBytes.byteLength &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

@Injectable()
export class MvpSecurityService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async authorize(
    authorizationHeader: string | undefined,
    tenantHeader: string | undefined,
    action: string
  ): Promise<AuthorizedAccessContext> {
    const resource = action.startsWith('inventory.')
      ? 'inventory.management'
      : action.startsWith('sales.')
        ? 'sales.management'
        : 'catalog.management';
    const token = authorizationHeader?.startsWith('Bearer ')
      ? authorizationHeader.slice('Bearer '.length)
      : '';
    try {
      const authentication = requireTrustedAuthenticationResult(
        await createAuthenticator({
          verify: (evidence) =>
            Promise.resolve(
              typeof evidence === 'string' && equalSecret(evidence, this.config.mvp.apiKey)
                ? {
                    authority: 'vero-mvp-api-key',
                    subject: 'santo-parma-owner',
                    type: 'human' as const
                  }
                : undefined
            )
        }).authenticate(AuthenticationEvidence.fromUntrusted(token))
      );
      if (!authentication.authenticated) throw authentication.error;

      const resolution = await createTenantResolver({
        findTenantId: (candidate) =>
          Promise.resolve(
            candidate === this.config.mvp.tenantId ? this.config.mvp.tenantId : undefined
          )
      }).resolve(TenantCandidate.fromUntrusted(tenantHeader));
      if (!resolution.resolved) throw resolution.error;

      return createAccessAuthorizer({
        evaluate: (request) =>
          Promise.resolve({
            outcome:
              (request.action.value.startsWith('catalog.') &&
                request.resource.value === 'catalog.management') ||
              (request.action.value.startsWith('inventory.') &&
                request.resource.value === 'inventory.management') ||
              (request.action.value.startsWith('sales.') &&
                request.resource.value === 'sales.management')
                ? 'allow'
                : 'deny',
            reason: 'santo-parma-mvp-owner',
            policyRevision: 'mvp-essential-v1'
          })
      }).authorize({
        identity: authentication.context,
        tenant: resolution.context,
        action: actionRef(action),
        resource: resourceRef(resource)
      });
    } catch {
      throw new UnauthorizedException();
    }
  }
}
