import { request } from './client'
const base = import.meta.env.VITE_SUPPLIER_API_BASE_URL || '/api/suppliers'
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
  return (await request<{ data: Supplier }>(base, `/supplier/${id}`)).data
}
export type SupplierInput = Omit<Supplier, 'supplierId' | 'createdAt' | 'updatedAt'>
export async function saveSupplier(input: SupplierInput, current?: Supplier) {
  if (current && !current.updatedAt) throw new Error('This record has no version timestamp. Reload it before editing.')
  return (await request<{ data: Supplier }>(base, current ? `/supplier/${current.supplierId}` : '/supplier', {
    method: current ? 'PUT' : 'POST', body: JSON.stringify(current ? { ...input, expectedUpdatedAt: current.updatedAt } : input),
  })).data
}
export const deleteSupplier = (id: number) => request<{ data: { id: number } }>(base, `/supplier/${id}`, { method: 'DELETE' })
