// AI Assistance Disclosure: ChatGPT (Codex, GPT-6), 2026-11-12.
// Scope: UI order editing, credit-history details, confirmation wrapping, and regression checks.
// Human review pending. Exact prompts and verification: ui/ai-usage/ui-order-fix.md.
// ChatGPT (Codex), 2026-11-03: Single-order retrieval with approved visibility rules; review pending; see order-service/usage-log.md.
// AI-assisted (Claude), reviewed and tested by Maliha
import { useEffect, useState } from "react"
import type { Order } from "../App"
import { getOrder, orderError, updateOrder, type OrderAction } from "../api/orders"

// Refresh details from the backend, then run lifecycle actions.
export function useOrder(initial: Order) {
  const [order, setOrder] = useState(initial)
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError("")
    getOrder(initial.id, controller.signal)
      .then(updated => { if (!controller.signal.aborted) setOrder(updated) })
      .catch(error => { if (!controller.signal.aborted) setLoadError(orderError(error)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [initial.id])

  // returns the updated order, or null if it failed (error is shown on the page)
  const run = async (action: OrderAction) => {
    if (loading || loadError || busy) return null
    setBusy(true)
    setActionError("")
    try {
      const updated = await updateOrder(order.id, action)
      setOrder(updated)
      return updated
    } catch (err) {
      setActionError(orderError(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  return { order, setOrder, actionError, busy: busy || loading, loadError, run }
}