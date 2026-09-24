/*
Has information about the supplier database and its operations
*/ 
import pool from '@database/db';
import { Supplier } from '@data/Supplier';

export async function createSupplierService(supplier: Supplier)  {
    //FIX LATER
}
export async function getSupplierByIdService(id: Int8Array)  {
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]); //prevent SQL injection issues
    return result.rows[0];
}
export async function updateSupplierByIdService(supplier: Supplier)  {
    return 0; //STUB
    //FIX LATER
}
export async function deleteSupplierByIdService(id: Int8Array) {
    const result = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [id]); //prevent SQL injection issues
    return result.rows[0];
}
export async function getAllSuppliersService() {
    const result = await pool.query('SELECT * FROM suppliers');
    return result.rows;
}
