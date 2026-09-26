import { useState } from "react"
import type { Order, User } from "../App"
import RequestCard from "../components/RequestCard"
import type { ComponentProps } from "react"
type CardActions = NonNullable<ComponentProps<typeof RequestCard>["actions"]>

type Tab = "my-requests" | "my-deliveries"

const TABS: { key: Tab; label: string }[] = [
  { key: "my-requests",   label: "My Requests" },
  { key: "my-deliveries", label: "My Deliveries" },
]


interface Props {
  orders: Order[]
  user: User
  onSelectOrder: (id: string) => void
  onDeleteOrder: (id: string) => void
  onMarkPickedUp: (id: string) => void
  onMarkDelivered: (id: string) => void
  onConfirmDelivery: (id: string) => void
  onReleaseCredits: (id: string) => void
}

export default function MyOrdersPage({
  orders, user, onSelectOrder,
  onDeleteOrder, onMarkPickedUp, onMarkDelivered,
  onConfirmDelivery, onReleaseCredits,
}: Props) {
  const [tab, setTab] = useState<Tab>("my-requests")

  const filtered = orders.filter((o) => {
    if (tab === "my-requests")   return o.requesterId === user.id
    if (tab === "my-deliveries") return o.courierId === user.id
    return true
  })

  const activeRequests   = orders.filter((o) => o.requesterId === user.id && o.status !== "completed" && o.status !== "cancelled").length
  const activeDeliveries = orders.filter((o) => o.courierId === user.id && o.status !== "completed").length

  function getActions(order: Order): CardActions {
    if (tab === "my-deliveries" && order.courierId === user.id) {
      return {
        onMarkPickedUp:  order.status === "accepted"  ? () => onMarkPickedUp(order.id)  : undefined,
        onMarkDelivered: order.status === "picked-up" ? () => onMarkDelivered(order.id) : undefined,
      }
    }
    if (tab === "my-requests" && order.requesterId === user.id) {
      const inProgress = ["accepted", "picked-up", "delivered"].includes(order.status)
      return {
        onConfirm:       inProgress ? () => onConfirmDelivery(order.id) : undefined,
        onReleaseCredits: inProgress ? () => onReleaseCredits(order.id) : undefined,
        onDelete: order.status === "open" ? () => onDeleteOrder(order.id) : undefined,
      }
    }
    return {}
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-[#162A46] mb-1">My orders</h1>
        <p className="text-sm text-[#3F6B5A]">Track your requests and deliveries, including completed orders.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "Active requests",   value: activeRequests,   unit: "" },
          { label: "Active deliveries", value: activeDeliveries, unit: "" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-white border border-[#E4E8E6] rounded-xl p-4">
            <p className="text-[11px] text-[#3F6B5A] mb-1 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-semibold text-[#162A46]">
              {value}
              {unit && <span className="text-xs font-normal text-[#3F6B5A] ml-1">{unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E4E8E6] mb-5 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
              tab === key
                ? "border-[#1A4A36] text-[#1A4A36]"
                : "border-transparent text-[#3F6B5A] hover:text-[#1B2522]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-[#E8F1ED] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-[#3F6B5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#162A46] mb-1">{tab === "my-requests" ? "No requests yet" : "No deliveries yet"}</p>
          <p className="text-xs text-[#3F6B5A]">{tab === "my-requests" ? "Create a request to get started." : "Browse open requests to accept your first errand."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {filtered.map((order) => (
            <RequestCard
              key={order.id}
              order={order}
              onClick={() => onSelectOrder(order.id)}
              actions={getActions(order)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
