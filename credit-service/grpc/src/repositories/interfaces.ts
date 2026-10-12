import type { CreditAccount, CreditHistoryEntry, Reservation, StoredHistoryEntry } from '../domain/models';

export interface CreditRepository {
  findByUserId(userId: string): Promise<CreditAccount | undefined>;
  findAccounts(userIds: string[]): Promise<CreditAccount[]>;
  saveCreditAccount(account: CreditAccount): Promise<void>;
  createCreditAccount(account: CreditAccount): Promise<void>;
  findReservation(orderId: string): Promise<Reservation | undefined>;
  saveReservation(reservation: Reservation): Promise<void>;
  saveCreditHistoryEntry(entry: CreditHistoryEntry): Promise<void>;
  findCreditHistoryEntry(id: string): Promise<CreditHistoryEntry | undefined>;
  findCreditHistory(userId: string, before: string | undefined, limit: number): Promise<StoredHistoryEntry[]>;
}
export interface TransactionRepositories {
  credit: CreditRepository;
}
export interface CreditUnitOfWork {
  transaction<T>(action: (repositories: TransactionRepositories) => Promise<T>): Promise<T>;
}
