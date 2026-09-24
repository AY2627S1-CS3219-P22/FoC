import { Location } from "@/data/Location";
import { OpeningHours } from "@/data/OpeningHours";

export class Supplier {

    private supplierId: number;
    public name: string; 
    public category: string; 
    public buildingName: string; 
    public locationDescription: string; 
    protected location: Location; 
    protected openingHours: OpeningHours;
    
    constructor(supplierId: number, name: string, category: string, buildingName: string, locationDescription: string, location: Location, openingHours: OpeningHours) {
        this.supplierId = supplierId;
        this.name = name;
        this.category = category;
        this.buildingName = buildingName;
        this.locationDescription = locationDescription;
        this.location = location;
        this.openingHours = openingHours;
    }

    //less strict equality check for suppliers, only checks if the supplierId is the same
    public equals(other: Supplier) {
        return this.supplierId === other.supplierId;
    }

    //strict equality check for duplicates
    public isDuplicateOf(other: Supplier): boolean {
        return (
        this.name.trim().toLowerCase() === other.name.trim().toLowerCase() &&
        this.location.equals(other.location) && 
        this.buildingName.trim().toLowerCase() === other.buildingName.trim().toLowerCase()
        );
    }

}

