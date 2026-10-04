/*
Has information about the supplier database and its operations
TODO: Supplier_Database name should be interpolated as db_name

AI Declaration: Migration to drizzle for createSupplierService and updateSupplierService used
*/ 

import { db } from '@database/db'; //drizzle-orm
import { CreateSupplierSchema, PublicSupplier, SupplierCategory, UpdateSupplierType, supplier } from '@data/schema';
import { getTableColumns, isNull, eq, and, sql, desc} from 'drizzle-orm';
import { ConflictError, NotFoundError,  } from '@/middleware/errors';


const { deletedAt, ...publicSupplierColumns } = getTableColumns(supplier);

//drizzle wraps driver errors, so the postgres code sits on err.cause
const isDuplicateName = (err: any) => err?.code === '23505' || err?.cause?.code === '23505';

export async function createSupplierService(newSupplier: CreateSupplierSchema): Promise<PublicSupplier>  {
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

export async function getSupplierByIdService(id: number): Promise<PublicSupplier>  {

  const [row] = await db
  .select(publicSupplierColumns)
  .from(supplier)
  .where(and(eq(supplier.supplierId, id), isNull(supplier.deletedAt)));

  if(!row) {
    //case 1: No Suppliers Listed in DB 
    //case 2: Cannot connect to DB
    throw new NotFoundError(`Error 404: Supplier ${id} Not Found`);
  }
  return row;
}

export async function updateSupplierByIdService(id: number, updates: UpdateSupplierType, expectedUpdatedAt: Date): Promise<PublicSupplier>  {

    /*
    Parameters: 
        - supplier id: bigint or number referencing supplier
        - updates: drizzle-zod schema of "Supplier" class wrapped to ensure user cannot access fields e.g. deleted_at or updated_at
        - expectedUpdatedAt: read current updated_at of the supplier. implements supplier_versioning

    DB query
        - Checks whether supplier_id exists, if supplier version is the same as expected version, and supplier is not deleted
        - Sets supplier fields. Sets updatedAt to current date

    Response/Error Handling Cases
        - Supplier Id does not exist or Supplier is deleted [Error 400]
        - Current supplier updated at version does not match request body [Error 409]
        - Supplier name is duplicated [Error 409]
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
    // causes: supplier deletion (not found err), stale data: updated by someone else, id does not exist(not found err)
    if (updated.length == 0 || !updated) {
        const [existing] = await db
            .select({ id: supplier.supplierId })
            .from(supplier)
            .where(and(eq(supplier.supplierId, id), isNull(supplier.deletedAt)));

        if (!existing) {
            throw new NotFoundError(`Supplier ${id} not found. Supplier is either deleted or does not exist.`);
        }
        throw new ConflictError('Conflict: Supplier was modified concurrently');
    }

    return updated[0];
}

//support soft delete
//edited to return the deleted supplier for better response messages
export async function deleteSupplierByIdService(id: number): Promise<PublicSupplier> {
    const [deleted] = await db
    .update(supplier)
    .set({ deletedAt: new Date() })
    .where(and(eq(supplier.supplierId, id), isNull(supplier.deletedAt)))
    .returning(publicSupplierColumns);
  if (!deleted) throw new NotFoundError(`Supplier ${id} not found`);
  return deleted;
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


//use drizzle-orm to standardize response to PublicSupplier type for UI integration
export async function searchSuppliersService(text: string): Promise<PublicSupplier[]> {
    const query = sql`websearch_to_tsquery('english', ${text})`;
    return db
      .select({ ...publicSupplierColumns, rank: sql<number>`ts_rank(fts, ${query})` })
      .from(supplier)
      .where(and(isNull(supplier.deletedAt), sql`fts @@ ${query}`))
      .orderBy(desc(sql`ts_rank(fts, ${query})`));
  }
  
  export async function filterSuppliersByCategoryService(
    supplierType: SupplierCategory,
  ): Promise<PublicSupplier[]> {
    return db
      .select(publicSupplierColumns)
      .from(supplier)
      .where(and(isNull(supplier.deletedAt), eq(supplier.type, supplierType)));
  }

