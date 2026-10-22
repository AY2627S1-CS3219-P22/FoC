// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Connected approved Order UI/API flow; author review pending.
// Prompts and verification: ../../order-service/usage-log.md.
// Error with the HTTP status so pages can tell "wrong password" (4xx)
// apart from "service not running" (5xx / network).
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type ErrorBody = {
  message?: string
  error?: string
  errors?: string[]
  details?: Record<string, string[]>
}

// user-service returns { message } for most errors, but validation errors
// come back as { details: { field: [msg] } } instead
function errorMessage(body: ErrorBody, status: number) {
  const detail = body.details
    ? Object.values(body.details).flat()[0]
    : undefined
  const orderErrors: Record<string, string> = {
    "dependency-unavailable":
      "A required service is unavailable. Please try again.",
    "dependency-rejected":
      "The request could not be completed. Check supplier availability, credits and order details.",
    "invalid-transition":
      "This order has changed and this action is no longer available. Refresh orders.",
    expired: "This order has expired. Refresh orders.",
    conflict:
      "Another operation is processing or the order changed. Refresh orders before retrying.",
    forbidden: "You do not have permission for this action.",
    unauthorized: "Your session has expired. Please sign in again.",
    "invalid-input": "Check all required fields, credits and expiry time.",
  }
  return (
    body.message ??
    (body.error ? orderErrors[body.error] : undefined) ??
    detail ??
    body.errors?.[0] ??
    body.error ??
    `Request failed (${status})`
  )
}

let refreshing: Promise<string | null> | null = null

// Swaps the refresh cookie for a new access token. Calls made at the same time
// share one request, since the backend rotates the cookie on every refresh.
export function refreshToken() {
  refreshing ??= fetch("/backend/users/refresh", { method: "POST" })
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      const token: string | null = body?.token ?? null
      if (token) localStorage.setItem("token", token)
      else localStorage.removeItem("token")
      return token
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

function send(path: string, options: RequestInit) {
  const token = localStorage.getItem("token")
  return fetch(`/backend${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

// Shared fetch helper: adds JSON headers + login token, throws on errors.
// On a 401 it refreshes the token once and retries.
export async function apiWithStatus<T>(
  path: string,
  options: RequestInit = {},
): Promise<{
  data: T
  status: number
}> {
  let res: Response
  try {
    res = await send(path, options)
    if (
      res.status === 401 &&
      path !== "/users/login" &&
      (await refreshToken())
    ) {
      res = await send(path, options)
    }
  } catch {
    throw new ApiError("Cannot reach the server.", 0)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(errorMessage(body, res.status), res.status)
  return { data: body as T, status: res.status }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return (await apiWithStatus<T>(path, options)).data
}
