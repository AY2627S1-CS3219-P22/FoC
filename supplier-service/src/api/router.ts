import express from 'express';
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory} from '@/api/supplier-controller';
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema,updateSupplierSchema} from "@data/schema";
  
//User Routes for Supplier Service
const supplierRouter = express.Router();

supplierRouter.post('/supplier',validateRequest(createSupplierSchema, ValidationSource.BODY), createSupplier); //TODO: add middleware call here, idempotency
supplierRouter.get('/supplier/:id', getSupplierById);
supplierRouter.put('/supplier/:id', validateRequest(updateSupplierSchema, ValidationSource.BODY),updateSupplierById); //TODO: add middleware call here, idempotency
supplierRouter.delete('/supplier/:id',deleteSupplierById); //TODO: add middleware call here

//common user actions
supplierRouter.get('/suppliers', getAllSuppliers);
supplierRouter.get('/suppliers/search', searchSuppliers); //update
supplierRouter.get('/suppliers/search', filterSuppliersByCategory)//update

export default supplierRouter;