import { HistoryType, ReservationStatus, type CreditAccount, type CreditHistoryEntry, type Reservation } from './models';

// Response snapshots retain existing API field names.
export interface Balance {
  userId: string;
  totalCredits: number;
  reservedCredits: number;
  availableCredits: number;
}
export interface ReservationView {
  orderId: string;
  requesterId: string;
  reservationId: string;
  amount: number;
  status: 'RESERVED' | 'RELEASED' | 'SETTLED';
  courierId: string;
  version: number;
}
export interface CreditHistoryView {
  userId: string;
  id: string;
  type: string;
  totalDelta: number;
  reservedDelta: number;
  orderId: string;
  reservationId: string;
  createdAt: string;
}

export function balance(account: CreditAccount): Balance {
  return { userId: account.userID, totalCredits: account.totalCreditBalance,
    reservedCredits: account.reservedCreditAmount, availableCredits: account.getAvailableBalance() };
}

export function reservationView(reservation: Reservation): ReservationView {
  return { orderId: reservation.errandID, requesterId: reservation.userID,
    reservationId: reservation.reservationID, amount: reservation.creditAmount,
    status: reservation.reservationStatus === ReservationStatus.TRANSFERRED ? 'SETTLED' : reservation.reservationStatus,
    courierId: reservation.courierID, version: reservation.version };
}

export function historyTypeForStorage(entry: CreditHistoryEntry): string {
  switch (entry.type) {
    case HistoryType.RESERVE: return 'RESERVED';
    case HistoryType.UPDATE: return 'RESERVATION_UPDATED';
    case HistoryType.RELEASE: return 'RELEASED';
    case HistoryType.TRANSFER: return entry.totalDelta < 0 ? 'TRANSFER_OUT' : 'TRANSFER_IN';
    default: return entry.type;
  }
}

export function historyView(entry: CreditHistoryEntry): CreditHistoryView {
  return { userId: entry.userID, id: entry.id, type: historyTypeForStorage(entry),
    totalDelta: entry.totalDelta, reservedDelta: entry.reservedDelta,
    orderId: entry.errandID, reservationId: entry.reservationID, createdAt: entry.timestamp.toISOString() };
}
