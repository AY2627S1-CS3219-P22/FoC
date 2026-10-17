import {
  credentials,
  Metadata,
  status,
  type CallOptions,
  type ChannelCredentials,
  type ClientUnaryCall,
  type requestCallback,
} from '@grpc/grpc-js';
import { UserService, OrderService, CreditService, SupplierService } from './contracts';
import type { GetPublicProfileRequest } from './generated/user/GetPublicProfileRequest';
import type { PublicProfile__Output as PublicProfile } from './generated/user/PublicProfile';
import type { GetOrderRequest } from './generated/order/GetOrderRequest';
import type { Order__Output as Order } from './generated/order/Order';
import type { GetBalanceRequest } from './generated/credit/GetBalanceRequest';
import type { InitCreditsRequest } from './generated/credit/InitCreditsRequest';
import type { UpdateReservationRequest } from './generated/credit/UpdateReservationRequest';
import type { GetCreditHistoryRequest } from './generated/credit/GetCreditHistoryRequest';
import type { CreditHistory__Output as CreditHistory } from './generated/credit/CreditHistory';
import type { Balance__Output as Balance } from './generated/credit/Balance';
import type { ReserveCreditsRequest } from './generated/credit/ReserveCreditsRequest';
import type { Reservation__Output as Reservation } from './generated/credit/Reservation';
import type { ReleaseCreditsRequest } from './generated/credit/ReleaseCreditsRequest';
import type { SettleCreditsRequest } from './generated/credit/SettleCreditsRequest';
import type { GetReservationRequest } from './generated/credit/GetReservationRequest';
import type { GetSupplierRequest } from './generated/supplier/GetSupplierRequest';
import type { Supplier__Output as Supplier } from './generated/supplier/Supplier';
import type { IsOpenRequest } from './generated/supplier/IsOpenRequest';
import type { IsOpenResponse__Output as IsOpenResponse } from './generated/supplier/IsOpenResponse';

export interface ClientConfig {
  timeoutMs?: number;
  credentials?: ChannelCredentials;
}

export interface RpcOptions {
  timeoutMs?: number;
  // Supply the incoming call's deadline to keep downstream calls within it.
  deadline?: Date | number;
  metadata?: Metadata;
}

function positiveTimeout(timeoutMs: number): number {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be a positive safe integer');
  }
  return timeoutMs;
}

function upstreamDeadline(options: RpcOptions): number {
  const deadline =
    options.deadline instanceof Date ? options.deadline.getTime() : (options.deadline ?? Infinity);
  if (Number.isNaN(deadline)) {
    throw new RangeError('deadline must be a valid Date or timestamp');
  }
  return deadline;
}

function callOptions(defaultTimeout: number, options: RpcOptions): CallOptions {
  const timeout = positiveTimeout(options.timeoutMs ?? defaultTimeout);
  return { deadline: Math.min(Date.now() + timeout, upstreamDeadline(options)) };
}

function unary<Response>(
  invoke: (callback: requestCallback<Response>) => ClientUnaryCall,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    invoke((error, response) => {
      if (error) reject(error);
      else if (response === undefined) reject(new Error('gRPC returned no response'));
      else resolve(response);
    });
  });
}

export function createUserClient(target: string, config: ClientConfig = {}) {
  const timeoutMs = positiveTimeout(config.timeoutMs ?? 3000);
  const client = new UserService(target, config.credentials ?? credentials.createInsecure());
  return {
    getPublicProfile(
      request: GetPublicProfileRequest,
      options: RpcOptions = {},
    ): Promise<PublicProfile> {
      return unary((callback) =>
        client.getPublicProfile(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    close(): void {
      client.close();
    },
  };
}

export function createOrderClient(target: string, config: ClientConfig = {}) {
  const timeoutMs = positiveTimeout(config.timeoutMs ?? 3000);
  const client = new OrderService(target, config.credentials ?? credentials.createInsecure());
  return {
    getOrder(request: GetOrderRequest, options: RpcOptions = {}): Promise<Order> {
      return unary((callback) =>
        client.getOrder(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    close(): void {
      client.close();
    },
  };
}

export interface RetryPolicy {
  // Total attempts, including the first. 1 disables retries.
  maxAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

export interface CreditClientConfig extends ClientConfig {
  // timeoutMs bounds each attempt; an RpcOptions deadline bounds the whole call.
  retry?: RetryPolicy;
}

// Transient failures where resending the identical request is the documented recovery.
const retryableCreditCodes: ReadonlySet<number> = new Set([
  status.UNAVAILABLE,
  status.ABORTED,
  status.DEADLINE_EXCEEDED,
]);

function retryPolicy(policy: RetryPolicy = {}): Required<RetryPolicy> {
  const resolved = { maxAttempts: 3, initialBackoffMs: 100, maxBackoffMs: 1000, ...policy };
  if (!Number.isSafeInteger(resolved.maxAttempts) || resolved.maxAttempts < 1 || resolved.maxAttempts > 10) {
    throw new RangeError('retry.maxAttempts must be an integer from 1 to 10');
  }
  for (const name of ['initialBackoffMs', 'maxBackoffMs'] as const) {
    if (!Number.isSafeInteger(resolved[name]) || resolved[name] < 0) {
      throw new RangeError(`retry.${name} must be a non-negative safe integer`);
    }
  }
  return resolved;
}

async function withRetries<Response>(
  policy: Required<RetryPolicy>,
  options: RpcOptions,
  attempt: () => Promise<Response>,
): Promise<Response> {
  const deadline = upstreamDeadline(options);
  for (let attempts = 1; ; attempts++) {
    try {
      return await attempt();
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (attempts >= policy.maxAttempts || typeof code !== 'number' || !retryableCreditCodes.has(code)) {
        throw error;
      }
      // Full jitter stops callers that failed together from retrying in lockstep.
      const delay = Math.random() * Math.min(policy.maxBackoffMs, policy.initialBackoffMs * 2 ** (attempts - 1));
      if (Date.now() + delay >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export function createCreditClient(target: string, config: CreditClientConfig = {}) {
  const timeoutMs = positiveTimeout(config.timeoutMs ?? 3000);
  const retry = retryPolicy(config.retry);
  const client = new CreditService(target, config.credentials ?? credentials.createInsecure());
  // Every credit RPC is safe to resend unchanged: reads have no side effects, and Credit
  // Service replays a committed mutation's original response for the identical request.
  const send = <Response>(options: RpcOptions, invoke: (metadata: Metadata, callOptions: CallOptions,
    callback: requestCallback<Response>) => ClientUnaryCall): Promise<Response> =>
    withRetries(retry, options, () => unary<Response>((callback) =>
      invoke(options.metadata?.clone() ?? new Metadata(), callOptions(timeoutMs, options), callback)));
  return {
    initCredits(request: InitCreditsRequest, options: RpcOptions = {}): Promise<Balance> {
      return send(options, (metadata, call, callback) => client.initCredits(request, metadata, call, callback));
    },
    updateReservation(request: UpdateReservationRequest, options: RpcOptions = {}): Promise<Reservation> {
      return send(options, (metadata, call, callback) => client.updateReservation(request, metadata, call, callback));
    },
    getCreditHistory(request: GetCreditHistoryRequest, options: RpcOptions = {}): Promise<CreditHistory> {
      return send(options, (metadata, call, callback) => client.getCreditHistory(request, metadata, call, callback));
    },
    getBalance(request: GetBalanceRequest, options: RpcOptions = {}): Promise<Balance> {
      return send(options, (metadata, call, callback) => client.getBalance(request, metadata, call, callback));
    },
    reserveCredits(request: ReserveCreditsRequest, options: RpcOptions = {}): Promise<Reservation> {
      return send(options, (metadata, call, callback) => client.reserveCredits(request, metadata, call, callback));
    },
    releaseCredits(request: ReleaseCreditsRequest, options: RpcOptions = {}): Promise<Reservation> {
      return send(options, (metadata, call, callback) => client.releaseCredits(request, metadata, call, callback));
    },
    settleCredits(request: SettleCreditsRequest, options: RpcOptions = {}): Promise<Reservation> {
      return send(options, (metadata, call, callback) => client.settleCredits(request, metadata, call, callback));
    },
    getReservation(request: GetReservationRequest, options: RpcOptions = {}): Promise<Reservation> {
      return send(options, (metadata, call, callback) => client.getReservation(request, metadata, call, callback));
    },
    close(): void {
      client.close();
    },
  };
}

export function createSupplierClient(target: string, config: ClientConfig = {}) {
  const timeoutMs = positiveTimeout(config.timeoutMs ?? 3000);
  const client = new SupplierService(target, config.credentials ?? credentials.createInsecure());
  return {
    getSupplier(request: GetSupplierRequest, options: RpcOptions = {}): Promise<Supplier> {
      return unary((callback) =>
        client.getSupplier(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    isOpen(request: IsOpenRequest, options: RpcOptions = {}): Promise<IsOpenResponse> {
      return unary((callback) =>
        client.isOpen(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    close(): void {
      client.close();
    },
  };
}

export interface PeerAddresses {
  user: string;
  order: string;
  credit: string;
  supplier: string;
}

export function createPeerClients(addresses: PeerAddresses, config: ClientConfig = {}) {
  const user = createUserClient(addresses.user, config);
  const order = createOrderClient(addresses.order, config);
  const credit = createCreditClient(addresses.credit, config);
  const supplier = createSupplierClient(addresses.supplier, config);
  return {
    user,
    order,
    credit,
    supplier,
    close(): void {
      user.close();
      order.close();
      credit.close();
      supplier.close();
    },
  };
}
