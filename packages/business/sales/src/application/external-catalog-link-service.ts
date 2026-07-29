import { consumeAuthorizedAccess, type AuthorizedAccessContext } from '@vero/core-access';

import {
  createExternalCatalogLink,
  type ExternalCatalogLink,
  type ExternalCatalogReferenceKind
} from './external-catalog-link.js';

export interface ExternalCatalogLinkAudit {
  readonly authoredBy: string;
  readonly at: Date;
}

export interface PersistedExternalCatalogLink extends ExternalCatalogLink {
  readonly authoredBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ExternalCatalogLinkRepository {
  upsert(
    link: ExternalCatalogLink,
    audit: ExternalCatalogLinkAudit
  ): Promise<PersistedExternalCatalogLink>;
  remove(link: ExternalCatalogLink): Promise<boolean>;
  list(
    tenantId: string,
    provider: string,
    establishmentExternalId: string
  ): Promise<readonly PersistedExternalCatalogLink[]>;
}

export interface HomologateExternalCatalogLinkInput {
  readonly provider: string;
  readonly establishmentExternalId: string;
  readonly kind: ExternalCatalogReferenceKind;
  readonly providerItemId: string;
  readonly catalogProductId: string;
}

export interface ExternalCatalogLinkScope {
  readonly provider: string;
  readonly establishmentExternalId: string;
}

export interface RemoveExternalCatalogLinkInput extends ExternalCatalogLinkScope {
  readonly kind: ExternalCatalogReferenceKind;
  readonly providerItemId: string;
}

export interface ExternalCatalogLinkClock {
  now(): Date;
}

export class ExternalCatalogLinkService {
  constructor(
    private readonly repository: ExternalCatalogLinkRepository,
    private readonly clock: ExternalCatalogLinkClock
  ) {}

  async homologate(
    access: AuthorizedAccessContext,
    input: HomologateExternalCatalogLinkInput
  ): Promise<PersistedExternalCatalogLink> {
    const authorization = linkAuthorization(access, 'sales.catalog-link.manage');
    const link = createExternalCatalogLink({
      tenantId: authorization.tenantId,
      ...input
    });
    return this.repository.upsert(link, {
      authoredBy: authorization.authoredBy,
      at: this.clock.now()
    });
  }

  async remove(
    access: AuthorizedAccessContext,
    input: RemoveExternalCatalogLinkInput
  ): Promise<boolean> {
    const authorization = linkAuthorization(access, 'sales.catalog-link.manage');
    return this.repository.remove(
      createExternalCatalogLink({
        tenantId: authorization.tenantId,
        ...input,
        catalogProductId: '00000000-0000-4000-8000-000000000000'
      })
    );
  }

  async list(
    access: AuthorizedAccessContext,
    scope: ExternalCatalogLinkScope
  ): Promise<readonly PersistedExternalCatalogLink[]> {
    const authorization = linkAuthorization(access, 'sales.catalog-link.read');
    const validated = createExternalCatalogLink({
      tenantId: authorization.tenantId,
      ...scope,
      kind: 'ITEM',
      providerItemId: 'scope-validation',
      catalogProductId: '00000000-0000-4000-8000-000000000000'
    });
    return this.repository.list(
      authorization.tenantId,
      validated.provider,
      validated.establishmentExternalId
    );
  }
}

function linkAuthorization(
  access: AuthorizedAccessContext,
  expectedAction: string
): Readonly<{ tenantId: string; authoredBy: string }> {
  const authorized = consumeAuthorizedAccess(access);
  if (
    authorized.request.action.value !== expectedAction ||
    authorized.request.resource.value !== 'sales.management'
  ) {
    throw new Error('External catalog link operation is not authorized.');
  }
  return Object.freeze({
    tenantId: authorized.request.tenant.tenantId.toString(),
    authoredBy: authorized.request.identity.principal.id.toString()
  });
}
