import { InvalidAccessReferenceError } from './access-errors.js';

const qualifiedReference = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

export interface AccessReference {
  readonly value: string;
}

function createReference(value: string): AccessReference {
  const normalized = value.trim().toLowerCase();
  if (!qualifiedReference.test(normalized)) throw new InvalidAccessReferenceError();
  return Object.freeze({ value: normalized });
}

export function actionRef(value: string): AccessReference {
  return createReference(value);
}

export function resourceRef(value: string): AccessReference {
  return createReference(value);
}
