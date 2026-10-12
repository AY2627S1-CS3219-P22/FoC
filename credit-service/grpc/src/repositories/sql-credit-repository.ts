import type { PoolClient } from 'pg';
import { CreditAccount, CreditHistoryEntry, HistoryType, Reservation, ReservationStatus, type StoredHistoryEntry } from '../domain/models';
import { historyTypeForStorage } from '../domain/views';
import type { CreditRepository } from './interfaces';

interface AccountRow { userID: string; totalCreditBalance: number; reservedCreditAmount: number }
interface ReservationRow { reservationID: string; errandID: string; userID: string; creditAmount: number;
  status: 'RESERVED' | 'RELEASED' | 'SETTLED'; courierID: string; version: number }
interface HistoryRow { sequenceId: string; id: string; userID: string; type: string; totalDelta: number;
  reservedDelta: number; errandID: string; reservationID: string; timestamp: Date }

const accountColumns = 'user_id AS "userID", total_credits AS "totalCreditBalance", reserved_credits AS "reservedCreditAmount"';
const reservationColumns = `reservation_id AS "reservationID", order_id AS "errandID",
  requester_id AS "userID", amount AS "creditAmount", status, COALESCE(courier_id, '') AS "courierID", version`;
const historyColumns = `sequence_id AS "sequenceId", id, user_id AS "userID", type,
  total_delta AS "totalDelta", reserved_delta AS "reservedDelta", COALESCE(order_id, '') AS "errandID",
  COALESCE(reservation_id::text, '') AS "reservationID", created_at AS timestamp`;

function accountFromRow(row: AccountRow): CreditAccount {
  return new CreditAccount(row.userID, row.totalCreditBalance, row.reservedCreditAmount);
}
function historyFromRow(row: HistoryRow): CreditHistoryEntry {
  const types: Record<string, HistoryType> = { INITIAL_GRANT: HistoryType.INITIAL_GRANT,
    RESERVED: HistoryType.RESERVE, RESERVATION_UPDATED: HistoryType.UPDATE, RELEASED: HistoryType.RELEASE,
    TRANSFER_OUT: HistoryType.TRANSFER, TRANSFER_IN: HistoryType.TRANSFER };
  const type = types[row.type];
  if (!type) throw new Error('Unknown persisted credit history type');
  const amount = type === HistoryType.TRANSFER || type === HistoryType.INITIAL_GRANT ? row.totalDelta : row.reservedDelta;
  return new CreditHistoryEntry(row.userID, row.id, type, amount, row.timestamp, row.errandID,
    row.reservationID, row.totalDelta, row.reservedDelta);
}

export class SqlCreditRepository implements CreditRepository {
  constructor(private readonly client: PoolClient) {}

  async findByUserId(userId: string): Promise<CreditAccount | undefined> {
    const result = await this.client.query<AccountRow>(`SELECT ${accountColumns} FROM credit.accounts WHERE user_id = $1`, [userId]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : undefined;
  }

  async findAccounts(userIds: string[]): Promise<CreditAccount[]> {
    // Load both participants for an atomic transfer.
    const result = await this.client.query<AccountRow>(
      `SELECT ${accountColumns} FROM credit.accounts WHERE user_id = ANY($1::text[]) ORDER BY user_id`,
      [[...new Set(userIds)].sort()],
    );
    return result.rows.map(accountFromRow);
  }

  async createCreditAccount(account: CreditAccount): Promise<void> {
    await this.client.query('INSERT INTO credit.accounts(user_id, total_credits, reserved_credits) VALUES ($1, $2, $3)',
      [account.userID, account.totalCreditBalance, account.reservedCreditAmount]);
  }

  async saveCreditAccount(account: CreditAccount): Promise<void> {
    const result = await this.client.query(
      'UPDATE credit.accounts SET total_credits = $2, reserved_credits = $3, updated_at = now() WHERE user_id = $1',
      [account.userID, account.totalCreditBalance, account.reservedCreditAmount],
    );
    if (result.rowCount !== 1) throw new Error('Locked credit account disappeared');
  }

  async findReservation(orderId: string): Promise<Reservation | undefined> {
    const result = await this.client.query<ReservationRow>(`SELECT ${reservationColumns} FROM credit.reservations WHERE order_id = $1`, [orderId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return new Reservation(row.userID, row.errandID, row.reservationID, row.creditAmount,
      row.status === 'SETTLED' ? ReservationStatus.TRANSFERRED : ReservationStatus[row.status], row.courierID, row.version);
  }

  async saveReservation(reservation: Reservation): Promise<void> {
    await this.client.query(`INSERT INTO credit.reservations
      (reservation_id, order_id, requester_id, amount, status, courier_id, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (order_id) DO UPDATE SET amount = EXCLUDED.amount, status = EXCLUDED.status,
        courier_id = EXCLUDED.courier_id, version = EXCLUDED.version, updated_at = now()`,
      [reservation.reservationID, reservation.errandID, reservation.userID, reservation.creditAmount,
        reservation.reservationStatus === ReservationStatus.TRANSFERRED ? 'SETTLED' : reservation.reservationStatus,
        reservation.courierID || null, reservation.version]);
  }

  async saveCreditHistoryEntry(entry: CreditHistoryEntry): Promise<void> {
    await this.client.query(`INSERT INTO credit.history
      (id, user_id, type, total_delta, reserved_delta, order_id, reservation_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [entry.id, entry.userID, historyTypeForStorage(entry), entry.totalDelta, entry.reservedDelta,
        entry.errandID || null, entry.reservationID || null, entry.timestamp]);
  }

  async findCreditHistoryEntry(id: string): Promise<CreditHistoryEntry | undefined> {
    const result = await this.client.query<HistoryRow>(`SELECT ${historyColumns} FROM credit.history WHERE id = $1`, [id]);
    return result.rows[0] ? historyFromRow(result.rows[0]) : undefined;
  }

  async findCreditHistory(userId: string, before: string | undefined, limit: number): Promise<StoredHistoryEntry[]> {
    const result = await this.client.query<HistoryRow>(`SELECT ${historyColumns}
      FROM credit.history WHERE user_id = $1 AND ($2::bigint IS NULL OR sequence_id < $2)
      ORDER BY sequence_id DESC LIMIT $3`, [userId, before ?? null, limit]);
    return result.rows.map(row => ({ sequenceId: row.sequenceId, entry: historyFromRow(row) }));
  }

}
