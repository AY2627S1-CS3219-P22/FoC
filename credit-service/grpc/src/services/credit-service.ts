import { createHash, randomUUID } from 'node:crypto';
import { CreditError, requireCondition } from '../domain/errors';
import { CreditAccount, CreditHistoryEntry, HistoryType, IdempotencyRecord, MAX_CREDITS, STARTER_CREDITS, Reservation, ReservationStatus } from '../domain/models';
import { balance, historyView, reservationView, type Balance, type CreditHistoryView, type ReservationView } from '../domain/views';
import type { CreditRepository, CreditUnitOfWork } from '../repositories/interfaces';

function identifier(value: string, field: string): string {
  if (typeof value !== 'string' || !value || value.length > 200 || value.trim() !== value || /[\x00-\x1f]/.test(value)) {
    throw new CreditError('INVALID_ARGUMENT', `${field} must be a nonempty identifier of at most 200 characters`);
  }
  return value;
}
function positive(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_CREDITS) {
    throw new CreditError('INVALID_ARGUMENT', `${field} must be a positive integer no greater than ${MAX_CREDITS}`);
  }
  return value;
}
function found<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new CreditError('NOT_FOUND', `${name} not found`);
  return value;
}
function retryKey(key: string | undefined, fallback?: string): string {
  return identifier(key || fallback || '', 'idempotencyKey');
}

export class CreditService {
  constructor(private readonly database: CreditUnitOfWork) {}

  private async mutate<T extends Balance | ReservationView>(operation: string, key: string, request: object, resource: string,
    action: (repository: CreditRepository) => Promise<T>): Promise<T> {
    const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    return this.database.transaction(async ({ credit }) => {
      await credit.lockResource(JSON.stringify(['idempotency', operation, key]));
      const previous = await credit.findIdempotencyRecord(operation, key);
      if (previous) {
        requireCondition(previous.requestHash === requestHash, 'Idempotency key was already used with a different request');
        return previous.result as T;
      }
      await credit.lockResource(resource);
      const result = await action(credit);
      const userID = 'userId' in result ? result.userId : result.requesterId;
      await credit.saveIdempotencyRecord(new IdempotencyRecord(userID, key, new Date(), operation, result, requestHash));
      return result;
    });
  }

  private recordReservation(repository: CreditRepository, userId: string, type: HistoryType, totalDelta: number,
    reservedDelta: number, reservation?: Reservation): Promise<void> {
    const amount = type === HistoryType.TRANSFER || type === HistoryType.INITIAL_GRANT ? totalDelta : reservedDelta;
    return repository.saveCreditHistoryEntry(new CreditHistoryEntry(userId, randomUUID(), type, amount, new Date(),
      reservation?.errandID ?? '', reservation?.reservationID ?? '', totalDelta, reservedDelta));
  }

  async initCredits(request: { userId: string; idempotencyKey?: string }): Promise<Balance> {
    const userId = identifier(request.userId, 'userId');
    return this.mutate('INIT', retryKey(request.idempotencyKey, userId), { userId }, `account:${userId}`, async repo => {
      const existing = await repo.findByUserId(userId);
      if (existing) return balance(existing);
      const account = new CreditAccount(userId);
      account.initAccount();
      await repo.createCreditAccount(account);
      await this.recordReservation(repo, userId, HistoryType.INITIAL_GRANT, STARTER_CREDITS, 0);
      return balance(account);
    });
  }

  async displayCredit(request: { userId: string }): Promise<Balance> {
    const userId = identifier(request.userId, 'userId');
    return this.database.transaction(async ({ credit }) => balance(found(await credit.findByUserId(userId), 'Credit account')));
  }

  async createReservation(request: { orderId: string; requesterId: string; amount: number; idempotencyKey?: string }): Promise<ReservationView> {
    const orderId = identifier(request.orderId, 'orderId');
    const requesterId = identifier(request.requesterId, 'requesterId');
    const amount = positive(request.amount, 'amount');
    return this.mutate('RESERVE', retryKey(request.idempotencyKey, orderId), { orderId, requesterId, amount }, `order:${orderId}`, async repo => {
      const existing = await repo.findReservation(orderId);
      if (existing) {
        requireCondition(existing.userID === requesterId && existing.creditAmount === amount, 'Order already has a different reservation');
        return reservationView(existing);
      }
      const account = found((await repo.lockAccounts([requesterId]))[0], 'Requester credit account');
      requireCondition(balance(account).availableCredits >= amount, 'Insufficient available credits');
      account.reservedCreditAmount += amount;
      const reservation = new Reservation(requesterId, orderId, randomUUID(), amount);
      await repo.saveCreditAccount(account);
      await repo.saveReservation(reservation);
      await this.recordReservation(repo, requesterId, HistoryType.RESERVE, 0, amount, reservation);
      return reservationView(reservation);
    });
  }

  async updateReservation(request: { orderId: string; amount: number; expectedVersion: number; idempotencyKey?: string }): Promise<ReservationView> {
    const orderId = identifier(request.orderId, 'orderId');
    const amount = positive(request.amount, 'amount');
    const expectedVersion = positive(request.expectedVersion, 'expectedVersion');
    return this.mutate('UPDATE', retryKey(request.idempotencyKey), { orderId, amount, expectedVersion }, `order:${orderId}`, async repo => {
      const reservation = found(await repo.findReservation(orderId), 'Reservation');
      requireCondition(reservation.reservationStatus === ReservationStatus.RESERVED, 'Only active reservations can be updated');
      requireCondition(reservation.version === expectedVersion, 'Reservation version changed; reload before updating');
      requireCondition(reservation.version < MAX_CREDITS, 'Reservation version limit reached');
      const account = found((await repo.lockAccounts([reservation.userID]))[0], 'Requester credit account');
      const delta = amount - reservation.creditAmount;
      requireCondition(balance(account).availableCredits >= delta, 'Insufficient available credits');
      account.reservedCreditAmount += delta;
      reservation.creditAmount = amount;
      reservation.version++;
      await repo.saveCreditAccount(account);
      await repo.saveReservation(reservation);
      await this.recordReservation(repo, account.userID, HistoryType.UPDATE, 0, delta, reservation);
      return reservationView(reservation);
    });
  }

  async releaseReservation(request: { orderId: string; idempotencyKey?: string }): Promise<ReservationView> {
    const orderId = identifier(request.orderId, 'orderId');
    return this.mutate('RELEASE', retryKey(request.idempotencyKey, orderId), { orderId }, `order:${orderId}`, async repo => {
      const reservation = found(await repo.findReservation(orderId), 'Reservation');
      if (reservation.reservationStatus === ReservationStatus.RELEASED) return reservationView(reservation);
      requireCondition(reservation.reservationStatus === ReservationStatus.RESERVED, 'Settled reservations cannot be released');
      requireCondition(reservation.version < MAX_CREDITS, 'Reservation version limit reached');
      const account = found((await repo.lockAccounts([reservation.userID]))[0], 'Requester credit account');
      account.reservedCreditAmount -= reservation.creditAmount;
      reservation.reservationStatus = ReservationStatus.RELEASED;
      reservation.version++;
      await repo.saveCreditAccount(account);
      await repo.saveReservation(reservation);
      await this.recordReservation(repo, account.userID, HistoryType.RELEASE, 0, -reservation.creditAmount, reservation);
      return reservationView(reservation);
    });
  }

  async transferReservation(request: { orderId: string; courierId: string; idempotencyKey?: string }): Promise<ReservationView> {
    const orderId = identifier(request.orderId, 'orderId');
    const courierId = identifier(request.courierId, 'courierId');
    return this.mutate('SETTLE', retryKey(request.idempotencyKey, orderId), { orderId, courierId }, `order:${orderId}`, async repo => {
      const reservation = found(await repo.findReservation(orderId), 'Reservation');
      if (reservation.reservationStatus === ReservationStatus.TRANSFERRED) {
        requireCondition(reservation.courierID === courierId, 'Reservation was settled to another courier');
        return reservationView(reservation);
      }
      requireCondition(reservation.reservationStatus === ReservationStatus.RESERVED, 'Released reservations cannot be settled');
      requireCondition(reservation.userID !== courierId, 'Requester and courier must be different users');
      requireCondition(reservation.version < MAX_CREDITS, 'Reservation version limit reached');
      const accounts = await repo.lockAccounts([reservation.userID, courierId]);
      const requester = found(accounts.find(a => a.userID === reservation.userID), 'Requester credit account');
      const courier = found(accounts.find(a => a.userID === courierId), 'Courier credit account');
      requireCondition(courier.totalCreditBalance <= MAX_CREDITS - reservation.creditAmount, 'Courier balance limit exceeded');
      requester.totalCreditBalance -= reservation.creditAmount;
      requester.reservedCreditAmount -= reservation.creditAmount;
      courier.totalCreditBalance += reservation.creditAmount;
      reservation.reservationStatus = ReservationStatus.TRANSFERRED;
      reservation.courierID = courierId;
      reservation.version++;
      await repo.saveCreditAccount(requester);
      await repo.saveCreditAccount(courier);
      await repo.saveReservation(reservation);
      await this.recordReservation(repo, requester.userID, HistoryType.TRANSFER, -reservation.creditAmount, -reservation.creditAmount, reservation);
      await this.recordReservation(repo, courier.userID, HistoryType.TRANSFER, reservation.creditAmount, 0, reservation);
      return reservationView(reservation);
    });
  }

  async displayUserHistory(request: { userId: string; pageSize?: number; pageToken?: string }): Promise<{ entries: CreditHistoryView[]; nextPageToken: string }> {
    const userId = identifier(request.userId, 'userId');
    const pageSize = request.pageSize === undefined || request.pageSize === 0 ? 50 : positive(request.pageSize, 'pageSize');
    if (pageSize > 100) throw new CreditError('INVALID_ARGUMENT', 'pageSize must not exceed 100');
    let before: string | undefined;
    if (request.pageToken) {
      try {
        if (request.pageToken.length > 1024) throw new Error();
        const cursor = JSON.parse(Buffer.from(request.pageToken, 'base64url').toString('utf8'));
        if (cursor.userId !== userId || typeof cursor.sequenceId !== 'string' || !/^[1-9]\d{0,18}$/.test(cursor.sequenceId)
          || BigInt(cursor.sequenceId) > 9223372036854775807n) throw new Error();
        before = cursor.sequenceId;
      } catch { throw new CreditError('INVALID_ARGUMENT', 'Invalid history page token for this user'); }
    }
    return this.database.transaction(async ({ credit }) => {
      found(await credit.findByUserId(userId), 'Credit account');
      const rows = await credit.findCreditHistory(userId, before, pageSize + 1);
      const page = rows.slice(0, pageSize);
      const nextPageToken = rows.length > pageSize
        ? Buffer.from(JSON.stringify({ userId, sequenceId: page[page.length - 1].sequenceId })).toString('base64url') : '';
      return { entries: page.map(({ entry }) => historyView(entry)), nextPageToken };
    });
  }
}
