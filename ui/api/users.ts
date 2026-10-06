import { request } from './client'
const base = import.meta.env.VITE_USER_API_BASE_URL || '/api/users'
export interface Profile {
  id: string; username: string; firstName: string; lastName: string; email: string
  roles: string[]; createdAt: string
}
export interface Registration {
  firstName: string; lastName: string; username: string; email: string; password: string
}
export const login = (email: string, password: string) => request<{ token: string }>(base, '/users/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const register = (input: Registration) => request<{ user: Profile }>(base, '/users/register', { method: 'POST', body: JSON.stringify(input) })
export const getMe = () => request<{ user: Profile }>(base, '/users/me')
export const listUsers = () => request<{ users: Profile[] }>(base, '/users')
