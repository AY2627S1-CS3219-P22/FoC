/*
Has information about the supplier database and its operations
TODO: Supplier_Database name should be interpolated as db_name

AI Declaration: Migration to drizzle for createSupplierService and updateSupplierService used
*/ 

import pool, { db } from '@database/db'; //drizzle-orm
import { CreateSupplierSchema, SupplierCategory, UpdateSupplierType, supplier } from '@data/schema';
import { getTableColumns, isNull, eq, and, sql} from 'drizzle-orm';
import dotenv from 'dotenv'; 

dotenv.config()

const db_name = process.env.DATABASE_NAME
const { deletedAt, ...publicSupplierColumns } = getTableColumns(supplier);

export async function createSupplierService(newSupplier: CreateSupplierSchema)  {
    const [created] = await db.insert(supplier).values(newSupplier).returning();
    return created;
}

export async function getSupplierByIdService(id: number)  {
  const [row] = await db
  .select(publicSupplierColumns)
  .from(supplier)
  .where(and(eq(supplier.supplierId, id), isNull(supplier.deletedAt)));

  return row;
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
//edited to return the deleted supplier for better response messages
export async function deleteSupplierByIdService(id: number) {
    const result = await pool.query(
        'UPDATE "Supplier_Database" SET deleted_at = NOW() WHERE id = $1 RETURNING id',
        [id],
    );
    return result.rows[0];
}

//Might need to think about loading optimizations
export async function getAllSuppliersService() {
    const suppliers = await db
      .select(publicSupplierColumns)
      .from(supplier)
      .where(isNull(supplier.deletedAt));

    return suppliers;
  }

export async function searchSuppliersService(text: string) {
    const resultList = await db
        .select(publicSupplierColumns)
        .from(sql `public.search_suppliers(${text}) AS ${supplier}` )
        .where(isNull(supplier.deletedAt));

    return resultList; //should result a list of matching results inclusive of Building, Name, and Location description DB inputs
}

export async function filterSuppliersByCategoryService(supplier_type: SupplierCategory ) {
    const resultList = await db
        .select(publicSupplierColumns)
        .from(sql `public.filter_suppliers_by_category(${supplier_type}) AS ${supplier}` )
        .where(isNull(supplier.deletedAt));

    return resultList; //list of matching results with category supplier_type
}
