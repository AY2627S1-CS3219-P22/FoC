// AI-assisted (Claude), reviewed and tested by Maliha
import { useEffect, useState } from "react"
import {
  ask, getChatSocket,
  type ChatErrorCode, type ChatMessage, type JoinReply, type SendReply,
} from "../api/chat"

// Live chat for one errand: history, new messages, read receipts.
// chat-service decides who's allowed in and whether sending is still open.
export function useChat(orderId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [me, setMe]             = useState("")
  const [other, setOther]       = useState<string | null>(null)
  const [canSend, setCanSend]   = useState(false)
  const [error, setError]       = useState<ChatErrorCode | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const socket = getChatSocket()
    let myId = ""

    const join = async () => {
      const reply = await ask<JoinReply>("chat:join", { orderId })
      setLoading(false)
      if ("error" in reply) {
        setError(reply.error)
        return
      }
      myId = reply.me
      setError(null)
      setMe(reply.me)
      setOther(reply.other)
      setCanSend(reply.canSend)
      setMessages(reply.messages)
    }

    const onMessage = (m: ChatMessage) => {
      if (m.orderId !== orderId) return
      // my own message also arrives here, after the send reply added it
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      // it's on screen, so it's read
      if (m.senderId !== myId) ask("chat:read", { orderId })
    }

    // the other person has seen everything I sent so far
    const onRead = (r: { orderId: string; readerId: string }) => {
      if (r.orderId !== orderId || r.readerId === myId) return
      const now = new Date().toISOString()
      setMessages((prev) => prev.map((m) => (m.senderId === myId && !m.readAt ? { ...m, readAt: now } : m)))
    }

    // chat-service down: say so. Socket.IO keeps retrying and "connect" re-joins
    const onConnectError = (err: Error) => {
      if (err.message === "unauthorized") return
      setLoading(false)
      setError("unavailable")
    }

    socket.on("chat:message", onMessage)
    socket.on("chat:read", onRead)
    // also re-joins after a reconnect, which picks up anything missed
    socket.on("connect", join)
    socket.on("connect_error", onConnectError)
    if (socket.connected) join()

    return () => {
      socket.off("chat:message", onMessage)
      socket.off("chat:read", onRead)
      socket.off("connect", join)
      socket.off("connect_error", onConnectError)
      socket.emit("chat:leave", { orderId })
    }
  }, [orderId])

  // resolves to an error code, or null once it's sent
  const send = async (text: string): Promise<{ error: ChatErrorCode | null; masked: boolean }> => {
    const reply = await ask<SendReply>("chat:send", { orderId, text })
    if ("error" in reply) {
      if (reply.error === "closed") setCanSend(false)
      return { error: reply.error, masked: false }
    }
    setMessages((prev) => (prev.some((x) => x.id === reply.message.id) ? prev : [...prev, reply.message]))
    return { error: null, masked: reply.masked }
  }

  return { messages, me, other, canSend, error, loading, send }
}