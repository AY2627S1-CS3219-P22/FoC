// Error with the HTTP status so pages can tell "wrong password" (4xx)
// apart from "service not running" (5xx / network).
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Shared fetch helper: adds JSON headers + login token, throws on errors.
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token")
  let res: Response
  try {
    res = await fetch(`/backend${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError("Cannot reach the server.", 0)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.message ?? `Request failed (${res.status})`, res.status)
  return body as T
}

// True when the backend isn't running (so the UI can fall back to mock data)
export const isServiceDown = (err: unknown) =>
  !(err instanceof ApiError) || err.status === 0 || err.status >= 500