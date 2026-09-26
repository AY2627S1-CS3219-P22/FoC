import express from 'express';
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById} from '@/api/supplier-controller';
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema,updateSupplierSchema} from "@data/schema";
  
//User Routes for Supplier Service
const supplierRouter = express.Router();

supplierRouter.post('/supplier',validateRequest(createSupplierSchema, ValidationSource.BODY), createSupplier);
supplierRouter.get('/supplier/:id', getSupplierById);
supplierRouter.put('/supplier/:id', validateRequest(updateSupplierSchema, ValidationSource.BODY),updateSupplierById); //idempotent
supplierRouter.delete('/supplier/:id',deleteSupplierById);
supplierRouter.get('/suppliers', getAllSuppliers);
export default supplierRouter;