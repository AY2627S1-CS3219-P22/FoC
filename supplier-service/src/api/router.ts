import express from 'express';
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory} from '@/api/supplier-controller';
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema, updateRequestSchema, supplierIdParamSchema, supplierCategoryQuerySchema} from "@data/schema";
import { authenticate } from '@/middleware/jwt-validation';
  
//User Routes for Supplier Service
const supplierRouter = express.Router();

//TODO: add in authenticate function

supplierRouter.post('/supplier', authenticate, validateRequest(createSupplierSchema, ValidationSource.BODY), createSupplier); 
supplierRouter.get('/supplier/:id', validateRequest(supplierIdParamSchema, ValidationSource.PARAM), getSupplierById);
supplierRouter.put('/supplier/:id', authenticate, validateRequest(supplierIdParamSchema, ValidationSource.PARAM), validateRequest(updateRequestSchema, ValidationSource.BODY),updateSupplierById);
supplierRouter.delete('/supplier/:id', authenticate,validateRequest(supplierIdParamSchema, ValidationSource.PARAM), deleteSupplierById); 

//common user actions
supplierRouter.get('/suppliers', getAllSuppliers);
supplierRouter.get('/suppliers/search', searchSuppliers); 
supplierRouter.get('/suppliers/category', validateRequest(supplierCategoryQuerySchema, ValidationSource.QUERY), filterSuppliersByCategory);

export default supplierRouter;
