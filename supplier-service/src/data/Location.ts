
export class Location {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number
  ) {}

  //checks if the current location has the same longitude and latitude as the other location
    public equals(other: Location): boolean {
    return (
      this.latitude === other.latitude &&
      this.longitude === other.longitude
    );
  }
}