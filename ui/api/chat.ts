// AI-assisted (Claude), reviewed and tested by Maliha
import { io, type Socket } from "socket.io-client"
import { api, refreshToken } from "./client"

export type ChatMessage = {
  id: string
  orderId: string
  senderId: string
  body: string
  sentAt: string
  readAt: string | null
}

export type ChatErrorCode = "invalid-input" | "forbidden" | "not-started" | "closed" | "blocked" | "unavailable"

export type JoinReply =
  | { messages: ChatMessage[]; canSend: boolean; me: string; other: string | null }
  | { error: ChatErrorCode }

export type SendReply =
  | { message: ChatMessage; masked: boolean }
  | { error: ChatErrorCode }

export const CHAT_ERRORS: Record<ChatErrorCode, string> = {
  "invalid-input": "That message couldn't be sent.",
  "forbidden":     "This chat is only for the requester and courier.",
  "not-started":   "Chat opens once a courier accepts this request.",
  "closed":        "This errand has ended, so the chat is closed.",
  "blocked":       "Message not sent. It looks like it breaks the community rules, and has been reported to admins.",
  "unavailable":   "Chat isn't available right now. Try again in a bit.",
}

// One socket for the whole app; the chat panel joins rooms on it.
// The token is read on every (re)connect, so a refreshed one gets picked up.
let socket: Socket | null = null

export function getChatSocket() {
  if (socket) return socket
  socket = io({
    path: "/backend/chat/socket.io",
    auth: (cb) => cb({ token: localStorage.getItem("token") }),
  })
  // access token expired: get a new one and try again
  socket.on("connect_error", async (err) => {
    if (err.message === "unauthorized" && (await refreshToken())) socket?.connect()
  })
  return socket
}

// on logout, so the next user doesn't reuse this connection
export function closeChatSocket() {
  socket?.close()
  socket = null
}

// emit with a reply, as a promise. Times out so a dead connection doesn't hang the UI
export function ask<T>(event: string, payload: object): Promise<T> {
  return getChatSocket()
    .timeout(8000)
    .emitWithAck(event, payload)
    .catch(() => ({ error: "unavailable" }) as T)
}

// ── Admin: flagged messages ──

export type Flag = {
  id: string
  orderId: string
  userId: string
  userName: string
  originalText: string
  action: "masked" | "blocked"
  flaggedAt: string
  reviewedAt: string | null
}

export const getFlags = (includeReviewed = false) =>
  api<{ flags: Flag[] }>(`/chat/flags${includeReviewed ? "?include=reviewed" : ""}`).then((r) => r.flags)

export const reviewFlag = (id: string) =>
  api<unknown>(`/chat/flags/${id}/review`, { method: "POST" })