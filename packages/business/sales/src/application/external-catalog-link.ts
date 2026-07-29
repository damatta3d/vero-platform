import type { ExternalOrder } from './external-order.js';

export type ExternalCatalogReferenceKind = 'ITEM' | 'MODIFIER';
export type ExternalCatalogLinkErrorCode =
  | 'INVALID_LINK'
  | 'DUPLICATE_LINK'
  | 'SCOPE_MISMATCH';

export interface ExternalCatalogLink {
  readonly tenantId: string;
  readonly provider: string;
  readonly establishmentExternalId: string;
  readonly kind: ExternalCatalogReferenceKind;
  readonly providerItemId: string;
  readonly catalogProductId: string;
}

export interface ResolvedExternalCatalogReference {
  readonly kind: ExternalCatalogReferenceKind;
  readonly providerItemId: string;
  readonly catalogProductId: string;
}

export interface UnresolvedExternalCatalogReference {
  readonly kind: ExternalCatalogReferenceKind;
  readonly providerItemId: string;
}

export interface ExternalOrderCatalogResolution {
  readonly tenantId: string;
  readonly ready: boolean;
  readonly resolved: readonly ResolvedExternalCatalogReference[];
  readonly unresolved: readonly UnresolvedExternalCatalogReference[];
}

export class ExternalCatalogLinkError extends Error {
  constructor(
    readonly code: ExternalCatalogLinkErrorCode,
    readonly field: string
  ) {
    super(`External catalog link is invalid: ${field}.`);
    this.name = 'ExternalCatalogLinkError';
  }
}

export function resolveExternalOrderCatalog(
  tenantIdValue: string,
  order: ExternalOrder,
  links: readonly ExternalCatalogLink[]
): ExternalOrderCatalogResolution {
  const tenantId = requiredText(tenantIdValue, 'tenantId');
  const provider = requiredText(order.identity.provider, 'order.identity.provider');
  const establishmentExternalId = requiredText(
    order.identity.establishmentExternalId,
    'order.identity.establishmentExternalId'
  );
  const linkByReference = new Map<string, ExternalCatalogLink>();

  for (const [index, candidate] of links.entries()) {
    const link = validateLink(candidate, index);
    if (
      link.tenantId !== tenantId ||
      link.provider !== provider ||
      link.establishmentExternalId !== establishmentExternalId
    ) {
      fail('SCOPE_MISMATCH', `links[${index}]`);
    }
    const key = referenceKey(link.kind, link.providerItemId);
    if (linkByReference.has(key)) fail('DUPLICATE_LINK', `links[${index}]`);
    linkByReference.set(key, link);
  }

  const references = collectOrderReferences(order);
  const resolved: ResolvedExternalCatalogReference[] = [];
  const unresolved: UnresolvedExternalCatalogReference[] = [];

  for (const reference of references) {
    const link = linkByReference.get(referenceKey(reference.kind, reference.providerItemId));
    if (link === undefined) {
      unresolved.push(Object.freeze(reference));
      continue;
    }
    resolved.push(
      Object.freeze({
        ...reference,
        catalogProductId: link.catalogProductId
      })
    );
  }

  return Object.freeze({
    tenantId,
    ready: unresolved.length === 0,
    resolved: Object.freeze(resolved),
    unresolved: Object.freeze(unresolved)
  });
}

function collectOrderReferences(
  order: ExternalOrder
): readonly UnresolvedExternalCatalogReference[] {
  const references = new Map<string, UnresolvedExternalCatalogReference>();

  for (const item of order.items) {
    addReference(references, 'ITEM', item.providerItemId);
    for (const modifier of item.modifiers) {
      addReference(references, 'MODIFIER', modifier.providerItemId);
    }
  }

  return Object.freeze([...references.values()]);
}

function addReference(
  references: Map<string, UnresolvedExternalCatalogReference>,
  kind: ExternalCatalogReferenceKind,
  providerItemIdValue: string
): void {
  const providerItemId = requiredText(providerItemIdValue, 'providerItemId');
  const key = referenceKey(kind, providerItemId);
  if (!references.has(key)) {
    references.set(key, Object.freeze({ kind, providerItemId }));
  }
}

function validateLink(value: ExternalCatalogLink, index: number): ExternalCatalogLink {
  const field = `links[${index}]`;
  if (value.kind !== 'ITEM' && value.kind !== 'MODIFIER') {
    fail('INVALID_LINK', `${field}.kind`);
  }
  return Object.freeze({
    tenantId: requiredText(value.tenantId, `${field}.tenantId`),
    provider: requiredText(value.provider, `${field}.provider`),
    establishmentExternalId: requiredText(
      value.establishmentExternalId,
      `${field}.establishmentExternalId`
    ),
    kind: value.kind,
    providerItemId: requiredText(value.providerItemId, `${field}.providerItemId`),
    catalogProductId: requiredText(value.catalogProductId, `${field}.catalogProductId`)
  });
}

function referenceKey(kind: ExternalCatalogReferenceKind, providerItemId: string): string {
  return `${kind}\0${providerItemId}`;
}

function requiredText(value: string, field: string): string {
  if (typeof value !== 'string') fail('INVALID_LINK', field);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 256) fail('INVALID_LINK', field);
  return normalized;
}

function fail(code: ExternalCatalogLinkErrorCode, field: string): never {
  throw new ExternalCatalogLinkError(code, field);
}
