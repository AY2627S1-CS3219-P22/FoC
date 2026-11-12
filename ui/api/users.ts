import { api } from "./client"

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

export const register = (data: {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  confirmRestore?: boolean
}) =>
  api<{ message: string }>("/users/register", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const verifyRegister = (email: string, otp: string) =>
  api<{ user: ApiUser }>("/users/register/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  })

export const requestResetPassword = () =>
  api<{ message: string }>("/users/reset-password/request", {
    method: "POST",
    body: JSON.stringify({}),
  })

export const completeResetPassword = (otp: string, newPassword: string) =>
  api<{ message: string }>("/users/reset-password/verify", {
    method: "POST",
    body: JSON.stringify({ otp, newPassword }),
  })

export const deleteMe = () => api<{ message: string }>("/users/me", { method: "DELETE" })

export const getMe = () => api<{ user: ApiUser }>("/users/me").then((r) => r.user)

export const updateMe = (profile: { firstName: string; lastName: string; username: string }) =>
  api<{ user: ApiUser }>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(profile),
  }).then((r) => r.user)

export const logout = () => api<void>("/users/logout", { method: "POST" })