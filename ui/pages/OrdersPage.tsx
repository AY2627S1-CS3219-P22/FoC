import { useState } from "react"
import type { Order, Page } from "../App"
import RequestCard from "../components/RequestCard"

interface Props {
  orders: Order[]
  onNavigate: (page: Page) => void
  onSelectOrder: (id: string) => void
}

export default function OrdersPage({ orders, onNavigate, onSelectOrder }: Props) {
  const [search, setSearch] = useState("")
  const query = search.trim().toLowerCase()
  const openOrders = orders.filter((order) => order.status === "open")
  const visibleOrders = openOrders.filter((order) =>
    order.pickupStore.toLowerCase().includes(query) ||
    order.deliveryLocation.toLowerCase().includes(query)
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-[#162A46]">Open Requests</h1>
          <p className="text-sm text-[#3F6B5A]">Help another student with an errand on campus.</p>
        </div>
        <button onClick={() => onNavigate("create-request")} className="rounded-lg bg-[#1A4A36] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#163D2C]">Create Request</button>
      </div>
      <div className="mb-5">
        <label htmlFor="order-search" className="mb-1.5 block text-xs font-medium text-[#1B2522]">Search open requests</label>
        <input
          id="order-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search pickup supplier or delivery location…"
          className="w-full rounded-lg border border-[#E4E8E6] bg-white px-3.5 py-2.5 text-sm text-[#1B2522] placeholder-[#9CA3AF] transition-colors focus:border-[#1A4A36] focus:outline-none focus:ring-1 focus:ring-[#1A4A36]"
        />
        <p role="status" className="mt-2 text-xs text-[#3F6B5A]">{visibleOrders.length} open request{visibleOrders.length === 1 ? "" : "s"}{query ? " found" : ""}</p>
      </div>
      {visibleOrders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-1 text-sm font-medium text-[#162A46]">{query ? "No matching requests" : "No open errands right now"}</p>
          <p className="text-xs text-[#3F6B5A]">{query ? "Try another pickup supplier or delivery location." : "Check again later or create your own request."}</p>
          {query && <button onClick={() => setSearch("")} className="mt-3 text-xs font-semibold text-[#1A4A36] underline">Clear search</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {visibleOrders.map((order) => <RequestCard key={order.id} order={order} onClick={() => onSelectOrder(order.id)} />)}
        </div>
      )}
    </div>
  )
}
