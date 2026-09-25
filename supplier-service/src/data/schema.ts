/*
All interfaces are in one file. Refactor into different files for greater readability if needed.
Zod schemas for request validation are derived from the drizzle table.

AI Declaration: Migration to drizzle performed by Cursor and reviewed/edited by @sunpterodactyl
*/

import { integer, json, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

export const SUPPLIER_CATEGORY = z.enum(['food/coffee', 'printing', 'food', 'shopping']);

export const locationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});

//TODO: Change validation
export const openingHoursSchema = z.object({
    startingTime: z.string(),
    closingTime: z.string(),
});

export type Location = z.infer<typeof locationSchema>;
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const supplier = pgTable('Supplier_Database', {
    supplierId: serial('supplier_id').primaryKey(),
    name: varchar('name').notNull(),
    type: varchar('type').notNull(),
    buildingName: varchar('building_name').notNull(),
    locationDescription: varchar('location_description').notNull(),
    floor: integer('floor').notNull(),
    location: json('location').$type<Location>().notNull(),
    openingHours: json('opening_hours').$type<OpeningHours>().notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(), //would be helpful for the admin user
});

const supplierFieldOverrides = {
    type: SUPPLIER_CATEGORY,
    location: locationSchema,
    openingHours: openingHoursSchema,
};

export const createSupplierSchema = createInsertSchema(supplier, supplierFieldOverrides).omit({
    supplierId: true,
    deletedAt: true,
    createdAt: true, 
    updatedAt: true,
});

export const updateSupplierSchema = createUpdateSchema(supplier, {
    type: SUPPLIER_CATEGORY,
    location: locationSchema,
    openingHours: openingHoursSchema.optional(),
}).omit({
    supplierId: true,
    createdAt: true, 
    updatedAt: true,
    deletedAt: true,
});

export type Supplier = typeof supplier.$inferSelect;
export type CreateSupplierSchema = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierType = z.infer<typeof updateSupplierSchema>;
