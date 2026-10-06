import {
  credentials,
  Metadata,
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
import type { Balance__Output as Balance } from './generated/credit/Balance';
import type { ReserveCreditsRequest } from './generated/credit/ReserveCreditsRequest';
import type { Reservation__Output as Reservation } from './generated/credit/Reservation';
import type { ReleaseCreditsRequest } from './generated/credit/ReleaseCreditsRequest';
import type { SettleCreditsRequest } from './generated/credit/SettleCreditsRequest';
import type { GetSupplierRequest } from './generated/supplier/GetSupplierRequest';
import type { Supplier__Output as Supplier } from './generated/supplier/Supplier';

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

function callOptions(defaultTimeout: number, options: RpcOptions): CallOptions {
  const timeout = positiveTimeout(options.timeoutMs ?? defaultTimeout);
  const localDeadline = Date.now() + timeout;
  const upstreamDeadline =
    options.deadline instanceof Date ? options.deadline.getTime() : (options.deadline ?? Infinity);
  if (Number.isNaN(upstreamDeadline)) {
    throw new RangeError('deadline must be a valid Date or timestamp');
  }
  return { deadline: Math.min(localDeadline, upstreamDeadline) };
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

export function createCreditClient(target: string, config: ClientConfig = {}) {
  const timeoutMs = positiveTimeout(config.timeoutMs ?? 3000);
  const client = new CreditService(target, config.credentials ?? credentials.createInsecure());
  return {
    getBalance(request: GetBalanceRequest, options: RpcOptions = {}): Promise<Balance> {
      return unary((callback) =>
        client.getBalance(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    reserveCredits(request: ReserveCreditsRequest, options: RpcOptions = {}): Promise<Reservation> {
      return unary((callback) =>
        client.reserveCredits(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    releaseCredits(request: ReleaseCreditsRequest, options: RpcOptions = {}): Promise<Reservation> {
      return unary((callback) =>
        client.releaseCredits(
          request,
          options.metadata ?? new Metadata(),
          callOptions(timeoutMs, options),
          callback,
        ),
      );
    },
    settleCredits(request: SettleCreditsRequest, options: RpcOptions = {}): Promise<Reservation> {
      return unary((callback) =>
        client.settleCredits(
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
