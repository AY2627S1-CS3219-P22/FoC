import type { CreditAccount, CreditHistoryEntry, IdempotencyRecord, Reservation, StoredHistoryEntry } from '../domain/models';

export interface CreditRepository {
  findByUserId(userId: string): Promise<CreditAccount | undefined>;
  lockAccounts(userIds: string[]): Promise<CreditAccount[]>;
  saveCreditAccount(account: CreditAccount): Promise<void>;
  createCreditAccount(account: CreditAccount): Promise<void>;
  findReservation(orderId: string): Promise<Reservation | undefined>;
  saveReservation(reservation: Reservation): Promise<void>;
  saveCreditHistoryEntry(entry: CreditHistoryEntry): Promise<void>;
  findCreditHistoryEntry(id: string): Promise<CreditHistoryEntry | undefined>;
  findCreditHistory(userId: string, before: string | undefined, limit: number): Promise<StoredHistoryEntry[]>;
  lockResource(resource: string): Promise<void>;
  findIdempotencyRecord(operation: string, key: string): Promise<IdempotencyRecord | undefined>;
  saveIdempotencyRecord(record: IdempotencyRecord): Promise<void>;
}
export interface TransactionRepositories {
  credit: CreditRepository;
}
export interface CreditUnitOfWork {
  transaction<T>(action: (repositories: TransactionRepositories) => Promise<T>): Promise<T>;
}
