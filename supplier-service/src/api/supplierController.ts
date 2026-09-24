//Standardize the controller responses for the UI

import { Request, Response, NextFunction } from 'express';
import {getSupplierByIdService, updateSupplierByIdService, deleteSupplierByIdService, getAllSuppliersService}  from '@database/SupplierRepository';
import { randomUUID } from 'crypto';

const handleResponse = (res: Response, status: number, data: any, message: string) => {
    res.status(status).json({
        data,
        message
    });
};

export default handleResponse;

//TODO: Implement Idempotency Key
const idempotencyKey = randomUUID; //to prevent the same duplicate supplier creation/edit request

export const getAllSuppliers = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const suppliers = await getAllSuppliersService();
        handleResponse(res, 200, suppliers, 'Suppliers fetched successfully');
    } catch (err) {
        next(err);
    }
 };


export const getSupplierById = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const supplierId = await getSupplierByIdService(Int8Array.from(req.params.id));
        handleResponse(res, 200, supplierId, 'Supplier ${req.params.id} fetched successfully');
    } catch (err) {
        next(err);
    }
 };


export const deleteSupplierById = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const deletedSupplier = await deleteSupplierByIdService(Int8Array.from(req.params.id));
        handleResponse(res, 200, deletedSupplier, 'Supplier deleted from active supplier list successfully');
    } catch (err) {
        next(err);
    }
 };

 export const createSupplier = async() => {0;}

 export const updateSupplierById = async() => {0;}

//TODO: How will the API handle writes that fail + repeated request the admin user makes