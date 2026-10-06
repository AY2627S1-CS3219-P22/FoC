import { clearToken, getToken, saveToken } from './api/client'
import { getMe, login, register, type Profile, type Registration } from './api/users'
import SuppliersPage from './pages/SuppliersPage'
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
  roles: string[]
  id: string
  name: string
  email: string
  credits: number
  memberSince: string
  requestsCreated: number
  errandsCompleted: number
  creditsEarned: number
}

const EMPTY_USER: User = {
  id: '', name: '', email: '', roles: [], credits: 0, memberSince: '',
  requestsCreated: 0, errandsCompleted: 0, creditsEarned: 0,
}
function toUser(profile: Profile): User {
  // Prototype balance until the Credit Service provides persisted balances.
  return { ...EMPTY_USER, credits: 10, id: profile.id, name: `${profile.firstName} ${profile.lastName}`, email: profile.email,
    roles: profile.roles, memberSince: new Date(profile.createdAt).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }) }
}

const SEED_ORDERS: Order[] = [
  {
    id: "o1",
    pickupLocation: "COM3",
    pickupStore: "CoffeeBean @ COM3",
    deliveryLocation: "PGP",
    description: "Pick up one iced latte, medium size. No sugar, please double-check the order.",
    credits: 4,
    deadline: "3:30 PM",
    status: "open",
    requesterId: "u2",
    requesterName: "Aisha Lim",
    createdAt: "2:45 PM",
  },
  {
    id: "o2",
    pickupLocation: "UTown",
    pickupStore: "Cheers @ UTown",
    deliveryLocation: "PGPR Block E",
    description: "One packet of instant noodles (any flavour) and a 1.5L mineral water.",
    credits: 3,
    deadline: "5:00 PM",
    status: "open",
    requesterId: "u3",
    requesterName: "Marcus Goh",
    createdAt: "3:10 PM",
  },
  {
    id: "o3",
    pickupLocation: "Science Faculty",
    pickupStore: "Science Canteen",
    deliveryLocation: "Arts (AS7) Level 4",
    description: "Chicken rice with drumstick and soup. No cucumber please.",
    credits: 5,
    deadline: "1:00 PM",
    status: "accepted",
    requesterId: "u4",
    requesterName: "Priya Nair",
    courierId: "u5",
    courierName: "Ryan Chen",
    createdAt: "12:10 PM",
  },
  {
    id: "o4",
    pickupLocation: "Engineering",
    pickupStore: "Print Lab @ Engineering",
    deliveryLocation: "E1A Room 02-06",
    description: "Print 20 pages double-sided from USB labelled EE2024_Lab. Black and white is fine.",
    credits: 6,
    deadline: "4:30 PM",
    status: "open",
    requesterId: "u6",
    requesterName: "Wei Lin",
    createdAt: "3:55 PM",
  },
  {
    id: "o5",
    pickupLocation: "YST",
    pickupStore: "YST Canteen",
    deliveryLocation: "UTown Residence",
    description: "Brown sugar pearl milk tea, 50% sugar, less ice, large.",
    credits: 4,
    deadline: "6:00 PM",
    status: "completed",
    requesterId: "u1",
    requesterName: "Jordan Tan",
    courierId: "u7",
    courierName: "Sofia Park",
    createdAt: "5:10 PM",
  },
  {
    id: "o6",
    pickupLocation: "Central Library",
    pickupStore: "CLB Bookshop",
    deliveryLocation: "PGPR Block A",
    description: "Reserved book: Introduction to Sociology 3rd Ed. under the name Priya Nair.",
    credits: 5,
    deadline: "2:00 PM",
    status: "open",
    requesterId: "u8",
    requesterName: "Priya Nair",
    createdAt: "1:00 PM",
  },
]

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
  const [user, setUser]           = useState<User>(EMPTY_USER)
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

  const [restoring, setRestoring] = useState(!!getToken())
  const [sessionError, setSessionError] = useState('')
  useEffect(() => {
    let active = true
    const expired = () => { setIsLoggedIn(false); setUser(EMPTY_USER); setPage('login'); setSessionError('Your session expired. Please sign in again.') }
    window.addEventListener('foc:unauthorized', expired)
    if (getToken()) getMe().then(({ user: profile }) => {
      if (active) { setUser(toUser(profile)); setIsLoggedIn(true); setPage('orders') }
    }).catch((err: Error) => { if (active) setSessionError(err.message) })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false; window.removeEventListener('foc:unauthorized', expired) }
  }, [])
  const handleLogin = async (email: string, password: string, remember = false) => {
    const { token } = await login(email, password)
    saveToken(token, remember)
    try {
      const { user: profile } = await getMe()
      setUser(toUser(profile)); setIsLoggedIn(true); setSessionError(''); navigate('orders')
    } catch (error) { clearToken(); throw error }
  }
  const handleRegister = async (input: Registration) => {
    await register(input)
    setSessionError('Account created. Sign in with your email and password.')
    navigate('login')
  }
  const handleLogout = () => {
    clearToken(); setUser(EMPTY_USER); setIsLoggedIn(false); setSessionError(''); navigate('login')
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

  if (restoring) return <p role="status" className="p-8">Restoring your session…</p>

  // Unauthenticated
  if (!isLoggedIn) {
    if (page === "signup") return <SignupPage onRegister={handleRegister} onNavigate={navigate} />
    return <LoginPage message={sessionError} onLogin={handleLogin} onNavigate={navigate} />
  }

  // Admin is a full-screen layout without the main Navbar
  if (page === "admin" && user.roles.includes("ADMINISTRATOR")) {
    return (
      <AdminPage
        orders={orders}
        user={user}
        onNavigate={navigate}
        onDeleteOrder={(id) => setOrders((prev) => prev.filter((o) => o.id !== id))}
      />
    )
  }

  const selectedOrder  = orders.find((o) => o.id === selectedOrderId)
  const acceptedOrder  = orders.find((o) => o.id === acceptedOrderId)

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar user={user} currentPage={page} onNavigate={navigate} onLogout={handleLogout} />

      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <p className="mx-auto max-w-6xl px-4 pt-3 text-xs text-[#3F6B5A]">Users and suppliers are live. Orders and credits are a prototype; the credit service is not connected.</p>
        {page === 'suppliers' && <SuppliersPage />}
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
