// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { Balance as _credit_Balance, Balance__Output as _credit_Balance__Output } from './credit/Balance';
import type { CreditHistoryEntry as _credit_CreditHistoryEntry, CreditHistoryEntry__Output as _credit_CreditHistoryEntry__Output } from './credit/CreditHistoryEntry';
import type { CreditHistoryPage as _credit_CreditHistoryPage, CreditHistoryPage__Output as _credit_CreditHistoryPage__Output } from './credit/CreditHistoryPage';
import type { CreditServiceClient as _credit_CreditServiceClient, CreditServiceDefinition as _credit_CreditServiceDefinition } from './credit/CreditService';
import type { GetBalanceRequest as _credit_GetBalanceRequest, GetBalanceRequest__Output as _credit_GetBalanceRequest__Output } from './credit/GetBalanceRequest';
import type { GetOrderCreditHistoryRequest as _credit_GetOrderCreditHistoryRequest, GetOrderCreditHistoryRequest__Output as _credit_GetOrderCreditHistoryRequest__Output } from './credit/GetOrderCreditHistoryRequest';
import type { GetReservationRequest as _credit_GetReservationRequest, GetReservationRequest__Output as _credit_GetReservationRequest__Output } from './credit/GetReservationRequest';
import type { GetReservationResponse as _credit_GetReservationResponse, GetReservationResponse__Output as _credit_GetReservationResponse__Output } from './credit/GetReservationResponse';
import type { GetUserCreditHistoryRequest as _credit_GetUserCreditHistoryRequest, GetUserCreditHistoryRequest__Output as _credit_GetUserCreditHistoryRequest__Output } from './credit/GetUserCreditHistoryRequest';
import type { InitCreditsRequest as _credit_InitCreditsRequest, InitCreditsRequest__Output as _credit_InitCreditsRequest__Output } from './credit/InitCreditsRequest';
import type { InitCreditsResponse as _credit_InitCreditsResponse, InitCreditsResponse__Output as _credit_InitCreditsResponse__Output } from './credit/InitCreditsResponse';
import type { ReleaseCreditsRequest as _credit_ReleaseCreditsRequest, ReleaseCreditsRequest__Output as _credit_ReleaseCreditsRequest__Output } from './credit/ReleaseCreditsRequest';
import type { Reservation as _credit_Reservation, Reservation__Output as _credit_Reservation__Output } from './credit/Reservation';
import type { ReserveCreditsRequest as _credit_ReserveCreditsRequest, ReserveCreditsRequest__Output as _credit_ReserveCreditsRequest__Output } from './credit/ReserveCreditsRequest';
import type { SettleCreditsRequest as _credit_SettleCreditsRequest, SettleCreditsRequest__Output as _credit_SettleCreditsRequest__Output } from './credit/SettleCreditsRequest';
import type { UpdateReservationRequest as _credit_UpdateReservationRequest, UpdateReservationRequest__Output as _credit_UpdateReservationRequest__Output } from './credit/UpdateReservationRequest';
import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from './google/protobuf/Timestamp';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  credit: {
    Balance: MessageTypeDefinition<_credit_Balance, _credit_Balance__Output>
    CreditHistoryEntry: MessageTypeDefinition<_credit_CreditHistoryEntry, _credit_CreditHistoryEntry__Output>
    CreditHistoryPage: MessageTypeDefinition<_credit_CreditHistoryPage, _credit_CreditHistoryPage__Output>
    CreditService: SubtypeConstructor<typeof grpc.Client, _credit_CreditServiceClient> & { service: _credit_CreditServiceDefinition }
    GetBalanceRequest: MessageTypeDefinition<_credit_GetBalanceRequest, _credit_GetBalanceRequest__Output>
    GetOrderCreditHistoryRequest: MessageTypeDefinition<_credit_GetOrderCreditHistoryRequest, _credit_GetOrderCreditHistoryRequest__Output>
    GetReservationRequest: MessageTypeDefinition<_credit_GetReservationRequest, _credit_GetReservationRequest__Output>
    GetReservationResponse: MessageTypeDefinition<_credit_GetReservationResponse, _credit_GetReservationResponse__Output>
    GetUserCreditHistoryRequest: MessageTypeDefinition<_credit_GetUserCreditHistoryRequest, _credit_GetUserCreditHistoryRequest__Output>
    InitCreditsRequest: MessageTypeDefinition<_credit_InitCreditsRequest, _credit_InitCreditsRequest__Output>
    InitCreditsResponse: MessageTypeDefinition<_credit_InitCreditsResponse, _credit_InitCreditsResponse__Output>
    ReleaseCreditsRequest: MessageTypeDefinition<_credit_ReleaseCreditsRequest, _credit_ReleaseCreditsRequest__Output>
    Reservation: MessageTypeDefinition<_credit_Reservation, _credit_Reservation__Output>
    ReservationStatus: EnumTypeDefinition
    ReserveCreditsRequest: MessageTypeDefinition<_credit_ReserveCreditsRequest, _credit_ReserveCreditsRequest__Output>
    SettleCreditsRequest: MessageTypeDefinition<_credit_SettleCreditsRequest, _credit_SettleCreditsRequest__Output>
    UpdateReservationRequest: MessageTypeDefinition<_credit_UpdateReservationRequest, _credit_UpdateReservationRequest__Output>
  }
  google: {
    protobuf: {
      Timestamp: MessageTypeDefinition<_google_protobuf_Timestamp, _google_protobuf_Timestamp__Output>
    }
  }
}

