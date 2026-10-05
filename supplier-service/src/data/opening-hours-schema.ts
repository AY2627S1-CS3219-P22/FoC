/*
Drizzle-zod schema for creating and updating opening hours 

This is a separate table in the prod db
*/

import { bigint, smallint, time, boolean, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {supplier} from '@data/schema';
import {z} from 'zod';
import {createInsertSchema} from 'drizzle-zod'

export const supplierOpeningHours = pgTable('supplier_opening_hours', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  supplierId: bigint('supplier_id', { mode: 'number' })
    .notNull()
    .references(() => supplier.supplierId, { onDelete: 'restrict' }),
  dayOfWeek: smallint('day_of_week').notNull(),
  opensAt: time('opens_at'),
  closesAt: time('closes_at'),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (t) => [unique().on(t.supplierId, t.dayOfWeek)]); //composite index

export const supplierRelations = relations(supplier, ({ many }) => ({
  openingHours: many(supplierOpeningHours),
}));

export const openingHoursRelations = relations(supplierOpeningHours, ({ one }) => ({
  supplier: one(supplier, {
    fields: [supplierOpeningHours.supplierId], //make sure to join FK with PK
    references: [supplier.supplierId],
  }),
}));

export const createOpeningHoursSchema = createInsertSchema(supplierOpeningHours).omit({
  supplierId: true
});

/*
createUpdateSchema makes every column optional, which cannot satisfy the table check constraint:
is_closed, opens_at and closes_at have to agree, so an update replaces a whole day rather than one field.
required() keeps opens_at/closes_at nullable but forces the client to state them.
*/
export const updateOpeningHoursSchema = createInsertSchema(supplierOpeningHours)
                                                          .omit({
                                                          supplierId:true,
                                                          createdAt:true, 
                                                          updatedAt:true
                                                          }).required({
                                                          opensAt:true,
                                                          closesAt:true,
                                                          isClosed:true
                                                          });


/*
The day is addressed by the URL, so it is validated as a path param rather than in the body.
id is restated instead of extending supplierIdParamSchema: schema.ts already imports this file,
and reaching back into it at module scope would evaluate before that import resolves.
*/
export const openingHoursParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
});

//the body carries the hours only; dayOfWeek comes from the path
export const updateOpeningHoursBodySchema = updateOpeningHoursSchema.omit({ dayOfWeek: true });


export type CreateOpeningHours = z.infer<typeof createOpeningHoursSchema>; 
export type UpdateOpeningHours = z.infer<typeof updateOpeningHoursSchema>;



                                              