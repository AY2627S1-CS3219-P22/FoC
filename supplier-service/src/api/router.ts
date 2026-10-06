import express from 'express';
<<<<<<< HEAD
<<<<<<< HEAD
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory, updateSupplierHours, getNearbySuppliers} from '@/api/supplier-controller';
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema, updateRequestSchema, supplierIdParamSchema, supplierCategoryQuerySchema, supplierRadiusQuerySchema} from "@data/schema";
import {openingHoursParamSchema, updateOpeningHoursBodySchema} from "@data/opening-hours-schema";
import { authenticate, requireRole, ADMIN } from '@/middleware/jwt-validation';
=======
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory, updateSupplierHours} from '@/api/supplier-controller';
=======
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById, searchSuppliers, filterSuppliersByCategory, updateSupplierHours, getNearbySuppliers} from '@/api/supplier-controller';
>>>>>>> a76812b (Add in the location post gis functionality)
import {validateRequest, ValidationSource} from '@/middleware/zod-validation';
import {createSupplierSchema, updateRequestSchema, supplierIdParamSchema, supplierCategoryQuerySchema, supplierRadiusQuerySchema} from "@data/schema";
import {openingHoursParamSchema, updateOpeningHoursBodySchema} from "@data/opening-hours-schema";
import { authenticate } from '@/middleware/jwt-validation';
>>>>>>> 8e75931 (Update supplier hours schema, controller, repository and tests)
  
//User Routes for Supplier Service
const supplierRouter = express.Router();

supplierRouter.post('/supplier', authenticate, requireRole(ADMIN), validateRequest(createSupplierSchema, ValidationSource.BODY), createSupplier); 
supplierRouter.get('/supplier/:id', validateRequest(supplierIdParamSchema, ValidationSource.PARAM), getSupplierById);
<<<<<<< HEAD
supplierRouter.put('/supplier/:id', authenticate, requireRole(ADMIN), validateRequest(supplierIdParamSchema, ValidationSource.PARAM), validateRequest(updateRequestSchema, ValidationSource.BODY),updateSupplierById);
supplierRouter.delete('/supplier/:id', authenticate, requireRole(ADMIN), validateRequest(supplierIdParamSchema, ValidationSource.PARAM), deleteSupplierById); 
//body: {isClosed, opensAt, closesAt}. All three are required because the table's check
//constraint needs them to agree, so a day is replaced rather than patched field by field.
supplierRouter.put('/supplier/:id/openingHours/:dayOfWeek', authenticate, requireRole(ADMIN), validateRequest(openingHoursParamSchema, ValidationSource.PARAM), validateRequest(updateOpeningHoursBodySchema, ValidationSource.BODY), updateSupplierHours);
=======
supplierRouter.put('/supplier/:id', authenticate, validateRequest(supplierIdParamSchema, ValidationSource.PARAM), validateRequest(updateRequestSchema, ValidationSource.BODY),updateSupplierById);
supplierRouter.delete('/supplier/:id', authenticate,validateRequest(supplierIdParamSchema, ValidationSource.PARAM), deleteSupplierById); 
//body: {isClosed, opensAt, closesAt}. All three are required because the table's check
//constraint needs them to agree, so a day is replaced rather than patched field by field.
supplierRouter.put('/supplier/:id/openingHours/:dayOfWeek', authenticate, validateRequest(openingHoursParamSchema, ValidationSource.PARAM), validateRequest(updateOpeningHoursBodySchema, ValidationSource.BODY), updateSupplierHours);
>>>>>>> 8e75931 (Update supplier hours schema, controller, repository and tests)


//common user actions
supplierRouter.get('/suppliers', getAllSuppliers);
supplierRouter.get('/suppliers/search', searchSuppliers); 
supplierRouter.get('/suppliers/category', validateRequest(supplierCategoryQuerySchema, ValidationSource.QUERY), filterSuppliersByCategory);
//get all suppliers closest to me; query: {latitude, longitude, radius in metres}
supplierRouter.get('/suppliers/search-radius', validateRequest(supplierRadiusQuerySchema, ValidationSource.QUERY), getNearbySuppliers);

// get all open suppliers 
//supplierRouter.get('/supplier/:id/opening-hours')
<<<<<<< HEAD
<<<<<<< HEAD
=======

//get all supppliers closest to me 
//supplierRouter.get('/suppliers/search-radius', getNearbySuppliers);
>>>>>>> 8e75931 (Update supplier hours schema, controller, repository and tests)
=======
>>>>>>> a76812b (Add in the location post gis functionality)
export default supplierRouter;
