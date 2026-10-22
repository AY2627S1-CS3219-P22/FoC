// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Connected approved Order UI/API flow; author review pending.
// Prompts and verification: ../order-service/usage-log.md.
import { useEffect, useRef, useState } from "react"
import Navbar from "./components/Navbar"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import OrdersPage from "./pages/OrdersPage"
import MyOrdersPage from "./pages/MyOrdersPage"
import CreateRequestPage from "./pages/CreateRequestPage"
import OrderDetailsPage from "./pages/OrderDetailsPage"
import AcceptedOrderPage from "./pages/AcceptedOrderPage"
import ProfilePage from "./pages/ProfilePage"
import AdminPage from "./pages/AdminPage"
import SuppliersPage from "./pages/SuppliersPage"
import {
  getOrders,
  createOrder,
  editOrder,
  changeOrder,
  type OrderInput,
} from "./api/orders"
import { api, ApiError } from "./api/client"
import { getMe, logout, type ApiUser } from "./api/users"
import { refreshToken } from "./api/client"

export type Page = "login" | "signup" | "orders" | "my-orders" | "create-request" | "edit-request" | "create-success" | "order-details" | "accepted-order" | "errand-complete" | "profile" | "admin" | "suppliers"

export interface Order {
  supplierId: string
  expiryTime: string
  creditState: string
  cancellationReason: string | null
  id: string
  pickupLocation: string
  pickupStore: string
  deliveryLocation: string
  description: string
  credits: number
  deadline: string
  status: "open" | "accepted" | "picked-up" | "delivered" | "completed" | "cancelled" | "expired"
  requesterId: string
  requesterName: string
  courierId?: string
  courierName?: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  credits: number | null
  roles: string[]
  memberSince: string
  requestsCreated: number
  errandsCompleted: number
  creditsEarned: number
}

const CURRENT_USER: User = {
  id: "",
  name: "",
  email: "",
  credits: null,
  roles: [],
  memberSince: "",
  requestsCreated: 0,
  errandsCompleted: 0,
  creditsEarned: 0,
}
const fromApiUser = (u: ApiUser): User => ({
  ...CURRENT_USER,
  id: u.id,
  name: `${u.firstName} ${u.lastName}`,
  email: u.email,
  roles: u.roles,
  memberSince: new Date(u.createdAt).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  }),
})
type PendingRequest = {
  kind: "create" | "edit"
  orderId?: string
  key: string
  body: OrderInput
}

function SuccessScreen({
  title,
  subtitle,
  accent,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  title: string
  subtitle: string
  accent?: string
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="text-center max-w-xs mx-auto">
        <div className="w-14 h-14 rounded-full bg-[#E8F1ED] flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-7 h-7 text-[#1A4A36]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#162A46] mb-1">{title}</h2>
        {accent && (
          <p className="text-2xl font-bold text-[#1A4A36] mb-1">{accent}</p>
        )}
        <p className="text-sm text-[#3F6B5A] mb-8 leading-relaxed">
          {subtitle}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onPrimary}
            className="w-full py-2.5 px-4 bg-[#1A4A36] text-white text-sm font-medium rounded-lg hover:bg-[#163D2C] transition-colors"
          >
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="w-full py-2.5 px-4 border border-[#E4E8E6] bg-white text-[#1B2522] text-sm font-medium rounded-lg hover:bg-[#F7F9F8] transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>("login")
  const [checkingSession, setCheckingSession] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User>(CURRENT_USER)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [acceptedOrderId, setAcceptedOrderId] = useState<string | null>(null)
  const [orderReturnPage, setOrderReturnPage] =
    useState<"orders" | "my-orders">("orders")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const session = useRef(0)
  const navigate = (next: Page, orderId?: string) => {
    if (next === "order-details" && (page === "orders" || page === "my-orders"))
      setOrderReturnPage(page)
    if (orderId) setSelectedOrderId(orderId)
    setPage(next)
    window.scrollTo({ top: 0, behavior: "instant" })
  }
  const report = (e: unknown) => {
    setError(
      e instanceof Error ? e.message : "Request failed. Please try again.",
    )
    if (e instanceof ApiError && e.status === 401) {
      session.current++
      setIsLoggedIn(false)
      setOrders([])
      setUser(CURRENT_USER)
    }
  }
  const loadUser = async () => {
    const version = ++session.current
    try {
      const profile = await getMe()
      if (session.current !== version) return
      setUser(fromApiUser(profile))
      setIsLoggedIn(true)
      setPage("orders")
      const saved = sessionStorage.getItem("order-request:" + profile.id)
      try {
        setPending(saved ? JSON.parse(saved) : null)
      } catch {
        setPending(null)
      }
      api<{ availableCredits: number }>("/credits/me/balance")
        .then((balance) => {
          if (session.current === version)
            setUser((current) => ({
              ...current,
              credits: Number.isFinite(balance.availableCredits)
                ? balance.availableCredits
                : null,
            }))
        })
        .catch(() => {})
    } catch (e) {
      if (session.current === version) report(e)
    }
  }
  useEffect(() => {
    refreshToken()
      .then((token) => (token ? loadUser() : undefined))
      .finally(() => setCheckingSession(false))
    return () => {
      session.current++
    }
  }, [])
  const handleLogout = () => {
    session.current++
    logout().catch(() => {})
    localStorage.removeItem("token")
    setIsLoggedIn(false)
    setUser(CURRENT_USER)
    setOrders([])
    setPending(null)
    setError("")
    setMessage("")
    navigate("login")
  }
  useEffect(() => {
    if (!isLoggedIn) return
    let current = true
    const load = async () => {
      setLoading(true)
      try {
        const lists =
          page === "admin"
            ? [await getOrders()]
            : await Promise.all([
                getOrders("open"),
                getOrders("requested"),
                getOrders("assigned"),
              ])
        if (current) {
          setOrders([
            ...new Map(lists.flat().map((order) => [order.id, order])).values(),
          ])
          setError("")
        }
      } catch (e) {
        if (current) {
          setOrders([])
          report(e)
        }
      } finally {
        if (current) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(load, 15000)
    return () => {
      current = false
      window.clearInterval(timer)
    }
  }, [isLoggedIn, user.id, page, revision])
  const refreshBalance = () => {
    const version = session.current
    api<{ availableCredits: number }>("/credits/me/balance")
      .then((balance) => {
        if (session.current === version)
          setUser((current) => ({
            ...current,
            credits: Number.isFinite(balance.availableCredits)
              ? balance.availableCredits
              : null,
          }))
      })
      .catch(() => {
        if (session.current === version)
          setUser((current) => ({ ...current, credits: null }))
      })
  }
  const run = async (work: () => Promise<void>) => {
    const version = session.current
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await work()
    } catch (e) {
      if (session.current === version) report(e)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const savePending = (request: PendingRequest | null) => {
    if (request)
      sessionStorage.setItem(
        "order-request:" + user.id,
        JSON.stringify(request),
      )
    else sessionStorage.removeItem("order-request:" + user.id)
    setPending(request)
  }
  const submitRequest = (request: PendingRequest) =>
    run(async () => {
      // Persist body and key BEFORE sending: uncertain requests must reuse both.
      savePending(request)
      const version = session.current
      try {
        const result =
          request.kind === "create"
            ? await createOrder(request.body, request.key)
            : await editOrder(request.orderId!, request.body, request.key)
        if (session.current !== version) return
        if (result.order)
          setOrders((old) => [
            result.order!,
            ...old.filter((order) => order.id !== result.order!.id),
          ])
        if (result.status === 202) {
          setMessage(
            "Your request is pending. Recovery continues automatically; check again using the same request.",
          )
          navigate("my-orders")
        } else {
          savePending(null)
          navigate(request.kind === "create" ? "create-success" : "my-orders")
          setMessage(request.kind === "edit" ? "Order updated." : "")
        }
        refreshBalance()
        setRevision((value) => value + 1)
      } catch (e) {
        if (session.current !== version) return
        // A confirmed input/permission/business rejection may be corrected as a new request.
        if (e instanceof ApiError && [400, 403, 404, 409].includes(e.status))
          savePending(null)
        throw e
      }
    })
  const command = (id: string, action: "accept" | "cancel" | "deliver") =>
    run(async () => {
      const version = session.current
      const result = await changeOrder(id, action)
      if (session.current !== version) return
      setOrders((old) => [
        result.order,
        ...old.filter((order) => order.id !== id),
      ])
      setMessage(
        result.status === 202
          ? "Order saved. Credit processing is pending; no payment confirmation yet."
          : "Order updated.",
      )
      if (action === "accept") {
        setAcceptedOrderId(id)
        navigate("accepted-order", id)
      }
      if (action === "cancel") navigate("my-orders")
      refreshBalance()
      setRevision((value) => value + 1)
    })
  const selectedOrder = orders.find((order) => order.id === selectedOrderId)
  const acceptedOrder = orders.find((order) => order.id === acceptedOrderId)
  const unavailablePickup = () =>
    setError(
      "Pickup is not available in the current Order Service. No order changes were made.",
    )
  const controls = (
    <div className="mx-auto max-w-6xl px-4 py-3 space-y-2">
      {loading && <p role="status">Loading orders…</p>}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {pending && (
        <p role="status">
          An order {pending.kind === "edit" ? "edit" : "creation"} needs
          confirmation.{" "}
          <button
            disabled={busy}
            onClick={() => void submitRequest(pending)}
            className="underline"
          >
            Check / retry original request
          </button>
        </p>
      )}
      <button
        disabled={busy || loading}
        onClick={() => {
          setRevision((value) => value + 1)
          refreshBalance()
        }}
        className="text-sm underline"
      >
        Refresh orders and balance
      </button>
    </div>
  )
  if (checkingSession) return <p role="status">Checking session…</p>
  if (!isLoggedIn)
    return (
      <>
        {error && <p role="alert">{error}</p>}
        {page === "signup" ? (
          <SignupPage onLogin={() => void loadUser()} onNavigate={navigate} />
        ) : (
          <LoginPage onLogin={() => void loadUser()} onNavigate={navigate} />
        )}
      </>
    )
  const statsUser = {
    ...user,
    requestsCreated: orders.filter((o) => o.requesterId === user.id).length,
    errandsCompleted: orders.filter(
      (o) => o.courierId === user.id && o.status === "completed",
    ).length,
    creditsEarned: orders
      .filter((o) => o.courierId === user.id && o.creditState === "SETTLED")
      .reduce((sum, o) => sum + o.credits, 0),
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar
        user={statsUser}
        currentPage={page}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      {controls}
      <fieldset
        disabled={busy}
        aria-busy={busy}
        className="min-w-0 flex-1 border-0 p-0 m-0 pb-16"
      >
        {page === "orders" && !loading && !error && (
          <OrdersPage
            orders={orders.filter(
              (o) =>
                o.requesterId !== user.id &&
                new Date(o.expiryTime).getTime() > Date.now(),
            )}
            onNavigate={navigate}
            onSelectOrder={(id) => navigate("order-details", id)}
          />
        )}
        {page === "my-orders" && !loading && !error && (
          <MyOrdersPage
            orders={orders}
            user={statsUser}
            onSelectOrder={(id) => navigate("order-details", id)}
            onDeleteOrder={(id) => void command(id, "cancel")}
            onMarkPickedUp={unavailablePickup}
            onMarkDelivered={(id) => void command(id, "deliver")}
          />
        )}
        {(page === "create-request" || page === "edit-request") &&
          (pending && !busy ? (
            <p className="p-6">
              Check the pending request above before submitting another order or
              edit.
            </p>
          ) : (
            <CreateRequestPage
              key={page === "edit-request" ? selectedOrderId : "create"}
              user={statsUser}
              initialOrder={page === "edit-request" ? selectedOrder : undefined}
              onNavigate={navigate}
              onSubmit={(body) =>
                void submitRequest({
                  kind: page === "edit-request" ? "edit" : "create",
                  orderId:
                    page === "edit-request" ? selectedOrderId : undefined,
                  key: crypto.randomUUID(),
                  body,
                })
              }
            />
          ))}
        {page === "create-success" && (
          <SuccessScreen
            title="Request created"
            subtitle="Your request is now visible to available couriers."
            primaryLabel="Back to Orders"
            secondaryLabel="View Requests"
            onPrimary={() => navigate("orders")}
            onSecondary={() => navigate("my-orders")}
          />
        )}
        {page === "order-details" && selectedOrder && (
          <OrderDetailsPage
            order={selectedOrder}
            currentUserId={user.id}
            onBack={() => navigate(orderReturnPage)}
            onAccept={(id) => void command(id, "accept")}
            onEdit={
              selectedOrder.requesterId === user.id &&
              selectedOrder.status === "open"
                ? () => navigate("edit-request")
                : undefined
            }
            onDelete={
              selectedOrder.requesterId === user.id &&
              selectedOrder.status === "open"
                ? () => void command(selectedOrder.id, "cancel")
                : undefined
            }
            onMarkDelivered={
              selectedOrder.courierId === user.id &&
              selectedOrder.status === "picked-up"
                ? () => void command(selectedOrder.id, "deliver")
                : undefined
            }
          />
        )}
        {page === "order-details" && !selectedOrder && !loading && (
          <p className="p-6">
            This order is no longer in your current listings.{" "}
            <button onClick={() => navigate("orders")}>Back to orders</button>
          </p>
        )}
        {page === "accepted-order" && acceptedOrder && (
          <AcceptedOrderPage
            order={acceptedOrder}
            onMarkPickedUp={unavailablePickup}
            onMarkDelivered={(id) => void command(id, "deliver")}
            onBack={() => navigate("orders")}
          />
        )}
        {page === "suppliers" && <SuppliersPage />}
        {page === "profile" && (
          <ProfilePage
            user={statsUser}
            orders={orders}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        )}
        {page === "admin" && user.roles.includes("ADMINISTRATOR") && (
          <AdminPage orders={orders} user={statsUser} onNavigate={navigate} />
        )}
        {page === "admin" && !user.roles.includes("ADMINISTRATOR") && (
          <p role="alert">Administrator access is required.</p>
        )}
      </fieldset>
    </div>
  )
}
