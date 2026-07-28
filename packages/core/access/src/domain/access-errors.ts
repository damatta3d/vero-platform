export class AccessError extends Error {
  constructor(message = 'Access could not be evaluated.') {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidAccessReferenceError extends AccessError {
  constructor() {
    super('Access action and resource must use qualified references.');
  }
}

export class AccessDeniedError extends AccessError {
  constructor() {
    super('Access denied.');
  }
}

export class AccessContextConsumedError extends AccessError {
  constructor() {
    super('Authorized access context has already been consumed.');
  }
}
