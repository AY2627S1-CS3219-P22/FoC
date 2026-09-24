
/*
All interfaces are in one file. Refactor into different files for greater readability if needed. 

*/

export type SUPPLIER_CATEGORY = ['food/coffee', 'printing', 'food', 'shopping'];

export interface Location {
    latitude: Float16Array;
    longitude: Float16Array;
}

export interface OpeningHours {
    startingTime: string;
    closingTime: string; // TODO: Refactor type
}

export interface Supplier {

    supplierId: number
    name: string; 
    type: SUPPLIER_CATEGORY; 
    buildingName: string; 
    locationDescription: string; 
    floor: number
    location: Location; 
    openingHours: OpeningHours;
    
}



