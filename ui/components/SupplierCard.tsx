import { useEffect, useState } from "react"
import { categoryLabel, getSupplier, supplierLocation, type SupplierDetail } from "../api/suppliers"
import LoadMessage from "./LoadMessage"
import OpenBadge from "./OpenBadge"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
// list Monday first, as people read a week
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "")

// hours are campus-local, so "today" is Singapore's day, not the browser's
const singaporeDay = () =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Singapore", weekday: "short" }).format(new Date()),
  )

// Modal with everything GET /supplier/:id returns for one supplier
export default function SupplierCard({ supplierId, onClose }: { supplierId: number; onClose: () => void }) {
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let stale = false
    setError("")
    getSupplier(supplierId)
      .then((data) => { if (!stale) setSupplier(data) })
      .catch(() => { if (!stale) setError("Couldn't load this supplier.") })
    return () => { stale = true }
  }, [supplierId, attempt])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const today = singaporeDay()
  const hasImage = supplier?.imageURL?.startsWith("http")

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={supplier?.name ?? "Supplier"}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!supplier || error ? (
          <div className="p-6">
            <LoadMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />
          </div>
        ) : (
          <>
            {hasImage && (
              <img
                src={supplier.imageURL}
                alt=""
                className="w-full h-40 object-cover rounded-t-2xl"
                onError={(e) => { e.currentTarget.style.display = "none" }}
              />
            )}

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-base font-semibold text-[#162A46]">{supplier.name}</h3>
                <OpenBadge isOpen={supplier.isOpen} />
              </div>
              <p className="text-xs text-[#3F6B5A] mb-4">
                {categoryLabel(supplier.type)} · {supplierLocation(supplier)}
              </p>

              {supplier.locationDescription && (
                <div className="bg-[#F7F9F8] border border-[#E4E8E6] rounded-lg px-4 py-3 mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">Where to find it</p>
                  <p className="text-sm text-[#1B2522]">{supplier.locationDescription}</p>
                </div>
              )}

              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">Opening hours</p>
              <ul className="divide-y divide-[#F0F2F1] mb-5">
                {WEEK_ORDER.map((day) => {
                  const h = supplier.openingHours.find((x) => x.dayOfWeek === day)
                  const closed = !h || h.isClosed || !h.opensAt || !h.closesAt
                  return (
                    <li
                      key={day}
                      className={`flex justify-between py-1.5 text-sm ${day === today ? "font-semibold text-[#162A46]" : "text-[#3F6B5A]"}`}
                    >
                      <span>{DAYS[day]}</span>
                      <span>{closed ? "Closed" : `${hhmm(h.opensAt)} – ${hhmm(h.closesAt)}`}</span>
                    </li>
                  )
                })}
              </ul>

              <button
                onClick={onClose}
                className="w-full py-2.5 border border-[#E4E8E6] text-[#1B2522] text-sm font-medium rounded-lg hover:bg-[#F7F9F8] transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
