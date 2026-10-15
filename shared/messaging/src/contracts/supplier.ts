export interface OpeningHoursDay {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
}

interface SupplierEventBase {
  eventId: string;
  occurredAt: string;
  /** Decimal string; matches the gRPC uint64 wire format. */
  supplierId: string;
}

export interface SupplierUpdated extends SupplierEventBase {
  type: 'supplier.updated';
  name: string;
  supplierType: string;
  buildingName: string;
  locationDescription: string;
  floor: number;
  latitude: string;
  longitude: string;
  imageUrl?: string;
}

export interface SupplierStatusChanged extends SupplierEventBase {
  type: 'supplier.status_changed';
  openingHours: OpeningHoursDay[];
}

export interface SupplierDeleted extends SupplierEventBase {
  type: 'supplier.deleted';
}

export type SupplierEvent = SupplierUpdated | SupplierStatusChanged | SupplierDeleted;
