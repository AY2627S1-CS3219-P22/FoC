import { useEffect, useState } from "react"
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
import { SEED_ORDERS } from "./api/orders"
import { getMe, logout, type ApiUser } from "./api/users"
import { refreshToken } from "./api/client"

export type Page =
  | "login"
  | "signup"
  | "orders"
  | "my-orders"
  | "create-request"
  | "create-success"
  | "order-details"
  | "accepted-order"
  | "errand-complete"
  | "profile"
  | "admin"
  | "suppliers"

export interface Order {
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
  credits: number
  memberSince: string
  requestsCreated: number
  errandsCompleted: number
  creditsEarned: number
  isAdmin: boolean
}

const CURRENT_USER: User = {
  id: "u1",
  name: "Jordan Tan",
  email: "jordan.tan@u.nus.edu",
  credits: 12,
  memberSince: "September 2026",
  requestsCreated: 2,
  errandsCompleted: 2,
  creditsEarned: 9,
  isAdmin: false,
}

// Credits and stats aren't in user-service, so those still come from the mock user for now
const fromApiUser = (u: ApiUser): User => ({
  ...CURRENT_USER,
  id: u.id,
  name: `${u.firstName} ${u.lastName}`,
  email: u.email,
  memberSince: new Date(u.createdAt).toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
  isAdmin: u.roles.includes("ADMINISTRATOR"),
})

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
          <svg className="w-7 h-7 text-[#1A4A36]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#162A46] mb-1">{title}</h2>
        {accent && <p className="text-2xl font-bold text-[#1A4A36] mb-1">{accent}</p>}
        <p className="text-sm text-[#3F6B5A] mb-8 leading-relaxed">{subtitle}</p>
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
  const [page, setPage]           = useState<Page>("login")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [user, setUser]           = useState<User>(CURRENT_USER)
  const [orders, setOrders]       = useState<Order[]>(SEED_ORDERS)
  const [selectedOrderId, setSelectedOrderId] = useState<string>("o1")
  const [acceptedOrderId, setAcceptedOrderId] = useState<string | null>(null)

  const [orderReturnPage, setOrderReturnPage] = useState<"orders" | "my-orders">("orders")

  const navigate = (p: Page, orderId?: string) => {
    if (p === "order-details" && (page === "orders" || page === "my-orders")) setOrderReturnPage(page)
    if (orderId) setSelectedOrderId(orderId)
    setPage(p)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  // keeps the mock user if user-service isn't running
  const loadUser = () => getMe().then((u) => setUser(fromApiUser(u))).catch(() => {})

  // Stay logged in across reloads if the refresh cookie is still valid
  useEffect(() => {
    refreshToken()
      .then((token) => {
        if (!token) return
        setIsLoggedIn(true)
        setPage("orders")
        loadUser()
      })
      .finally(() => setCheckingSession(false))
  }, [])

  const handleLogin = () => {
    setIsLoggedIn(true)
    loadUser()
    navigate("orders")
  }

  const handleLogout = () => {
    logout().catch(() => {})
    localStorage.removeItem("token")
    setUser(CURRENT_USER)
    setIsLoggedIn(false)
    navigate("login")
  }

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "accepted", courierId: user.id, courierName: user.name }
          : o
      )
    )
    setAcceptedOrderId(orderId)
    navigate("accepted-order", orderId)
  }

  const handleMarkPickedUp = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "picked-up" } : o))
    )
  }

  const handleMarkDelivered = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "completed" } : o))
    )
    navigate("errand-complete")
  }

  const completedOrderCredits =
    acceptedOrderId
      ? (orders.find((o) => o.id === acceptedOrderId)?.credits ?? 4)
      : 4

  if (checkingSession) return null

  // Unauthenticated
  if (!isLoggedIn) {
    if (page === "signup") return <SignupPage onLogin={handleLogin} onNavigate={navigate} />
    return <LoginPage onLogin={handleLogin} onNavigate={navigate} />
  }

  // Admin is a full-screen layout without the main Navbar
  if (page === "admin" && user.isAdmin) {
    return <AdminPage user={user} onNavigate={navigate} />
  }

  const selectedOrder  = orders.find((o) => o.id === selectedOrderId)
  const acceptedOrder  = orders.find((o) => o.id === acceptedOrderId)

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar user={user} currentPage={page} onNavigate={navigate} onLogout={handleLogout} />

      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {page === "orders" && (
          <OrdersPage orders={orders} onNavigate={navigate} onSelectOrder={(id) => navigate("order-details", id)} />
        )}

        {page === "my-orders" && (
          <MyOrdersPage
            orders={orders}
            user={user}
            onSelectOrder={(id) => navigate("order-details", id)}
            onDeleteOrder={(id) => setOrders((prev) => prev.filter((o) => o.id !== id))}
            onMarkPickedUp={handleMarkPickedUp}
            onMarkDelivered={(id) => setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "picked-up" } : o))}
            onConfirmDelivery={(id) => setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "completed" } : o))}
            onReleaseCredits={(id) => setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "completed" } : o))}
          />
        )}

        {page === "create-request" && (
          <CreateRequestPage
            user={user}
            onNavigate={navigate}
            onSubmit={(order) => {
              setOrders((prev) => [order, ...prev])
              setUser((prev) => ({ ...prev, credits: prev.credits - order.credits }))
              navigate("create-success")
            }}
          />
        )}

        {page === "create-success" && (
          <SuccessScreen
            title="Request created"
            subtitle="Your request is now visible to available couriers."
            primaryLabel="Back to Orders"
            secondaryLabel="View Requests"
            onPrimary={() => navigate("orders")}
            onSecondary={() => { navigate("my-orders") }}
          />
        )}

        {page === "order-details" && selectedOrder && (() => {
          const isRequester = selectedOrder.requesterId === user.id
          const isCourier   = selectedOrder.courierId   === user.id
          const inProgress  = ["accepted", "picked-up", "delivered"].includes(selectedOrder.status)
          return (
            <OrderDetailsPage
              order={selectedOrder}
              currentUserId={user.id}
              onBack={() => navigate(orderReturnPage)}
              onAccept={handleAcceptOrder}
              onDelete={isRequester && selectedOrder.status === "open"
                ? () => setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id))
                : undefined}
              onMarkPickedUp={isCourier && selectedOrder.status === "accepted"
                ? () => handleMarkPickedUp(selectedOrder.id)
                : undefined}
              onMarkDelivered={isCourier && selectedOrder.status === "picked-up"
                ? () => { setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: "completed" } : o)); navigate("orders") }
                : undefined}
              onConfirm={isRequester && inProgress
                ? () => setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: "completed" } : o))
                : undefined}
              onReleaseCredits={isRequester && inProgress
                ? () => { setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: "completed" } : o)); navigate("orders") }
                : undefined}
            />
          )
        })()}

        {page === "accepted-order" && acceptedOrder && (
          <AcceptedOrderPage
            order={acceptedOrder}
            onMarkPickedUp={handleMarkPickedUp}
            onMarkDelivered={handleMarkDelivered}
            onBack={() => navigate("orders")}
          />
        )}

        {page === "errand-complete" && (
          <SuccessScreen
            title="Errand completed"
            accent={`+${completedOrderCredits} Credits`}
            subtitle="Credits have been added to your balance."
            primaryLabel="Back to Orders"
            onPrimary={() => navigate("orders")}
          />
        )}

        {page === "suppliers" && <SuppliersPage />}

        {page === "profile" && (
          <ProfilePage
            user={user}
            orders={orders}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  )
}