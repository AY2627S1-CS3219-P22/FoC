
/*
All interfaces are in one file. Refactor into different files for greater readability if needed. 
Interfaces are now zod schemas to handle data validation concerns
*/

import {z} from "zod";

export const SUPPLIER_CATEGORY = z.enum(['food/coffee', 'printing', 'food', 'shopping']);

export const locationSchema = z.object ({
    latitude: z.number(),
    longitude: z.number(),
});

//TODO: Change validation
export const openingHoursSchema =  z.object({
    startingTime: z.string(),
    closingTime: z.string(),
});


//Note:SupplierId supposed to be created
export const supplierSchema = z.object({
    supplierId: z.number(),
    name: z.string(),
    type: SUPPLIER_CATEGORY,
    buildingName: z.string(),
    locationDescription: z.string(),
    floor: z.number(),
    location: locationSchema,
    openingHours: openingHoursSchema,
    });

//Had some agentic assistance with translating Omit<> and Partial<> in ts to zod framework

export const createSupplierSchema = supplierSchema.omit({ supplierId: true });
export const updateSupplierSchema = createSupplierSchema.partial();
export const supplierIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type SUPPLIER_CATEGORY = z.infer<typeof SUPPLIER_CATEGORY>;
export type Location = z.infer<typeof locationSchema>;
export type OpeningHours = z.infer<typeof openingHoursSchema>;
export type Supplier = z.infer<typeof supplierSchema>;

