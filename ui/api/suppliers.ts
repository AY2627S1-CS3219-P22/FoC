import { api } from "./client"

export type Supplier = {
  supplierId: number
  name: string
  type: string
  buildingName: string
  locationDescription: string
  floor: number
  imageURL: string
}

export const getSuppliers = () =>
  api<{ data: Supplier[] }>("/suppliers").then((r) => r.data)

export const searchSuppliers = (q: string) =>
  api<{ data: Supplier[] }>(`/suppliers/search?q=${encodeURIComponent(q)}`).then((r) => r.data)