// AI-assisted (Claude), reviewed and tested by Maliha
import { useEffect, useState } from "react"
import type { Order } from "../App"
import { getOrderDetails, orderError, updateOrder, type OrderAction } from "../api/orders"

// Loads one order and runs accept / pickup / deliver / cancel on it.
// Used by the details page and the active errand page.
export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoadError("")
    getOrderDetails(id)
      .then(setOrder)
      .catch((err) => setLoadError(orderError(err)))
  }

  useEffect(load, [id])

  // returns the updated order, or null if it failed (error is shown on the page)
  const run = async (action: OrderAction) => {
    setBusy(true)
    setActionError("")
    try {
      const updated = await updateOrder(id, action)
      setOrder(updated)
      return updated
    } catch (err) {
      setActionError(orderError(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  return { order, loadError, actionError, busy, reload: load, run }
}