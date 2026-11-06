// AI-assisted (Claude), reviewed and tested by Maliha
import { api, ApiError } from "./client"

export type ApiUser = {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
  createdAt: string
}

export const login = (email: string, password: string) =>
  api<{ token: string }>("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })

export const register = (data: { firstName: string; lastName: string; username: string; email: string; password: string }) =>
  api<{ user: ApiUser }>("/users/register", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const getMe = () => api<{ user: ApiUser }>("/users/me").then((r) => r.user)

export const logout = () => api<void>("/users/logout", { method: "POST" })

// user-service refuses (409) while you have active orders or are the last
// admin, and its message says which, so it's shown as is
export const deleteMe = () =>
  api<{ message: string }>("/users/me", { method: "DELETE" }).then((r) => r.message)

export function deleteError(err: unknown) {
  if (!(err instanceof ApiError)) return "Something went wrong."
  // plain 404 with no message = user-service doesn't have DELETE /users/me yet
  if (err.status === 404 && err.message.startsWith("Request failed")) return "Account deletion isn't available yet."
  return err.message
}