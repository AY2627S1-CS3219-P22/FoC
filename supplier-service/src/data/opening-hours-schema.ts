/*
Drizzle-zod schema for creating and updating opening hours 

This is a separate table in the prod db
*/

import { bigint, smallint, time, boolean, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {supplier} from '@data/schema';

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

