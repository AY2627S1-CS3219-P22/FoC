/*
All interfaces are in one file. Refactor into different files for greater readability if needed.
Zod schemas for request validation are derived from the drizzle table.

AI Declaration: Migration to drizzle performed by Cursor and reviewed/edited by @sunpterodactyl
*/

import { bigint, integer, numeric, pgTable, timestamp, varchar, uniqueIndex} from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import {sql} from 'drizzle-orm'

export const SUPPLIER_CATEGORY = z.enum(['food/coffee', 'printing', 'food', 'shopping']);

//supplier schema in drizzle
export const supplier = pgTable('Supplier_Database', {
    supplierId: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    name: varchar("Name").notNull(),
    type: varchar("Type").notNull(),
    buildingName: varchar("Building").notNull(),
    locationDescription: varchar("Location Description").notNull(),
    floor: integer("Floor").notNull(),
    longitude: numeric("Longitude").notNull(),
    latitude: numeric("Latitude").notNull(),
    startingTime:varchar("StartingTime").default("NA"),
    closingTime: varchar("ClosingTime").default("NA"),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    //precision 3 keeps updated_at at millisecond precision so the concurrency check can match a JS Date
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow(),
},(table) => ({
    uniqueActiveSupplierName: uniqueIndex('unique_active_supplier_name')
        .on(table.name)
        .where(sql`${table.deletedAt} IS NULL`),
}));

//supplier schema in drizzle-zod for partial updates and accepting non-required fields

export const createSupplierSchema = createInsertSchema(supplier).omit ({
                                    supplierId: true,
                                    createdAt: true, 
                                    updatedAt: true,
                                    deletedAt: true,
                                }).extend({
                                    startingTime: z.string().default("NA").optional(),
                                    closingTime: z.string().default("NA").optional(),
                                });

export const updateSupplierSchema = createUpdateSchema(supplier)
                                    .omit({
                                    supplierId: true,
                                    createdAt: true, 
                                    updatedAt: true,
                                    deletedAt: true,
                                    }).partial();

export const updateRequestSchema = updateSupplierSchema.extend({
    expectedUpdatedAt: z.coerce.date(),
});



export type Supplier = typeof supplier.$inferSelect;
export type CreateSupplierSchema = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierType = z.infer<typeof updateSupplierSchema>;
export type SupplierCategory = z.infer<typeof SUPPLIER_CATEGORY>;
