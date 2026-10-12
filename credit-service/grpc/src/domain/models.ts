export const MAX_CREDITS = 2_147_483_647;
export const STARTER_CREDITS = 10;

export class CreditAccount {
  public totalCreditBalance: number;
  public reservedCreditAmount: number;
  private initialized: boolean;

  constructor(
    public readonly userID: string,
    totalCreditBalance?: number,
    reservedCreditAmount = 0,
  ) {
    this.totalCreditBalance = totalCreditBalance ?? 0;
    this.reservedCreditAmount = reservedCreditAmount;
    this.initialized = totalCreditBalance !== undefined;
  }

  // Called by CreditService only when creating a new account, within its transaction.
  initAccount(): void {
    requireCondition(!this.initialized, 'Credit account has already been initialised');
    this.totalCreditBalance = STARTER_CREDITS;
    this.reservedCreditAmount = 0;
    this.initialized = true;
  }

  getAvailableBalance(): number {
    return this.totalCreditBalance - this.reservedCreditAmount;
  }
}

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  RELEASED = 'RELEASED',
  TRANSFERRED = 'TRANSFERRED',
}

export class Reservation {
  constructor(
    public readonly userID: string,
    public readonly errandID: string,
    public readonly reservationID: string,
    public creditAmount: number,
    public reservationStatus: ReservationStatus = ReservationStatus.RESERVED,
    public courierID = '',
    public version = 1,
  ) {}
}

export enum HistoryType {
  RESERVE = 'RESERVE',
  UPDATE = 'UPDATE',
  RELEASE = 'RELEASE',
  TRANSFER = 'TRANSFER',
  DISPUTE_ADJUST = 'DISPUTE_ADJUST',
  INITIAL_GRANT = 'INITIAL_GRANT',
}

export class CreditHistoryEntry {
  constructor(
    public readonly userID: string,
    public readonly id: string,
    public readonly type: HistoryType,
    public readonly amount: number,
    public readonly timestamp: Date,
    public readonly errandID = '',
    public readonly reservationID = '',
    public readonly totalDelta = 0,
    public readonly reservedDelta = 0,
  ) {}
}

export class IdempotencyRecord {
  constructor(
    public readonly userID: string,
    public readonly key: string,
    public readonly timestamp: Date,
    public readonly operationType: string,
    public readonly result: unknown,
    public readonly requestHash: string,
  ) {}
}

export interface StoredHistoryEntry {
  sequenceId: string;
  entry: CreditHistoryEntry;
}
import { requireCondition } from './errors';
