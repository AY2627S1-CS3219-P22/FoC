import { api } from "./client"

// Shape returned by supplier-service
export type Supplier = {
  supplierId: number
  name: string
  type: string
  buildingName: string
  locationDescription: string
  floor: number
  imageURL: string | null
}

// What the supplier lists in the UI use (same shape as the mock data)
export type SupplierCard = { id: string; name: string; location: string; type: string; hours: string }

// supplier-service categories -> the labels the UI already has colours/icons for
const TYPE_LABELS: Record<string, string> = {
  "food/coffee": "F&B",
  food: "F&B",
  printing: "Services",
  shopping: "Retail",
  other: "Other",
}

const toCard = (s: Supplier): SupplierCard => ({
  id: String(s.supplierId),
  name: s.name,
  location: `${s.buildingName}, Level ${s.floor}`,
  type: TYPE_LABELS[s.type] ?? s.type,
  hours: "",
})

export const getSuppliers = () =>
  api<{ data: Supplier[] }>("/suppliers").then((r) => r.data.map(toCard))

export const searchSuppliers = (q: string) =>
  api<{ data: Supplier[] }>(`/suppliers/search?q=${encodeURIComponent(q)}`).then((r) => r.data.map(toCard))