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
  TRANSFER_OUT:        "Paid a courier",
  TRANSFER_IN:         "Paid for a completed request",
}

export const creditLabel = (entry: CreditEntry) => LABELS[entry.type] ?? entry.type

// Holding and returning credits doesn't change the total, only the reserved
// part, so show that change for those
export const creditChange = (entry: CreditEntry) =>
  entry.totalAmountChange !== 0 ? entry.totalAmountChange : -entry.totalReservedChange

// Reservations and order edits stay on the order. History shows the welcome
// grant plus settled payments: paying a courier, or being paid as the courier.
const VISIBLE_CREDIT_TYPES = new Set<CreditEntry["type"]>(["INITIAL_GRANT", "TRANSFER_OUT", "TRANSFER_IN"])

export function visibleCreditHistory(entries: CreditEntry[]): CreditEntry[] {
  return entries.filter(entry => VISIBLE_CREDIT_TYPES.has(entry.type))
}

// Same bookmark the credit service accepts: the history entry id, base64url-encoded.
function encodeHistoryBookmark(entryId: string) {
  return btoa(entryId).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export type CreditHistoryPage = { entries: CreditEntry[]; nextPageToken: string | null }

// One page of payments. Reservation rows are skipped, and the next token points
// at the last payment shown so the following page does not skip or repeat one.
export async function loadVisibleCreditHistory(limit = 5, pageToken?: string): Promise<CreditHistoryPage> {
  const visible: CreditEntry[] = []
  let token = pageToken
  let buffer: CreditEntry[] = []
  let index = 0
  let moreRaw = true
  let fetches = 0

  const nextRaw = async (): Promise<CreditEntry | null> => {
    if (index < buffer.length) return buffer[index++]
    if (!moreRaw || fetches >= 20) return null
    fetches += 1
    const result = await getCreditHistory(50, token)
    buffer = result.entries
    index = 0
    moreRaw = result.nextPageToken !== null
    token = result.nextPageToken ?? undefined
    if (buffer.length === 0) return null
    return buffer[index++]
  }

  while (visible.length < limit) {
    const entry = await nextRaw()
    if (!entry) return { entries: visible, nextPageToken: null }
    if (VISIBLE_CREDIT_TYPES.has(entry.type)) visible.push(entry)
  }

  while (true) {
    const entry = await nextRaw()
    if (!entry) return { entries: visible, nextPageToken: null }
    if (VISIBLE_CREDIT_TYPES.has(entry.type)) {
      return { entries: visible, nextPageToken: encodeHistoryBookmark(visible[visible.length - 1].id) }
    }
  }
}

export function creditDescription(entry: CreditEntry, orders: { id: string; description: string; pickupStore: string }[]) {
  const label = creditLabel(entry)
  if (!entry.orderId) return label
  const order = orders.find(order => order.id === entry.orderId)
  const detail = order
    ? [order.pickupStore, order.description].filter(Boolean).join(" — ")
    : ""
  return detail ? `${label} — ${detail}` : label
}
