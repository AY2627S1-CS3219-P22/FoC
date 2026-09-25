/*
Has information about the supplier database and its operations
TODO: Supplier_Database name should be interpolated as db_name

AI Declaration: Migration to drizzle for createSupplierService and updateSupplierService used

*/ 
import pool, { db } from '@database/db';
import { CreateSupplierSchema, UpdateSupplierType, supplier } from '@data/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv'; 

dotenv.config()

const db_name = process.env.DATABASE_NAME

export async function createSupplierService(newSupplier: CreateSupplierSchema)  {
    const [created] = await db.insert(supplier).values(newSupplier).returning();
    return created;
}
export async function getSupplierByIdService(id: number)  {
    const result = await pool.query('SELECT * FROM "Supplier_Database" WHERE id = $1 AND deleted_at IS NULL', [id]); //prevent SQL injection issues
    return result.rows[0];
}
export async function updateSupplierByIdService(id: number, updates: UpdateSupplierType)  {
    const [updated] = await db
        .update(supplier)
        .set({
            ...updates,
            updatedAt: new Date(),
        })
        .where(eq(supplier.supplierId, id))
        .returning();
    return updated;
}

//support soft delete
export async function deleteSupplierByIdService(id: number) {
    const result = await pool.query('UPDATE "Supplier_Database" SET deleted_at = NOW() WHERE id = $1', [id]); //prevent SQL injection issues
    return result.rows[0];
}

//allow loading 30 suppliers per UI page
//optimization - just in case
export async function getAllSuppliersService(page: number = 1, limit: number = 30) {
    const result = await pool.query('SELECT * FROM "Supplier_Database" WHERE deleted_at IS NULL LIMIT $1 OFFSET $2', [page, limit]);
    return result.rows;
}

