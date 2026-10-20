// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Balance as _credit_Balance, Balance__Output as _credit_Balance__Output } from '../credit/Balance';
import type { CreditHistoryPage as _credit_CreditHistoryPage, CreditHistoryPage__Output as _credit_CreditHistoryPage__Output } from '../credit/CreditHistoryPage';
import type { GetBalanceRequest as _credit_GetBalanceRequest, GetBalanceRequest__Output as _credit_GetBalanceRequest__Output } from '../credit/GetBalanceRequest';
import type { GetOrderCreditHistoryRequest as _credit_GetOrderCreditHistoryRequest, GetOrderCreditHistoryRequest__Output as _credit_GetOrderCreditHistoryRequest__Output } from '../credit/GetOrderCreditHistoryRequest';
import type { GetReservationRequest as _credit_GetReservationRequest, GetReservationRequest__Output as _credit_GetReservationRequest__Output } from '../credit/GetReservationRequest';
import type { GetReservationResponse as _credit_GetReservationResponse, GetReservationResponse__Output as _credit_GetReservationResponse__Output } from '../credit/GetReservationResponse';
import type { GetUserCreditHistoryRequest as _credit_GetUserCreditHistoryRequest, GetUserCreditHistoryRequest__Output as _credit_GetUserCreditHistoryRequest__Output } from '../credit/GetUserCreditHistoryRequest';
import type { InitCreditsRequest as _credit_InitCreditsRequest, InitCreditsRequest__Output as _credit_InitCreditsRequest__Output } from '../credit/InitCreditsRequest';
import type { InitCreditsResponse as _credit_InitCreditsResponse, InitCreditsResponse__Output as _credit_InitCreditsResponse__Output } from '../credit/InitCreditsResponse';
import type { ReleaseCreditsRequest as _credit_ReleaseCreditsRequest, ReleaseCreditsRequest__Output as _credit_ReleaseCreditsRequest__Output } from '../credit/ReleaseCreditsRequest';
import type { Reservation as _credit_Reservation, Reservation__Output as _credit_Reservation__Output } from '../credit/Reservation';
import type { ReserveCreditsRequest as _credit_ReserveCreditsRequest, ReserveCreditsRequest__Output as _credit_ReserveCreditsRequest__Output } from '../credit/ReserveCreditsRequest';
import type { SettleCreditsRequest as _credit_SettleCreditsRequest, SettleCreditsRequest__Output as _credit_SettleCreditsRequest__Output } from '../credit/SettleCreditsRequest';
import type { UpdateReservationRequest as _credit_UpdateReservationRequest, UpdateReservationRequest__Output as _credit_UpdateReservationRequest__Output } from '../credit/UpdateReservationRequest';

export interface CreditServiceClient extends grpc.Client {
  GetBalance(argument: _credit_GetBalanceRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  GetBalance(argument: _credit_GetBalanceRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  GetBalance(argument: _credit_GetBalanceRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  GetBalance(argument: _credit_GetBalanceRequest, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _credit_GetBalanceRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _credit_GetBalanceRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _credit_GetBalanceRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;
  getBalance(argument: _credit_GetBalanceRequest, callback: grpc.requestCallback<_credit_Balance__Output>): grpc.ClientUnaryCall;

  GetOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  GetOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  GetOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  GetOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getOrderCreditHistory(argument: _credit_GetOrderCreditHistoryRequest, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;

  GetReservation(argument: _credit_GetReservationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  GetReservation(argument: _credit_GetReservationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  GetReservation(argument: _credit_GetReservationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  GetReservation(argument: _credit_GetReservationRequest, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  getReservation(argument: _credit_GetReservationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  getReservation(argument: _credit_GetReservationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  getReservation(argument: _credit_GetReservationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;
  getReservation(argument: _credit_GetReservationRequest, callback: grpc.requestCallback<_credit_GetReservationResponse__Output>): grpc.ClientUnaryCall;

  GetUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  GetUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  GetUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  GetUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;
  getUserCreditHistory(argument: _credit_GetUserCreditHistoryRequest, callback: grpc.requestCallback<_credit_CreditHistoryPage__Output>): grpc.ClientUnaryCall;

  InitCredits(argument: _credit_InitCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  InitCredits(argument: _credit_InitCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  InitCredits(argument: _credit_InitCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  InitCredits(argument: _credit_InitCreditsRequest, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  initCredits(argument: _credit_InitCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  initCredits(argument: _credit_InitCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  initCredits(argument: _credit_InitCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;
  initCredits(argument: _credit_InitCreditsRequest, callback: grpc.requestCallback<_credit_InitCreditsResponse__Output>): grpc.ClientUnaryCall;

  ReleaseCredits(argument: _credit_ReleaseCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  ReleaseCredits(argument: _credit_ReleaseCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  ReleaseCredits(argument: _credit_ReleaseCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  ReleaseCredits(argument: _credit_ReleaseCreditsRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  releaseCredits(argument: _credit_ReleaseCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  releaseCredits(argument: _credit_ReleaseCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  releaseCredits(argument: _credit_ReleaseCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  releaseCredits(argument: _credit_ReleaseCreditsRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;

  ReserveCredits(argument: _credit_ReserveCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  ReserveCredits(argument: _credit_ReserveCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  ReserveCredits(argument: _credit_ReserveCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  ReserveCredits(argument: _credit_ReserveCreditsRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  reserveCredits(argument: _credit_ReserveCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  reserveCredits(argument: _credit_ReserveCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  reserveCredits(argument: _credit_ReserveCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  reserveCredits(argument: _credit_ReserveCreditsRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;

  SettleCredits(argument: _credit_SettleCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  SettleCredits(argument: _credit_SettleCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  SettleCredits(argument: _credit_SettleCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  SettleCredits(argument: _credit_SettleCreditsRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  settleCredits(argument: _credit_SettleCreditsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  settleCredits(argument: _credit_SettleCreditsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  settleCredits(argument: _credit_SettleCreditsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  settleCredits(argument: _credit_SettleCreditsRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;

  UpdateReservation(argument: _credit_UpdateReservationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  UpdateReservation(argument: _credit_UpdateReservationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  UpdateReservation(argument: _credit_UpdateReservationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  UpdateReservation(argument: _credit_UpdateReservationRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  updateReservation(argument: _credit_UpdateReservationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  updateReservation(argument: _credit_UpdateReservationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  updateReservation(argument: _credit_UpdateReservationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;
  updateReservation(argument: _credit_UpdateReservationRequest, callback: grpc.requestCallback<_credit_Reservation__Output>): grpc.ClientUnaryCall;

}

export interface CreditServiceHandlers extends grpc.UntypedServiceImplementation {
  GetBalance: grpc.handleUnaryCall<_credit_GetBalanceRequest__Output, _credit_Balance>;

  GetOrderCreditHistory: grpc.handleUnaryCall<_credit_GetOrderCreditHistoryRequest__Output, _credit_CreditHistoryPage>;

  GetReservation: grpc.handleUnaryCall<_credit_GetReservationRequest__Output, _credit_GetReservationResponse>;

  GetUserCreditHistory: grpc.handleUnaryCall<_credit_GetUserCreditHistoryRequest__Output, _credit_CreditHistoryPage>;

  InitCredits: grpc.handleUnaryCall<_credit_InitCreditsRequest__Output, _credit_InitCreditsResponse>;

  ReleaseCredits: grpc.handleUnaryCall<_credit_ReleaseCreditsRequest__Output, _credit_Reservation>;

  ReserveCredits: grpc.handleUnaryCall<_credit_ReserveCreditsRequest__Output, _credit_Reservation>;

  SettleCredits: grpc.handleUnaryCall<_credit_SettleCreditsRequest__Output, _credit_Reservation>;

  UpdateReservation: grpc.handleUnaryCall<_credit_UpdateReservationRequest__Output, _credit_Reservation>;

}

export interface CreditServiceDefinition extends grpc.ServiceDefinition {
  GetBalance: MethodDefinition<_credit_GetBalanceRequest, _credit_Balance, _credit_GetBalanceRequest__Output, _credit_Balance__Output>
  GetOrderCreditHistory: MethodDefinition<_credit_GetOrderCreditHistoryRequest, _credit_CreditHistoryPage, _credit_GetOrderCreditHistoryRequest__Output, _credit_CreditHistoryPage__Output>
  GetReservation: MethodDefinition<_credit_GetReservationRequest, _credit_GetReservationResponse, _credit_GetReservationRequest__Output, _credit_GetReservationResponse__Output>
  GetUserCreditHistory: MethodDefinition<_credit_GetUserCreditHistoryRequest, _credit_CreditHistoryPage, _credit_GetUserCreditHistoryRequest__Output, _credit_CreditHistoryPage__Output>
  InitCredits: MethodDefinition<_credit_InitCreditsRequest, _credit_InitCreditsResponse, _credit_InitCreditsRequest__Output, _credit_InitCreditsResponse__Output>
  ReleaseCredits: MethodDefinition<_credit_ReleaseCreditsRequest, _credit_Reservation, _credit_ReleaseCreditsRequest__Output, _credit_Reservation__Output>
  ReserveCredits: MethodDefinition<_credit_ReserveCreditsRequest, _credit_Reservation, _credit_ReserveCreditsRequest__Output, _credit_Reservation__Output>
  SettleCredits: MethodDefinition<_credit_SettleCreditsRequest, _credit_Reservation, _credit_SettleCreditsRequest__Output, _credit_Reservation__Output>
  UpdateReservation: MethodDefinition<_credit_UpdateReservationRequest, _credit_Reservation, _credit_UpdateReservationRequest__Output, _credit_Reservation__Output>
}
