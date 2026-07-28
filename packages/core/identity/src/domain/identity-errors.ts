export abstract class IdentityError extends Error {
  protected constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = new.target.name;
    Object.freeze(this);
  }
}

export class AuthenticationEvidenceRequiredError extends IdentityError {
  constructor() {
    super('Authentication evidence is required.', 'AUTHENTICATION_EVIDENCE_REQUIRED');
  }
}

export class InvalidAuthenticationEvidenceError extends IdentityError {
  constructor() {
    super('Authentication evidence is invalid.', 'AUTHENTICATION_EVIDENCE_INVALID');
  }
}

export class AuthenticationFailedError extends IdentityError {
  constructor() {
    super('Authentication failed.', 'AUTHENTICATION_FAILED');
  }
}

export class IdentityContextRequiredError extends IdentityError {
  constructor() {
    super('Authenticated identity context is required.', 'IDENTITY_CONTEXT_REQUIRED');
  }
}
