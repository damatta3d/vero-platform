const principalIdBrand: unique symbol = Symbol('PrincipalId');
const trustedPrincipals = new WeakSet<object>();

export type PrincipalType = 'human' | 'service';

export interface PrincipalId {
  readonly [principalIdBrand]: true;
  equals(other: PrincipalId): boolean;
  toString(): string;
}

export interface AuthenticatedPrincipal {
  readonly id: PrincipalId;
  readonly type: PrincipalType;
}

class QualifiedPrincipalId implements PrincipalId {
  readonly [principalIdBrand] = true;

  constructor(
    private readonly authority: string,
    private readonly subject: string
  ) {
    Object.freeze(this);
  }

  equals(other: PrincipalId): boolean {
    return this.toString() === other.toString();
  }

  toString(): string {
    return `${encodeURIComponent(this.authority)}:${encodeURIComponent(this.subject)}`;
  }
}

export function createTrustedPrincipal(
  authority: string,
  subject: string,
  type: PrincipalType
): AuthenticatedPrincipal {
  if (authority.trim().length === 0 || subject.trim().length === 0) {
    throw new Error('Trusted authority and subject are required.');
  }
  const principal = Object.freeze({
    id: new QualifiedPrincipalId(authority, subject),
    type
  });
  trustedPrincipals.add(principal);
  return principal;
}

export function isTrustedPrincipal(value: unknown): value is AuthenticatedPrincipal {
  return typeof value === 'object' && value !== null && trustedPrincipals.has(value);
}
