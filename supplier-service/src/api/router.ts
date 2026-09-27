import express from 'express';
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory} from '@/api/supplier-controller';
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema, updateRequestSchema} from "@data/schema";
  
//User Routes for Supplier Service
const supplierRouter = express.Router();

supplierRouter.post('/supplier',validateRequest(createSupplierSchema, ValidationSource.BODY), createSupplier); //TODO: add middleware call here, idempotency, jwt auth
supplierRouter.get('/supplier/:id', getSupplierById);
supplierRouter.put('/supplier/:id', validateRequest(updateRequestSchema, ValidationSource.BODY),updateSupplierById); //TODO: add middleware call here, idempotency, jwt auth
supplierRouter.delete('/supplier/:id',deleteSupplierById); //TODO: add middleware call here, idempotency, jwt auth

//common user actions
supplierRouter.get('/suppliers', getAllSuppliers);
supplierRouter.get('/suppliers/search', searchSuppliers); 
supplierRouter.get('/suppliers/category', filterSuppliersByCategory);

export default supplierRouter;
