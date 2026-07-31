import { DomainValidationError, ValueObject } from '@vero/core-domain';

interface AccountCodeProps {
  readonly value: string;
}

const ACCOUNT_CODE_REGEX = /^(\d{1,2})(\.\d{1,2})*$/;

export class AccountCode extends ValueObject<AccountCodeProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(code: string): AccountCode {
    const normalized = code.trim();

    if (!ACCOUNT_CODE_REGEX.test(normalized)) {
      throw new DomainValidationError('Invalid account code', 'FINANCE_ACCOUNT_CODE_INVALID');
    }

    return new AccountCode(normalized);
  }

  override toString(): string {
    return this.props.value;
  }
}
