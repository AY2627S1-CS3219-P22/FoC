//Standardize the controller responses for the UI

import { Request, Response, NextFunction } from 'express';
import {getSupplierByIdService, updateSupplierByIdService, deleteSupplierByIdService, getAllSuppliersService, createSupplierService, searchSuppliersService, filterSuppliersByCategoryService}  from '@/database/supplier-repository';
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
        handleResponse(res, 200, suppliers, 'All suppliers fetched successfully');
    } catch (err) {
        next(err);
    }
 };


export const getSupplierById = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const supplierId = await getSupplierByIdService(Number(req.params.id));
        const id_value = Number(req.params.id);
        handleResponse(res, 200, supplierId, `Supplier ${id_value} fetched successfully`);
    } catch (err) {
        next(err);
    }
 };


export const deleteSupplierById = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const deletedSupplier = await deleteSupplierByIdService(Number(req.params.id));
        const id_value = Number(req.params.id);
        handleResponse(res, 200, deletedSupplier, `Supplier ${id_value} deleted from active supplier list successfully`);
    } catch (err) {
        next(err);
    }
 };

 export const createSupplier = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const newSupplier = await createSupplierService(req.body);
        const newSupplierName = req.body.name;
        handleResponse(res, 200, newSupplier, `Supplier ${newSupplier} created`);
    } catch(err) {
        next(err);
    }
}

export const updateSupplierById = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const updatedSupplier = await updateSupplierByIdService(Number(req.params.id), req.body);
        handleResponse(res, 200, updatedSupplier, `Supplier ${req.params.id} was updated`);
    } catch(err) {
        next(err);
    }
}

//Supports supplier search for building, location description, and name
export const searchSuppliers = async(req:Request, res:Response, next:NextFunction) => {
   try {
       const supplierList = await searchSuppliersService(req.body);
       handleResponse(res, 200, supplierList, `Supplier list for ${req.body} search input returned`)
   } catch(err) {
    next(err);
   }
} 

//Supports supplier filtering by category
export const filterSuppliersByCategory = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const supplierList = await searchSuppliersService(req.body);
        handleResponse(res, 200, supplierList, `Supplier list for ${req.body} search input returned`)
    } catch(err) {
     next(err);
    }
} 

//TODO: How will the API handle writes that fail
// TODO: Handle repeated request the admin user makes --idempotency 
// TODO: error responses