import express from 'express';
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory} from '@/api/supplier-controller';
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema, updateRequestSchema, supplierIdParamSchema, supplierCategoryQuerySchema} from "@data/schema";
  
//User Routes for Supplier Service
const supplierRouter = express.Router();

//TODO: add in authenticate function

supplierRouter.post('/supplier', validateRequest(createSupplierSchema, ValidationSource.BODY), createSupplier); //TODO: add middleware call here, idempotency, jwt auth
supplierRouter.get('/supplier/:id', validateRequest(supplierIdParamSchema, ValidationSource.PARAM), getSupplierById);
supplierRouter.put('/supplier/:id', validateRequest(supplierIdParamSchema, ValidationSource.PARAM), validateRequest(updateRequestSchema, ValidationSource.BODY),updateSupplierById); //TODO: add middleware call here, idempotency, jwt auth
supplierRouter.delete('/supplier/:id', validateRequest(supplierIdParamSchema, ValidationSource.PARAM), deleteSupplierById); //TODO: add middleware call here, idempotency, jwt auth

//common user actions
supplierRouter.get('/suppliers', getAllSuppliers);
supplierRouter.get('/suppliers/search', searchSuppliers); 
supplierRouter.get('/suppliers/category', validateRequest(supplierCategoryQuerySchema, ValidationSource.QUERY), filterSuppliersByCategory);

export default supplierRouter;
