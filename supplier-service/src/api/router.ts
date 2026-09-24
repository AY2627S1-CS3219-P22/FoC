import express from 'express';
import { getAllSuppliers, getSupplierById, deleteSupplierById, createSupplier, updateSupplierById} from '@api/supplierController';

//User Routes for Supplier Service
const supplierRouter = express.Router();

supplierRouter.post('/supplier', createSupplier);
supplierRouter.get('/supplier/:id', getSupplierById);
supplierRouter.put('/supplier/:id', updateSupplierById);
supplierRouter.delete('/supplier/:id', deleteSupplierById);
supplierRouter.get('/supplier', getAllSuppliers);

export default supplierRouter;