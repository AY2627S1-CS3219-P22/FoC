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

/**
 * Inserts a supplier and returns the created row.
 * @throws If the database insert fails.
 */
export async function createSupplierService(newSupplier: CreateSupplierSchema)  {
    const [created] = await db.insert(supplier).values(newSupplier).returning();
    return created;
}
/**
 * Queries a non-deleted supplier by the database's `id` column.
 * Returns the first row, or undefined when no row matches.
 * @throws If the database query fails.
 */
export async function getSupplierByIdService(id: number)  {
    const result = await pool.query('SELECT * FROM "Supplier_Database" WHERE id = $1 AND deleted_at IS NULL', [id]); //prevent SQL injection issues
    return result.rows[0];
}
/**
 * Applies updates to a supplier ID, including rows marked as deleted, and refreshes `updatedAt`.
 * Returns the updated row, or undefined when no row matches.
 * @throws If the database update fails.
 */
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
/**
 * Marks rows matching the database's `id` column as deleted at the current database time.
 * Returns undefined, whether or not a row matches, because the query returns no rows.
 * @throws If the database query fails.
 */
export async function deleteSupplierByIdService(id: number) {
    const result = await pool.query('UPDATE "Supplier_Database" SET deleted_at = NOW() WHERE id = $1', [id]); //prevent SQL injection issues
    return result.rows[0];
}

//allow loading 30 suppliers per UI page
//optimization - just in case
/**
 * Returns non-deleted supplier rows without a specified order.
 * @param page - Maximum number of rows to return; defaults to 1.
 * @param limit - Number of rows to skip; defaults to 30.
 * @throws If the database query fails.
 */
export async function getAllSuppliersService(page: number = 1, limit: number = 30) {
    const result = await pool.query('SELECT * FROM "Supplier_Database" WHERE deleted_at IS NULL LIMIT $1 OFFSET $2', [page, limit]);
    return result.rows;
}

