export type CreditErrorCode = 'INVALID_ARGUMENT' | 'NOT_FOUND' | 'FAILED_PRECONDITION';

export class CreditError extends Error {
  constructor(public readonly code: CreditErrorCode, message: string) {
    super(message);
    this.name = 'CreditError';
  }
}

export function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CreditError('FAILED_PRECONDITION', message);
}
