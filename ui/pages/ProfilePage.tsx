// AI Assistance Disclosure: ChatGPT (Codex, GPT-6), 2026-11-12.
// Scope: UI order editing, credit-history details, confirmation wrapping, and regression checks.
// Human review pending. Exact prompts and verification: ui/ai-usage/ui-order-fix.md.
import { useEffect, useState } from "react"
import type { User, Order, Page } from "../App"
import { formatTime, listOrders } from "../api/orders"
import { creditChange, creditDescription, getCreditHistory, type CreditEntry } from "../api/credits"

interface Props {
  user: User
  onNavigate: (page: Page) => void
  onLogout: () => void
  onResetPassword: () => Promise<void>
}

export default function ProfilePage({ user, onNavigate, onLogout, onResetPassword }: Props) {
  const [resetError, setResetError] = useState("")
  const [resetting, setResetting] = useState(false)
  const [myRequests, setMyRequests]     = useState<Order[]>([])
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([])
  const [history, setHistory]           = useState<CreditEntry[] | null>(null)

  // stats just stay at 0 if order-service isn't up
  useEffect(() => {
    listOrders("requested").then(setMyRequests).catch(() => {})
    listOrders("assigned").then(setMyDeliveries).catch(() => {})
    getCreditHistory(10).then((r) => setHistory(r.entries)).catch(() => setHistory(null))
  }, [])

  const delivered = myDeliveries.filter((o) => o.status === "delivered")
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#162A46]">My Profile</h1>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-[#E4E8E6] rounded-xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#162A46] text-white text-lg font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[#162A46] mb-0.5">{user.name}</h2>
            <p className="text-sm text-[#3F6B5A] mb-3 truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#E8F1ED] text-[#1A4A36] text-xs font-semibold px-3 py-1.5 rounded-full">
                {user.credits ?? "–"} Credits
              </div>
              <span className="text-xs text-[#9CA3AF]">Member since {user.memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Requests created",  value: myRequests.length },
          { label: "Errands completed", value: delivered.length },
          { label: "Credits earned",    value: delivered.reduce((sum, o) => sum + o.credits, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#E4E8E6] rounded-xl p-4 text-center">
            <p className="text-xl font-semibold text-[#162A46]">{value}</p>
            <p className="text-xs text-[#3F6B5A] mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <div className="bg-white border border-[#E4E8E6] rounded-xl mb-3 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4E8E6]">
          <h3 className="text-sm font-semibold text-[#162A46]">Recent Requests</h3>
        </div>
        {myRequests.length === 0 ? (
          <p className="text-xs text-[#3F6B5A] text-center py-6">No requests yet</p>
        ) : (
          myRequests.slice(0, 3).map((order, i) => (
            <div
              key={order.id}
              className={`flex items-center justify-between px-5 py-3 ${i < Math.min(myRequests.length, 3) - 1 ? "border-b border-[#E4E8E6]" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-[#1B2522] font-medium truncate">
                  {order.pickupStore} → {order.deliveryLocation}
                </p>
                <p className="text-xs text-[#3F6B5A]">By {order.deadline}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ml-3 flex-shrink-0 uppercase tracking-wider ${
                  order.status === "delivered"
                    ? "bg-[#E8F1ED] text-[#1A4A36]"
                    : order.status === "open"
                    ? "bg-[#E8F1ED] text-[#1A4A36]"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {order.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Recent deliveries */}
      <div className="bg-white border border-[#E4E8E6] rounded-xl mb-3 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4E8E6]">
          <h3 className="text-sm font-semibold text-[#162A46]">Recent Deliveries</h3>
        </div>
        {myDeliveries.length === 0 ? (
          <p className="text-xs text-[#3F6B5A] text-center py-6">No deliveries yet</p>
        ) : (
          myDeliveries.slice(0, 3).map((order, i) => (
            <div
              key={order.id}
              className={`flex items-center justify-between px-5 py-3 ${i < Math.min(myDeliveries.length, 3) - 1 ? "border-b border-[#E4E8E6]" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-[#1B2522] font-medium truncate">
                  {order.pickupStore} → {order.deliveryLocation}
                </p>
                <p className="text-xs text-[#3F6B5A]">By {order.deadline}</p>
              </div>
              <span className="text-sm font-semibold text-[#1A4A36] ml-3 flex-shrink-0">
                +{order.credits} cr
              </span>
            </div>
          ))
        )}
      </div>

      {/* Credit history */}
      <div className="bg-white border border-[#E4E8E6] rounded-xl mb-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4E8E6]">
          <h3 className="text-sm font-semibold text-[#162A46]">Credit History</h3>
        </div>
        {!history || history.length === 0 ? (
          <p className="text-xs text-[#3F6B5A] text-center py-6">
            {history ? "No credit activity yet" : "Couldn't load credit history"}
          </p>
        ) : (
          history.map((entry, i) => {
            const change = creditChange(entry)
            const gained = change > 0
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-5 py-3 ${i < history.length - 1 ? "border-b border-[#E4E8E6]" : ""}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    gained ? "bg-[#E8F1ED]" : "bg-[#F7F9F8] border border-[#E4E8E6]"
                  }`}>
                    <span className={`text-[10px] font-bold ${gained ? "text-[#1A4A36]" : "text-[#3F6B5A]"}`}>
                      {gained ? "+" : "−"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#1B2522] break-words">{creditDescription(entry, [...myRequests, ...myDeliveries])}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatTime(entry.createdAt)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ml-4 flex-shrink-0 ${gained ? "text-[#1A4A36]" : "text-[#1B2522]"}`}>
                  {gained ? "+" : "−"}{Math.abs(change)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Actions */}
      {resetError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{resetError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          disabled={resetting}
          onClick={() => {
            setResetError("")
            setResetting(true)
            onResetPassword().catch((err) => {
              setResetError(err instanceof Error ? err.message : "Could not send a code.")
              setResetting(false)
            })
          }}
          className="flex-1 py-2.5 border border-[#E4E8E6] bg-white text-[#1B2522] text-sm font-medium rounded-lg hover:bg-[#F7F9F8] disabled:opacity-60"
        >
          {resetting ? "Sending code…" : "Reset password"}
        </button>
        <button
          onClick={() => onNavigate("delete-account")}
          className="flex-1 py-2.5 border border-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
        >
          Delete account
        </button>
        <button
          onClick={onLogout}
          className="flex-1 py-2.5 border border-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  )
}