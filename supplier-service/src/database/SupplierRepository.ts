/*
Has information about the supplier database and its operations
TODO: Supplier_Database name should be interpolated as db_name

*/ 
import pool from '@database/db';
import { Supplier } from '@/data/schema';
import dotenv from 'dotenv'; 

dotenv.config()

const db_name = process.env.DATABASE_NAME

export async function createSupplierService(supplier: Supplier)  {

}
export async function getSupplierByIdService(id: Int8Array)  {
    const result = await pool.query('SELECT * FROM "Supplier_Database" WHERE id = $1 AND deleted_at IS NULL', [id]); //prevent SQL injection issues
    return result.rows[0];
}
export async function updateSupplierByIdService(supplier: Supplier)  {
    return 0; //STUB
    //FIX LATER
}
export async function deleteSupplierByIdService(id: Int8Array) {
    const result = await pool.query('UPDATE "Supplier_Database" SET deleted_at = NOW() WHERE id = $1', [id]); //prevent SQL injection issues
    return result.rows[0];
}
export async function getAllSuppliersService() {
    const result = await pool.query('SELECT * FROM "Supplier_Database" WHERE deleted_at IS NULL');
    return result.rows;
}

/*
TODO: Update to where deleted_at is null
CREATE UNIQUE INDEX suppliers_name_uniq
  ON suppliers (lower(btrim(name)))
  WHERE deleted_at IS NULL;
*/ 
