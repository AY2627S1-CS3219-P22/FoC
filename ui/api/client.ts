export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
const key = 'foc.token'
export function getToken() { return sessionStorage.getItem(key) || localStorage.getItem(key) }
export function saveToken(token: string, remember = false) {
  clearToken()
  ;(remember ? localStorage : sessionStorage).setItem(key, token)
}
export function clearToken() { sessionStorage.removeItem(key); localStorage.removeItem(key) }
export async function request<T>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try { response = await fetch(`${base}${path}`, { ...options, headers }) }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Cannot reach the service. Check that the backend is running and try again.')
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && token) { clearToken(); window.dispatchEvent(new Event('foc:unauthorized')) }
    const data = body as { message?: string; error?: string; errors?: { path?: (string | number)[]; message?: string }[]; details?: Record<string, string[]> } | null
    const details = data?.details ? Object.entries(data.details).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join('; ')
      : Array.isArray(data?.errors) ? data.errors.map(issue => `${issue.path?.join('.') || 'Input'}: ${issue.message || 'Invalid value'}`).join('; ') : ''
    throw new ApiError(response.status, [data?.message || data?.error || `Request failed (${response.status}).`, details].filter(Boolean).join(' '))
  }
  return body as T
}
