import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@database/SupplierRepository', () => ({
  getAllSuppliersService: vi.fn(),
  getSupplierByIdService: vi.fn(),
  createSupplierService: vi.fn(),
  updateSupplierByIdService: vi.fn(),
  deleteSupplierByIdService: vi.fn(),
}));

import supplierRouter from '@api/router';
import type { CreateSupplierSchema, Supplier, UpdateSupplierType } from '@data/schema';
import errorHandler from '@middleware/errorHandler';
import {
  createSupplierService,
  deleteSupplierByIdService,
  getAllSuppliersService,
  getSupplierByIdService,
  updateSupplierByIdService,
} from '@database/SupplierRepository';

type ApiResponse<T = unknown> = {
  data: T;
  message: string;
};

const mockedGetAll = vi.mocked(getAllSuppliersService);
const mockedGetById = vi.mocked(getSupplierByIdService);
const mockedCreate = vi.mocked(createSupplierService);
const mockedUpdate = vi.mocked(updateSupplierByIdService);
const mockedDelete = vi.mocked(deleteSupplierByIdService);

const supplierPayload: CreateSupplierSchema = {
  name: 'Router Cafe',
  type: 'food',
  buildingName: 'COM3',
  locationDescription: 'Near the lobby',
  floor: 1,
  location: { latitude: 1.294, longitude: 103.774 },
  openingHours: { startingTime: '09:00', closingTime: '18:00' },
};

const updatePayload: UpdateSupplierType = {
  name: 'Updated Cafe',
  type: 'food',
  location: { latitude: 1.3, longitude: 103.8 },
};

describe('supplierRouter', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(supplierRouter);
    app.use(errorHandler);
    server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAll.mockResolvedValue([]);
    mockedGetById.mockResolvedValue({ supplierId: 7, name: 'Router Cafe' } as Supplier);
    mockedCreate.mockResolvedValue({ supplierId: 7, ...supplierPayload } as Supplier);
    mockedUpdate.mockResolvedValue({ supplierId: 7, name: 'Updated Cafe' } as Supplier);
    mockedDelete.mockResolvedValue(undefined);
  });

  it('GET /supplier lists suppliers', async () => {
    const response = await fetch(`${baseUrl}/supplier`);
    const body = (await response.json()) as ApiResponse;

    expect(response.status).toBe(200);
    expect(mockedGetAll).toHaveBeenCalledOnce();
    expect(body.message).toBe('All suppliers fetched successfully');
  });

  it('GET /supplier/:id fetches one supplier', async () => {
    const response = await fetch(`${baseUrl}/supplier/7`);
    const body = (await response.json()) as ApiResponse;

    expect(response.status).toBe(200);
    expect(mockedGetById).toHaveBeenCalledWith(7);
    expect(body.message).toBe('Supplier 7 fetched successfully');
  });

  it('POST /supplier creates a supplier', async () => {
    const response = await fetch(`${baseUrl}/supplier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplierPayload),
    });

    expect(response.status).toBe(200);
    expect(mockedCreate).toHaveBeenCalled();
  });

  it('PUT /supplier/:id updates a supplier', async () => {
    const response = await fetch(`${baseUrl}/supplier/7`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    expect(response.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ name: 'Updated Cafe' }),
    );
  });

  it('DELETE /supplier/:id deletes a supplier', async () => {
    const response = await fetch(`${baseUrl}/supplier/7`, {
      method: 'DELETE',
    });
    const body = (await response.json()) as ApiResponse;

    expect(response.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith(7);
    expect(body.message).toBe(
      'Supplier 7 deleted from active supplier list successfully',
    );
  });

  it('returns 404 for an unknown route', async () => {
    const response = await fetch(`${baseUrl}/not-a-route`);

    expect(response.status).toBe(404);
  });
});
