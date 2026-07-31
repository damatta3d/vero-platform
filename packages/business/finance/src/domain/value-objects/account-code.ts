const ACCOUNT_CODE_REGEX = /^(\d{1,2})(\.\d{1,2})*$/;

export class AccountCode {
  private constructor(private readonly value: string) {}

  static create(code: string): AccountCode {
    const normalized = code.trim();

    if (!ACCOUNT_CODE_REGEX.test(normalized)) {
      throw new Error('Invalid account code');
    }

    return new AccountCode(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AccountCode): boolean {
    return this.value === other.value;
  }
}
