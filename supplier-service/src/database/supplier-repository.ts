/*
Has information about the supplier database and its operations
TODO: Supplier_Database name should be interpolated as db_name

AI Declaration: Migration to drizzle for createSupplierService and updateSupplierService used
*/ 

import pool, { db } from '@database/db'; //drizzle-orm
import { CreateSupplierSchema, SupplierCategory, UpdateSupplierType, supplier } from '@data/schema';
import { getTableColumns, isNull, eq, and, sql} from 'drizzle-orm';
import { ConflictError, NotFoundError } from '@/middleware/errors';


const { deletedAt, ...publicSupplierColumns } = getTableColumns(supplier);

//drizzle wraps driver errors, so the postgres code sits on err.cause
const isDuplicateName = (err: any) => err?.code === '23505' || err?.cause?.code === '23505';

export async function createSupplierService(newSupplier: CreateSupplierSchema)  {
    try{
        const [created] = await db.insert(supplier).values(newSupplier).returning(publicSupplierColumns);
    return created;
    } catch(err) {
        if (isDuplicateName(err)) {
            throw new ConflictError(`Supplier "${newSupplier.name}" already exists`);
        }
        throw err;
    }
}

export async function getSupplierByIdService(id: number)  {
  const [row] = await db
  .select(publicSupplierColumns)
  .from(supplier)
  .where(and(eq(supplier.supplierId, id), isNull(supplier.deletedAt)));

  return row;
}
export async function updateSupplierByIdService(id: number, updates: UpdateSupplierType, expectedUpdatedAt: Date)  {

    /*
    Parameters: 
        - supplier id: bigint or number referencing supplier
        - updates: drizzle-zod schema of "Supplier" class wrapped to ensure user cannot access fields e.g. deleted_at or updated_at
        - expectedUpdatedAt: read current updated_at of the supplier. implements supplier_versioning

    DB query
        - Checks whether supplier_id exists, if supplier version is the same as expected version, and supplier is not deleted
        - Sets supplier fields. Sets updatedAt to current date

    Response/Error Handling Cases
        - Supplier Id does not exist or Supplier is deleted
        - Current supplier updated at version does not match request body
        - Supplier name is duplicated 
    */

    let updated; //declare variable in function scope

    try {
        updated = await db
            .update(supplier)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(and(eq(supplier.supplierId, id), eq(supplier.updatedAt, expectedUpdatedAt), isNull(supplier.deletedAt)))
            .returning(publicSupplierColumns);
    } catch(err) {
        if (isDuplicateName(err)) {
            throw new ConflictError(`Supplier "${updates.name}" already exists`);
        }
        throw err;
    }

    //no row matched
    // causes: supplier deletion, stale data: updated by someone else, id does not exist
    if (!updated) {
        const [existing] = await db
            .select({ id: supplier.supplierId })
            .from(supplier)
            .where(and(eq(supplier.supplierId, id), isNull(supplier.deletedAt)));

        if (!existing) {
            throw new NotFoundError(`Supplier ${id} not found`);
        }
        throw new ConflictError('Supplier was modified concurrently');
    }

    return updated;
}

//support soft delete
//edited to return the deleted supplier for better response messages
export async function deleteSupplierByIdService(id: number) {
    const result = await db.execute(
        sql`UPDATE "Supplier_Database" SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING id`
    );

    if (!result.rows[0]) {
       throw new NotFoundError(`Supplier ${id} not found`);
    }
    return result.rows[0];
}

//Might need to think about loading optimizations
//TODO: Order supplier loading based on location
export async function getAllSuppliersService() {
    const suppliers = await db
      .select(publicSupplierColumns)
      .from(supplier)
      .where(isNull(supplier.deletedAt));

    return suppliers;
  }


//replace drizzle with SQL queries due to some weird issues...apparently drizzle-orm does not expose functions stored in db
//functions stored in db are public.search_suppliers public.filter_suppliers_by_category a.k.a ts vectors

export async function searchSuppliersService(text: string) {
    const resultList = await db.execute(`SELECT * FROM public.search_suppliers(${text})`);

    return resultList.rows; //should result a list of matching results inclusive of Building, Name, and Location description DB inputs
}

export async function filterSuppliersByCategoryService(supplier_type: SupplierCategory ) {
    const resultList = await db.execute(`SELECT * FROM public.filter_suppliers_by_category(${supplier_type})`);

    return resultList.rows; //list of matching results with category supplier_type
}
