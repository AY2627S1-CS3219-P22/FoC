import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@database/SupplierRepository', () => ({
  getAllSuppliersService: vi.fn(),
  getSupplierByIdService: vi.fn(),
  createSupplierService: vi.fn(),
  updateSupplierByIdService: vi.fn(),
  deleteSupplierByIdService: vi.fn(),
}));

import {
  createSupplier,
  deleteSupplierById,
  getAllSuppliers,
  getSupplierById,
  updateSupplierById,
} from '@api/supplierController';
import {
  createSupplierService,
  deleteSupplierByIdService,
  getAllSuppliersService,
  getSupplierByIdService,
  updateSupplierByIdService,
} from '@database/SupplierRepository';

const mockedGetAll = vi.mocked(getAllSuppliersService);
const mockedGetById = vi.mocked(getSupplierByIdService);
const mockedCreate = vi.mocked(createSupplierService);
const mockedUpdate = vi.mocked(updateSupplierByIdService);
const mockedDelete = vi.mocked(deleteSupplierByIdService);

const mockResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
};

const supplierPayload = {
  name: 'Test Cafe',
  type: 'food' as const,
  buildingName: 'COM3',
  locationDescription: 'Near the lobby',
  floor: 1,
  location: { latitude: 1.294, longitude: 103.774 },
  openingHours: { startingTime: '09:00', closingTime: '18:00' },
};

describe('supplierController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllSuppliers returns 200 and the supplier list', async () => {
    const suppliers = [{ supplierId: 1, name: 'Test Cafe' }];
    mockedGetAll.mockResolvedValue(suppliers);
    const req = {} as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await getAllSuppliers(req, res, next);

    expect(mockedGetAll).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: suppliers,
      message: 'All suppliers fetched successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('getAllSuppliers forwards errors to next', async () => {
    const error = new Error('list failed');
    mockedGetAll.mockRejectedValue(error);
    const next = vi.fn() as NextFunction;

    await getAllSuppliers({} as Request, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('getSupplierById coerces the path id and returns 200', async () => {
    const supplier = { supplierId: 12, name: 'Test Cafe' };
    mockedGetById.mockResolvedValue(supplier);
    const req = { params: { id: '12' } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await getSupplierById(req, res, next);

    expect(mockedGetById).toHaveBeenCalledWith(12);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: supplier,
      message: 'Supplier 12 fetched successfully',
    });
  });

  it('getSupplierById forwards errors to next', async () => {
    const error = new Error('not found');
    mockedGetById.mockRejectedValue(error);
    const req = { params: { id: '12' } } as unknown as Request;
    const next = vi.fn() as NextFunction;

    await getSupplierById(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('createSupplier persists the request body and returns 200', async () => {
    const created = { supplierId: 3, ...supplierPayload };
    mockedCreate.mockResolvedValue(created);
    const req = { body: supplierPayload } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await createSupplier(req, res, next);

    expect(mockedCreate).toHaveBeenCalledWith(supplierPayload);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: created,
      message: `Supplier ${created} created`,
    });
  });

  it('createSupplier forwards errors to next', async () => {
    const error = new Error('insert failed');
    mockedCreate.mockRejectedValue(error);
    const req = { body: supplierPayload } as Request;
    const next = vi.fn() as NextFunction;

    await createSupplier(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('updateSupplierById updates by id and returns 200', async () => {
    const updated = { supplierId: 9, name: 'Renamed Cafe' };
    mockedUpdate.mockResolvedValue(updated);
    const req = {
      params: { id: '9' },
      body: { name: 'Renamed Cafe' },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await updateSupplierById(req, res, next);

    expect(mockedUpdate).toHaveBeenCalledWith(9, { name: 'Renamed Cafe' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: updated,
      message: 'Supplier 9 was updated',
    });
  });

  it('updateSupplierById forwards errors to next', async () => {
    const error = new Error('update failed');
    mockedUpdate.mockRejectedValue(error);
    const req = {
      params: { id: '9' },
      body: { name: 'Renamed Cafe' },
    } as unknown as Request;
    const next = vi.fn() as NextFunction;

    await updateSupplierById(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('deleteSupplierById soft-deletes by id and returns 200', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const req = { params: { id: '4' } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await deleteSupplierById(req, res, next);

    expect(mockedDelete).toHaveBeenCalledWith(4);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: undefined,
      message: 'Supplier 4 deleted from active supplier list successfully',
    });
  });

  it('deleteSupplierById forwards errors to next', async () => {
    const error = new Error('delete failed');
    mockedDelete.mockRejectedValue(error);
    const req = { params: { id: '4' } } as unknown as Request;
    const next = vi.fn() as NextFunction;

    await deleteSupplierById(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
