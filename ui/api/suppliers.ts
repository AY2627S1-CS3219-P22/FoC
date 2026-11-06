// AI-assisted (Claude), reviewed and tested by Maliha

//AI assisted by Cursor - I just got it to import my dto, see suppliers/src/data/.. {in schema.ts}
import { api } from "./client"

export type Supplier = {
  supplierId: number
  name: string
  type: Category
  buildingName: string
  locationDescription: string
  floor: number
  imageURL: string
  // derived by supplier-service from today's hours in Asia/Singapore
  isOpen: boolean
}

// dayOfWeek 0 = Sunday; times come back as HH:MM:SS
export type OpeningHours = {
  dayOfWeek: number
  opensAt: string | null
  closesAt: string | null
  isClosed: boolean
}

export type SupplierDetail = Supplier & {
  latitude: string
  longitude: string
  openingHours: OpeningHours[]
}

// Fixed list from supplier-service (SUPPLIER_CATEGORY), shown as a dropdown
export const CATEGORIES = [
  { value: "food/coffee", label: "Coffee" },
  { value: "food",        label: "Food" },
  { value: "printing",    label: "Printing" },
  { value: "shopping",    label: "Shopping" },
  { value: "other",       label: "Other" },
] as const

export type Category = (typeof CATEGORIES)[number]["value"]

export const categoryLabel = (type: string) =>
  CATEGORIES.find((c) => c.value === type)?.label ?? "Other"

export const supplierLocation = (s: Supplier) => `${s.buildingName}, Level ${s.floor}`

export const getSuppliers = () =>
  api<{ data: Supplier[] }>("/suppliers").then((r) => r.data)

export const getSupplier = (id: number) =>
  api<{ data: SupplierDetail }>(`/supplier/${id}`).then((r) => r.data)

export const searchSuppliers = (q: string) =>
  api<{ data: Supplier[] }>(`/suppliers/search?q=${encodeURIComponent(q)}`).then((r) => r.data)

export const getSuppliersByCategory = (type: Category) =>
  api<{ data: Supplier[] }>(`/suppliers/category?type=${encodeURIComponent(type)}`).then((r) => r.data)
