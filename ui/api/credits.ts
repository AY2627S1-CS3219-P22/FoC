// AI Assistance Disclosure: ChatGPT (Codex, GPT-6), 2026-11-12.
// Scope: UI order editing, credit-history details, confirmation wrapping, and regression checks.
// Human review pending. Exact prompts and verification: ui/ai-usage/ui-order-fix.md.
// AI-assisted (Claude), reviewed and tested by Maliha
import { api } from "./client"

export type Balance = {
  userId: string
  totalCredits: number
  reservedCredits: number   // held for my open requests
  availableCredits: number  // what I can still spend
}

export type CreditEntry = {
  id: string
  orderId: string | null
  type: "INITIAL_GRANT" | "RESERVED" | "RESERVATION_UPDATED" | "RELEASED" | "TRANSFER_OUT" | "TRANSFER_IN"
  totalAmountChange: number
  totalReservedChange: number
  createdAt: string
}

export const getBalance = () => api<Balance>("/credits/me/balance")

// newest first; nextPageToken is null on the last page
export const getCreditHistory = (pageSize = 10, pageToken?: string) => {
  const query = new URLSearchParams({ pageSize: String(pageSize) })
  if (pageToken) query.set("pageToken", pageToken)
  return api<{ entries: CreditEntry[]; nextPageToken: string | null }>(`/credits/me/history?${query}`)
}

const LABELS: Record<CreditEntry["type"], string> = {
  INITIAL_GRANT:       "Welcome credits",
  RESERVED:            "Reserved for transaction",
  RESERVATION_UPDATED: "Request credits changed",
  RELEASED:            "Returned from a cancelled request",
  TRANSFER_OUT:        "Paid for a delivered request",
  TRANSFER_IN:         "Earned from a delivery",
}

export const creditLabel = (entry: CreditEntry) => LABELS[entry.type] ?? entry.type

// Holding and returning credits doesn't change the total, only the reserved
// part, so show that change for those
export const creditChange = (entry: CreditEntry) =>
  entry.totalAmountChange !== 0 ? entry.totalAmountChange : -entry.totalReservedChange

// Credit-service appends RESERVATION_UPDATED rows for amount edits. Fold those
// into the original RESERVED row so the profile list shows one edited hold.
export function collapseCreditHistory(entries: CreditEntry[]): CreditEntry[] {
  const reservedByOrder = new Map<string, CreditEntry>()
  const chronological: CreditEntry[] = []

  for (const entry of [...entries].reverse()) {
    if (entry.type === "RESERVED" && entry.orderId) {
      const merged = { ...entry }
      reservedByOrder.set(entry.orderId, merged)
      chronological.push(merged)
      continue
    }
    if (entry.type === "RESERVATION_UPDATED" && entry.orderId) {
      const base = reservedByOrder.get(entry.orderId)
      if (base) {
        base.totalReservedChange += entry.totalReservedChange
        continue
      }
      // Base reserve may sit on an earlier page — still show one hold row.
      const merged = { ...entry, type: "RESERVED" as const }
      reservedByOrder.set(entry.orderId, merged)
      chronological.push(merged)
      continue
    }
    chronological.push(entry)
  }

  return chronological.reverse()
}

export function creditDescription(entry: CreditEntry, orders: { id: string; description: string; pickupStore: string }[]) {
  if (!entry.orderId) return creditLabel(entry)
  const order = orders.find(order => order.id === entry.orderId)
  const detail = order
    ? [order.pickupStore, order.description].filter(Boolean).join(" — ")
    : `Order ${entry.orderId}`
  return `${detail} (${creditLabel(entry)})`
}
