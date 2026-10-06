import { request } from './client'
const base = import.meta.env.VITE_SUPPLIER_API_BASE_URL || '/api/suppliers'
// Keep legacy mode until the replacement service and its migrations are installed.
export const weeklyHoursEnabled = import.meta.env.VITE_SUPPLIER_HOURS_MODE === 'weekly'
export const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export interface OpeningHours { dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null }
export const blankOpeningHours = (): OpeningHours[] => weekDays.map((_, dayOfWeek) => ({ dayOfWeek, isClosed: true, opensAt: null, closesAt: null }))
export function validateOpeningHours(hours: OpeningHours[]) {
  if (hours.length !== 7 || new Set(hours.map(day => day.dayOfWeek)).size !== 7) throw new Error('Provide opening hours for all seven days.')
  for (const day of hours) {
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6 ||
      (day.isClosed ? day.opensAt !== null || day.closesAt !== null : !time.test(day.opensAt || '') || !time.test(day.closesAt || ''))) {
      throw new Error('Each day must be closed or have opening and closing times in HH:MM:SS format.')
    }
  }
}
export const categories = ['food/coffee', 'printing', 'food', 'shopping', 'other'] as const
const categoryLabels: Record<string, string> = {
  'food/coffee': 'Food & Coffee', printing: 'Printing', food: 'Food',
  shopping: 'Shopping', other: 'Other', All: 'All',
}
export const categoryLabel = (value: string) => categoryLabels[value] ?? value
export interface Supplier {
  supplierId: number; name: string; type: string; buildingName: string; locationDescription: string
  floor: number; latitude: string; longitude: string
  startingTime: string | null; closingTime: string | null; imageURL: string | null
  openingHours?: OpeningHours[]
  createdAt: string | null; updatedAt: string | null
}
interface SearchRow {
  id: number | string; Name: string; Type: string; Building: string; 'Location Description': string
  Floor: number | string; Latitude: string; Longitude: string; StartingTime: string | null
  ClosingTime: string | null; ImageURL: string | null; created_at: string | null; updated_at: string | null
}
export function normalizeSupplier(row: Supplier | SearchRow): Supplier {
  if ('supplierId' in row) return row
  return { supplierId: Number(row.id), name: row.Name, type: row.Type, buildingName: row.Building,
    locationDescription: row['Location Description'], floor: Number(row.Floor), latitude: String(row.Latitude),
    longitude: String(row.Longitude), startingTime: row.StartingTime, closingTime: row.ClosingTime,
    imageURL: row.ImageURL, createdAt: row.created_at, updatedAt: row.updated_at }
}
export async function listSuppliers(query = '', category = 'All', signal?: AbortSignal) {
  const path = query.trim() ? `/suppliers/search?q=${encodeURIComponent(query.trim())}`
    : category !== 'All' ? `/suppliers/category?type=${encodeURIComponent(category)}` : '/suppliers'
  const result = await request<{ data: (Supplier | SearchRow)[] }>(base, path, { signal })
  const rows = result.data.map(normalizeSupplier)
  // The existing API has separate search/category endpoints, not a combined query.
  return query.trim() && category !== 'All' ? rows.filter(row => row.type === category) : rows
}
export async function getSupplier(id: number) {
  return normalizeSupplier((await request<{ data: Supplier | SearchRow }>(base, `/supplier/${id}`)).data)
}
export type SupplierInput = Omit<Supplier, 'supplierId' | 'createdAt' | 'updatedAt'>
export async function saveSupplier(input: SupplierInput, current?: Supplier) {
  if (current && !current.updatedAt) throw new Error('This record has no version timestamp. Reload it before editing.')
  const { openingHours, startingTime, closingTime, ...fields } = input
  if (weeklyHoursEnabled && !current) validateOpeningHours(openingHours || [])
  // Parent edits never send hours: the nested endpoint replaces one day independently.
  const payload = weeklyHoursEnabled ? { ...fields, ...(!current ? { openingHours } : {}) } : { ...fields, startingTime, closingTime }
  return (await request<{ data: Supplier }>(base, current ? `/supplier/${current.supplierId}` : '/supplier', {
    method: current ? 'PUT' : 'POST', body: JSON.stringify(current ? { ...payload, expectedUpdatedAt: current.updatedAt } : payload),
  })).data
}
export const deleteSupplier = (id: number) => request<{ data: { id: number } }>(base, `/supplier/${id}`, { method: 'DELETE' })

export async function saveOpeningHours(id: number, day: OpeningHours) {
  const hours = blankOpeningHours().map(value => value.dayOfWeek === day.dayOfWeek ? day : value)
  validateOpeningHours(hours)
  if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) throw new Error('Invalid day of week.')
  const { dayOfWeek, opensAt, closesAt, isClosed } = day
  return request<unknown>(base, `/supplier/${id}/openingHours/${dayOfWeek}`, {
    method: 'PUT', body: JSON.stringify({ opensAt, closesAt, isClosed }),
  })
}
export function supplierHoursLabel(supplier: Supplier) {
  // The README does not specify a read contract for weekly hours. Do not show legacy hours as current.
  if (weeklyHoursEnabled) return 'See supplier for opening hours'
  return supplier.startingTime && supplier.startingTime !== 'NA' && supplier.closingTime && supplier.closingTime !== 'NA'
    ? `${supplier.startingTime} – ${supplier.closingTime}` : 'Hours unavailable'
}
