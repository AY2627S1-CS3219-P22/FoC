// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Connected approved Order REST contracts to existing UI types; review pending.
// Prompts and verification: ../../order-service/usage-log.md.
import type { Order } from "../App"
import { apiWithStatus } from "./client"

export type OrderInput = {
  supplierId: string
  destination: string
  requestDetails: string
  credits: number
  expiryTime: string
}
export type OrderScope = "open" | "requested" | "assigned"
export type ApiOrder = {
  id: string
  supplierId: string
  pickupLocation: string
  pickupStore: string
  destination: string
  requestDetails: string
  credits: number
  expiryTime: string
  status: "UNASSIGNED" | "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED"
  creditState: string
  cancellationReason: string | null
  requesterId: string
  requesterName: string
  courierId: string | null
  courierName: string | null
  createdAt: string
}
export function fromApiOrder(row: ApiOrder): Order {
  const status: Order["status"] =
    row.status === "UNASSIGNED"
      ? "open"
      : row.status === "ASSIGNED"
        ? "accepted"
        : row.status === "PICKED_UP"
          ? "picked-up"
          : row.status === "DELIVERED"
            ? row.creditState === "SETTLED"
              ? "completed"
              : "delivered"
            : row.cancellationReason === "EXPIRY"
              ? "expired"
              : "cancelled"
  return {
    ...row,
    status,
    deliveryLocation: row.destination,
    description: row.requestDetails,
    deadline: new Date(row.expiryTime).toLocaleString("en-SG"),
    courierId: row.courierId ?? undefined,
    courierName: row.courierName ?? undefined,
  }
}
export async function getOrders(scope?: OrderScope) {
  const { data } = await apiWithStatus<{ orders: ApiOrder[] }>(
    `/orders${scope ? `?scope=${scope}` : ""}`,
  )
  return data.orders.map(fromApiOrder)
}
export async function createOrder(body: OrderInput, key: string) {
  const { status, data } = await apiWithStatus<{
    order?: ApiOrder
    creationId?: string
    state?: string
  }>("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  })
  return {
    status,
    order: data.order ? fromApiOrder(data.order) : undefined,
    creationId: data.creationId,
  }
}
export async function changeOrder(
  id: string,
  action: "accept" | "cancel" | "deliver",
) {
  const { status, data } = await apiWithStatus<{ order: ApiOrder }>(
    `/orders/${encodeURIComponent(id)}/${action}`,
    { method: "POST" },
  )
  return { status, order: fromApiOrder(data.order) }
}
export async function editOrder(
  id: string,
  body: Partial<OrderInput>,
  key: string,
) {
  const { status, data } = await apiWithStatus<{ order: ApiOrder }>(
    `/orders/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    },
  )
  return { status, order: fromApiOrder(data.order) }
}
